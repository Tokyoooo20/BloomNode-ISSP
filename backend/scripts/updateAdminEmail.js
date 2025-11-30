const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

// Load environment variables
dotenv.config({
  path: path.resolve(__dirname, '..', '.env'),
});

const { MONGODB_URI } = process.env;

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI in environment configuration.');
  process.exit(1);
}

// Get new email from command line argument
const newEmail = process.argv[2];

if (!newEmail) {
  console.error('❌ Please provide a new email address as an argument.');
  console.log('Usage: node scripts/updateAdminEmail.js your-email@example.com');
  process.exit(1);
}

// Basic email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(newEmail)) {
  console.error('❌ Invalid email format. Please provide a valid email address.');
  process.exit(1);
}

const updateAdminEmail = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Find admin user (by role or by current email)
    const adminUser = await User.findOne({ 
      $or: [
        { role: 'admin' },
        { email: 'admin@gmail.com' }
      ]
    });

    if (!adminUser) {
      console.error('❌ Admin user not found in database.');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Check if new email is already in use
    const emailExists = await User.findOne({ email: newEmail.toLowerCase() });
    if (emailExists && emailExists._id.toString() !== adminUser._id.toString()) {
      console.error(`❌ Email ${newEmail} is already in use by another user.`);
      await mongoose.disconnect();
      process.exit(1);
    }

    const oldEmail = adminUser.email;

    // Update admin email
    adminUser.email = newEmail.toLowerCase();
    // Set isEmailVerified to false so they can verify the new email
    adminUser.isEmailVerified = false;
    
    await adminUser.save();

    console.log('✅ Admin email updated successfully!');
    console.log(`   Old email: ${oldEmail}`);
    console.log(`   New email: ${adminUser.email}`);
    console.log(`   Email verification status: ${adminUser.isEmailVerified ? 'Verified' : 'Not verified'}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Try to login with the new email address');
    console.log('   2. You will be prompted to verify your email');
    console.log('   3. Check your inbox for the verification code');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating admin email:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

updateAdminEmail();

