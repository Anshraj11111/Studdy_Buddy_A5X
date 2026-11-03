import communityService from '../services/community.service.js';
import { checkContent } from '../utils/contentFilter.js';
import { getCache, setCache, deleteCache } from '../config/redis.js';

/**
 * Create a new community
 * POST /api/communities
 */
export const createCommunity = async (req, res) => {
  try {
    const { name, description, topic } = req.body;

    if (!name || !description || !topic) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide name, description, and topic',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const community = await communityService.createCommunity({
      name,
      description,
      topic,
      createdBy: req.user._id,
    });

    // Invalidate communities cache
    deleteCache('communities:*').catch(() => {});

    res.status(201).json({
      success: true,
      data: { community },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message || 'Failed to create community',
        code: 'VALIDATION_ERROR',
      },
    });
  }
};

/**
 * Get all communities
 * GET /api/communities
 */
export const getCommunities = async (req, res) => {
  try {
    const { page = 1, limit = 10, topic } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const filters = {};
    if (topic) filters.topic = topic;

    // Cache key — TTL 5 min (communities don't change often)
    const cacheKey = `communities:${JSON.stringify({ pageNum, limitNum, ...filters })}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const communities = await communityService.getCommunities(filters, { page: pageNum, limit: limitNum });
    const total = await communityService.getCommunityCount(filters);

    const response = {
      success: true,
      data: {
        communities,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    };

    await setCache(cacheKey, response, 300); // 5 min TTL

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch communities',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Get community by ID
 * GET /api/communities/:id
 */
export const getCommunityById = async (req, res) => {
  try {
    const { id } = req.params;

    const community = await communityService.getCommunityById(id);

    res.status(200).json({
      success: true,
      data: {
        community,
      },
    });
  } catch (error) {
    if (error.message === 'Community not found') {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'NOT_FOUND',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch community',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Join a community
 * POST /api/communities/:id/join
 */
export const joinCommunity = async (req, res) => {
  try {
    const { id } = req.params;

    const community = await communityService.joinCommunity(id, req.user._id);

    res.status(200).json({
      success: true,
      data: {
        community,
        message: 'Successfully joined community',
      },
    });
  } catch (error) {
    if (error.message === 'Community not found') {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'NOT_FOUND',
        },
      });
    }

    res.status(400).json({
      success: false,
      error: {
        message: error.message || 'Failed to join community',
        code: 'VALIDATION_ERROR',
      },
    });
  }
};

/**
 * Leave a community
 * POST /api/communities/:id/leave
 */
export const leaveCommunity = async (req, res) => {
  try {
    const { id } = req.params;

    const community = await communityService.leaveCommunity(id, req.user._id);

    res.status(200).json({
      success: true,
      data: {
        community,
        message: 'Successfully left community',
      },
    });
  } catch (error) {
    if (error.message === 'Community not found') {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'NOT_FOUND',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to leave community',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Create a post in a community
 * POST /api/communities/:id/posts
 */
export const createPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide post content',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // Content moderation - block abusive words
    const modResult = checkContent(content);
    if (modResult.blocked) {
      return res.status(400).json({
        success: false,
        error: {
          message: modResult.reason,
          code: 'CONTENT_BLOCKED',
        },
      });
    }

    const post = await communityService.createPost(id, req.user._id, content);

    // Send notifications to all connections when post is created
    try {
      console.log('📢 [Community Post] Starting notification process...');
      const Connection = (await import('../models/Connection.js')).default;
      const Notification = (await import('../models/Notification.js')).default;
      const { sendPushToUser } = await import('../services/webPush.service.js');
      const io = req.app.get('io');

      // Find all accepted connections (both requester and recipient sides)
      const connections = await Connection.find({
        $or: [
          { requester: req.user._id, status: 'accepted' },
          { recipient: req.user._id, status: 'accepted' },
        ],
      }).lean();

      console.log(`📢 [Community Post] Found ${connections.length} connections`);

      if (connections.length > 0) {
        // Extract connection user IDs (exclude self)
        const connectionUserIds = connections.map(conn => {
          const otherUserId = String(conn.requester) === String(req.user._id) 
            ? conn.recipient 
            : conn.requester;
          return otherUserId;
        }).filter(uid => String(uid) !== String(req.user._id));

        // Remove duplicates
        const uniqueUserIds = [...new Set(connectionUserIds.map(id => String(id)))];
        console.log(`📢 [Community Post] Notifying ${uniqueUserIds.length} unique connections`);

        if (uniqueUserIds.length > 0) {
          // Create notifications for all connections
          const notifications = uniqueUserIds.map(userId => ({
            recipient: userId,
            sender: req.user._id,
            type: 'community_post',
            message: `${req.user.name} posted in community: "${content.length > 50 ? content.substring(0, 50) + '...' : content}"`,
            read: false,
          }));

          const savedNotifs = await Notification.insertMany(notifications);
          console.log(`📢 [Community Post] ✅ Created ${savedNotifs.length} in-app notifications`);

          // Emit real-time Socket.IO notifications
          uniqueUserIds.forEach(userId => {
            const room = `user:${userId}`;
            io.to(room).emit('notification', {
              type: 'community_post',
              message: `${req.user.name} posted in community`,
              sender: {
                _id: req.user._id,
                name: req.user.name,
                profileImage: req.user.profileImage,
              },
            });
          });
          console.log(`📢 [Community Post] ✅ Emitted ${uniqueUserIds.length} socket notifications`);

          // Send Web Push notifications
          console.log(`📢 [Community Post] Sending web push to ${uniqueUserIds.length} connections...`);
          const pushPromises = uniqueUserIds.map(userId =>
            sendPushToUser(String(userId), {
              title: '📝 New Post from Connection',
              body: `${req.user.name}: ${content.length > 80 ? content.substring(0, 80) + '...' : content}`,
              icon: req.user.profileImage || '/icons/icon-192x192.png',
              url: '/community',
              type: 'community_post',
            })
          );
          const pushResults = await Promise.allSettled(pushPromises);
          const pushSuccess = pushResults.filter(r => r.status === 'fulfilled').length;
          console.log(`📢 [Community Post] ✅ Web push: ${pushSuccess} success, ${pushResults.length - pushSuccess} failed`);

          console.log(`✅ Sent community post notifications to ${uniqueUserIds.length} connections (in-app + socket + push)`);
        }
      } else {
        console.log('📢 [Community Post] ⚠️ No connections found!');
      }
    } catch (notifError) {
      console.error('❌ [Community Post] Notification error:', notifError);
      console.error('📢 [Community Post] Stack:', notifError.stack);
      // Don't fail post creation if notifications fail
    }

    res.status(201).json({
      success: true,
      data: {
        post,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message || 'Failed to create post',
        code: 'VALIDATION_ERROR',
      },
    });
  }
};

/**
 * Get posts for a community
 * GET /api/communities/:id/posts
 */
export const getPostsByCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const posts = await communityService.getPostsByCommunity(id, {
      page: pageNum,
      limit: limitNum,
    });

    const total = await communityService.getPostCount(id);

    res.status(200).json({
      success: true,
      data: {
        posts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch posts',
        code: 'SERVER_ERROR',
      },
    });
  }
};

export default {
  createCommunity,
  getCommunities,
  getCommunityById,
  joinCommunity,
  leaveCommunity,
  createPost,
  getPostsByCommunity,
};
