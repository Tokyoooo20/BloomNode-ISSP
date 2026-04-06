const mongoose = require('mongoose');

const officeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  campus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: false // Campus is optional - null means applicable to all campuses
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Unique index on name only - offices are global (applicable to all campuses)
officeSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Office', officeSchema);

