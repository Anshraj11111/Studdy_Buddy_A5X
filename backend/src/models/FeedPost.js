import mongoose from 'mongoose';
import { getConnection } from '../config/db-multi.js';

const feedPostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 7000,
    },
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    hashtags: [{
      type: String,
      lowercase: true,
      trim: true,
    }],
    poll: {
      question: { type: String, maxlength: 200 },
      options: [{
        text: { type: String, maxlength: 100 },
        votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
      }],
      expiresAt: { type: Date },
      totalVotes: { type: Number, default: 0 }
    },
    category: {
      type: String,
      enum: ['All', 'Robotics', 'IoT', 'Embedded Systems', 'AI/ML', 'Projects', 'Mentorship'],
      default: 'All',
      index: true,
    },
    mediaUrl: { type: String, default: null },   // base64 or URL
    mediaType: { type: String, enum: ['image', 'video', null], default: null },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        content: { type: String, maxlength: 1000 },
        createdAt: { type: Date, default: Date.now },
        replies: [
          {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            content: { type: String, maxlength: 1000 },
            createdAt: { type: Date, default: Date.now },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

// ─── PERFORMANCE INDEXES (Critical for 10K users) ─────────────────────────────
// Index 1: Most common query - category + createdAt (feed listing)
feedPostSchema.index({ category: 1, createdAt: -1 });

// Index 2: User's posts (profile page)
feedPostSchema.index({ userId: 1, createdAt: -1 });

// Index 3: Hashtag search
feedPostSchema.index({ hashtags: 1, createdAt: -1 });

// Index 4: Text search on content (optional - expensive, only if needed)
// feedPostSchema.index({ content: 'text' });

// Index 5: Poll expiry checks (for cleanup)
feedPostSchema.index({ 'poll.expiresAt': 1 }, { sparse: true });

// Index 6: Likes array for user's liked posts
feedPostSchema.index({ likes: 1 });

// FeedPosts are stored in PRIMARY database (with User data)
let FeedPost;
try {
  const conn = getConnection('primary');
  FeedPost = conn.model('FeedPost', feedPostSchema);
} catch (error) {
  console.warn('⚠️ FeedPost model: Using default mongoose connection');
  FeedPost = mongoose.model('FeedPost', feedPostSchema);
}

export default FeedPost;
