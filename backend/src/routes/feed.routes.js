import express from 'express';
import FeedPost from '../models/FeedPost.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import authMiddleware from '../middleware/auth.middleware.js';
import { pollVoteLimiter, writeLimiter, searchLimiter } from '../middleware/rateLimiter.js';
import { addXP } from '../services/xp.service.js';
import { checkContent } from '../utils/contentFilter.js';
import { escapeRegex } from '../utils/sanitize.js';
import { sendPushToUser } from '../services/webPush.service.js';
import { getCache, setCache, deleteCache } from '../config/redis.js';

const router = express.Router();
const { authenticate } = authMiddleware;

// Helper: emit socket notification to a user
const emitNotification = (io, userId, notification) => {
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
};

// GET /api/feed/users/search?q=john - Search users for mentions
router.get('/users/search', authenticate, searchLimiter, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: { users: [] } });
    }

    const searchTerm = escapeRegex(q.trim());
    const users = await User.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ],
      _id: { $ne: req.user._id } // Exclude current user
    })
      .select('_id name email profileImage role')
      .limit(10)
      .lean();

    res.json({ success: true, data: { users } });
  } catch (err) {
    console.error('User search failed:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to search users' } });
  }
});

// GET /api/feed/hashtags/trending - Get trending hashtags
router.get('/hashtags/trending', authenticate, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    // Aggregate hashtags from recent posts (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const trending = await FeedPost.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $unwind: '$hashtags' },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) },
      { $project: { tag: '$_id', count: 1, _id: 0 } }
    ]);

    res.json({ success: true, data: { hashtags: trending } });
  } catch (err) {
    console.error('Failed to fetch trending hashtags:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch hashtags' } });
  }
});

// GET /api/feed/liked - Get posts liked by current user
router.get('/liked', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user._id;

    // Find posts where user's ID is in the likes array
    const posts = await FeedPost.find({
      likes: userId
    })
      .populate('userId', 'name profileImage role skills')
      .populate('comments.userId', 'name profileImage')
      .populate('comments.replies.userId', 'name profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FeedPost.countDocuments({ likes: userId });

    res.json({
      success: true,
      data: {
        posts,
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
      },
    });
  } catch (err) {
    console.error('Failed to fetch liked posts:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch liked posts' } });
  }
});

// GET /api/feed?category=Robotics&page=1&limit=20&hashtag=ai&sort=random
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, page = 1, limit = 20, search = '', userId, hashtag, sort = 'random' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {};
    if (category && category !== 'All') query.category = category;
    if (search.trim()) {
      query.content = { $regex: escapeRegex(search.trim()), $options: 'i' };
    }
    if (hashtag) {
      query.hashtags = hashtag.toLowerCase().replace('#', '');
    }
    if (userId) {
      query.userId = userId;
    }

    // Random sort: Use MongoDB's $sample aggregation for true randomness
    // Or use simple random ID offset for better performance
    let posts;
    
    if (sort === 'random') {
      // Use aggregation pipeline for random posts (every refresh gets different posts)
      posts = await FeedPost.aggregate([
        { $match: query },
        { $sample: { size: parseInt(limit) } }, // Random sampling
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userId',
            pipeline: [{ $project: { name: 1, profileImage: 1, role: 1, skills: 1 } }]
          }
        },
        { $unwind: { path: '$userId', preserveNullAndEmptyArrays: true } },
        // Populate comments.userId for each comment
        {
          $lookup: {
            from: 'users',
            localField: 'comments.userId',
            foreignField: '_id',
            as: 'commentUsers'
          }
        },
        {
          $addFields: {
            comments: {
              $map: {
                input: '$comments',
                as: 'comment',
                in: {
                  $mergeObjects: [
                    '$$comment',
                    {
                      userId: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$commentUsers',
                              cond: { $eq: ['$$this._id', '$$comment.userId'] }
                            }
                          },
                          0
                        ]
                      }
                    }
                  ]
                }
              }
            }
          }
        },
        {
          $project: {
            commentUsers: 0 // Remove temporary field
          }
        }
      ]);
    } else {
      // Default: Latest first (chronological)
      posts = await FeedPost.find(query)
        .populate('userId', 'name profileImage role skills')
        .populate({
          path: 'comments.userId',
          select: 'name profileImage',
          options: { limit: 5 }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean()
        .exec();
    }

    // OPTIMIZATION: Only count on first page (expensive operation)
    let total;
    if (parseInt(page) === 1) {
      total = await FeedPost.countDocuments(query);
    } else {
      // Estimate total for pagination (avoid expensive count on every page)
      total = skip + posts.length + (posts.length === parseInt(limit) ? parseInt(limit) : 0);
    }

    const response = {
      success: true,
      data: {
        posts,
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
      },
    };

    res.json(response);
  } catch (err) {
    console.error('Feed fetch error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch feed' } });
  }
});

