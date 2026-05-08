const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const PendingUser = require('../models/PendingUser');
const auth = require('../middleware/auth');
const { logAuditEvent } = require('../utils/auditLogger');
const { generateVerificationCode, sendVerificationEmail, sendApprovalEmail, sendPasswordResetEmail } = require('../utils/emailService');

const router = express.Router();

// University-level offices that should have special conflict detection
const UNIVERSITY_LEVEL_OFFICES = [
  'Office of the University President',
  'Office of the Vice President for Academic Affairs',
  'Office of the Chancellor'
];

const normalizeCampusValue = (campus) => {
  if (!campus || typeof campus !== 'string' || campus.trim() === '') {
    return 'Main';
  }
  const trimmed = campus.trim();
  // Be tolerant of values like "Main Campus" coming from UI/legacy data.
  const withoutSuffix = trimmed.replace(/\s+campus$/i, '').trim();
  return withoutSuffix.charAt(0).toUpperCase() + withoutSuffix.slice(1).toLowerCase();
};

const normalizeUnitValue = (unit) =>
  String(unit ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const extractBaseUnit = (unit) => {
  const normalized = normalizeUnitValue(unit).toLowerCase();
  if (!normalized) return '';
  const prefixes = ['main ', 'bga ', 'tar ', 'ban ', 'sid ', 'president '];
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      return normalized.slice(prefix.length).trim();
    }
  }
  return normalized;
};

const isSystemRole = (role, isUniversityLevelOffice) => {
  const normalized = String(role ?? '').toLowerCase().trim();
  if (isUniversityLevelOffice) {
    return normalized === 'admin';
  }
  return normalized === 'admin' || normalized === 'president' || normalized === 'executive';
};

const isPresidentOfficeSelection = ({ unit, office, universityLevelOffice }) => {
  const values = [unit, office, universityLevelOffice]
    .map((v) => String(v ?? '').toLowerCase().trim())
    .filter(Boolean);

  return values.some((text) => {
    return (
      text.includes('office of the president') ||
      text.includes('office of the university president') ||
      text.includes('main office (office of the president)')
    );
  });
};

const resolveRoleForSignup = ({ campus, unit, office, universityLevelOffice }) => {
  if (isPresidentOfficeSelection({ unit, office, universityLevelOffice })) {
    return 'president';
  }

  if (campus === 'President' && unit === 'Executive') {
    return 'Executive';
  }

  return 'Program head';
};

const findApprovedUnitConflict = async ({ userIdToExclude, unit, campus, isUniversityLevelOffice }) => {
  const campusNormalized = normalizeCampusValue(campus);
  const baseUnit = extractBaseUnit(unit);
  const unitNormalized = normalizeUnitValue(unit);

  // Pull all approved candidates (excluding the user), then compare campus + unit in JS.
  // This avoids brittle string variations like "Main" vs "Main Campus".
  const candidates = await User.find({
    approvalStatus: 'approved',
    _id: { $ne: userIdToExclude }
  }).select('-password');

  const conflict = candidates.find((u) => {
    const candidateCampus = normalizeCampusValue(u.campus);
    if (candidateCampus !== campusNormalized) return false;

    const candidateUnit = normalizeUnitValue(u.unit);
    if (!candidateUnit) return false;

    const candidateIsUniversityLevel = UNIVERSITY_LEVEL_OFFICES.includes(candidateUnit);
    // If we're dealing with a university-level office, the unit must match exactly (after normalization).
    if (isUniversityLevelOffice || candidateIsUniversityLevel) {
      const a = normalizeUnitValue(candidateUnit).toLowerCase();
      const b = normalizeUnitValue(unitNormalized).toLowerCase();
      if (a !== b) return false;
      return !isSystemRole(u.role, true);
    }

    // Regular unit: compare using extracted base unit (handles "BSIT" vs "MAIN BSIT", casing, spacing).
    return extractBaseUnit(candidateUnit) === baseUnit && !isSystemRole(u.role, false);
  });

  return conflict || null;
};

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/profiles');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF) are allowed'));
    }
  }
});

