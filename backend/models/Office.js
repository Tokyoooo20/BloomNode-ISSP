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
    required: true
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

// Compound index to ensure unique office names per campus
officeSchema.index({ name: 1, campus: 1 }, { unique: true });

module.exports = mongoose.model('Office', officeSchema);

