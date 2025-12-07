const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const ISSP = require('../models/ISSP');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { logAuditEvent } = require('../utils/auditLogger');

const sanitizeRequestItems = (items = []) =>
  (Array.isArray(items) ? items : []).map((item = {}, index) => ({
    id: item.id || `item-${Date.now()}-${index}`,
    item: item.item || '',
    quantity: Number(item.quantity) || 0,
    quantityByYear: item.quantityByYear || {},
    price: Number(item.price) || 0,
    range: item.range || 'mid',
    specification: item.specification || '',
    purpose: item.purpose || '',
    approvalStatus: item.approvalStatus || 'pending',
    approvalReason: item.approvalReason || '',
    itemStatus: item.itemStatus || undefined,
    itemStatusRemarks: item.itemStatusRemarks || '',
    itemStatusUpdatedAt: item.itemStatusUpdatedAt || undefined
  }));

// Helper function to get request name with fallback
const getRequestName = async (request) => {
  if (request.requestTitle && request.requestTitle.trim()) {
    return request.requestTitle;
  }
  
  // Try to get unit from populated user or fetch it
  let unit = null;
  if (request.userId && typeof request.userId === 'object' && request.userId.unit) {
    // User is already populated
    unit = request.userId.unit;
  } else if (request.userId) {
    // Need to fetch user
    try {
      const user = await User.findById(request.userId);
      unit = user?.unit || null;
    } catch (error) {
      console.error('Error fetching user for request name:', error);
    }
  }
  
  if (unit && unit.trim()) {
    return unit.trim();
  }
  
  // Fallback to ID if no unit available
  const requestId = request._id ? request._id.toString().slice(-6) : 'unknown';
  return `Request #${requestId}`;
};

const hasItemChanged = (previous = {}, next = {}) => {
  const fieldsToCompare = ['item', 'quantity', 'price', 'range', 'specification', 'purpose'];
  return fieldsToCompare.some((field) => {
    const prevValue = previous[field];
    const nextValue = next[field];
    if (typeof prevValue === 'number' || typeof nextValue === 'number') {
      return Number(prevValue || 0) !== Number(nextValue || 0);
    }
    return (prevValue || '').toString().trim() !== (nextValue || '').toString().trim();
  });
};

const diffRequestItems = (previous = [], next = []) => {
  const previousMap = new Map(previous.map((item) => [item.id, item]));
  const nextMap = new Map(next.map((item) => [item.id, item]));

  const added = [];
  const removed = [];
  const updated = [];

  next.forEach((item) => {
    const prevItem = previousMap.get(item.id);
    if (!prevItem) {
      added.push(item);
    } else if (hasItemChanged(prevItem, item)) {
      updated.push({ before: prevItem, after: item });
    }
  });

  previous.forEach((item) => {
    if (!nextMap.has(item.id)) {
      removed.push(item);
    }
  });

  return { added, removed, updated };
};

