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

// Get new password from command line argument
const newPassword = process.argv[2];

if (!newPassword) {
  console.error('❌ Please provide a new password as an argument.');
  console.log('Usage: node scripts/updatePresidentPassword.js your-new-password');
  process.exit(1);
}

// Check password length
if (newPassword.length < 12) {
  console.error('❌ Password must be at least 12 characters long.');
  process.exit(1);
}

const updatePresidentPassword = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Find president user by email or role
    const presidentUser = await User.findOne({ 
      $or: [
        { email: 'president@gmail.com' },
        { role: 'president' }
      ]
    });

    if (!presidentUser) {
      console.error('❌ President user not found in database.');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Update password (will be hashed automatically by the pre-save hook)
    presidentUser.password = newPassword;
    await presidentUser.save();

    console.log('✅ President password updated successfully!');
    console.log(`   Email: ${presidentUser.email}`);
    console.log(`   Username: ${presidentUser.username}`);
    console.log(`   New password: ${newPassword}`);
    console.log('\n📝 You can now login with:');
    console.log(`   Email: ${presidentUser.email}`);
    console.log(`   Password: ${newPassword}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating president password:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

updatePresidentPassword();

