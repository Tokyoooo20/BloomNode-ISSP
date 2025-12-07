const mongoose = require('mongoose');

// Schema for individual items in a request
const itemSchema = new mongoose.Schema({
  id: { type: String },  // Changed from ObjectId to String
  item: { type: String, required: true },
  quantity: { type: Number, required: true },
  quantityByYear: { type: mongoose.Schema.Types.Mixed, default: {} }, // e.g., { 2024: 30, 2025: 30, 2026: 0 }
  price: { type: Number, default: 0 },
  range: { type: String, enum: ['low', 'mid', 'high'], default: 'mid' },
  specification: String,
  purpose: String,
  // Item-level approval tracking
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'disapproved'],
    default: 'pending'
  },
  approvalReason: {
    type: String,
    default: ''
  },
  // Item status tracking (for units to update after approval)
  itemStatus: {
    type: String,
    enum: ['approved', 'pr_created', 'purchased', 'received', 'in_transit', 'completed'],
    required: false
  },
  itemStatusRemarks: {
    type: String,
    default: ''
  },
  itemStatusUpdatedAt: {
    type: Date,
    required: false,
    default: undefined
  }
}, { _id: false }); // Disable automatic _id for items

// Main request schema
const requestSchema = new mongoose.Schema({
  requestTitle: { type: String, default: '' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  year: { type: String, required: true },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'in-review', 'submitted', 'approved', 'rejected', 'revised', 'resubmitted'],
    default: 'pending'
  },
  revisionStatus: {
    type: String,
    enum: ['none', 'pending_revision', 'revised', 'resubmitted'],
    default: 'none'
  },
  revisionNotes: {
    type: String,
    default: ''
  },
  revisedAt: {
    type: Date,
    default: null
  },
  progress: {
    type: String,
    enum: ['in-progress', 'completed'],
    default: 'in-progress'
  },
  items: [itemSchema],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  unit: {
    type: String,
    required: false,
    trim: true,
    index: true // Index for efficient queries by unit
  },
  campus: {
    type: String,
    required: false,
    trim: true,
    default: '',
    index: true // Index for efficient queries by campus
  },
  dictApproval: {
    status: {
      type: String,
      enum: ['pending', 'approve_for_dict', 'collation_compilation', 'revision_from_dict', 'approved_by_dict'],
      default: 'pending'
    },
    updatedAt: {
      type: Date,
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  }
}, { timestamps: true });

// Pre-save hook to clean up null itemStatus values and populate unit
requestSchema.pre('save', async function(next) {
  // Clean up null itemStatus values
  if (this.items && Array.isArray(this.items)) {
    this.items.forEach(item => {
      if (item.itemStatus === null) {
        item.itemStatus = undefined;
      }
      if (item.itemStatusUpdatedAt === null) {
        item.itemStatusUpdatedAt = undefined;
      }
    });
  }
  
  // Populate unit and campus from userId if not already set
  if ((!this.unit || !this.campus) && this.userId) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(this.userId);
      if (user) {
        if (!this.unit && user.unit) {
          this.unit = user.unit;
        }
        if (!this.campus && user.campus) {
          this.campus = user.campus;
        }
      }
    } catch (error) {
      // If user not found or error, continue without setting unit/campus
      console.warn('Could not populate unit/campus for Request:', error.message);
    }
  }
  
  next();
});

module.exports = mongoose.model('Request', requestSchema);