// Strong password validation function
const validateStrongPassword = (password) => {
  const minLength = 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (password.length < minLength) {
    return { isValid: false, message: 'Password must be at least 12 characters long' };
  }
  if (!hasUpperCase) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!hasLowerCase) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!hasNumber) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  if (!hasSpecialChar) {
    return { isValid: false, message: 'Password must contain at least one special character (!@#$%^&* etc.)' };
  }

  return { isValid: true, message: '' };
};

// Signup route with admin approval requirement
router.post('/signup', async (req, res) => {
  try {
    const { unit, campus, office, universityLevelOffice, program, firstName, lastName, username, email, password } = req.body;

    // Validation
    if (!unit || !campus || !username || !email || !password) {
      return res.status(400).json({ 
        message: 'Please provide unit, campus, username, email, and password' 
      });
    }

    // Strong password validation
    const passwordValidation = validateStrongPassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        message: passwordValidation.message 
      });
    }

    // Check if user already exists in User collection
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email or username already exists' 
      });
    }

    // Drop any stale pending registration for this email or username (no email verification flow)
    await PendingUser.deleteMany({
      $or: [{ email }, { username }]
    });

    const role = resolveRoleForSignup({ campus, unit, office, universityLevelOffice });

    const newUser = new User({
      unit,
      program: program || '',
      campus,
      office: office || '',
      universityLevelOffice: universityLevelOffice || '',
      firstName: firstName || '',
      lastName: lastName || '',
      username,
      email,
      password,
      role,
      isApproved: false,
      approvalStatus: 'pending',
      isEmailVerified: true
    });

    await newUser.save();

    console.log(`✅ Account created for ${newUser.email} (signup without email verification)`);

    res.status(201).json({
      message:
        'Registration successful! Your account is pending admin approval. You will be able to log in once an administrator approves your account.',
      requiresVerification: false,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        program: newUser.program || '',
        approvalStatus: newUser.approvalStatus,
        isEmailVerified: true
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      message: 'Server error during signup' 
    });
  }
});

// Verify email with code - Creates actual account after verification
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        message: 'Please provide email and verification code'
      });
    }

    // Find pending user by email
    const pendingUser = await PendingUser.findOne({ email });

    if (!pendingUser) {
      return res.status(404).json({
        message: 'No pending verification found for this email. Please sign up again.'
      });
    }

    // Check if code has expired
    if (pendingUser.verificationCodeExpires && new Date() > pendingUser.verificationCodeExpires) {
      return res.status(400).json({
        message: 'Verification code has expired. Please request a new one.',
        expired: true
      });
    }

    // Check if code matches
    if (pendingUser.verificationCode !== code.trim()) {
      return res.status(400).json({
        message: 'Invalid verification code'
      });
    }

    // Check if user already exists (in case they verified while another tab was open)
    const existingUser = await User.findOne({
      $or: [{ email: pendingUser.email }, { username: pendingUser.username }]
    });

    if (existingUser) {
      // Delete pending user and return success
      await PendingUser.findByIdAndDelete(pendingUser._id);
      return res.json({
        message: 'Email already verified! Your account is pending admin approval.',
        user: {
          id: existingUser._id,
          username: existingUser.username,
          email: existingUser.email,
          isEmailVerified: true,
          approvalStatus: existingUser.approvalStatus
        }
      });
    }

    // Create actual user account now that email is verified
    const role = resolveRoleForSignup({
      campus: pendingUser.campus,
      unit: pendingUser.unit,
      office: pendingUser.office,
      universityLevelOffice: pendingUser.universityLevelOffice
    });
    
    const newUser = new User({
      unit: pendingUser.unit,
      campus: pendingUser.campus,
      office: pendingUser.office || '',
      universityLevelOffice: pendingUser.universityLevelOffice || '',
      firstName: pendingUser.firstName || '',
      lastName: pendingUser.lastName || '',
      username: pendingUser.username,
      email: pendingUser.email,
      password: pendingUser.password, // Already hashed in PendingUser model
      role: role,
      isApproved: false,
      approvalStatus: 'pending',
      isEmailVerified: true
    });

    // Prevent double-hashing: mark password as not modified since it's already hashed
    newUser.$__.activePaths.clearPath('password');

    await newUser.save();

    // Delete pending user
    await PendingUser.findByIdAndDelete(pendingUser._id);

    console.log(`✅ Account created for ${newUser.email} after email verification`);

    res.json({
      message: 'Email verified successfully! Your account has been created and is now pending admin approval.',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        isEmailVerified: true,
        approvalStatus: newUser.approvalStatus
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      message: 'Server error during email verification'
    });
  }
});

