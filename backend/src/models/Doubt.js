import mongoose from 'mongoose';

const doubtSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    topic: {
      type: String,
      required: [true, 'Topic is required'],
      trim: true,
      indexed: true,
    },
    tags: {
      type: [String],
      default: [],
      indexed: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      indexed: true,
    },
    status: {
      type: String,
      enum: ['open', 'matched', 'resolved'],
      default: 'open',
    },
    replies: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        content: {
          type: String,
          required: false, // Content OR images can be present
          trim: true,
          default: '',
        },
        images: {
          type: [String],
          default: [],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create indexes
doubtSchema.index({ topic: 1 });
doubtSchema.index({ tags: 1 });
doubtSchema.index({ userId: 1 });
doubtSchema.index({ status: 1 });
doubtSchema.index({ createdAt: -1 });

const Doubt = mongoose.model('Doubt', doubtSchema);

export default Doubt;
