const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: false
  },
  office: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Office',
    required: false
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: false // When set, program is under this unit (e.g. unit under OVPAA)
  },
  campus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: false // Programs can be campus-specific or general
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

// Same program name allowed on different campuses; not allowed twice on the same campus (faculty is not part of uniqueness)
programSchema.index(
  { name: 1, campus: 1 },
  {
    unique: true,
    partialFilterExpression: { campus: { $exists: true, $ne: null } }
  }
);

module.exports = mongoose.model('Program', programSchema);