// POST /api/feed
router.post('/', authenticate, writeLimiter, async (req, res) => {
  try {
    const { content, category = 'All', mediaUrl, mediaType, mentions = [], poll } = req.body;
    if (!content?.trim() && !mediaUrl && !poll) {
      return res.status(400).json({ success: false, error: { message: 'Content, media, or poll is required' } });
    }

    // Content moderation - block abusive words in post content
    if (content?.trim()) {
      const modResult = checkContent(content);
      if (modResult.blocked) {
        return res.status(400).json({ 
          success: false, 
          error: { 
            message: modResult.reason,
            code: 'CONTENT_BLOCKED'
          } 
        });
      }
    }

    // Extract hashtags from content (#robotics, #ai, etc.)
    const hashtagRegex = /#(\w+)/g;
    const hashtagMatches = content?.match(hashtagRegex) || [];
    const hashtags = [...new Set(hashtagMatches.map(tag => tag.slice(1).toLowerCase()))]; // Remove # and dedupe

    // Prepare poll data if provided
    let pollData = null;
    if (poll && poll.question && poll.options && poll.options.length >= 2) {
      const expiresAt = new Date(Date.now() + (poll.duration || 24) * 60 * 60 * 1000);
      pollData = {
        question: poll.question.trim(),
        options: poll.options.map(opt => ({ text: opt.trim(), votes: [] })),
        expiresAt,
        totalVotes: 0
      };
    }

    const post = await FeedPost.create({
      userId: req.user._id,
      content: content?.trim() || '',
      category,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      mentions: mentions || [],
      hashtags: hashtags,
      poll: pollData
    });

    const populated = await FeedPost.findById(post._id)
      .populate('userId', 'name profileImage role skills')
      .populate('mentions', 'name profileImage role');

    // Award XP for creating a feed post
    await addXP(req.user._id, 'post');

    // Send notifications to mentioned users
    const io = req.app.get('io');
    if (mentions && mentions.length > 0) {
      console.log(`📢 Sending mention notifications to ${mentions.length} user(s)`);
      
      // Get a short preview of the post content
      const contentPreview = content?.trim().substring(0, 50) || 'a post';
      const preview = contentPreview.length < content?.trim().length ? `${contentPreview}...` : contentPreview;
      
      for (const mentionedUserId of mentions) {
        if (String(mentionedUserId) !== String(req.user._id)) {
          try {
            console.log(`  📬 Notifying user ${mentionedUserId} about mention`);
            
            const notification = await Notification.create({
              recipient: mentionedUserId,
              sender: req.user._id,
              type: 'mention',
              postId: post._id,
              message: `${req.user.name} mentioned you in a post`,
            });

            // Populate notification
            await notification.populate('sender', 'name profileImage');

            // Emit socket notification
            emitNotification(io, mentionedUserId, notification);
            console.log(`  ✅ Socket notification sent to user:${mentionedUserId}`);

            // Send push notification with post preview
            try {
              await sendPushToUser(mentionedUserId, {
                title: `${req.user.name} mentioned you`,
                body: preview,
                url: `/communities?postId=${post._id}`,
              });
              console.log(`  ✅ Push notification sent to user ${mentionedUserId}`);
            } catch (pushErr) {
              console.error('  ❌ Push notification failed for mention:', pushErr);
            }
          } catch (notifErr) {
            console.error(`  ❌ Failed to create mention notification for ${mentionedUserId}:`, notifErr);
          }
        }
      }
      console.log(`✅ All mention notifications processed`);
    }

    // Invalidate feed cache so new post shows immediately
    deleteCache('feed:*').catch(() => {});

    res.status(201).json({ success: true, data: { post: populated } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to create post' } });
  }
});

// GET /api/feed/:id - Get single post by ID (for deep linking)
// IMPORTANT: Place BEFORE DELETE to avoid route conflicts
router.get('/:id', authenticate, async (req, res) => {
  try {
    const post = await FeedPost.findById(req.params.id)
      .populate('userId', 'name profileImage role skills')
      .populate('comments.userId', 'name profileImage')
      .populate('comments.replies.userId', 'name profileImage');

    if (!post) {
      return res.status(404).json({ success: false, error: { message: 'Post not found' } });
    }

    res.json({ success: true, data: { post } });
  } catch (err) {
    console.error('Failed to fetch post:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch post' } });
  }
});

