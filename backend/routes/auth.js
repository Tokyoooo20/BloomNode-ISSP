const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Signup route with admin approval requirement
router.post('/signup', async (req, res) => {
  try {
    const { unit, username, email, password } = req.body;

    // Validation
    if (!unit || !username || !email || !password) {
      return res.status(400).json({ 
        message: 'Please provide unit, username, email, and password' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email or username already exists' 
      });
    }

    // Create new user with pending approval status
    const newUser = new User({
      unit,
      username,
      email,
      password,
      isApproved: false,
      approvalStatus: 'pending'
    });

    await newUser.save();

    res.status(201).json({
      message: 'Account created successfully! Your account is pending admin approval. You will be notified once approved.',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        approvalStatus: newUser.approvalStatus
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      message: 'Server error during signup' 
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

    // Check if user is approved
    if (!user.isApproved || user.approvalStatus !== 'approved') {
      return res.status(403).json({ 
        message: 'Your account is still pending admin approval. Please wait for approval before logging in.',
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
        approvalStatus: user.approvalStatus
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
router.get('/pending-users', async (req, res) => {
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
router.patch('/approve-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndUpdate(
      userId,
      {
        isApproved: true,
        approvalStatus: 'approved',
        approvedAt: new Date()
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    res.json({
      message: 'User approved successfully',
      user
    });

  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ 
      message: 'Server error approving user' 
    });
  }
});

// Reject user (for future admin dashboard)
router.patch('/reject-user/:userId', async (req, res) => {
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

module.exports = router;
