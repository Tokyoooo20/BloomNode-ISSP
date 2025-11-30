const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/logs
router.get('/', auth, async (req, res) => {
  try {
    const {
      limit = 50,
      cursor,
      action,
      actorRole
    } = req.query;

    const numericLimit = Math.min(parseInt(limit, 10) || 50, 100);
    const query = {};

    // Get the logged-in user's unit
    const user = await User.findById(req.user.id).select('unit role approvalStatus');
    const userUnit = user?.unit;

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

    // Filter by unit - only show logs from users in the same unit
    // For Program Heads and pending users: show all logs for their unit (department account)
    // Query by actor.unit OR by actor.id from users in the same unit (for backward compatibility)
    if ((isProgramHead || isPendingWithUnit) && userUnit) {
      // Find all users in the same unit
      const unitUsers = await User.find({ unit: userUnit }).select('_id');
      const unitUserIds = unitUsers.map(u => u._id);
      
      // Query logs by unit OR by actor.id from users in the same unit
      query.$or = [
        { 'actor.unit': userUnit }, // Logs with unit field set
        { 'actor.id': { $in: unitUserIds } } // Logs from users in the same unit (for old logs)
      ];
    } else if (!userUnit) {
      // If user has no unit, return empty logs
      return res.json({
        logs: [],
        nextCursor: null
      });
    }

    // Apply other filters (these will be combined with $or if it exists)
    if (action) {
      query.action = action;
    }
    if (actorRole) {
      query['actor.role'] = actorRole;
    }
    if (cursor) {
      query._id = { $lt: cursor };
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(numericLimit)
      .lean();

    const nextCursor = logs.length === numericLimit
      ? logs[logs.length - 1]._id
      : null;

    res.json({
      logs,
      nextCursor
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Error fetching logs', error: error.message });
  }
});

module.exports = router;

