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

    // Check if president user already exists
    const existingPresident = await User.findOne({ email: 'president@gmail.com' });
    
    if (!existingPresident) {
      // Create president user
      const presidentUser = new User({
        unit: 'Executive',
        username: 'president',
        email: 'president@gmail.com',
        password: 'president123',
        isApproved: true,
        approvalStatus: 'approved',
        role: 'president',
        isEmailVerified: true,
        approvedAt: new Date()
      });

      await presidentUser.save();
      console.log('✅ President user created successfully');
      console.log('📧 Email: president@gmail.com');
      console.log('🔑 Password: president123');
    }
    // Removed the "already exists" message to avoid console spam
  } catch (error) {
    console.error('❌ Error creating admin/president users:', error);
  }
};

module.exports = seedAdminUser;