// DELETE /api/feed/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const post = await FeedPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post not found' } });
    if (String(post.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized' } });
    }
    await post.deleteOne();
    
    // 🔥 IMPORTANT: Invalidate feed cache after post deleted
    await deleteCache('feed:*').catch(err => {
      console.error('⚠️ Failed to invalidate feed cache:', err);
    });
    console.log('✅ Feed cache invalidated after post deleted');
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to delete post' } });
  }
});

// PUT /api/feed/:id - Edit post
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { content, category, mediaUrl, mediaType } = req.body;
    
    const post = await FeedPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post not found' } });
    if (String(post.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized to edit this post' } });
    }

    // Content moderation - block abusive words
    if (content?.trim()) {
      const modResult = checkContent(content);
      if (modResult.blocked) {
        return res.status(400).json({ 
          success: false, 
          error: { 
            message: modResult.reason,
            code: 'CONTENT_BLOCKED'
          } 
        });
      }
    }

    // Update fields
    if (content !== undefined) post.content = content.trim();
    if (category !== undefined) post.category = category;
    if (mediaUrl !== undefined) post.mediaUrl = mediaUrl;
    if (mediaType !== undefined) post.mediaType = mediaType;

    await post.save();

    const populated = await FeedPost.findById(post._id)
      .populate('userId', 'name profileImage role skills')
      .populate('comments.userId', 'name profileImage')
      .populate('comments.replies.userId', 'name profileImage');

    // Invalidate cache
    deleteCache('feed:*').catch(() => {});

    res.json({ success: true, data: { post: populated } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to update post' } });
  }
});

// POST /api/feed/:id/like  (toggle)
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const post = await FeedPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post not found' } });

    const uid = String(req.user._id);
    const liked = post.likes.map(String).includes(uid);

    if (liked) {
      post.likes = post.likes.filter(id => String(id) !== uid);
    } else {
      post.likes.push(req.user._id);

      // Award XP to post owner for receiving a like
      if (String(post.userId) !== uid) {
        await addXP(String(post.userId), 'like_received');

        // Notify post owner (not self)
        const notif = await Notification.create({
          recipient: post.userId,
          sender: req.user._id,
          type: 'like',
          postId: post._id,
          message: `${req.user.name} liked your post`,
        });
        const populated = await Notification.findById(notif._id).populate('sender', 'name profileImage');
        const io = req.app.get('io');
        emitNotification(io, String(post.userId), populated);
        // Push to device even if app/browser is closed
        sendPushToUser(String(post.userId), {
          title: 'Studdy Buddy',
          body: `${req.user.name} liked your post`,
          icon: req.user.profileImage || '/icons/icon-192x192.png',
          url: '/feed',
          type: 'like',
        });
      }
    }
    await post.save();

    // 🔥 IMPORTANT: Invalidate ALL feed cache when a like is added/removed
    // This ensures that when user refreshes page, they get updated like counts
    await deleteCache('feed:*').catch(err => {
      console.error('⚠️ Failed to invalidate feed cache:', err);
    });
    console.log('✅ Feed cache invalidated after like toggle');

    res.json({ success: true, data: { liked: !liked, likeCount: post.likes.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to toggle like' } });
  }
});

