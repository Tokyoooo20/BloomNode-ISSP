const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { logAuditEvent } = require('../utils/auditLogger');

// GET dashboard statistics (admin only)
router.get('/dashboard/stats', auth, async (req, res) => {
  try {
    // Get all requests
    const allRequests = await Request.find();
    
    // Total requests
    const totalRequests = allRequests.length;
    
    // Requests by status
    const pendingRequests = allRequests.filter(r => r.status === 'pending').length;
    const submittedRequests = allRequests.filter(r => r.status === 'submitted').length;
    const approvedRequests = allRequests.filter(r => r.status === 'approved').length;
    const rejectedRequests = allRequests.filter(r => r.status === 'rejected').length;
    
    // Group by year range and track approvals by actual calendar year
    const yearRangeStats = {};
    const approvalsByYear = {}; // Track approved requests by calendar year
    
    allRequests.forEach(request => {
      const yearRange = request.year || '2024-2027';
      
      // Initialize year range stats
      if (!yearRangeStats[yearRange]) {
        yearRangeStats[yearRange] = {
          total: 0,
          pending: 0,
          submitted: 0,
          approved: 0,
          rejected: 0,
          yearlyApprovals: {} // Track approvals per individual year
        };
      }
      
      yearRangeStats[yearRange].total++;
      yearRangeStats[yearRange][request.status]++;
      
      // Track approved requests by calendar year (from createdAt or updatedAt)
      if (request.status === 'approved') {
        const approvalDate = request.updatedAt || request.createdAt;
        const approvalYear = new Date(approvalDate).getFullYear();
        
        // Add to global approvals by year
        if (!approvalsByYear[approvalYear]) {
          approvalsByYear[approvalYear] = 0;
        }
        approvalsByYear[approvalYear]++;
        
        // Add to year range's yearly approvals
        if (!yearRangeStats[yearRange].yearlyApprovals[approvalYear]) {
          yearRangeStats[yearRange].yearlyApprovals[approvalYear] = 0;
        }
        yearRangeStats[yearRange].yearlyApprovals[approvalYear]++;
      }
    });
    
    // Format yearRangeStats to include years array with actual approval data
    Object.keys(yearRangeStats).forEach(yearRange => {
      const [startYear, endYear] = yearRange.split('-').map(Number);
      const years = [];
      
      for (let year = startYear; year <= endYear; year++) {
        const approvedCount = yearRangeStats[yearRange].yearlyApprovals[year] || 0;
        const percentage = yearRangeStats[yearRange].approved > 0 
          ? Math.round((approvedCount / yearRangeStats[yearRange].approved) * 100) 
          : 0;
        
        years.push({
          year: year.toString(),
          value: approvedCount,
          percentage: percentage
        });
      }
      
      yearRangeStats[yearRange].years = years;
    });
    
    // Calculate approval rate
    const totalReviewed = approvedRequests + rejectedRequests;
    const approvalRate = totalReviewed > 0 
      ? Math.round((approvedRequests / totalReviewed) * 100) 
      : 0;
    const rejectionRate = totalReviewed > 0 
      ? Math.round((rejectedRequests / totalReviewed) * 100) 
      : 0;
    
    res.json({
      totalRequests,
      pendingRequests,
      submittedRequests,
      approvedRequests,
      rejectedRequests,
      yearRangeStats,
      approvalsByYear,
      approvalRate,
      rejectionRate,
      totalReviewed
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats', error: error.message });
  }
});

// GET office statistics (admin only)
router.get('/office/stats', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Get all requests
    const allRequests = await Request.find().populate('userId', 'unit');
    
    // Calculate request trends
    const newRequests = allRequests.filter(r => r.status === 'pending').length;
    const pendingReviews = allRequests.filter(r => r.status === 'submitted').length;
    const completed = allRequests.filter(r => ['approved', 'rejected'].includes(r.status)).length;
    
    // Calculate completion rate for current month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentMonthRequests = allRequests.filter(r => {
      const requestDate = new Date(r.createdAt);
      return requestDate.getMonth() === currentMonth && requestDate.getFullYear() === currentYear;
    });
    const currentMonthCompleted = currentMonthRequests.filter(r => ['approved', 'rejected'].includes(r.status)).length;
    const completionRate = currentMonthRequests.length > 0 
      ? Math.round((currentMonthCompleted / currentMonthRequests.length) * 100)
      : 0;
    
    // Get all unique units from users - exclude admin, president, and Executive
    // Only show regular unit users (Program heads and regular users)
    const allUsers = await User.find({ 
      role: { $nin: ['admin', 'president', 'Executive'] }, // Exclude admin, president, and Executive
      approvalStatus: 'approved', // Only show approved users
      unit: { $exists: true, $ne: '' } // Only users with a unit defined
    }, 'unit');
    const allUnits = [...new Set(allUsers.map(u => u.unit).filter(Boolean))];
    
    // Track unit submission status
    const unitStats = allUnits.map(unit => {
      // Find the most recent request from this unit
      const unitRequests = allRequests.filter(r => r.userId?.unit === unit);
      // Prioritize resubmitted requests, then sort by most recent
      const latestRequest = unitRequests.sort((a, b) => {
        const aResubmitted = a.status === 'resubmitted' || a.revisionStatus === 'resubmitted';
        const bResubmitted = b.status === 'resubmitted' || b.revisionStatus === 'resubmitted';
        if (aResubmitted && !bResubmitted) return -1;
        if (!aResubmitted && bResubmitted) return 1;
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      })[0];
      
      return {
        unit: unit,
        hasSubmitted: unitRequests.length > 0,
        status: latestRequest ? latestRequest.status : 'not_submitted',
        lastSubmitted: latestRequest ? (latestRequest.revisedAt || latestRequest.updatedAt || latestRequest.createdAt) : null,
        totalRequests: unitRequests.length
      };
    });
    
    // Calculate summary
    const submittedCount = unitStats.filter(u => u.hasSubmitted).length;
    const notSubmittedCount = unitStats.filter(u => !u.hasSubmitted).length;
    
    res.json({
      requestTrends: {
        newRequests,
        pendingReviews,
        completed,
        completionRate
      },
      unitTracking: {
        units: unitStats,
        summary: {
          submitted: submittedCount,
          notSubmitted: notSubmittedCount,
          total: allUnits.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching office stats:', error);
    res.status(500).json({ message: 'Error fetching office stats', error: error.message });
  }
});

// GET all submitted requests (admin only)
router.get('/submitted-requests', auth, async (req, res) => {
  try {
    // Get all requests that are submitted, approved, rejected, or resubmitted
    const requests = await Request.find({
      status: { $in: ['submitted', 'approved', 'rejected', 'resubmitted'] }
    })
    .populate('userId', 'username email unit campus') // Populate user info including campus
    .sort({ createdAt: -1 });

    console.log(`Admin fetched ${requests.length} submitted requests`);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching submitted requests:', error);
    res.status(500).json({ message: 'Error fetching submitted requests', error: error.message });
  }
});

// GET single request by ID (admin only)
router.get('/requests/:id', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('userId', 'username email unit');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json(request);
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ message: 'Error fetching request', error: error.message });
  }
});

