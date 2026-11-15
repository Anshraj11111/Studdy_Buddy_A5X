import mongoose from 'mongoose';

// Admin-managed access codes per channel
const broadcastCodeSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ['robotics', 'aiml', 'electronics', 'renewable_energy'], required: true },
    code:    { type: String, required: true, trim: true },
    active:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

broadcastCodeSchema.index({ channel: 1, code: 1 }, { unique: true });

const BroadcastCode = mongoose.model('BroadcastCode', broadcastCodeSchema);
export default BroadcastCode;
