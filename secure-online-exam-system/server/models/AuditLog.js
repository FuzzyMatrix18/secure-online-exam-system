import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  meta: { type: Object },
  ip: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('AuditLog', AuditLogSchema);