// PUT - Review (approve/disapprove) a specific item in a request
router.put('/requests/:requestId/items/:itemId/review', auth, async (req, res) => {
  try {
    const { requestId, itemId } = req.params;
    const { approvalStatus, approvalReason } = req.body;

    // Validate approval status
    if (!['approved', 'disapproved'].includes(approvalStatus)) {
      return res.status(400).json({ message: 'Invalid approval status' });
    }

    if (!approvalReason || approvalReason.trim() === '') {
      return res.status(400).json({ message: 'Approval reason is required' });
    }

    // Find the request
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Find the item in the request
    const itemIndex = request.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in request' });
    }

    // Update the item's approval status and reason
    request.items[itemIndex].approvalStatus = approvalStatus;
    request.items[itemIndex].approvalReason = approvalReason;
    // Ensure itemStatus is not set to null (only set if it has a value)
    if (request.items[itemIndex].itemStatus === null) {
      delete request.items[itemIndex].itemStatus;
    }

    // Check if all items have been reviewed
    const allItemsReviewed = request.items.every(
      item => item.approvalStatus !== 'pending'
    );

    // If all items reviewed, update request status
    if (allItemsReviewed) {
      // Check if all items are approved
      const allApproved = request.items.every(
        item => item.approvalStatus === 'approved'
      );

      // If ALL items are approved -> APPROVED
      // If ANY item is disapproved -> REJECTED
      if (allApproved) {
        request.status = 'approved';
      } else {
        request.status = 'rejected';
      }
    }

    await request.save();

    // Create notification for the user
    const notificationType = approvalStatus === 'approved' ? 'item_approved' : 'item_disapproved';
    const notificationTitle = approvalStatus === 'approved' 
      ? 'Item Approved' 
      : 'Item Disapproved';
    const notificationMessage = approvalStatus === 'approved'
      ? `Your item "${request.items[itemIndex].item}" in request "${request.requestTitle}" has been approved.`
      : `Your item "${request.items[itemIndex].item}" in request "${request.requestTitle}" has been disapproved. Reason: ${approvalReason}`;

    // Get the unit from the request
    await request.populate('userId', 'unit');
    await Notification.create({
      userId: request.userId,
      unit: request.unit || (request.userId?.unit) || null, // Store unit for department account access
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      requestId: request._id,
      itemId: itemId
    });

    await logAuditEvent({
      actor: req.user,
      action: 'request_item_reviewed',
      description: `${approvalStatus === 'approved' ? 'Approved' : 'Disapproved'} item "${request.items[itemIndex].item}" in request "${request.requestTitle}"`,
      target: { type: 'request', id: request._id.toString(), name: request.requestTitle },
      metadata: {
        itemId,
        approvalStatus,
        approvalReason,
        requestStatus: request.status
      }
    });

    console.log(`Item ${itemId} in request ${requestId} ${approvalStatus}`);
    res.json(request);
  } catch (error) {
    console.error('Error reviewing item:', error);
    res.status(500).json({ message: 'Error reviewing item', error: error.message });
  }
});

