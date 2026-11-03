import mongoose from 'mongoose';

// When a student already enrolled in one channel wants to join another
const broadcastJoinRequestSchema = new mongoose.Schema(
  {
    user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    currentChannel:  { type: String, required: true },
    requestedChannel:{ type: String, required: true },
    school:          { type: String, required: true, trim: true },
    class:           { type: String, required: true, trim: true },
    code:            { type: String, required: true, trim: true },
    status:          { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

broadcastJoinRequestSchema.index({ user: 1, status: 1 });

const BroadcastJoinRequest = mongoose.model('BroadcastJoinRequest', broadcastJoinRequestSchema);
export default BroadcastJoinRequest;
