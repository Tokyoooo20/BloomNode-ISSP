const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  unit: {
    type: String,
    required: false,
    trim: true,
    index: true // Index for efficient queries by unit
  },
  type: {
    type: String,
    enum: ['approved', 'rejected', 'disapproved', 'review_completed', 'item_approved', 'item_disapproved', 'request_submitted', 'issp_approved', 'issp_rejected', 'issp_submitted_for_review', 'dict_status_updated', 'item_status_updated'],
    required: true
  },
  isspId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ISSP',
    default: null
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    default: null
  },
  itemId: {
    type: String,
    default: null
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