// PUT - Approve/Reject entire request
router.put('/requests/:id/status', auth, async (req, res) => {
  try {
    const { status, reason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Update request status
    request.status = status;

    // Update all items with the same status and reason
    request.items.forEach(item => {
      item.approvalStatus = status === 'approved' ? 'approved' : 'disapproved';
      item.approvalReason = reason || `Request ${status}`;
      // Ensure itemStatus is not set to null (only set if it has a value)
      if (item.itemStatus === null) {
        delete item.itemStatus;
      }
    });

    await request.save();

    // Create notification for the user
    const notificationType = status === 'approved' ? 'approved' : 'rejected';
    const notificationTitle = status === 'approved' 
      ? 'Request Approved' 
      : 'Request Rejected';
    const notificationMessage = status === 'approved'
      ? `Your request "${request.requestTitle}" has been approved.`
      : `Your request "${request.requestTitle}" has been rejected.${reason ? ' Reason: ' + reason : ''}`;

    // Get the unit from the request
    await request.populate('userId', 'unit');
    await Notification.create({
      userId: request.userId,
      unit: request.unit || (request.userId?.unit) || null, // Store unit for department account access
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      requestId: request._id
    });

    await logAuditEvent({
      actor: req.user,
      action: 'request_status_changed',
      description: `Marked request "${request.requestTitle}" as ${status}`,
      target: { type: 'request', id: request._id.toString(), name: request.requestTitle },
      metadata: {
        status,
        reason
      }
    });

    console.log(`Request ${req.params.id} ${status}`);
    res.json(request);
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ message: 'Error updating request status' });
  }
});

// PUT - Complete review (mark as reviewed/done)
router.put('/requests/:id/complete-review', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if all items have been reviewed
    const allItemsReviewed = request.items.every(
      item => item.approvalStatus !== 'pending'
    );

    if (!allItemsReviewed) {
      return res.status(400).json({ message: 'All items must be reviewed before completing' });
    }

    // Update request status based on item reviews
    // If ALL items are approved -> APPROVED
    // If ANY item is disapproved -> REJECTED
    const allApproved = request.items.every(
      item => item.approvalStatus === 'approved'
    );

    if (allApproved) {
      request.status = 'approved';
    } else {
      request.status = 'rejected';
    }

    await request.save();

    // Create notification for the user
    const notificationType = request.status === 'approved' ? 'approved' : 'rejected';
    const notificationTitle = request.status === 'approved' 
      ? 'Request Approved' 
      : 'Request Rejected';
    const notificationMessage = request.status === 'approved'
      ? `Your request "${request.requestTitle}" has been fully approved. All items have been reviewed and approved.`
      : `Your request "${request.requestTitle}" has been rejected. Some items were disapproved during review.`;

    await Notification.create({
      userId: request.userId,
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      requestId: request._id
    });

    await logAuditEvent({
      actor: req.user,
      action: 'request_review_completed',
      description: `Completed review for request "${request.requestTitle}" with final status ${request.status}`,
      target: { type: 'request', id: request._id.toString(), name: request.requestTitle },
      metadata: {
        status: request.status
      }
    });

    console.log(`Review completed for request ${req.params.id} - Status: ${request.status}`);
    res.json(request);
  } catch (error) {
    console.error('Error completing review:', error);
    res.status(500).json({ message: 'Error completing review', error: error.message });
  }
});

