const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    actor: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      role: { type: String, default: 'user' },
      email: { type: String, default: '' },
      name: { type: String, default: '' },
      unit: { type: String, default: '' }
    },
    target: {
      type: { type: String, default: '' },
      id: { type: String, default: '' },
      name: { type: String, default: '' }
    },
    metadata: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ 'actor.role': 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

