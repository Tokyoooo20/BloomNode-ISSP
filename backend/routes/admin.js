const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ApprovedItem = require('../models/ApprovedItem');
const PendingItem = require('../models/PendingItem');
const DisapprovedItem = require('../models/DisapprovedItem');
const auth = require('../middleware/auth');
const { logAuditEvent } = require('../utils/auditLogger');
const { syncItemToStatusCollection, syncAllItemsFromRequest } = require('../utils/itemSync');

// GET dashboard statistics (admin only)
router.get('/dashboard/stats', auth, async (req, res) => {
  try {
    const { yearCycle, compareYearCycle } = req.query; // optional: filter stats by year cycle + compare to previous cycle
    // Use the new status collections for accurate counting
    const [totalPendingItems, totalApprovedItems, totalDisapprovedItems] = await Promise.all([
      PendingItem.countDocuments(),
      ApprovedItem.countDocuments(),
      DisapprovedItem.countDocuments()
    ]);
    
    // Total items = sum of all items in status collections
    const totalItems = totalPendingItems + totalApprovedItems + totalDisapprovedItems;
    
    const defaultYearCycle = '2024-2026';
    const effectiveYearCycle = (yearCycle && String(yearCycle).trim()) || defaultYearCycle;
    
    // Get all approved items for the selected year cycle (for Approve vs Reject vs Pending chart)
    const approvedItemsForYear = await ApprovedItem.find({ year: effectiveYearCycle });
    
    // Group approved items by unit+campus to count unique approved units
    const approvedUnits = new Set();
    approvedItemsForYear.forEach(item => {
      const unit = (item.unit && item.unit.trim()) ? item.unit.trim() : 'Unknown Unit';
      const campus = (item.campus && item.campus.trim()) ? item.campus.trim() : 'Main';
      const unitKey = `${unit}|||${campus}`;
      approvedUnits.add(unitKey);
    });
    
    const approvedRequestsCount = approvedUnits.size; // Count unique approved units
    
    // Get all requests (then filter by year cycle when computing chart stats)
    const allRequests = await Request.find();
    const normalizeCycle = (v) => (v && String(v).trim()) || '';
    const requestsForYearCycle = normalizeCycle(yearCycle)
      ? allRequests.filter((r) => (r.year || '').trim() === normalizeCycle(yearCycle))
      : allRequests;
    const requestsForCompareCycle = normalizeCycle(compareYearCycle)
      ? allRequests.filter((r) => (r.year || '').trim() === normalizeCycle(compareYearCycle))
      : [];
    
    // Keep request counts for backward compatibility (but these won't be used in Reports Management)
    const totalRequests = allRequests.length;
    const pendingRequests = allRequests.filter(r => r.status === 'pending').length;
    const submittedRequests = allRequests.filter(r => r.status === 'submitted').length;
    const approvedRequests = allRequests.filter(r => r.status === 'approved').length;
    const rejectedRequests = allRequests.filter(r => 
      r.status === 'rejected' || 
      r.status === 'resubmitted' || 
      r.revisionStatus === 'resubmitted'
    ).length;
    
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
      
      // Count resubmitted requests as rejected for statistics
      if (request.status === 'resubmitted' || request.revisionStatus === 'resubmitted') {
        yearRangeStats[yearRange].rejected++;
      } else if (request.status === 'rejected') {
        yearRangeStats[yearRange].rejected++;
      } else if (['pending', 'submitted', 'approved'].includes(request.status)) {
        yearRangeStats[yearRange][request.status]++;
      }
      
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
    
    // Calculate approval/reject/pending by year cycle: use requestsForYearCycle for rejected and pending
    const rejectedUnits = new Set();
    requestsForYearCycle.forEach(request => {
      if (request.status === 'rejected' || 
          request.status === 'resubmitted' || 
          request.revisionStatus === 'resubmitted') {
        const unit = (request.unit && request.unit.trim()) 
          ? request.unit.trim() 
          : (request.userId?.unit && request.userId.unit.trim()) 
            ? request.userId.unit.trim() 
            : 'Unknown Unit';
        const campus = (request.campus && request.campus.trim()) 
          ? request.campus.trim() 
          : (request.userId?.campus && request.userId.campus.trim()) 
            ? request.userId.campus.trim() 
            : 'Main';
        const unitKey = `${unit}|||${campus}`;
        rejectedUnits.add(unitKey);
      }
    });
    
    const rejectedRequestsCount = rejectedUnits.size; // Count unique rejected units
    // Pending units = unique units that are not yet reviewed (not approved/rejected/resubmitted)
    const pendingUnits = new Set();
    requestsForYearCycle.forEach(request => {
      const isReviewed = request.status === 'approved' ||
        request.status === 'rejected' ||
        request.status === 'resubmitted' ||
        request.revisionStatus === 'resubmitted';
      if (!isReviewed) {
        const unit = (request.unit && request.unit.trim()) 
          ? request.unit.trim() 
          : (request.userId?.unit && request.userId.unit.trim()) 
            ? request.userId.unit.trim() 
            : 'Unknown Unit';
        const campus = (request.campus && request.campus.trim()) 
          ? request.campus.trim() 
          : (request.userId?.campus && request.userId.campus.trim()) 
            ? request.userId.campus.trim() 
            : 'Main';
        const unitKey = `${unit}|||${campus}`;
        pendingUnits.add(unitKey);
      }
    });
    const pendingUnitsCount = pendingUnits.size;

    const totalReviewed = approvedRequestsCount + rejectedRequestsCount;
    const totalWithPending = totalReviewed + pendingUnitsCount;
    const approvalRate = totalWithPending > 0 
      ? Math.round((approvedRequestsCount / totalWithPending) * 100) 
      : 0;
    const rejectionRate = totalWithPending > 0 
      ? Math.round((rejectedRequestsCount / totalWithPending) * 100) 
      : 0;
    const pendingRate = totalWithPending > 0
      ? Math.max(0, 100 - approvalRate - rejectionRate)
      : 0;

    // Top requested items (by item name), with counts per calendar year in the cycle and a grand total
    const { start: rangeStart, end: rangeEnd } = (() => {
      const s = (effectiveYearCycle && String(effectiveYearCycle).trim()) || '2024-2026';
      const parts = s.split('-').map((p) => parseInt(p, 10));
      if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
        return { start: parts[0], end: parts[1] };
      }
      return { start: 2024, end: 2026 };
    })();
    const yearsInTopItemsRange = [];
    for (let y = rangeStart; y <= rangeEnd; y += 1) {
      yearsInTopItemsRange.push(y);
    }
    if (yearsInTopItemsRange.length === 0) {
      [2024, 2025, 2026].forEach((y) => yearsInTopItemsRange.push(y));
    }

    const itemYearTotals = {};
    const addLine = (row) => {
      const name = (row.item && String(row.item).trim()) || 'Unnamed';
      if (!itemYearTotals[name]) {
        const byYear = {};
        yearsInTopItemsRange.forEach((yy) => {
          byYear[String(yy)] = 0;
        });
        itemYearTotals[name] = { byYear, total: 0 };
      }
      const qBy = row.quantityByYear || {};
      const contrib = {};
      let lineSum = 0;
      yearsInTopItemsRange.forEach((yy) => {
        const yk = String(yy);
        const v = Number(qBy[yk] ?? qBy[yy] ?? 0) || 0;
        contrib[yk] = v;
        lineSum += v;
      });
      if (lineSum === 0) {
        const q = Number(row.quantity) || 0;
        const firstY = String(yearsInTopItemsRange[0]);
        if (q > 0) {
          contrib[firstY] = q;
          lineSum = q;
        } else {
          contrib[firstY] = 1;
          lineSum = 1;
        }
      }
      yearsInTopItemsRange.forEach((yy) => {
        const yk = String(yy);
        const add = Number(contrib[yk]) || 0;
        itemYearTotals[name].byYear[yk] = (itemYearTotals[name].byYear[yk] || 0) + add;
      });
      itemYearTotals[name].total += lineSum;
    };

    requestsForYearCycle.forEach((request) => {
      if (request.items && Array.isArray(request.items)) {
        request.items.forEach((row) => addLine(row));
      }
    });

    const topRequestedItems = Object.entries(itemYearTotals)
      .map(([name, { byYear, total }]) => ({
        name,
        count: total,
        total,
        byYear,
        years: yearsInTopItemsRange.map(String)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Monthly request counts for this cycle vs previous cycle (Jan-Dec)
    const monthlyThisCycle = Array(12).fill(0);
    const monthlyLastCycle = Array(12).fill(0);
    requestsForYearCycle.forEach((reqDoc) => {
      const d = new Date(reqDoc.createdAt || reqDoc.updatedAt || Date.now());
      const m = d.getMonth(); // 0-11
      if (m < 0 || m > 11) return;
      monthlyThisCycle[m] += 1;
    });
    requestsForCompareCycle.forEach((reqDoc) => {
      const d = new Date(reqDoc.createdAt || reqDoc.updatedAt || Date.now());
      const m = d.getMonth(); // 0-11
      if (m < 0 || m > 11) return;
      monthlyLastCycle[m] += 1;
    });
    
    res.json({
      // Item-based counts (for Total, Pending, Submitted) - using new collections
      totalRequests: totalItems, // Total items across all status collections
      pendingRequests: totalPendingItems, // Pending items from pendingitems collection
      submittedRequests: totalApprovedItems, // Approved items (submitted = approved items)
      // Unit-based counts (for Approved, Rejected - matching ISSP.js)
      approvedRequests: approvedRequestsCount, // Approved UNITS (matching ISSP.js: unique units with status === 'approved')
      rejectedRequests: rejectedRequestsCount, // Rejected UNITS
      pendingUnits: pendingUnitsCount, // Pending UNITS (not yet reviewed)
      totalReviewed: totalReviewed, // Total reviewed units
      approvalRate,
      rejectionRate,
      pendingRate,
      // Request-based stats (kept for backward compatibility)
      yearRangeStats,
      approvalsByYear,
      topRequestedItems,
      topRequestedItemsYearColumns: yearsInTopItemsRange.map(String),
      monthlyRequestCounts: {
        thisCycle: effectiveYearCycle,
        lastCycle: normalizeCycle(compareYearCycle) || null,
        thisCycleByMonth: monthlyThisCycle,
        lastCycleByMonth: monthlyLastCycle
      }
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
    const { yearCycle } = req.query;
    const getCampusAbbreviation = (campusValue) => {
      const c = String(campusValue || '').trim().toLowerCase();
      if (!c || c === 'main' || c === 'main campus') return 'MAIN';
      if (c === 'baganga') return 'BGA';
      if (c === 'tarragona') return 'TAR';
      if (c === 'banaybanay' || c === 'banaybanay campus') return 'BAN';
      if (c === 'san isidro') return 'SID';
      if (c === 'president') return '';
      return String(campusValue || '').trim().toUpperCase();
    };
    const resolveDisplayUnit = ({ program, unit, campus }) => {
      const base = String(program || '').trim() || String(unit || '').trim();
      if (!base) return 'Unknown Unit';
      const campusAbbr = getCampusAbbreviation(campus);
      return campusAbbr ? `${campusAbbr} ${base}` : base;
    };
    
    // Get all requests
    const requestQuery = {};
    if (yearCycle && typeof yearCycle === 'string' && yearCycle.trim()) {
      requestQuery.year = yearCycle.trim();
    }
    const allRequests = await Request.find(requestQuery).populate('userId', 'unit program campus');
    
    // Calculate request trends
    const newRequests = allRequests.filter(r => r.status === 'pending').length;
    const pendingReviews = allRequests.filter(r => r.status === 'submitted').length;
    const completed = allRequests.filter(r => ['approved', 'rejected'].includes(r.status)).length;
    const totalRequestsInCycle = allRequests.length;
    // Share of requests in this year cycle that reached a terminal status (admin review done)
    const requestCompletionRate =
      totalRequestsInCycle > 0
        ? Math.round((completed / totalRequestsInCycle) * 100)
        : null;

    // Get all unique units from users - exclude admin, president, and Executive
    // Only show regular unit users (Program heads and regular users)
    const allUsers = await User.find({
      role: { $nin: ['admin', 'president', 'Executive'] }, // Exclude admin, president, and Executive
      approvalStatus: 'approved', // Only show approved users
      unit: { $exists: true, $ne: '' } // Only users with a unit defined
    }, 'unit program campus');
    const allUnitKeys = [
      ...new Set(
        allUsers
          .map((u) => {
            const campus = String(u.campus || '').trim() || 'Main';
            const displayUnit = resolveDisplayUnit({ program: u.program, unit: u.unit, campus });
            return `${displayUnit}|||${campus}`;
          })
          .filter(Boolean)
      )
    ];
    
    // Track unit submission status
    const unitStats = allUnitKeys.map((unitKey) => {
      const [displayUnit, campus] = unitKey.split('|||');
      // Find the most recent request from this display-unit + campus
      const unitRequests = allRequests.filter((r) => {
        const requestCampus = String(r.campus || r.userId?.campus || '').trim() || 'Main';
        const requestDisplayUnit = resolveDisplayUnit({
          program: r.program || r.userId?.program,
          unit: r.unit || r.userId?.unit,
          campus: requestCampus
        });
        return requestDisplayUnit === displayUnit && requestCampus === campus;
      });
      // Prioritize resubmitted requests, then sort by most recent
      const latestRequest = unitRequests.sort((a, b) => {
        const aResubmitted = a.status === 'resubmitted' || a.revisionStatus === 'resubmitted';
        const bResubmitted = b.status === 'resubmitted' || b.revisionStatus === 'resubmitted';
        if (aResubmitted && !bResubmitted) return -1;
        if (!aResubmitted && bResubmitted) return 1;
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      })[0];
      
      return {
        unit: displayUnit,
        campus,
        hasSubmitted: unitRequests.length > 0,
        status: latestRequest ? latestRequest.status : 'not_submitted',
        lastSubmitted: latestRequest ? (latestRequest.revisedAt || latestRequest.updatedAt || latestRequest.createdAt) : null,
        totalRequests: unitRequests.length
      };
    });
    
    // Calculate summary
    const submittedCount = unitStats.filter(u => u.hasSubmitted).length;
    const notSubmittedCount = unitStats.filter(u => !u.hasSubmitted).length;
    const totalUnits = allUnitKeys.length;
    // Share of approved program-head units that have at least one request in the selected year cycle
    const unitSubmissionRate =
      totalUnits > 0 ? Math.round((submittedCount / totalUnits) * 100) : 0;

    res.json({
      yearCycle: yearCycle && typeof yearCycle === 'string' ? yearCycle.trim() : null,
      requestTrends: {
        newRequests,
        pendingReviews,
        completed,
        totalRequestsInCycle,
        unitSubmissionRate,
        requestCompletionRate
      },
      unitTracking: {
        units: unitStats,
        summary: {
          submitted: submittedCount,
          notSubmitted: notSubmittedCount,
          total: allUnitKeys.length
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
    const { yearCycle } = req.query;
    const requestQuery = {
      status: { $in: ['submitted', 'approved', 'rejected', 'resubmitted'] }
    };
    if (yearCycle && typeof yearCycle === 'string' && yearCycle.trim()) {
      requestQuery.year = yearCycle.trim();
    }
    // Get all requests that are submitted, approved, rejected, or resubmitted
    const requests = await Request.find(requestQuery)
    .populate('userId', 'username email unit program campus') // Populate user info including campus + program
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

    // Sync item to appropriate status collection
    await syncItemToStatusCollection(request.items[itemIndex], request);

    // Create notification for the user
    const notificationType = approvalStatus === 'approved' ? 'item_approved' : 'item_disapproved';
    const notificationTitle = approvalStatus === 'approved' 
      ? 'Item Approved' 
      : 'Item Disapproved';
    const notificationMessage = approvalStatus === 'approved'
      ? `Your item "${request.items[itemIndex].item}" in request "${request.requestTitle}" has been approved.`
      : `Your item "${request.items[itemIndex].item}" in request "${request.requestTitle}" has been disapproved. Reason: ${approvalReason}`;

    // Get the unit from the request - ensure userId exists before creating notification
    try {
      if (request.userId) {
        await request.populate('userId', 'unit');
        // Only create notification if userId is valid after population
        if (request.userId && request.userId._id) {
          await Notification.create({
            userId: request.userId._id || request.userId,
            unit: request.unit || (request.userId?.unit) || null, // Store unit for department account access
            type: notificationType,
            title: notificationTitle,
            message: notificationMessage,
            requestId: request._id,
            itemId: itemId
          });
        }
      }
    } catch (notificationError) {
      console.error('Error creating notification (non-fatal):', notificationError);
      // Don't fail the request if notification creation fails
    }

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

    // Emit Socket.io event to notify unit
    try {
      const io = req.app.get('io');
      if (io && request.userId) {
        const userId = request.userId._id || request.userId;
        if (userId) {
          io.emit('item_reviewed', {
            requestId: request._id,
            itemId: itemId,
            itemName: request.items[itemIndex].item,
            approvalStatus: approvalStatus,
            approvalReason: approvalReason,
            requestStatus: request.status,
            unitUserId: userId
          });
        }
      }
    } catch (socketError) {
      console.error('Error emitting Socket.io event:', socketError);
      // Don't fail the request if Socket.io emit fails
    }

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

    // Sync all items to appropriate status collections
    await syncAllItemsFromRequest(request);

    // Create notification for the user
    const notificationType = status === 'approved' ? 'approved' : 'rejected';
    const notificationTitle = status === 'approved' 
      ? 'Request Approved' 
      : 'Request Rejected';
    const notificationMessage = status === 'approved'
      ? `Your request "${request.requestTitle}" has been approved.`
      : `Your request "${request.requestTitle}" has been rejected.${reason ? ' Reason: ' + reason : ''}`;

    // Get the unit from the request - ensure userId exists before creating notification
    try {
      if (request.userId) {
        await request.populate('userId', 'unit');
        // Only create notification if userId is valid after population
        if (request.userId && request.userId._id) {
          await Notification.create({
            userId: request.userId._id || request.userId,
            unit: request.unit || (request.userId?.unit) || null, // Store unit for department account access
            type: notificationType,
            title: notificationTitle,
            message: notificationMessage,
            requestId: request._id
          });
        }
      }
    } catch (notificationError) {
      console.error('Error creating notification (non-fatal):', notificationError);
      // Don't fail the request if notification creation fails
    }

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
// POST - Sync approved items to approveditems collection (ensures items are saved)
router.post('/approved-items/sync', auth, async (req, res) => {
  try {
    const { unitName, year } = req.body;
    
    if (!unitName) {
      return res.status(400).json({ message: 'Unit name is required' });
    }
    
    // Find all requests for this unit
    const User = require('../models/User');
    const users = await User.find({ unit: unitName }, '_id');
    const userIds = users.map(u => u._id);
    
    // Build query for requests
    const requestQuery = {
      userId: { $in: userIds },
      'items.approvalStatus': 'approved' // Only requests with approved items
    };
    
    if (year) {
      requestQuery.year = year;
    }
    
    // Get all requests with approved items
    const requests = await Request.find(requestQuery);
    
    let syncedCount = 0;
    
    // Sync all approved items from these requests to approveditems collection
    for (const request of requests) {
      if (request.items && Array.isArray(request.items)) {
        for (const item of request.items) {
          if (item.approvalStatus === 'approved' && item.item && item.item.trim() !== '') {
            await syncItemToStatusCollection(item, request);
            syncedCount++;
          }
        }
      }
    }
    
    res.json({ 
      message: `Synced ${syncedCount} approved items to approveditems collection`,
      syncedCount 
    });
  } catch (error) {
    console.error('Error syncing approved items:', error);
    res.status(500).json({ message: 'Error syncing approved items', error: error.message });
  }
});

// GET - Get approved items for a specific unit (using approveditems collection)
router.get('/approved-items/unit/:unitName', auth, async (req, res) => {
  try {
    const { unitName } = req.params;
    const { year } = req.query; // Optional year filter
    
    // First, ensure all approved items are synced to approveditems collection
    try {
      const User = require('../models/User');
      const users = await User.find({ unit: unitName }, '_id');
      const userIds = users.map(u => u._id);
      
      const requestQuery = {
        userId: { $in: userIds },
        'items.approvalStatus': 'approved'
      };
      
      if (year) {
        requestQuery.year = year;
      }
      
      const requests = await Request.find(requestQuery);
      
      // Sync all approved items to approveditems collection
      for (const request of requests) {
        if (request.items && Array.isArray(request.items)) {
          for (const item of request.items) {
            if (item.approvalStatus === 'approved' && item.item && item.item.trim() !== '') {
              await syncItemToStatusCollection(item, request);
            }
          }
        }
      }
    } catch (syncError) {
      console.warn('Error syncing items (non-fatal):', syncError);
      // Continue even if sync fails
    }
    
    // Build query
    const query = { unit: unitName };
    if (year) {
      query.year = year;
    }
    
    // Get approved items directly from approveditems collection
    const approvedItems = await ApprovedItem.find(query)
      .populate('userId', 'username email unit campus')
      .populate('requestId', 'requestTitle status createdAt updatedAt')
      .sort({ approvedAt: -1 });
    
    // Format items to match expected structure
    const formattedItems = approvedItems.map(item => ({
      ...item.toObject(),
      id: item.itemId,
      requestId: item.requestId._id.toString(),
      requestTitle: item.requestId?.requestTitle || item.requestTitle,
      requestYear: item.year,
      requestStatus: item.requestId?.status || 'approved',
      requestCreatedAt: item.requestId?.createdAt || item.createdAt,
      requestUpdatedAt: item.requestId?.updatedAt || item.updatedAt,
      userId: item.userId
    }));
    
    res.json({ items: formattedItems });
  } catch (error) {
    console.error('Error fetching approved items for unit:', error);
    res.status(500).json({ message: 'Error fetching approved items', error: error.message });
  }
});

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
    
    // Sync price update to approveditems collection if item is approved
    if (request.items[itemIndex].approvalStatus === 'approved') {
      await syncItemToStatusCollection(request.items[itemIndex], request);
    }
    
    // Create notification for the unit user
    try {
      await request.populate('userId', 'unit');
      await Notification.create({
        userId: request.userId,
        unit: request.unit || (request.userId?.unit) || null,
        type: 'item_updated',
        title: 'Item Updated',
        message: `The price for item "${itemName}" in your request "${request.requestTitle}" has been updated from ₱${oldPrice.toLocaleString()} to ₱${priceNum.toLocaleString()}.`,
        requestId: request._id,
        itemId: itemId
      });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the request if notification creation fails
    }
    
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

    // Emit Socket.io event to notify unit
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('item_updated', {
          requestId: request._id,
          itemId: itemId,
          itemName: itemName,
          updateType: 'price',
          oldValue: oldPrice,
          newValue: priceNum,
          unitUserId: request.userId._id || request.userId
        });
      }
    } catch (socketError) {
      console.error('Error emitting Socket.io event:', socketError);
      // Don't fail the request if Socket.io emit fails
    }
    
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
    const { quantity, quantityByYear } = req.body;
    
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
    
    // Update quantityByYear if provided
    if (quantityByYear !== undefined && quantityByYear !== null) {
      request.items[itemIndex].quantityByYear = quantityByYear;
    }
    
    await request.save();
    
    // Sync quantity update to approveditems collection if item is approved
    if (request.items[itemIndex].approvalStatus === 'approved') {
      await syncItemToStatusCollection(request.items[itemIndex], request);
    }
    
    // Create notification for the unit user
    try {
      await request.populate('userId', 'unit');
      await Notification.create({
        userId: request.userId,
        unit: request.unit || (request.userId?.unit) || null,
        type: 'item_updated',
        title: 'Item Updated',
        message: `The quantity for item "${itemName}" in your request "${request.requestTitle}" has been updated from ${oldQuantity} to ${quantityNum}.`,
        requestId: request._id,
        itemId: itemId
      });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the request if notification creation fails
    }
    
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

    // Emit Socket.io event to notify unit
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('item_updated', {
          requestId: request._id,
          itemId: itemId,
          itemName: itemName,
          updateType: 'quantity',
          oldValue: oldQuantity,
          newValue: quantityNum,
          unitUserId: request.userId._id || request.userId
        });
      }
    } catch (socketError) {
      console.error('Error emitting Socket.io event:', socketError);
      // Don't fail the request if Socket.io emit fails
    }
    
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
    
    // Sync specification update to approveditems collection if item is approved
    if (request.items[itemIndex].approvalStatus === 'approved') {
      await syncItemToStatusCollection(request.items[itemIndex], request);
    }
    
    // Create notification for the unit user
    try {
      await request.populate('userId', 'unit');
      await Notification.create({
        userId: request.userId,
        unit: request.unit || (request.userId?.unit) || null,
        type: 'item_updated',
        title: 'Item Updated',
        message: `The specification for item "${itemName}" in your request "${request.requestTitle}" has been updated by the administrator.`,
        requestId: request._id,
        itemId: itemId
      });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the request if notification creation fails
    }
    
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

    // Emit Socket.io event to notify unit
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('item_updated', {
          requestId: request._id,
          itemId: itemId,
          itemName: itemName,
          updateType: 'specification',
          unitUserId: request.userId._id || request.userId
        });
      }
    } catch (socketError) {
      console.error('Error emitting Socket.io event:', socketError);
      // Don't fail the request if Socket.io emit fails
    }
    
    res.json({ item: request.items[itemIndex], request });
  } catch (error) {
    console.error('Error updating item specification:', error);
    res.status(500).json({ message: 'Error updating item specification', error: error.message });
  }
});

// PUT - Update item details (item name, purpose, range) (admin only)
router.put('/requests/:requestId/items/:itemId/details', auth, async (req, res) => {
  try {
    const { requestId, itemId } = req.params;
    const { item, purpose, range } = req.body;
    
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
    
    // Capture old values before updating
    const oldItemName = request.items[itemIndex].item;
    const oldPurpose = request.items[itemIndex].purpose || '';
    const oldRange = request.items[itemIndex].range || 'mid';
    
    // Update the item's details
    const updatedFields = [];
    if (item !== undefined && item !== null) {
      request.items[itemIndex].item = item;
      if (item !== oldItemName) {
        updatedFields.push(`name from "${oldItemName}" to "${item}"`);
      }
    }
    if (purpose !== undefined && purpose !== null) {
      request.items[itemIndex].purpose = purpose;
      updatedFields.push('purpose');
    }
    if (range !== undefined && range !== null) {
      request.items[itemIndex].range = range;
      updatedFields.push(`range to ${range.toUpperCase()}`);
    }
    
    await request.save();
    
    // Create notification for the unit user
    try {
      await request.populate('userId', 'unit');
      const itemNameDisplay = item !== undefined ? item : oldItemName;
      
      // Build a more descriptive message
      const changes = [];
      if (item !== undefined && item !== null && item !== oldItemName) {
        changes.push(`name changed from "${oldItemName}" to "${item}"`);
      }
      if (purpose !== undefined && purpose !== null && purpose !== oldPurpose) {
        changes.push('purpose updated');
      }
      if (range !== undefined && range !== null && range !== oldRange) {
        changes.push(`range changed to ${range.toUpperCase()}`);
      }
      
      const updateMessage = changes.length > 0
        ? `The ${changes.join(', ')} for item "${itemNameDisplay}" in your request "${request.requestTitle}" has been updated by the administrator.`
        : `Item "${itemNameDisplay}" in your request "${request.requestTitle}" has been updated by the administrator.`;
      
      await Notification.create({
        userId: request.userId,
        unit: request.unit || (request.userId?.unit) || null,
        type: 'item_updated',
        title: 'Item Updated',
        message: updateMessage,
        requestId: request._id,
        itemId: itemId
      });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the request if notification creation fails
    }
    
    await logAuditEvent({
      actor: req.user,
      action: 'item_details_updated',
      description: `Updated details for item "${oldItemName}"`,
      target: { type: 'request', id: request._id.toString(), name: request.requestTitle },
      metadata: {
        itemId,
        itemName: item !== undefined ? item : oldItemName,
        oldItemName,
        oldPurpose,
        oldRange,
        newPurpose: purpose !== undefined ? purpose : oldPurpose,
        newRange: range !== undefined ? range : oldRange
      }
    });

    // Emit Socket.io event to notify unit
    try {
      const io = req.app.get('io');
      if (io) {
        const itemNameDisplay = item !== undefined ? item : oldItemName;
        io.emit('item_updated', {
          requestId: request._id,
          itemId: itemId,
          itemName: itemNameDisplay,
          updateType: 'details',
          updatedFields: updatedFields,
          unitUserId: request.userId._id || request.userId
        });
      }
    } catch (socketError) {
      console.error('Error emitting Socket.io event:', socketError);
      // Don't fail the request if Socket.io emit fails
    }
    
    res.json({ item: request.items[itemIndex], request });
  } catch (error) {
    console.error('Error updating item details:', error);
    res.status(500).json({ message: 'Error updating item details', error: error.message });
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

