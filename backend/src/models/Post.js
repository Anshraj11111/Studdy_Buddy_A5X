import mongoose from 'mongoose';
import { getConnection } from '../config/db-multi.js';

const postSchema = new mongoose.Schema(
  {
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    likeCount: {
      type: Number,
      default: 0,
    },
    comments: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        content: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
        replies: [
          {
            userId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User',
            },
            content: String,
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],
    commentCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
postSchema.index({ communityId: 1, createdAt: -1 });
postSchema.index({ userId: 1 });

// Posts are stored in SECONDARY database (model-registry.js says 'secondary')
let Post;
try {
  const conn = getConnection('secondary');
  Post = conn.model('Post', postSchema);
} catch (error) {
  console.warn('⚠️ Post model: Using default mongoose connection');
  Post = mongoose.model('Post', postSchema);
}

export default Post;