// POST /api/feed/:id/poll/vote - Vote on a poll
router.post('/:id/poll/vote', authenticate, pollVoteLimiter, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    
    if (optionIndex === undefined || optionIndex < 0) {
      return res.status(400).json({ success: false, error: { message: 'Invalid option' } });
    }

    const post = await FeedPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: { message: 'Post not found' } });
    }

    if (!post.poll || !post.poll.question) {
      return res.status(400).json({ success: false, error: { message: 'No poll in this post' } });
    }

    // Check if poll expired
    if (new Date() > post.poll.expiresAt) {
      return res.status(400).json({ success: false, error: { message: 'Poll has expired' } });
    }

    if (optionIndex >= post.poll.options.length) {
      return res.status(400).json({ success: false, error: { message: 'Invalid option index' } });
    }

    const userId = String(req.user._id);

    // Check if user already voted
    let previousVoteIndex = -1;
    post.poll.options.forEach((option, idx) => {
      if (option.votes.some(v => String(v) === userId)) {
        previousVoteIndex = idx;
      }
    });

    // If user already voted for the same option, do nothing
    if (previousVoteIndex === optionIndex) {
      return res.json({ success: true, data: { poll: post.poll } });
    }

    // Remove previous vote if exists (in memory)
    if (previousVoteIndex !== -1) {
      post.poll.options[previousVoteIndex].votes = post.poll.options[previousVoteIndex].votes.filter(
        v => String(v) !== userId
      );
    }

    // Add new vote (in memory)
    if (!post.poll.options[optionIndex].votes.some(v => String(v) === userId)) {
      post.poll.options[optionIndex].votes.push(req.user._id);
    }

    // Recalculate total votes
    post.poll.totalVotes = post.poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);

    // Save changes
    await post.save();

    res.json({ success: true, data: { poll: post.poll } });
  } catch (err) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ POLL VOTE ERROR:');
    console.error('Post ID:', req.params.id);
    console.error('Option Index:', req.body.optionIndex);
    console.error('User ID:', req.user._id);
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    res.status(500).json({ success: false, error: { message: 'Failed to vote on poll', details: err.message } });
  }
});

// POST /api/feed/:id/comment
router.post('/:id/comment', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Comment cannot be empty' } });
    }

    // Content moderation - block abusive words
    const modResult = checkContent(content);
    if (modResult.blocked) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          message: modResult.reason,
          code: 'CONTENT_BLOCKED'
        } 
      });
    }

    const post = await FeedPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post not found' } });

    post.comments.push({ userId: req.user._id, content: content.trim() });
    await post.save();

    // 🔥 IMPORTANT: Invalidate feed cache after comment added
    await deleteCache('feed:*').catch(err => {
      console.error('⚠️ Failed to invalidate feed cache:', err);
    });
    console.log('✅ Feed cache invalidated after comment added');

    // XP for commenter + post owner
    await addXP(String(req.user._id), 'comment');
    if (String(post.userId) !== String(req.user._id)) {
      await addXP(String(post.userId), 'comment_received');
    }

    // Notify post owner (not self)
    if (String(post.userId) !== String(req.user._id)) {
      const notif = await Notification.create({
        recipient: post.userId,
        sender: req.user._id,
        type: 'comment',
        postId: post._id,
        message: `${req.user.name} commented on your post`,
      });
      const populated = await Notification.findById(notif._id).populate('sender', 'name profileImage');
      const io = req.app.get('io');
      emitNotification(io, String(post.userId), populated);
      // Push to device even if app/browser is closed
      sendPushToUser(String(post.userId), {
        title: 'Studdy Buddy',
        body: `${req.user.name} commented on your post`,
        icon: req.user.profileImage || '/icons/icon-192x192.png',
        url: '/feed',
        type: 'comment',
      });
    }

    const populatedPost = await FeedPost.findById(post._id)
      .populate('userId', 'name profileImage role')
      .populate('comments.userId', 'name profileImage')
      .populate('comments.replies.userId', 'name profileImage');

    res.status(201).json({ success: true, data: { post: populatedPost } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to add comment' } });
  }
});

// PUT /api/feed/:postId/comment/:commentId - Edit comment
router.put('/:postId/comment/:commentId', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Comment cannot be empty' } });
    }

    // Content moderation - block abusive words
    const modResult = checkContent(content);
    if (modResult.blocked) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          message: modResult.reason,
          code: 'CONTENT_BLOCKED'
        } 
      });
    }

    const post = await FeedPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post not found' } });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, error: { message: 'Comment not found' } });

    // Check if user owns the comment
    if (String(comment.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized to edit this comment' } });
    }

    comment.content = content.trim();
    await post.save();

    const populatedPost = await FeedPost.findById(post._id)
      .populate('userId', 'name profileImage role')
      .populate('comments.userId', 'name profileImage')
      .populate('comments.replies.userId', 'name profileImage');

    res.status(200).json({ success: true, data: { post: populatedPost } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to edit comment' } });
  }
});

