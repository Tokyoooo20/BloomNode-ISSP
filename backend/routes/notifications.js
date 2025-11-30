const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET - Get all notifications for the authenticated user
// For Program Heads: Returns all notifications for their unit (department account)
// For other roles: Returns only their own notifications
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is a Program Head OR pending with unit
    const isProgramHead = user.role && 
                          user.role !== 'admin' && 
                          user.role !== 'president' && 
                          user.role !== 'Executive' &&
                          user.unit && 
                          user.unit.trim() !== '';
    
    const isPendingWithUnit = user.approvalStatus === 'pending' && 
                              user.unit && 
                              user.unit.trim() !== '';
    
    let notifications;
    if (isProgramHead || isPendingWithUnit) {
      // For Program Heads (and pending users with matching unit): Query by unit to get all department notifications
      // This allows new Program Heads to see previous Program Head's notifications
      // Query by unit OR by userId from users in the same unit (for backward compatibility)
      const unitUsers = await User.find({ unit: user.unit }).select('_id');
      const unitUserIds = unitUsers.map(u => u._id);
      
      notifications = await Notification.find({
        $or: [
          { unit: user.unit }, // Notifications with unit field set
          { userId: { $in: unitUserIds } } // Notifications from users in the same unit (for old notifications)
        ]
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('requestId', 'requestTitle');
    } else {
      // For admin/president: Query by userId (individual account)
      notifications = await Notification.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('requestId', 'requestTitle');
    }

    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
});

// GET - Get unread notification count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is a Program Head OR pending with unit
    const isProgramHead = user.role && 
                          user.role !== 'admin' && 
                          user.role !== 'president' && 
                          user.role !== 'Executive' &&
                          user.unit && 
                          user.unit.trim() !== '';
    
    const isPendingWithUnit = user.approvalStatus === 'pending' && 
                              user.unit && 
                              user.unit.trim() !== '';
    
    let count;
    if (isProgramHead || isPendingWithUnit) {
      // For Program Heads: Count all unread notifications for their unit
      // Query by unit OR by userId from users in the same unit (for backward compatibility)
      const unitUsers = await User.find({ unit: user.unit }).select('_id');
      const unitUserIds = unitUsers.map(u => u._id);
      
      count = await Notification.countDocuments({ 
        $or: [
          { unit: user.unit, isRead: false },
          { userId: { $in: unitUserIds }, isRead: false }
        ]
      });
    } else {
      // For admin/president: Count only their own unread notifications
      count = await Notification.countDocuments({ 
        userId: req.user.id, 
        isRead: false 
      });
    }
    
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Error fetching unread count', error: error.message });
  }
});

// PUT - Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is a Program Head OR pending with unit
    const isProgramHead = user.role && 
                          user.role !== 'admin' && 
                          user.role !== 'president' && 
                          user.role !== 'Executive' &&
                          user.unit && 
                          user.unit.trim() !== '';
    
    const isPendingWithUnit = user.approvalStatus === 'pending' && 
                              user.unit && 
                              user.unit.trim() !== '';
    
    let notification;
    if (isProgramHead || isPendingWithUnit) {
      // For Program Heads: Can mark any notification from their unit as read
      // Query by unit OR by userId from users in the same unit (for backward compatibility)
      const unitUsers = await User.find({ unit: user.unit }).select('_id');
      const unitUserIds = unitUsers.map(u => u._id);
      
      notification = await Notification.findOne({ 
        _id: req.params.id,
        $or: [
          { unit: user.unit },
          { userId: { $in: unitUserIds } }
        ]
      });
    } else {
      // For admin/president: Can only mark their own notifications as read
      notification = await Notification.findOne({ 
        _id: req.params.id, 
        userId: req.user.id 
      });
    }

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error marking notification as read', error: error.message });
  }
});

// PUT - Mark all notifications as read
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is a Program Head OR pending with unit
    const isProgramHead = user.role && 
                          user.role !== 'admin' && 
                          user.role !== 'president' && 
                          user.role !== 'Executive' &&
                          user.unit && 
                          user.unit.trim() !== '';
    
    const isPendingWithUnit = user.approvalStatus === 'pending' && 
                              user.unit && 
                              user.unit.trim() !== '';
    
    if (isProgramHead || isPendingWithUnit) {
      // For Program Heads: Mark all unread notifications for their unit as read
      // Query by unit OR by userId from users in the same unit (for backward compatibility)
      const unitUsers = await User.find({ unit: user.unit }).select('_id');
      const unitUserIds = unitUsers.map(u => u._id);
      
      await Notification.updateMany(
        {
          $or: [
            { unit: user.unit, isRead: false },
            { userId: { $in: unitUserIds }, isRead: false }
          ]
        },
        { isRead: true, readAt: new Date() }
      );
    } else {
      // For admin/president: Mark only their own notifications as read
      await Notification.updateMany(
        { userId: req.user.id, isRead: false },
        { isRead: true, readAt: new Date() }
      );
    }

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error marking all notifications as read', error: error.message });
  }
});

module.exports = router;