// Get all requests for the logged-in user
// For Program Heads: Returns all requests from their unit (department account)
// For other roles: Returns only their own requests
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is a Program Head (role is a unit name, not 'admin', 'president', or 'Program head')
    // OR if user is pending but has a unit that matches an existing Program Head's unit
    const isProgramHead = user.role && 
                          user.role !== 'admin' && 
                          user.role !== 'president' && 
                          user.role !== 'Executive' &&
                          user.unit && 
                          user.unit.trim() !== '';
    
    // Check if user is pending but has a unit - allow access if unit matches existing Program Head
    const isPendingWithUnit = user.approvalStatus === 'pending' && 
                              user.unit && 
                              user.unit.trim() !== '';
    
    let requests;
    if (isProgramHead || isPendingWithUnit) {
      // For Program Heads (and pending users with matching unit): Query by unit AND campus to get all department requests
      // This allows new Program Heads to see previous Program Head's requests for the same campus
      // Normalize campus values (empty/null = 'Main')
      const userCampus = (user.campus || '').trim() || 'Main';
      
      // Build campus query: match exact campus or match empty/null if userCampus is 'Main'
      const campusQuery = userCampus === 'Main' 
        ? { $or: [{ campus: 'Main' }, { campus: '' }, { campus: null }, { campus: { $exists: false } }] }
        : { campus: userCampus };
      
      // First, find all users in the same unit AND same campus
      const unitUsers = await User.find({ 
        unit: user.unit,
        ...campusQuery
      }).select('_id');
      const unitUserIds = unitUsers.map(u => u._id);
      
      // Query requests by unit+campus OR by userId from the same unit+campus
      // This ensures we get all requests from the department for this campus, even old ones without unit/campus field
      requests = await Request.find({
        $or: [
          { 
            unit: user.unit,
            ...campusQuery
          }, // Requests with unit+campus field set
          { userId: { $in: unitUserIds } } // Requests from users in the same unit+campus (for old requests)
        ]
      })
        .populate('userId', 'username email unit campus')
        .sort({ createdAt: -1 });
      
      // Update any requests that don't have unit/campus field set (migration)
      const requestsToUpdate = requests.filter(req => 
        (!req.unit || req.unit.trim() === '') || 
        (!req.campus || req.campus.trim() === '')
      );
      if (requestsToUpdate.length > 0) {
        await Promise.all(
          requestsToUpdate.map(req => {
            if (!req.unit || req.unit.trim() === '') {
              req.unit = user.unit;
            }
            if (!req.campus || req.campus.trim() === '') {
              req.campus = userCampus;
            }
            return req.save();
          })
        );
      }
    } else {
      // For admin/president: Query by userId (individual account)
      requests = await Request.find({ userId: req.user.id })
        .populate('userId', 'unit')
        .sort({ createdAt: -1 });
    }
    
    res.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: 'Error fetching requests' });
  }
});

// Create new request
router.post('/', auth, async (req, res) => {
  try {
    const { requestTitle, priority, year, description, items } = req.body;
    
    // Check if entries are being accepted for this year cycle
    if (year) {
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        const adminISSP = await ISSP.findOne({ userId: adminUser._id });
        if (adminISSP && adminISSP.acceptingEntries) {
          // Mongoose Maps can be accessed as objects or with .get() method
          const yearCycleStatus = adminISSP.acceptingEntries[year] || 
                                 (adminISSP.acceptingEntries.get ? adminISSP.acceptingEntries.get(year) : null);
          // If status exists and is 'not_accepting', block the request
          if (yearCycleStatus && yearCycleStatus.status === 'not_accepting') {
            return res.status(403).json({ 
              message: `ISSP entries are not being accepted for ${year}. Please contact the administrator.` 
            });
          }
          // If status doesn't exist, default to 'accepting' (allow the request)
        }
      }
    }
    
    // Sanitize incoming items
    const cleanedItems = sanitizeRequestItems(items);
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Normalize campus values (empty/null = 'Main')
    const userCampus = (user.campus || '').trim() || 'Main';
    
    const newRequest = new Request({
      requestTitle,
      priority,
      year,
      description,
      items: cleanedItems,
      userId: req.user.id, // Use id instead of _id
      unit: user.unit || '', // Store unit for department-based queries
      campus: userCampus // Store campus for department-based queries
    });

    const savedRequest = await newRequest.save();

    // Populate user to get unit for request name
    await savedRequest.populate('userId', 'unit');
    const requestName = await getRequestName(savedRequest);
    
    const auditTasks = [
      logAuditEvent({
        actor: req.user,
        action: 'request_created',
        description: `Created request "${requestName}"`,
        target: { type: 'request', id: savedRequest._id.toString(), name: requestName },
        metadata: {
          priority: savedRequest.priority,
          status: savedRequest.status,
          itemCount: savedRequest.items?.length || 0
        }
      })
    ];

    if (cleanedItems.length) {
      auditTasks.push(
        logAuditEvent({
          actor: req.user,
          action: 'request_item_added',
          description: `Added ${cleanedItems.length} item(s) to request "${requestName}"`,
          target: { type: 'request', id: savedRequest._id.toString(), name: requestName },
          metadata: {
            items: cleanedItems.map((item) => ({
              id: item.id,
              name: item.item,
              quantity: item.quantity,
              range: item.range
            }))
          }
        })
      );
    }

    await Promise.all(auditTasks);

    // If request is submitted, automatically add items to ISSP deployment table
    if (savedRequest.status === 'submitted' && cleanedItems.length > 0 && req.user.unit) {
      try {
        // Get admin user's ISSP
        const adminUser = await User.findOne({ role: 'admin' });
        if (adminUser) {
          let adminISSP = await ISSP.findOne({ userId: adminUser._id });
          
          if (!adminISSP) {
            // Create ISSP if it doesn't exist
            adminISSP = new ISSP({ userId: adminUser._id });
            await adminISSP.save();
          }
          
          // Get current deployment data
          const currentDeployment = adminISSP.resourceRequirements?.pageA?.deploymentData || [];
          
          // Check if items from this request already exist (to avoid duplicates)
          const existingItems = new Set(
            currentDeployment
              .filter(row => row.item && row.item.trim() !== '')
              .map(row => `${row.item}|${row.office}`)
          );
          
          // Add new items from this request
          const newItems = [];
          cleanedItems.forEach(item => {
            if (item.item && item.item.trim() !== '') {
              const itemKey = `${item.item}|${req.user.unit}`;
              if (!existingItems.has(itemKey)) {
                newItems.push({
                  item: item.item,
                  office: req.user.unit,
                  year1: '',
                  year2: '',
                  year3: ''
                });
                existingItems.add(itemKey);
              }
            }
          });
          
          // Update deployment data if there are new items
          if (newItems.length > 0) {
            const updatedDeployment = [...currentDeployment, ...newItems];
            
            // Ensure resourceRequirements structure exists
            if (!adminISSP.resourceRequirements) {
              adminISSP.resourceRequirements = {};
            }
            if (!adminISSP.resourceRequirements.pageA) {
              adminISSP.resourceRequirements.pageA = {};
            }
            
            adminISSP.resourceRequirements.pageA.deploymentData = updatedDeployment;
            await adminISSP.save();
            
            console.log(`Auto-added ${newItems.length} item(s) from request "${requestName}" to ISSP deployment table`);
          }
        }
      } catch (isspError) {
        console.error('Error updating ISSP deployment table:', isspError);
        // Don't fail the request creation if ISSP update fails
      }
    }

    res.json(savedRequest);
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ message: error.message || 'Error creating request' });
  }
});

