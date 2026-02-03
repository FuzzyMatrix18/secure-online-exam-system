import mongoose from 'mongoose';

const RefreshTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  revoked: { type: Boolean, default: false },
  replacedByToken: { type: String },
  ip: { type: String },
  userAgent: { type: String }
}, { timestamps: true });

export default mongoose.model('RefreshToken', RefreshTokenSchema);
