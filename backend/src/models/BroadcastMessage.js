import mongoose from 'mongoose';

const broadcastMessageSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ['robotics', 'aiml', 'electronics', 'renewable_energy'], required: true, index: true },
    sender:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

broadcastMessageSchema.index({ channel: 1, deleted: 1, createdAt: -1 });

const BroadcastMessage = mongoose.model('BroadcastMessage', broadcastMessageSchema);
export default BroadcastMessage;