// PUT - Submit revised request (for units to resubmit after DICT revision)
router.put('/:id/resubmit-revision', auth, async (req, res) => {
  try {
    const { items, revisionNotes } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is a Program Head OR pending with matching unit
    const isProgramHead = user.role && 
                          user.role !== 'admin' && 
                          user.role !== 'president' && 
                          user.role !== 'Executive' &&
                          user.unit && 
                          user.unit.trim() !== '';
    
    const isPendingWithUnit = user.approvalStatus === 'pending' && 
                              user.unit && 
                              user.unit.trim() !== '';

    let request;
    if (isProgramHead || isPendingWithUnit) {
      // For Program Heads (and pending users with matching unit): Can resubmit any request from their unit
      request = await Request.findOne({ 
        _id: req.params.id, 
        unit: user.unit 
      });
    } else {
      // For admin/president: Can only resubmit their own requests
      request = await Request.findOne({ 
        _id: req.params.id, 
        userId: req.user.id 
      });
    }

    if (!request) {
      return res.status(404).json({ message: 'Request not found or unauthorized' });
    }

    // Check if request has revision status or rejected items
    const hasRejectedItems = (request.items || []).some(item => 
      item.approvalStatus === 'disapproved'
    );
    const canRevise = request.dictApproval?.status === 'revision_from_dict' || 
                      (hasRejectedItems && request.status === 'rejected');
    
    if (!canRevise) {
      return res.status(400).json({ message: 'This request is not marked for revision' });
    }

    // Sanitize incoming items
    const cleanedItems = sanitizeRequestItems(items);

    // Update request with revised items
    request.items = cleanedItems;
    request.status = 'resubmitted';
    request.revisionStatus = 'resubmitted';
    request.revisionNotes = revisionNotes || '';
    request.revisedAt = new Date();

    await request.save();
    await request.populate('userId', 'unit');
    const requestName = await getRequestName(request);

    // Create notification for admin
    try {
      const adminUsers = await User.find({ role: 'admin' });
      const notifications = adminUsers.map(admin => ({
        userId: admin._id,
        unit: request.unit || (request.userId?.unit) || null, // Store unit for department account access
        type: 'issp_submitted_for_review',
        title: 'Revised Request Resubmitted',
        message: `Unit "${request.userId.unit || request.userId.username}" has resubmitted their revised request "${requestName}".`,
        requestId: request._id
      }));
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } catch (notificationError) {
      console.error('Error creating notifications:', notificationError);
    }

    // Log audit event
    await logAuditEvent({
      actor: req.user,
      action: 'request_resubmitted',
      description: `Resubmitted revised request "${requestName}"`,
      target: { type: 'request', id: request._id.toString(), name: requestName },
      metadata: {
        itemCount: cleanedItems.length,
        revisionNotes
      }
    });

    res.json(request);
  } catch (error) {
    console.error('Error resubmitting revised request:', error);
    res.status(500).json({ message: error.message || 'Error resubmitting revised request' });
  }
});

