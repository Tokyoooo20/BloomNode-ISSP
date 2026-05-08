const User = require('../models/User');

const seedAdminUser = async () => {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: 'verdeflor2003@gmail.com' },
        { role: 'admin' }
      ]
    });
    
    if (!existingAdmin) {
      // Create admin user
      const adminUser = new User({
        unit: 'Administration',
        username: 'admin',
        email: 'verdeflor2003@gmail.com',
        password: 'admin123456',
        isApproved: true,
        approvalStatus: 'approved',
        role: 'admin',
        isEmailVerified: true,
        approvedAt: new Date()
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully');
      console.log('📧 Email: verdeflor2003@gmail.com');
      console.log('🔑 Password: admin123456');
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
};

module.exports = seedAdminUser;