// GET approved requests by unit (admin only)
router.get('/requests/unit/:unitName', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const { unitName } = req.params;
    
    // Find users with this unit
    const users = await User.find({ unit: unitName }, '_id');
    const userIds = users.map(u => u._id);
    
    // Get approved requests for these users
    const requests = await Request.find({
      userId: { $in: userIds },
      status: 'approved'
    })
    .populate('userId', 'username email unit')
    .sort({ createdAt: -1 });
    
    // Extract all approved items from all requests
    const allItems = [];
    requests.forEach(request => {
      request.items.forEach(item => {
        if (item.approvalStatus === 'approved') {
          allItems.push({
            ...item.toObject(),
            requestId: request._id.toString(),
            requestTitle: request.requestTitle,
            requestYear: request.year,
            userId: request.userId
          });
        }
      });
    });
    
    res.json({ items: allItems, requests });
  } catch (error) {
    console.error('Error fetching unit requests:', error);
    res.status(500).json({ message: 'Error fetching unit requests', error: error.message });
  }
});

// PUT - Update item price (admin only)
router.put('/requests/:requestId/items/:itemId/price', auth, async (req, res) => {
  try {
    const { requestId, itemId } = req.params;
    const { price } = req.body;
    
    if (price === undefined || price === null) {
      return res.status(400).json({ message: 'Price is required' });
    }
    
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ message: 'Price must be a valid positive number' });
    }
    
    // Find the request
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Find the item in the request
    const itemIndex = request.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in request' });
    }
    
    // Capture old price before updating
    const oldPrice = request.items[itemIndex].price || 0;
    const itemName = request.items[itemIndex].item;
    
    // Update the item's price
    request.items[itemIndex].price = priceNum;
    await request.save();
    
    await logAuditEvent({
      actor: req.user,
      action: 'item_price_updated',
      description: `Updated price for item "${itemName}" from ${oldPrice} to ${priceNum}`,
      target: { type: 'request', id: request._id.toString(), name: request.requestTitle },
      metadata: {
        itemId,
        itemName,
        oldPrice,
        newPrice: priceNum
      }
    });
    
    res.json({ item: request.items[itemIndex], request });
  } catch (error) {
    console.error('Error updating item price:', error);
    res.status(500).json({ message: 'Error updating item price', error: error.message });
  }
});

// PUT - Update item quantity (admin only)
router.put('/requests/:requestId/items/:itemId/quantity', auth, async (req, res) => {
  try {
    const { requestId, itemId } = req.params;
    const { quantity } = req.body;
    
    if (quantity === undefined || quantity === null) {
      return res.status(400).json({ message: 'Quantity is required' });
    }
    
    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum < 0) {
      return res.status(400).json({ message: 'Quantity must be a valid positive number' });
    }
    
    // Find the request
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Find the item in the request
    const itemIndex = request.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in request' });
    }
    
    // Capture old quantity before updating
    const oldQuantity = request.items[itemIndex].quantity || 0;
    const itemName = request.items[itemIndex].item;
    
    // Update the item's quantity
    request.items[itemIndex].quantity = quantityNum;
    await request.save();
    
    await logAuditEvent({
      actor: req.user,
      action: 'item_quantity_updated',
      description: `Updated quantity for item "${itemName}" from ${oldQuantity} to ${quantityNum}`,
      target: { type: 'request', id: request._id.toString(), name: request.requestTitle },
      metadata: {
        itemId,
        itemName,
        oldQuantity,
        newQuantity: quantityNum
      }
    });
    
    res.json({ item: request.items[itemIndex], request });
  } catch (error) {
    console.error('Error updating item quantity:', error);
    res.status(500).json({ message: 'Error updating item quantity', error: error.message });
  }
});

// PUT - Update item specification (admin only)
router.put('/requests/:requestId/items/:itemId/specification', auth, async (req, res) => {
  try {
    const { requestId, itemId } = req.params;
    const { specification } = req.body;
    
    if (specification === undefined || specification === null) {
      return res.status(400).json({ message: 'Specification is required' });
    }
    
    // Find the request
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Find the item in the request
    const itemIndex = request.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in request' });
    }
    
    // Capture old specification before updating
    const oldSpecification = request.items[itemIndex].specification || '';
    const itemName = request.items[itemIndex].item;
    
    // Update the item's specification
    request.items[itemIndex].specification = specification;
    await request.save();
    
    await logAuditEvent({
      actor: req.user,
      action: 'item_specification_updated',
      description: `Updated specification for item "${itemName}"`,
      target: { type: 'request', id: request._id.toString(), name: request.requestTitle },
      metadata: {
        itemId,
        itemName,
        oldSpecification,
        newSpecification: specification
      }
    });
    
    res.json({ item: request.items[itemIndex], request });
  } catch (error) {
    console.error('Error updating item specification:', error);
    res.status(500).json({ message: 'Error updating item specification', error: error.message });
  }
});

