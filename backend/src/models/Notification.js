import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'comment', 'reply', 'mention', 'connection', 'connection_request', 'follow', 'message', 'doubt', 'doubt_reply', 'community_post'], required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeedPost', default: null },
  doubtId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doubt', default: null },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