// DELETE /api/feed/:postId/comment/:commentId - Delete comment
router.delete('/:postId/comment/:commentId', authenticate, async (req, res) => {
  try {
    const post = await FeedPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post not found' } });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, error: { message: 'Comment not found' } });

    // Check if user owns the comment or owns the post
    const isCommentOwner = String(comment.userId) === String(req.user._id);
    const isPostOwner = String(post.userId) === String(req.user._id);
    
    if (!isCommentOwner && !isPostOwner) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized to delete this comment' } });
    }

    // Use pull to remove the comment from the array
    post.comments.pull(req.params.commentId);
    await post.save();

    const populatedPost = await FeedPost.findById(post._id)
      .populate('userId', 'name profileImage role')
      .populate('comments.userId', 'name profileImage')
      .populate('comments.replies.userId', 'name profileImage');

    res.status(200).json({ success: true, data: { post: populatedPost } });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to delete comment' } });
  }
});

// POST /api/feed/:postId/comment/:commentId/reply - Add reply to a comment
router.post('/:postId/comment/:commentId/reply', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Reply cannot be empty' } });
    }

    const post = await FeedPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post not found' } });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, error: { message: 'Comment not found' } });

    // Initialize replies array if it doesn't exist
    if (!comment.replies) comment.replies = [];

    // Add reply to comment
    comment.replies.push({ 
      userId: req.user._id, 
      content: content.trim(),
      createdAt: new Date()
    });
    await post.save();

    // Invalidate cache
    await deleteCache('feed:*').catch(err => {
      console.error('⚠️ Failed to invalidate feed cache:', err);
    });

    // XP for replier + comment owner
    await addXP(String(req.user._id), 'comment');
    if (String(comment.userId) !== String(req.user._id)) {
      await addXP(String(comment.userId), 'comment_received');

      // Send notification to comment owner
      const notif = await Notification.create({
        recipient: comment.userId,
        sender: req.user._id,
        type: 'reply',
        postId: post._id,
        message: `${req.user.name} replied to your comment`,
      });
      const populated = await Notification.findById(notif._id).populate('sender', 'name profileImage');
      
      // Emit notification via socket
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${comment.userId}`).emit('notification', populated);
      }

      sendPushToUser(String(comment.userId), {
        title: 'Studdy Buddy',
        body: `${req.user.name} replied to your comment`,
        icon: req.user.profileImage || '/icons/icon-192x192.png',
        url: '/feed',
        type: 'reply',
      });
    }

    const populatedPost = await FeedPost.findById(post._id)
      .populate('userId', 'name profileImage role')
      .populate('comments.userId', 'name profileImage')
      .populate('comments.replies.userId', 'name profileImage');

    res.status(201).json({ success: true, data: { post: populatedPost } });
  } catch (err) {
    console.error('Add reply error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to add reply' } });
  }
});

// DELETE /api/feed/:postId/comment/:commentId/reply/:replyId - Delete reply
router.delete('/:postId/comment/:commentId/reply/:replyId', authenticate, async (req, res) => {
  try {
    const post = await FeedPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, error: { message: 'Post not found' } });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, error: { message: 'Comment not found' } });

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ success: false, error: { message: 'Reply not found' } });

    // Check if user owns the reply, comment, or post
    const isReplyOwner = String(reply.userId) === String(req.user._id);
    const isCommentOwner = String(comment.userId) === String(req.user._id);
    const isPostOwner = String(post.userId) === String(req.user._id);

    if (!isReplyOwner && !isCommentOwner && !isPostOwner) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized to delete this reply' } });
    }

    comment.replies.pull(req.params.replyId);
    await post.save();

    // Invalidate cache
    await deleteCache('feed:*').catch(err => {
      console.error('⚠️ Failed to invalidate feed cache:', err);
    });

    const populatedPost = await FeedPost.findById(post._id)
      .populate('userId', 'name profileImage role')
      .populate('comments.userId', 'name profileImage')
      .populate('comments.replies.userId', 'name profileImage');

    res.status(200).json({ success: true, data: { post: populatedPost } });
  } catch (err) {
    console.error('Delete reply error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to delete reply' } });
  }
});

export default router;
