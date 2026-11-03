import mongoose from 'mongoose';
import { getConnection } from '../config/db-multi.js';

const pushSubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  endpoint: {
    type: String,
    required: true,
  },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  userAgent: { type: String, default: '' },
}, { timestamps: true });

pushSubscriptionSchema.index({ user: 1 });
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

// Use PRIMARY DB — same default connection all other models use
export default mongoose.model('PushSubscription', pushSubscriptionSchema);
