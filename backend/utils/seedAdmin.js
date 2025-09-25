const User = require('../models/User');

const seedAdminUser = async () => {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@gmail.com' });
    
    if (!existingAdmin) {
      // Create admin user
      const adminUser = new User({
        unit: 'Administration',
        username: 'admin',
        email: 'admin@gmail.com',
        password: 'admin123',
        isApproved: true,
        approvalStatus: 'approved',
        role: 'admin',
        approvedAt: new Date()
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully');
      console.log('📧 Email: admin@gmail.com');
      console.log('🔑 Password: admin123');
    }

    // Check if president user already exists
    const existingPresident = await User.findOne({ email: 'president@gmail.com' });
    
    if (!existingPresident) {
      // Create president user
      const presidentUser = new User({
        unit: 'Executive',
        username: 'president',
        email: 'president@gmail.com',
        password: 'pres123',
        isApproved: true,
        approvalStatus: 'approved',
        role: 'president',
        approvedAt: new Date()
      });

      await presidentUser.save();
      console.log('✅ President user created successfully');
      console.log('📧 Email: president@gmail.com');
      console.log('🔑 Password: pres123');
    }
    // Removed the "already exists" message to avoid console spam
  } catch (error) {
    console.error('❌ Error creating admin/president users:', error);
  }
};

module.exports = seedAdminUser;