// DELETE - Delete an item from a request (admin only)
router.delete('/requests/:requestId/items/:itemId', auth, async (req, res) => {
  try {
    console.log('DELETE item route hit:', req.params);
    
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can delete items' });
    }

    const { requestId, itemId } = req.params;
    console.log('Deleting item:', { requestId, itemId });

    // Find the request
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Find the item in the request - try both string and strict comparison
    const itemIndex = request.items.findIndex(item => {
      // Try both string comparison and direct comparison
      return String(item.id) === String(itemId) || item.id === itemId;
    });
    
    if (itemIndex === -1) {
      // Log for debugging
      console.log('Item not found. Looking for itemId:', itemId);
      console.log('Available item IDs:', request.items.map(item => item.id));
      return res.status(404).json({ 
        message: 'Item not found in request',
        debug: {
          searchedItemId: itemId,
          availableItemIds: request.items.map(item => item.id)
        }
      });
    }

    const itemName = request.items[itemIndex].item;
    const itemQuantity = request.items[itemIndex].quantity;

    // Remove the item from the array
    request.items.splice(itemIndex, 1);

    // If no items remain, you might want to handle this case
    // For now, we'll just save the request with the remaining items
    await request.save();

    // Create notification for the unit user
    try {
      await Notification.create({
        userId: request.userId,
        type: 'rejected',
        title: 'Item Deleted',
        message: `Item "${itemName}" (Quantity: ${itemQuantity}) has been deleted from your request "${request.requestTitle}" by the administrator.`,
        requestId: request._id
      });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the request if notification creation fails
    }

    // Log audit event
    await logAuditEvent({
      actor: req.user,
      action: 'item_deleted',
      description: `Deleted item "${itemName}" (Quantity: ${itemQuantity}) from request "${request.requestTitle}"`,
      target: { type: 'request', id: request._id.toString(), name: request.requestTitle },
      metadata: {
        itemId,
        itemName,
        itemQuantity
      }
    });

    res.json({ 
      message: 'Item deleted successfully',
      request: request
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Error deleting item', error: error.message });
  }
});

// PUT - Update DICT approval status for Request (Admin only)
router.put('/requests/:requestId/dict-approval', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can update DICT approval status' });
    }

    const { requestId } = req.params;
    const { status, notes } = req.body;

    // Validate status
    const validStatuses = ['pending', 'approve_for_dict', 'collation_compilation', 'revision_from_dict', 'approved_by_dict'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid DICT approval status' });
    }

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const oldStatus = request.dictApproval?.status || 'pending';

    // Update DICT approval status
    if (!request.dictApproval) {
      request.dictApproval = {};
    }
    request.dictApproval.status = status;
    request.dictApproval.updatedAt = new Date();
    request.dictApproval.updatedBy = req.user.id;
    request.dictApproval.notes = notes || '';

    await request.save();
    await request.populate('userId', 'username email unit');
    await request.populate('dictApproval.updatedBy', 'username email');

    // Create notification for the unit user
    const statusLabels = {
      'pending': 'Pending',
      'approve_for_dict': 'Approve for DICT',
      'collation_compilation': 'Collation/Compilation',
      'revision_from_dict': 'Revision from DICT',
      'approved_by_dict': 'Approved by DICT'
    };

    const notificationMessage = `Your request "${request.requestTitle}" DICT approval status has been updated to: ${statusLabels[status]}.${notes ? ' Notes: ' + notes : ''}`;

    await Notification.create({
      userId: request.userId._id,
      type: 'dict_status_updated',
      title: 'DICT Approval Status Updated',
      message: notificationMessage,
      requestId: request._id
    });

    // Log audit event
    await logAuditEvent({
      actor: req.user,
      action: 'dict_approval_updated',
      description: `Updated request DICT approval status from "${oldStatus}" to "${status}"`,
      target: { type: 'request', id: request._id.toString(), name: request.requestTitle },
      metadata: {
        oldStatus,
        newStatus: status,
        notes
      }
    });

    res.json({
      message: 'DICT approval status updated successfully',
      request: request
    });
  } catch (error) {
    console.error('Error updating DICT approval status:', error);
    res.status(500).json({ message: error.message || 'Failed to update DICT approval status' });
  }
});

module.exports = router;

