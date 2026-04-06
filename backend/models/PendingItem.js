const mongoose = require('mongoose');

// Schema for pending items (separated from requests for easier querying)
const pendingItemSchema = new mongoose.Schema({
  // Item details (from request item)
  itemId: { type: String, required: true }, // Original item.id from request
  item: { type: String, required: true },
  quantity: { type: Number, required: true },
  quantityByYear: { type: mongoose.Schema.Types.Mixed, default: {} },
  price: { type: Number, default: 0 },
  range: { type: String, enum: ['low', 'mid', 'high'], default: 'mid' },
  specification: String,
  purpose: String,
  approvalStatus: {
    type: String,
    enum: ['pending'],
    default: 'pending'
  },
  approvalReason: {
    type: String,
    default: ''
  },
  // Request reference
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true,
    index: true
  },
  // User and organization info
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
    index: true
  },
  campus: {
    type: String,
    required: false,
    trim: true,
    default: '',
    index: true
  },
  year: {
    type: String,
    required: true,
    index: true
  },
  // Request metadata
  requestTitle: String,
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

// Indexes for efficient querying
pendingItemSchema.index({ requestId: 1, itemId: 1 }, { unique: true });
pendingItemSchema.index({ userId: 1, year: 1 });
pendingItemSchema.index({ unit: 1, campus: 1, year: 1 });
pendingItemSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PendingItem', pendingItemSchema);

