const ApprovedItem = require('../models/ApprovedItem');
const PendingItem = require('../models/PendingItem');
const DisapprovedItem = require('../models/DisapprovedItem');

/**
 * Sync an item to the appropriate status collection based on its approvalStatus
 * @param {Object} item - The item object from request.items array
 * @param {Object} request - The request document
 */
const syncItemToStatusCollection = async (item, request) => {
  if (!item || !item.item || item.item.trim() === '') {
    return; // Skip empty items
  }

  const itemData = {
    itemId: item.id || String(item._id) || String(new Date().getTime()),
    item: item.item,
    quantity: item.quantity || 0,
    quantityByYear: item.quantityByYear || {},
    price: item.price || 0,
    range: item.range || 'mid',
    specification: item.specification || '',
    purpose: item.purpose || '',
    approvalStatus: item.approvalStatus || 'pending',
    approvalReason: item.approvalReason || '',
    requestId: request._id,
    userId: request.userId,
    unit: request.unit || '',
    campus: request.campus || '',
    year: request.year || '',
    requestTitle: request.requestTitle || '',
    priority: request.priority || 'medium'
  };

  // Add itemStatus fields for approved items
  if (item.approvalStatus === 'approved') {
    itemData.itemStatus = item.itemStatus;
    itemData.itemStatusRemarks = item.itemStatusRemarks || '';
    itemData.itemStatusUpdatedAt = item.itemStatusUpdatedAt;
    itemData.approvedAt = new Date();
  }

  const status = item.approvalStatus || 'pending';

  try {
    // Remove item from all status collections first (to handle status changes)
    await Promise.all([
      ApprovedItem.deleteOne({ requestId: request._id, itemId: itemData.itemId }),
      PendingItem.deleteOne({ requestId: request._id, itemId: itemData.itemId }),
      DisapprovedItem.deleteOne({ requestId: request._id, itemId: itemData.itemId })
    ]);

    // Add to appropriate collection based on status
    if (status === 'approved') {
      await ApprovedItem.create(itemData);
    } else if (status === 'disapproved') {
      itemData.disapprovedAt = new Date();
      await DisapprovedItem.create(itemData);
    } else {
      // pending or no status
      await PendingItem.create(itemData);
    }
  } catch (error) {
    console.error('Error syncing item to status collection:', error);
    // Don't throw - allow request save to continue
  }
};

/**
 * Sync all items from a request to their status collections
 * @param {Object} request - The request document
 */
const syncAllItemsFromRequest = async (request) => {
  if (!request || !request.items || !Array.isArray(request.items)) {
    return;
  }

  try {
    // Sync each item
    await Promise.all(
      request.items.map(item => syncItemToStatusCollection(item, request))
    );
  } catch (error) {
    console.error('Error syncing all items from request:', error);
    // Don't throw - allow request save to continue
  }
};

/**
 * Remove an item from all status collections
 * @param {String} requestId - The request ID
 * @param {String} itemId - The item ID
 */
const removeItemFromStatusCollections = async (requestId, itemId) => {
  try {
    await Promise.all([
      ApprovedItem.deleteOne({ requestId, itemId }),
      PendingItem.deleteOne({ requestId, itemId }),
      DisapprovedItem.deleteOne({ requestId, itemId })
    ]);
  } catch (error) {
    console.error('Error removing item from status collections:', error);
  }
};

/**
 * Update itemStatus for an approved item
 * @param {String} requestId - The request ID
 * @param {String} itemId - The item ID
 * @param {String} itemStatus - The new itemStatus
 * @param {String} remarks - Optional remarks
 */
const updateApprovedItemStatus = async (requestId, itemId, itemStatus, remarks = '') => {
  try {
    await ApprovedItem.updateOne(
      { requestId, itemId },
      {
        $set: {
          itemStatus,
          itemStatusRemarks: remarks,
          itemStatusUpdatedAt: new Date()
        }
      }
    );
  } catch (error) {
    console.error('Error updating approved item status:', error);
  }
};

module.exports = {
  syncItemToStatusCollection,
  syncAllItemsFromRequest,
  removeItemFromStatusCollections,
  updateApprovedItemStatus
};

