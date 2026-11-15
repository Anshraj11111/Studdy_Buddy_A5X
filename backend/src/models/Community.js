import mongoose from 'mongoose';

const communitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    topic: {
      type: String,
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    memberCount: {
      type: Number,
      default: 1,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    icon: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
communitySchema.index({ topic: 1, createdAt: -1 });
communitySchema.index({ createdBy: 1 });

export default mongoose.model('Community', communitySchema);
