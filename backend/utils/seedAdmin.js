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

    // Check if president user already exists (by email OR by role)
    const existingPresident = await User.findOne({ 
      $or: [
        { email: 'president@gmail.com' },
        { role: 'president' },
        { role: 'Executive' }
      ]
    });
    
    // Only create default president on initial setup
    // Check if there are any non-admin users - if yes, system has been used, don't recreate president
    const nonAdminUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    const isInitialSetup = nonAdminUsers === 0;
    
    if (!existingPresident && isInitialSetup) {
      // Only create default president if this is initial setup (no non-admin users exist)
      // Once system has been used, president must be created through signup form
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
      console.log('✅ President user created successfully (initial setup)');
      console.log('📧 Email: president@gmail.com');
      console.log('🔑 Password: president123');
    } else if (!existingPresident && !isInitialSetup) {
      // Database has non-admin users but no president - president was likely deleted
      // Don't recreate it - user can create president through signup form if needed
      // This prevents automatic recreation after deletion
    }
    // Removed the "already exists" message to avoid console spam
  } catch (error) {
    console.error('❌ Error creating admin/president users:', error);
  }
};

module.exports = seedAdminUser;
