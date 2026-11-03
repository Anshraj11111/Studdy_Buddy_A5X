import mongoose from 'mongoose';

/**
 * BroadcastStream Model
 * Stores YouTube live stream URLs for each channel
 * Allows unlimited viewers via YouTube embed
 */
const broadcastStreamSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      required: true,
      unique: true,
      enum: ['robotics', 'aiml', 'electronics', 'renewable_energy'],
    },
    youtubeVideoId: {
      type: String,
      default: null,
      trim: true,
    },
    streamTitle: {
      type: String,
      default: '',
    },
    isLive: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    viewerCount: {
      type: Number,
      default: 0,
    },
    peakViewers: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookups
broadcastStreamSchema.index({ channel: 1 });
broadcastStreamSchema.index({ isLive: 1 });

const BroadcastStream = mongoose.model('BroadcastStream', broadcastStreamSchema);

export default BroadcastStream;
