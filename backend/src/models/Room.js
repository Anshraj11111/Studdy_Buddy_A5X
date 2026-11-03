import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    student1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    student2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doubt1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doubt',
      required: false,
      default: null,
    },
    doubt2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doubt',
      required: false,
      default: null,
    },
    topic: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
      index: true,
    },
    lastMessage: {
      content: { type: String, default: '' },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: null },
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

// Index for efficient room lookup by students
roomSchema.index({ student1: 1, student2: 1 });
roomSchema.index({ createdAt: -1 });

export default mongoose.model('Room', roomSchema);
