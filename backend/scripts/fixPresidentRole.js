const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env'),
});

const { MONGODB_URI } = process.env;

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI in environment configuration.');
  process.exit(1);
}

const fixPresidentRole = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Find president user by email
    const presidentUser = await User.findOne({ email: 'president@gmail.com' });

    if (!presidentUser) {
      console.error('❌ President user not found in database.');
      console.log('💡 Looking for any user with "president" in email or username...');
      
      const altPresident = await User.findOne({ 
        $or: [
          { email: /president/i },
          { username: /president/i }
        ]
      });
      
      if (altPresident) {
        console.log(`\n📋 Found user:`);
        console.log(`   Email: ${altPresident.email}`);
        console.log(`   Username: ${altPresident.username}`);
        console.log(`   Current Role: "${altPresident.role}"`);
        console.log(`   Unit: ${altPresident.unit}`);
        
        console.log('\n🔄 Updating this user to be president...');
        altPresident.role = 'president';
        altPresident.email = 'president@gmail.com';
        altPresident.isApproved = true;
        altPresident.approvalStatus = 'approved';
        altPresident.isEmailVerified = true;
        await altPresident.save();
        
        console.log('✅ User updated to president role!');
        console.log('\n📝 President login credentials:');
        console.log(`   Email: president@gmail.com`);
        console.log(`   Password: president123`);
        console.log(`   Role: president`);
      }
      
      await mongoose.disconnect();
      process.exit(altPresident ? 0 : 1);
      return;
    }

    console.log(`📋 Current president details:`);
    console.log(`   Email: ${presidentUser.email}`);
    console.log(`   Username: ${presidentUser.username}`);
    console.log(`   Current Role: "${presidentUser.role}"`);
    console.log(`   Unit: ${presidentUser.unit}`);

    // Update role to lowercase 'president'
    if (presidentUser.role !== 'president') {
      const oldRole = presidentUser.role;
      presidentUser.role = 'president';
      await presidentUser.save();
      console.log(`\n✅ President role updated from "${oldRole}" to "president"`);
    } else {
      console.log('\n✅ President role is already correct');
    }

    console.log('\n📝 President account details:');
    console.log(`   Email: ${presidentUser.email}`);
    console.log(`   Username: ${presidentUser.username}`);
    console.log(`   Role: ${presidentUser.role}`);
    console.log(`   Email Verified: ${presidentUser.isEmailVerified}`);
    console.log(`   Approved: ${presidentUser.isApproved}`);
    console.log('\n📧 You can now login with:');
    console.log(`   Email: president@gmail.com`);
    console.log(`   Password: president123`);

    await mongoose.disconnect();
    console.log('\n✅ Done! Please restart your backend server and try logging in again.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing president role:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

fixPresidentRole();