// Update request
router.put('/:id', auth, async (req, res) => {
  try {
    const { requestTitle, priority, year, description, status, progress, items } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is a Program Head OR pending with matching unit
    const isProgramHead = user.role && 
                          user.role !== 'admin' && 
                          user.role !== 'president' && 
                          user.role !== 'Executive' &&
                          user.unit && 
                          user.unit.trim() !== '';
    
    const isPendingWithUnit = user.approvalStatus === 'pending' && 
                              user.unit && 
                              user.unit.trim() !== '';

    let request;
    if (isProgramHead || isPendingWithUnit) {
      // For Program Heads (and pending users with matching unit): Can update any request from their unit
      request = await Request.findOne({ 
        _id: req.params.id, 
        unit: user.unit 
      });
    } else {
      // For admin/president: Can only update their own requests
      request = await Request.findOne({ 
        _id: req.params.id, 
        userId: req.user.id 
      });
    }

    if (!request) {
      return res.status(404).json({ message: 'Request not found or unauthorized' });
    }

    const originalSnapshot = {
      status: request.status,
      items: (request.items || []).map((item) => (item.toObject ? item.toObject() : item))
    };

    const touchedFields = [];

    if (requestTitle !== undefined) {
      request.requestTitle = requestTitle;
      touchedFields.push('requestTitle');
    }
    if (priority !== undefined) {
      request.priority = priority;
      touchedFields.push('priority');
    }
    if (year !== undefined) {
      request.year = year;
      touchedFields.push('year');
    }
    if (description !== undefined) {
      request.description = description;
      touchedFields.push('description');
    }
    let statusChanged = false;
    if (status !== undefined) {
      statusChanged = status !== request.status;
      request.status = status;
      touchedFields.push('status');
    }
    if (progress !== undefined) {
      request.progress = progress;
      touchedFields.push('progress');
    }

    let itemsDiff = null;
    if (items !== undefined && Array.isArray(items)) {
      const sanitizedItems = sanitizeRequestItems(items);
      itemsDiff = diffRequestItems(originalSnapshot.items, sanitizedItems);
      request.items = sanitizedItems;
      touchedFields.push('items');
    }

    if (!touchedFields.length) {
      return res.status(400).json({ message: 'No updates provided' });
    }

    // Ensure unit is set (for migration of existing data)
    if (!request.unit) {
      const user = await User.findById(request.userId);
      if (user && user.unit) {
        request.unit = user.unit;
      }
    }

    await request.save();

    // Populate user to get unit for request name
    await request.populate('userId', 'unit');
    const auditTasks = [];

    const requestName = await getRequestName(request);
    
    if (itemsDiff) {
      if (itemsDiff.added.length) {
        auditTasks.push(
          logAuditEvent({
            actor: req.user,
            action: 'request_item_added',
            description: `Added ${itemsDiff.added.length} item(s) to request "${requestName}"`,
            target: { type: 'request', id: request._id.toString(), name: requestName },
            metadata: {
              items: itemsDiff.added.map((item) => ({
                id: item.id,
                name: item.item,
                quantity: item.quantity,
                range: item.range
              }))
            }
          })
        );
      }

      if (itemsDiff.removed.length) {
        auditTasks.push(
          logAuditEvent({
            actor: req.user,
            action: 'request_item_removed',
            description: `Removed ${itemsDiff.removed.length} item(s) from request "${requestName}"`,
            target: { type: 'request', id: request._id.toString(), name: requestName },
            metadata: {
              items: itemsDiff.removed.map((item) => ({
                id: item.id,
                name: item.item
              }))
            }
          })
        );
      }

      if (itemsDiff.updated.length) {
        auditTasks.push(
          logAuditEvent({
            actor: req.user,
            action: 'request_item_updated',
            description: `Edited ${itemsDiff.updated.length} item(s) in request "${requestName}"`,
            target: { type: 'request', id: request._id.toString(), name: requestName },
            metadata: {
              items: itemsDiff.updated.map(({ before, after }) => ({
                id: after.id,
                name: after.item,
                before: {
                  quantity: before.quantity,
                  range: before.range,
                  specification: before.specification,
                  purpose: before.purpose
                },
                after: {
                  quantity: after.quantity,
                  range: after.range,
                  specification: after.specification,
                  purpose: after.purpose
                }
              }))
            }
          })
        );
      }
    }

    if (statusChanged) {
      // If status changed to "submitted", notify all admins and update ISSP deployment table
      if (request.status === 'submitted') {
        try {
          // Fetch the user who submitted the request to get username and unit
          const submittingUser = await User.findById(request.userId);
          
          if (submittingUser) {
            // Find all admin users
            const adminUsers = await User.find({ role: 'admin' });
            
            // Create notifications for all admins
            const adminNotifications = adminUsers.map(admin => ({
              userId: admin._id,
              unit: submittingUser.unit || null, // Store unit for department account access
              type: 'request_submitted',
              title: 'New Request Submitted',
              message: `${submittingUser.username} (${submittingUser.unit || 'N/A'}) has submitted a new request: "${requestName}"`,
              requestId: request._id
            }));
            
            if (adminNotifications.length > 0) {
              await Notification.insertMany(adminNotifications);
            }
            
            // Automatically add items to ISSP Resource Requirements deployment table
            if (request.items && request.items.length > 0 && submittingUser.unit) {
              try {
                // Get admin user's ISSP
                const adminUser = adminUsers[0]; // Use first admin
                if (adminUser) {
                  let adminISSP = await ISSP.findOne({ userId: adminUser._id });
                  
                  if (!adminISSP) {
                    // Create ISSP if it doesn't exist
                    adminISSP = new ISSP({ userId: adminUser._id });
                    await adminISSP.save();
                  }
                  
                  // Get current deployment data
                  const currentDeployment = adminISSP.resourceRequirements?.pageA?.deploymentData || [];
                  
                  // Check if items from this request already exist (to avoid duplicates)
                  const existingItems = new Set(
                    currentDeployment
                      .filter(row => row.item && row.item.trim() !== '')
                      .map(row => `${row.item}|${row.office}`)
                  );
                  
                  // Add new items from this request
                  const newItems = [];
                  request.items.forEach(item => {
                    if (item.item && item.item.trim() !== '') {
                      const itemKey = `${item.item}|${submittingUser.unit}`;
                      if (!existingItems.has(itemKey)) {
                        newItems.push({
                          item: item.item,
                          office: submittingUser.unit,
                          year1: '',
                          year2: '',
                          year3: ''
                        });
                        existingItems.add(itemKey);
                      }
                    }
                  });
                  
                  // Update deployment data if there are new items
                  if (newItems.length > 0) {
                    const updatedDeployment = [...currentDeployment, ...newItems];
                    
                    // Ensure resourceRequirements structure exists
                    if (!adminISSP.resourceRequirements) {
                      adminISSP.resourceRequirements = {};
                    }
                    if (!adminISSP.resourceRequirements.pageA) {
                      adminISSP.resourceRequirements.pageA = {};
                    }
                    
                    adminISSP.resourceRequirements.pageA.deploymentData = updatedDeployment;
                    await adminISSP.save();
                    
                    console.log(`Auto-added ${newItems.length} item(s) from request "${requestName}" to ISSP deployment table`);
                  }
                }
              } catch (isspError) {
                console.error('Error updating ISSP deployment table:', isspError);
                // Don't fail the request update if ISSP update fails
              }
            }
          }
        } catch (error) {
          console.error('Error creating admin notifications:', error);
          // Don't fail the request update if notification creation fails
        }
      }

      auditTasks.push(
        logAuditEvent({
          actor: req.user,
          action: 'request_status_changed',
          description: `Updated request "${requestName}" status to ${request.status}`,
          target: { type: 'request', id: request._id.toString(), name: requestName },
          metadata: {
            previousStatus: originalSnapshot.status,
            status: request.status
          }
        })
      );
    }

    auditTasks.push(
      logAuditEvent({
        actor: req.user,
        action: 'request_updated',
        description: `Updated request "${requestName}"`,
        target: { type: 'request', id: request._id.toString(), name: requestName },
        metadata: {
          touchedFields,
          status: request.status,
          itemCount: request.items ? request.items.length : 0
        }
      })
    );

    await Promise.all(auditTasks);

    res.json(request);
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ message: 'Error updating request', error: error.message });
  }
});

