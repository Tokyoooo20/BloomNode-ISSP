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

const verifyPresidentEmail = async () => {
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

    // Set email as verified and ensure password is updated
    presidentUser.isEmailVerified = true;
    
    // Update password if it's too short (president123 is 13 chars, should be fine)
    // But let's make sure it's set correctly
    if (presidentUser.password.length < 12) {
      presidentUser.password = 'president123';
    }
    
    await presidentUser.save();

    console.log('✅ President email marked as verified!');
    console.log(`   Email: ${presidentUser.email}`);
    console.log(`   Username: ${presidentUser.username}`);
    console.log(`   Email Verified: ${presidentUser.isEmailVerified}`);
    console.log('\n📝 President login credentials:');
    console.log(`   Email: ${presidentUser.email}`);
    console.log(`   Password: president123`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error verifying president email:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

verifyPresidentEmail();