// Resend verification code
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Please provide email address'
      });
    }

    // Find pending user by email
    const pendingUser = await PendingUser.findOne({ email });

    if (!pendingUser) {
      // Check if user already exists and is verified
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          message: 'Email is already verified. You can log in now.'
        });
      }
      
      return res.status(404).json({
        message: 'No pending verification found. Please sign up again.'
      });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const codeExpiration = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    pendingUser.verificationCode = verificationCode;
    pendingUser.verificationCodeExpires = codeExpiration;
    await pendingUser.save();

    // Send verification email
    let emailSent = false;
    try {
      await sendVerificationEmail(email, pendingUser.username, verificationCode);
      emailSent = true;
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      
      // Always log verification code when email fails
      console.warn('⚠️  Email not sent, but verification code saved.');
      console.warn('   📧 Email:', email);
      console.warn('   🔢 Verification Code:', verificationCode);
      console.warn('   ⏰ Expires:', codeExpiration);
    }

    // Prepare response
    const response = {
      message: emailSent 
        ? 'Verification code sent successfully! Please check your email.'
        : 'Verification code generated, but email could not be sent. Please try again or contact support.'
    };

    // In development or when email fails, optionally include code in response for testing
    if ((process.env.NODE_ENV === 'development' || !process.env.SENDGRID_API_KEY) && !emailSent) {
      response.devMode = true;
      response.verificationCode = verificationCode; // Include code for testing
      response.codeExpires = codeExpiration;
    }

    res.json(response);

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      message: 'Server error during resend'
    });
  }
});

// Login route - only allow approved users
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Please provide email and password' 
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Check if password is correct
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Check if email is verified (except for president and admin roles)
    if (!user.isEmailVerified && user.role !== 'president' && user.role !== 'admin') {
      return res.status(403).json({
        message: 'Please verify your email before logging in. Check your email for the verification code.',
        requiresVerification: true,
        email: user.email
      });
    }

    // Check if user is approved
    // Users must be approved by admin before they can log in
    if (!user.isApproved || user.approvalStatus !== 'approved') {
      let message = 'Your account is still pending admin approval. Please wait for approval before logging in.';

      if (user.approvalStatus === 'rejected') {
        message = 'Your account has been rejected by the administrator.';
      } else if (user.approvalStatus === 'suspended') {
        message = 'Your account has been suspended. Please contact the administrator.';
      }

      return res.status(403).json({ 
        message,
        approvalStatus: user.approvalStatus
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        unit: user.unit,
        program: user.program || '',
        campus: user.campus || ''
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login' 
    });
  }
});

// Get all users (for admin dashboard)
router.get('/pending-users', auth, async (req, res) => {
  try {
    // Get all users except admin for the admin dashboard
    const users = await User.find({ 
      role: { $ne: 'admin' } 
    }).select('-password').sort({ createdAt: -1 });

    res.json({
      message: 'Users retrieved successfully',
      users: users
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      message: 'Server error fetching users' 
    });
  }
});

