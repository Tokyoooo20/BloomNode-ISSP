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

const verifyAdminEmail = async () => {
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

    // Set email as verified
    adminUser.isEmailVerified = true;
    await adminUser.save();

    console.log('✅ Admin email marked as verified!');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Email Verified: ${adminUser.isEmailVerified}`);
    console.log('\n📝 You can now login without email verification:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: admin12345678`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error verifying admin email:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

verifyAdminEmail();