// Delete request
router.delete('/:id', auth, async (req, res) => {
  try {
    const request = await Request.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found or unauthorized' });
    }

    // Populate user to get unit for request name
    await request.populate('userId', 'unit');
    const requestName = await getRequestName(request);
    
    await logAuditEvent({
      actor: req.user,
      action: 'request_deleted',
      description: `Deleted request "${requestName}"`,
      target: { type: 'request', id: request._id.toString(), name: requestName },
      metadata: {
        status: request.status
      }
    });

    res.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ message: 'Error deleting request' });
  }
});

// Get inventory items (individual items from submitted requests)
// For Program Heads: Returns all inventory items from their unit (department account)
// For other roles: Returns only their own inventory items
router.get('/inventory/items', auth, async (req, res) => {
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
    
    let requests;
    if (isProgramHead || isPendingWithUnit) {
      // For Program Heads (and pending users with matching unit): Query by unit AND campus to get all department requests
      // Normalize campus values (empty/null = 'Main')
      const userCampus = (user.campus || '').trim() || 'Main';
      
      // Build campus query: match exact campus or match empty/null if userCampus is 'Main'
      const campusQuery = userCampus === 'Main' 
        ? { $or: [{ campus: 'Main' }, { campus: '' }, { campus: null }, { campus: { $exists: false } }] }
        : { campus: userCampus };
      
      // Find all users in the same unit AND same campus
      const unitUsers = await User.find({ 
        unit: user.unit,
        ...campusQuery
      }).select('_id');
      const unitUserIds = unitUsers.map(u => u._id);
      
      requests = await Request.find({
        $or: [
          { 
            unit: user.unit,
            ...campusQuery
          }, // Requests with unit+campus field set
          { userId: { $in: unitUserIds } } // Requests from users in the same unit+campus (for old requests)
        ],
        status: { $in: ['submitted', 'approved', 'rejected'] }
      })
        .populate('userId', 'username email unit campus')
        .sort({ createdAt: -1 });
    } else {
      // For admin/president: Query by userId (individual account)
      requests = await Request.find({ 
        userId: req.user.id,
        status: { $in: ['submitted', 'approved', 'rejected'] }
      })
      .populate('userId', 'unit')
      .sort({ createdAt: -1 });
    }

    // Extract all items from these requests with their context
    const inventoryItems = [];
    for (const request of requests) {
      if (request.items && request.items.length > 0) {
        const requestName = await getRequestName(request);
        request.items.forEach(item => {
          inventoryItems.push({
            id: item.id,
            name: item.item,
            purpose: item.purpose || 'N/A',
            quantity: item.quantity,
            price: item.price || 0,
            range: item.range,
            specification: item.specification || '',
            status: item.approvalStatus === 'approved' ? 'Approved' : 
                   item.approvalStatus === 'disapproved' ? 'Disapproved' : 'Pending',
            reason: item.approvalReason || 'Awaiting review',
            requestTitle: requestName,
            requestId: request._id,
            requestStatus: request.status,
            requestYear: request.year || 'N/A', // Include year cycle
            requestDate: request.createdAt
          });
        });
      }
    }

    res.json(inventoryItems);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ message: 'Error fetching inventory items' });
  }
});