// Approve user (for future admin dashboard)
router.patch('/approve-user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { autoSuspendConflict } = req.body; // Flag to auto-suspend existing user with same unit
    
    // Find the user to approve
    const userToApprove = await User.findById(userId);
    
    if (!userToApprove) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    const userToApproveCampus = normalizeCampusValue(userToApprove.campus);
    const userToApproveUnit = normalizeUnitValue(userToApprove.unit);
    
    // Check if this is a university-level office (these need special conflict detection)
    const isUniversityLevelOffice = UNIVERSITY_LEVEL_OFFICES.includes(userToApproveUnit);

    const existingUser = await findApprovedUnitConflict({
      userIdToExclude: userId,
      unit: userToApproveUnit,
      campus: userToApproveCampus,
      isUniversityLevelOffice
    });

    // If conflict exists and not auto-suspending, return conflict info
    if (existingUser && !autoSuspendConflict) {
      const existingUserCampus = normalizeCampusValue(existingUser.campus);
      return res.status(409).json({
        conflict: true,
        message: `Another user with the same unit (${existingUserCampus} campus) is already approved`,
        existingUser: {
          _id: existingUser._id,
          username: existingUser.username,
          email: existingUser.email,
          unit: existingUser.unit,
          campus: existingUserCampus,
          approvedAt: existingUser.approvedAt
        },
        userToApprove: {
          _id: userToApprove._id,
          username: userToApprove.username,
          email: userToApprove.email,
          unit: userToApprove.unit,
          campus: userToApproveCampus
        }
      });
    }

    let suspendedUserSnapshot = null;

    // If conflict exists and auto-suspending, suspend the existing user first
    if (existingUser && autoSuspendConflict) {
      existingUser.isApproved = false;
      existingUser.approvalStatus = 'suspended';
      await existingUser.save();
      suspendedUserSnapshot = existingUser;
      console.log(`Auto-suspended user ${existingUser.username} (${existingUser.email}) due to program head transfer`);
    }

    // Approve the new user
    userToApprove.isApproved = true;
    userToApprove.approvalStatus = 'approved';
    userToApprove.approvedAt = new Date();
    await userToApprove.save();

    // Send approval notification email
    try {
      await sendApprovalEmail(userToApprove.email, userToApprove.username);
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
      // Continue even if email fails
    }

    const sanitizedUser = userToApprove.toObject();
    delete sanitizedUser.password;

    const response = {
      message: existingUser 
        ? `User approved successfully. Previous program head (${existingUser.email}) has been suspended.`
        : 'User approved successfully',
      user: sanitizedUser
    };

    if (existingUser) {
      response.suspendedUser = {
        username: existingUser.username,
        email: existingUser.email
      };
    }

    const auditTasks = [
      logAuditEvent({
        actor: req.user,
        action: 'account_verified',
        description: `Approved account for ${userToApprove.email}`,
        target: { type: 'user', id: userToApprove._id.toString(), name: userToApprove.username },
        metadata: {
          unit: userToApprove.unit,
          autoSuspendedPrevious: Boolean(suspendedUserSnapshot)
        }
      })
    ];

    if (suspendedUserSnapshot) {
      auditTasks.push(
        logAuditEvent({
          actor: req.user,
          action: 'account_suspended',
          description: `Suspended ${suspendedUserSnapshot.email} during program head transfer`,
          target: { type: 'user', id: suspendedUserSnapshot._id.toString(), name: suspendedUserSnapshot.username },
          metadata: {
            unit: suspendedUserSnapshot.unit
          }
        })
      );
    }

    await Promise.all(auditTasks);

    res.json(response);

  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ 
      message: 'Server error approving user' 
    });
  }
});

// Reject user (for future admin dashboard)
router.patch('/reject-user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndUpdate(
      userId,
      {
        isApproved: false,
        approvalStatus: 'rejected'
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    await logAuditEvent({
      actor: req.user,
      action: 'account_rejected',
      description: `Rejected account for ${user.email}`,
      target: { type: 'user', id: user._id.toString(), name: user.username },
      metadata: {
        unit: user.unit
      }
    });

    res.json({
      message: 'User rejected successfully',
      user
    });

  } catch (error) {
    console.error('Error rejecting user:', error);
    res.status(500).json({ 
      message: 'Server error rejecting user' 
    });
  }
});

