const mongoose = require('mongoose');

const yearCycleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Validate format: YYYY-YYYY (e.g., "2024-2026")
        return /^\d{4}-\d{4}$/.test(v);
      },
      message: 'Year cycle must be in format YYYY-YYYY (e.g., "2024-2026")'
    }
  },
  startYear: {
    type: Number,
    required: true
  },
  endYear: {
    type: Number,
    required: true,
    validate: {
      validator: function(v) {
        return v > this.startYear;
      },
      message: 'End year must be greater than start year'
    }
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

// Pre-save hook to set startYear and endYear from name
yearCycleSchema.pre('save', function(next) {
  if (this.name && this.isModified('name')) {
    const parts = this.name.split('-');
    if (parts.length === 2) {
      this.startYear = parseInt(parts[0], 10);
      this.endYear = parseInt(parts[1], 10);
    }
  }
  next();
});

// Index for efficient sorting
yearCycleSchema.index({ order: 1, startYear: -1 });

module.exports = mongoose.model('YearCycle', yearCycleSchema);