// PUT - Update item status (for units to update status after approval)
router.put('/:requestId/items/:itemId/status', auth, async (req, res) => {
  try {
    const { requestId, itemId } = req.params;
    const { itemStatus, remarks } = req.body;

    // Validate itemStatus
    const validStatuses = ['approved', 'pr_created', 'purchased', 'received', 'in_transit', 'completed'];
    if (!itemStatus || !validStatuses.includes(itemStatus)) {
      return res.status(400).json({ message: 'Invalid item status' });
    }

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Get the current user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is a Program Head OR pending with matching unit
    const isProgramHead = user.role && 
                          user.role !== 'admin' && 
                          user.role !== 'president' && 
                          user.role !== 'Executive' &&
                          user.unit && 
                          user.unit.trim() !== '';
    
    const isPendingWithUnit = user.approvalStatus === 'pending' && 
                              user.unit && 
                              user.unit.trim() !== '';

    // Check if user can update this request
    // For Program Heads: Can update any request from their unit (department account)
    // For other users: Can only update their own requests
    if (isProgramHead || isPendingWithUnit) {
      // For Program Heads: Check if request belongs to their unit
      // Also check by userId from users in the same unit (for backward compatibility)
      const unitUsers = await User.find({ unit: user.unit }).select('_id');
      const unitUserIds = unitUsers.map(u => u._id);
      
      const requestBelongsToUnit = request.unit === user.unit || 
                                   unitUserIds.some(uid => uid.toString() === request.userId.toString());
      
      if (!requestBelongsToUnit) {
        return res.status(403).json({ message: 'You can only update status for requests from your unit' });
      }
    } else {
      // For admin/president: Can only update their own requests
      if (request.userId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'You can only update status for your own requests' });
      }
    }

    // Find the item
    const itemIndex = request.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in request' });
    }

    const item = request.items[itemIndex];

    // Only allow status update if item is approved
    if (item.approvalStatus !== 'approved') {
      return res.status(400).json({ message: 'You can only update status for approved items' });
    }

    // Update item status
    request.items[itemIndex].itemStatus = itemStatus;
    request.items[itemIndex].itemStatusRemarks = remarks || '';
    request.items[itemIndex].itemStatusUpdatedAt = new Date();

    await request.save();

    // Create notification for admin and president
    try {
      const adminUsers = await User.find({ role: 'admin' });
      const presidentUsers = await User.find({ 
        $or: [{ role: 'president' }, { role: 'Executive' }] 
      });
      
      const allRecipients = [...adminUsers, ...presidentUsers];
      
      if (allRecipients.length > 0) {
        const notifications = allRecipients.map(recipient => ({
          userId: recipient._id,
          unit: req.user.unit || null, // Store unit for department account access
          type: 'review_completed',
          title: 'Item Status Updated',
          message: `${req.user.username} (${req.user.unit || 'N/A'}) has updated the status of item "${item.item}" to "${itemStatus}"${remarks ? '. Remarks: ' + remarks : ''}`,
          requestId: request._id,
          itemId: itemId
        }));
        
        await Notification.insertMany(notifications);
      }
    } catch (error) {
      console.error('Error creating notifications for item status update:', error);
      // Don't fail the request if notification creation fails
    }

    await logAuditEvent({
      actor: req.user,
      action: 'item_status_updated',
      description: `Updated status of item "${item.item}" to ${itemStatus}`,
      target: { type: 'request', id: request._id.toString(), name: request.requestTitle },
      metadata: {
        itemId,
        itemName: item.item,
        itemStatus,
        remarks: remarks || ''
      }
    });

    res.json(request);
  } catch (error) {
    console.error('Error updating item status:', error);
    res.status(500).json({ message: 'Error updating item status', error: error.message });
  }
});

module.exports = router;