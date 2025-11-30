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
  console.log('Usage: node scripts/updateAdminPassword.js your-new-password');
  process.exit(1);
}

// Check password length
if (newPassword.length < 12) {
  console.error('❌ Password must be at least 12 characters long.');
  process.exit(1);
}

const updateAdminPassword = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Find admin user by email or role
    const adminUser = await User.findOne({ 
      $or: [
        { email: 'verdeflor2003@gmail.com' },
        { role: 'admin' }
      ]
    });

    if (!adminUser) {
      console.error('❌ Admin user not found in database.');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Update password (will be hashed automatically by the pre-save hook)
    adminUser.password = newPassword;
    await adminUser.save();

    console.log('✅ Admin password updated successfully!');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   New password: ${newPassword}`);
    console.log('\n📝 You can now login with:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: ${newPassword}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating admin password:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

updateAdminPassword();

