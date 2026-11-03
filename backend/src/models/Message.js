import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: false, // Made optional because image-only messages are allowed
      maxlength: 5000,
      default: '',
    },
    imageUrl: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

// Index for efficient message retrieval by room and time
messageSchema.index({ roomId: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
