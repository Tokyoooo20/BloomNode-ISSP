/* eslint-disable no-console */
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const AuditLog = require('../models/AuditLog');

dotenv.config({
  path: path.resolve(__dirname, '..', '.env'),
});

const { MONGODB_URI } = process.env;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in environment configuration.');
  process.exit(1);
}

const clearAuditLogs = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const { deletedCount } = await AuditLog.deleteMany({});
    console.log(`✅ Cleared ${deletedCount} audit log entr${deletedCount === 1 ? 'y' : 'ies'}.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Failed to clear audit logs:', error);
    process.exit(1);
  }
};

clearAuditLogs();

