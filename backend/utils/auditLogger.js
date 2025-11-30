const AuditLog = require('../models/AuditLog');

const buildActorPayload = (actor = {}) => ({
  id: actor.id || actor._id || null,
  role: actor.role || 'user',
  email: actor.email || '',
  name: actor.name || actor.username || '',
  unit: actor.unit || ''
});

const buildTargetPayload = (target = {}) => ({
  type: target.type || '',
  id: target.id || '',
  name: target.name || ''
});

const logAuditEvent = async ({
  actor = {},
  action,
  description,
  target = {},
  metadata = {}
}) => {
  if (!action || !description) {
    return;
  }

  try {
    await AuditLog.create({
      action,
      description,
      actor: buildActorPayload(actor),
      target: buildTargetPayload(target),
      metadata
    });
  } catch (error) {
    console.error('Failed to write audit log:', error.message);
  }
};

module.exports = {
  logAuditEvent
};