// Suspend user
router.patch('/suspend-user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isApproved: false,
        approvalStatus: 'suspended'
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    await logAuditEvent({
      actor: req.user,
      action: 'account_suspended',
      description: `Suspended account for ${user.email}`,
      target: { type: 'user', id: user._id.toString(), name: user.username },
      metadata: {
        unit: user.unit
      }
    });

    res.json({
      message: 'User suspended successfully',
      user
    });
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({
      message: 'Server error suspending user'
    });
  }
});

// Update user details (e.g., unit, role, campus, office, etc.)
router.patch('/update-user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      username, 
      email, 
      firstName, 
      lastName, 
      campus, 
      office, 
      universityLevelOffice, 
      unit, 
      role 
    } = req.body;

    // Check if any updates are provided
    const hasUpdates = username || email || firstName || lastName || campus !== undefined || 
                       office !== undefined || universityLevelOffice !== undefined || unit || role;

    if (!hasUpdates) {
      return res.status(400).json({
        message: 'No updates provided'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const changes = [];
    const auditMetadata = {};

    // Update username
    if (username && username !== user.username) {
      // Check if username is already taken
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({
          message: 'Username already taken'
        });
      }
      user.username = username.trim();
      changes.push('username');
      auditMetadata.username = username;
    }

    // Update email
    if (email && email !== user.email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({
          message: 'Email already taken'
        });
      }
      user.email = email.toLowerCase().trim();
      changes.push('email');
      auditMetadata.email = email;
    }

    // Update firstName
    if (firstName !== undefined) {
      user.firstName = firstName ? firstName.trim() : '';
      changes.push('firstName');
    }

    // Update lastName
    if (lastName !== undefined) {
      user.lastName = lastName ? lastName.trim() : '';
      changes.push('lastName');
    }

    // Update campus
    if (campus !== undefined) {
      user.campus = campus ? campus.trim() : '';
      changes.push('campus');
      auditMetadata.campus = campus;
    }

    // Update office
    if (office !== undefined) {
      user.office = office ? office.trim() : '';
      changes.push('office');
      auditMetadata.office = office;
    }

    // Update universityLevelOffice
    if (universityLevelOffice !== undefined) {
      user.universityLevelOffice = universityLevelOffice ? universityLevelOffice.trim() : '';
      changes.push('universityLevelOffice');
      auditMetadata.universityLevelOffice = universityLevelOffice;
    }

    // Update unit
    if (unit) {
      if (typeof unit !== 'string' || !unit.trim()) {
        return res.status(400).json({
          message: 'Unit must be a non-empty string'
        });
      }
      const newUnit = unit.trim();
      if (newUnit !== user.unit) {
        // Check for conflict if user is approved
        if (user.approvalStatus === 'approved') {
          const userCampus = normalizeCampusValue(user.campus);
          const isUniversityLevelOffice = UNIVERSITY_LEVEL_OFFICES.includes(newUnit);

          const existingUser = await findApprovedUnitConflict({
            userIdToExclude: userId,
            unit: newUnit,
            campus: userCampus,
            isUniversityLevelOffice
          });
          
          // If conflict exists and not auto-suspending, return conflict info
          if (existingUser && !req.body.autoSuspendConflict) {
            const existingUserCampus = normalizeCampusValue(existingUser.campus);
            return res.status(409).json({
              conflict: true,
              message: `Another user with the same unit (${existingUserCampus} campus) is already approved`,
              existingUser: {
                _id: existingUser._id,
                username: existingUser.username,
                email: existingUser.email,
                unit: existingUser.unit,
                campus: existingUserCampus,
                approvedAt: existingUser.approvedAt
              }
            });
          }
          
          // If conflict exists and auto-suspending, suspend the existing user
          if (existingUser && req.body.autoSuspendConflict) {
            existingUser.isApproved = false;
            existingUser.approvalStatus = 'suspended';
            await existingUser.save();
            console.log(`Auto-suspended user ${existingUser.username} (${existingUser.email}) due to unit change conflict`);
            auditMetadata.suspendedUser = {
              username: existingUser.username,
              email: existingUser.email
            };
          }
        }
        
        user.unit = newUnit;
        changes.push('unit');
        auditMetadata.unit = unit;
      }
    }

    // Update role
    if (role && role !== user.role) {
      if (typeof role !== 'string' || role.trim().length === 0) {
        return res.status(400).json({
          message: 'Role must be a non-empty string'
        });
      }
      user.role = role.trim();
      changes.push('role');
      auditMetadata.role = role;
    }

    await user.save();

    const sanitizedUser = user.toObject();
    delete sanitizedUser.password;

    // Log audit event if there were changes
    if (changes.length > 0) {
      try {
        await logAuditEvent({
          actor: req.user,
          action: 'account_updated',
          description: `Updated ${changes.join(', ')} for ${user.email}`,
          target: { type: 'user', id: user._id.toString(), name: user.username },
          metadata: auditMetadata
        });
      } catch (auditError) {
        console.error('Failed to log audit event:', auditError);
        // Don't fail the request if audit logging fails
      }
    }

    res.json({
      message: 'User updated successfully',
      user: sanitizedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      message: 'Server error updating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete user
router.delete('/delete-user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: 'Invalid user ID format'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Store user info before deletion for audit log
    const userEmail = user.email;
    const username = user.username;
    const userUnit = (user.unit || '').trim();
    const userIdString = user._id.toString();

    // Only prevent deletion of system administrators (admin role)
    // Allow deletion of president/Executive roles - these are office holders, not system admins
    // Users with "Executive" unit or "president"/"Executive" roles can be deleted
    if (user.role === 'admin') {
      return res.status(403).json({
        message: 'Cannot delete system administrator accounts'
      });
    }

    // Delete the user
    const deletedUser = await User.findByIdAndDelete(userId);

    // Verify deletion was successful
    if (!deletedUser) {
      return res.status(500).json({
        message: 'Failed to delete user. User may have already been deleted.'
      });
    }

    // Double-check that user is actually deleted
    const verifyDeletion = await User.findById(userId);
    if (verifyDeletion) {
      console.error('Warning: User still exists after deletion attempt:', userId);
      return res.status(500).json({
        message: 'User deletion failed. User still exists in database.'
      });
    }

    // Log audit event (non-blocking - don't fail if this errors)
    try {
      await logAuditEvent({
        actor: req.user,
        action: 'account_removed',
        description: `Removed user ${userEmail}`,
        target: { type: 'user', id: userIdString, name: username },
        metadata: {
          unit: userUnit
        }
      });
    } catch (auditError) {
      console.error('Failed to log audit event for user deletion:', auditError);
      // Don't fail the request if audit logging fails
    }

    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      message: 'Server error deleting user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Forgot password - send reset email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Please provide email address'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    // Always return success message for security (don't reveal if email exists)
    if (!user) {
      return res.json({
        message: 'If an account exists with this email, you will receive a password reset link.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();

    // Send reset email
    try {
      await sendPasswordResetEmail(email, user.username, resetToken);
      
      res.json({
        message: 'If an account exists with this email, you will receive a password reset link.'
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      
      // DEVELOPMENT MODE: Allow password reset to work without email
      if (process.env.NODE_ENV === 'development' || !process.env.SENDGRID_API_KEY) {
        console.warn('⚠️  DEVELOPMENT MODE: Email not sent, but reset token saved.');
        console.warn('   Reset URL:', `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`);
        
        return res.json({
          message: 'If an account exists with this email, you will receive a password reset link.',
          // Only in development - include token for testing
          devMode: true,
          resetToken: resetToken,
          resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
        });
      }
      
      // Production: Clear the reset token if email fails
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
      
      res.status(500).json({
        message: 'Failed to send password reset email. Please try again later.'
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      message: 'Server error during password reset request'
    });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: 'Please provide reset token and new password'
      });
    }

    // Strong password validation
    const passwordValidation = validateStrongPassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        message: passwordValidation.message
      });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Password reset token is invalid or has expired'
      });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Log the password reset
    await logAuditEvent({
      actor: { userId: user._id.toString(), email: user.email, role: user.role },
      action: 'password_reset',
      description: `Password reset for ${user.email}`,
      target: { type: 'user', id: user._id.toString(), name: user.username },
      metadata: {}
    });

    res.json({
      message: 'Password reset successful! You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      message: 'Server error during password reset'
    });
  }
});

