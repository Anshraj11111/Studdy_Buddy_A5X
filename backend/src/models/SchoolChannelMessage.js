import mongoose from 'mongoose';
import { getConnection } from '../config/db-multi.js';

const schoolChannelMessageSchema = new mongoose.Schema(
  {
    channelId: {
      type: String,
      required: [true, 'Channel ID is required'],
      trim: true,
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolChannel',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'announcement'],
      default: 'text',
    },
    // For image/file messages
    attachments: [{
      url: { type: String },
      type: { type: String }, // image, pdf, doc, etc.
      name: { type: String },
      size: { type: Number }, // in bytes
    }],
    // Pinned messages (for announcements)
    isPinned: {
      type: Boolean,
      default: false,
    },
    // Reactions
    reactions: [{
      emoji: { type: String },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    }],
    // Read receipts
    readBy: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      readAt: { type: Date, default: Date.now },
    }],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
schoolChannelMessageSchema.index({ channelId: 1, createdAt: -1 });
schoolChannelMessageSchema.index({ channel: 1, createdAt: -1 });
schoolChannelMessageSchema.index({ sender: 1 });
schoolChannelMessageSchema.index({ isPinned: 1 });

// Get the appropriate database connection (tertiary for messages)
let SchoolChannelMessage;
try {
  const conn = getConnection('tertiary');
  SchoolChannelMessage = conn.model('SchoolChannelMessage', schoolChannelMessageSchema);
} catch (error) {
  // Fallback to default mongoose connection
  SchoolChannelMessage = mongoose.model('SchoolChannelMessage', schoolChannelMessageSchema);
}

export default SchoolChannelMessage;