// Verify reset token (optional - to check if token is valid before showing reset form)
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        message: 'Please provide reset token'
      });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        valid: false,
        message: 'Password reset token is invalid or has expired'
      });
    }

    res.json({
      valid: true,
      message: 'Token is valid',
      email: user.email
    });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({
      valid: false,
      message: 'Server error verifying token'
    });
  }
});

// Get current user data
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user data error:', error);
    res.status(500).json({ message: 'Server error retrieving user data' });
  }
});

// Update user profile
router.put('/profile', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    const { username } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Preserve required fields that might not be in the update
    const updateData = {};

    // Check if username is being changed and if it's already taken
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username, _id: { $ne: req.user.id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      updateData.username = username;
    }

    // Handle profile picture upload
    if (req.file) {
      // Delete old profile picture if exists
      if (user.profilePicture) {
        try {
        const oldPicturePath = path.join(__dirname, '..', user.profilePicture);
        if (fs.existsSync(oldPicturePath)) {
          fs.unlinkSync(oldPicturePath);
          }
        } catch (deleteError) {
          console.error('Error deleting old profile picture:', deleteError);
          // Continue even if old picture deletion fails
        }
      }
      
      // Store relative path
      updateData.profilePicture = `uploads/profiles/${req.file.filename}`;
    }

    // Use findByIdAndUpdate to preserve required fields
    if (Object.keys(updateData).length > 0) {
      await User.findByIdAndUpdate(req.user.id, updateData, { 
        new: true,
        runValidators: true 
      });
    }
    
    // Fetch updated user
    const updatedUser = await User.findById(req.user.id);

    // Log audit event with correct format
    await logAuditEvent({
      actor: {
        id: updatedUser._id,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
        unit: updatedUser.unit
      },
      action: 'profile_updated',
      description: `Updated profile${req.file ? ' and profile picture' : ''}`,
      target: {
        type: 'user',
        id: updatedUser._id.toString(),
        name: updatedUser.username
      },
      metadata: {
        username: updatedUser.username,
        fieldsUpdated: Object.keys(req.body).filter(key => key !== 'profilePicture')
      }
    });

    // Return user without password
    const userResponse = await User.findById(updatedUser._id).select('-password');
    res.json(userResponse);
  } catch (error) {
    console.error('Profile update error:', error);
    
    // Handle multer errors (file upload errors)
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size too large. Maximum size is 5MB.' });
      }
      return res.status(400).json({ message: `File upload error: ${error.message}` });
    }
    
    // Handle other errors
    if (error.message) {
      return res.status(500).json({ message: `Server error updating profile: ${error.message}` });
    }
    
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Change email
router.put('/change-email', auth, async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    if (!newEmail || !password) {
      return res.status(400).json({ 
        message: 'Please provide new email and password' 
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    // Check if new email is already in use
    const existingUser = await User.findOne({ 
      email: newEmail.toLowerCase(), 
      _id: { $ne: req.user.id } 
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const oldEmail = user.email;
    user.email = newEmail.toLowerCase();
    user.isEmailVerified = false; // Require re-verification
    await user.save();

    await logAuditEvent(req.user.id, 'EMAIL_CHANGE', 'User changed their email', {
      oldEmail,
      newEmail: user.email
    });

    res.json({ 
      message: 'Email updated successfully',
      email: user.email
    });
  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({ message: 'Server error changing email' });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Please provide current and new password' 
      });
    }

    // Validate new password strength
    const passwordValidation = validateStrongPassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        message: passwordValidation.message 
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Check if new password is same as current
    if (currentPassword === newPassword) {
      return res.status(400).json({ 
        message: 'New password must be different from current password' 
      });
    }

    user.password = newPassword;
    await user.save();

    await logAuditEvent(req.user.id, 'PASSWORD_CHANGE', 'User changed their password');

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error changing password' });
  }
});

module.exports = router;
