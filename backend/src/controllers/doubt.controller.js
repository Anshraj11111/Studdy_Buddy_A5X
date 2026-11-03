import doubtService from '../services/doubt.service.js';
import matchService from '../services/match.service.js';
import { addXP } from '../services/xp.service.js';
import cache from '../services/cache.service.js';
import { checkContent } from '../utils/contentFilter.js';

// Cache TTLs
const DOUBTS_LIST_TTL = 30;  // 30 seconds — list is frequently changing

/**
 * Create a new doubt
 * POST /api/doubts
 */
export const createDoubt = async (req, res) => {
  try {
    const { title, description, topic, tags } = req.body;

    // Input validation
    if (!title || !description || !topic) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide title, description, and topic',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Title cannot exceed 200 characters',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    if (description.length > 5000) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Description cannot exceed 5000 characters',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // Content moderation - block abusive words in title and description
    const titleMod = checkContent(title);
    if (titleMod.blocked) {
      return res.status(400).json({
        success: false,
        error: {
          message: titleMod.reason,
          code: 'CONTENT_BLOCKED',
        },
      });
    }

    const descMod = checkContent(description);
    if (descMod.blocked) {
      return res.status(400).json({
        success: false,
        error: {
          message: descMod.reason,
          code: 'CONTENT_BLOCKED',
        },
      });
    }

    // Create doubt
    const doubt = await doubtService.createDoubt({
      title,
      description,
      topic,
      tags: tags || [],
      userId: req.user._id,
    });

    // Try to find a matching doubt and create a room
    let room = null;
    try {
      room = await matchService.findAndMatch(doubt._id);
    } catch (matchError) {
      // Log matching error but don't fail the doubt creation
      console.error('Error during doubt matching:', matchError);
    }

    // Award XP for posting a doubt
    await addXP(req.user._id, 'doubt_posted');

    // Send notification to all mentors about new doubt
    try {
      console.log('📢 [Doubt Notification] Starting notification process...');
      const User = (await import('../models/User.js')).default;
      const Notification = (await import('../models/Notification.js')).default;
      const { sendPushToUser } = await import('../services/webPush.service.js');

      // Get Socket.IO instance from app
      const io = req.app.get('io');
      
      // Find all mentors
      const mentors = await User.find({ role: 'mentor' }).select('_id name').lean();
      console.log(`📢 [Doubt Notification] Found ${mentors.length} mentors:`, mentors.map(m => m.name));
      
      if (mentors.length > 0) {
        // Create notifications for all mentors
        const notifications = mentors.map(mentor => ({
          recipient: mentor._id,
          sender: req.user._id,
          type: 'doubt',
          doubtId: doubt._id,
          message: `New doubt posted: "${title.length > 50 ? title.substring(0, 50) + '...' : title}"`,
          read: false,
        }));

        const savedNotifs = await Notification.insertMany(notifications);
        console.log(`📢 [Doubt Notification] ✅ Created ${savedNotifs.length} in-app notifications`);
        
        // Emit real-time notification to online mentors via Socket.io
        mentors.forEach(mentor => {
          const room = `user:${mentor._id.toString()}`;
          console.log(`📢 [Doubt Notification] Emitting socket to room: ${room}`);
          io.to(room).emit('notification', {
            type: 'doubt',
            doubtId: doubt._id,
            message: `New doubt: ${title.length > 50 ? title.substring(0, 50) + '...' : title}`,
            sender: {
              _id: req.user._id,
              name: req.user.name,
              profileImage: req.user.profileImage,
            },
          });
        });
        console.log(`📢 [Doubt Notification] ✅ Emitted ${mentors.length} socket notifications`);

        // Send Web Push Notifications to all mentors (even if offline/browser closed)
        console.log(`📢 [Doubt Notification] Sending web push to ${mentors.length} mentors...`);
        const pushPromises = mentors.map(mentor =>
          sendPushToUser(mentor._id.toString(), {
            title: '🆘 New Doubt Posted',
            body: title.length > 80 ? title.substring(0, 80) + '...' : title,
            icon: req.user.profileImage || '/icons/icon-192x192.png',
            url: '/doubts',
            type: 'doubt',
          })
        );
        const pushResults = await Promise.allSettled(pushPromises);
        const pushSuccess = pushResults.filter(r => r.status === 'fulfilled').length;
        console.log(`📢 [Doubt Notification] ✅ Web push: ${pushSuccess} success, ${pushResults.length - pushSuccess} failed`);

        console.log(`✅ Sent doubt notifications to ${mentors.length} mentors (in-app + socket + push)`);
      } else {
        console.log('📢 [Doubt Notification] ⚠️ No mentors found!');
      }
    } catch (notifError) {
      console.error('❌ [Doubt Notification] Error:', notifError);
      console.error('📢 [Doubt Notification] Stack:', notifError.stack);
      // Don't fail doubt creation if notifications fail
    }

    // Invalidate doubts list cache
    await cache.delPattern('doubts:list:');

    res.status(201).json({
      success: true,
      data: {
        doubt,
        room: room || null,
        matched: room !== null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create doubt',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Get all doubts with pagination
 * GET /api/doubts
 */
export const getDoubts = async (req, res) => {
  try {
    const { page = 1, limit = 10, topic, status, userId } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 10));

    const filters = {};
    if (topic) filters.topic = topic;
    if (status) filters.status = status;
    if (userId) filters.userId = userId;

    // Cache key based on query params
    const cacheKey = `doubts:list:${JSON.stringify(filters)}:${pageNum}:${limitNum}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const doubts = await doubtService.getDoubts(filters, { page: pageNum, limit: limitNum });
    const total = await doubtService.getDoubtsCount(filters);

    const response = {
      success: true,
      data: {
        doubts,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    };

    await cache.set(cacheKey, response, DOUBTS_LIST_TTL);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch doubts', code: 'SERVER_ERROR' } });
  }
};

/**
 * Get doubt by ID
 * GET /api/doubts/:id
 */
export const getDoubtById = async (req, res) => {
  try {
    const { id } = req.params;

    const doubt = await doubtService.getDoubtById(id);

    res.status(200).json({
      success: true,
      data: {
        doubt,
      },
    });
  } catch (error) {
    if (error.message === 'Doubt not found') {
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
        message: 'Failed to fetch doubt',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Search doubts
 * GET /api/doubts/search
 */
export const searchDoubts = async (req, res) => {
  try {
    const { keyword, page = 1, limit = 10 } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide a search keyword',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 10));

    const doubts = await doubtService.searchDoubts(keyword, {
      page: pageNum,
      limit: limitNum,
    });

    res.status(200).json({
      success: true,
      data: {
        doubts,
        pagination: {
          page: pageNum,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to search doubts',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Get doubts by topic
 * GET /api/doubts/topic/:topic
 */
export const getDoubtsByTopic = async (req, res) => {
  try {
    const { topic } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 10));

    const doubts = await doubtService.getDoubtsByTopic(topic, {
      page: pageNum,
      limit: limitNum,
    });

    const total = await doubtService.getDoubtsCount({ topic });

    res.status(200).json({
      success: true,
      data: {
        doubts,
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
        message: 'Failed to fetch doubts by topic',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Find match for a doubt manually
 * POST /api/doubts/:id/find-match
 */
export const findMatch = async (req, res) => {
  try {
    const { id } = req.params;

    // Get the doubt
    const doubt = await doubtService.getDoubtById(id);

    // Check if user owns this doubt
    const doubtUserId = doubt.userId._id ? doubt.userId._id.toString() : doubt.userId.toString();
    const currentUserId = req.user._id.toString();
    
    if (doubtUserId !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You can only find matches for your own doubts',
          code: 'FORBIDDEN',
        },
      });
    }

    // Check if doubt is already matched
    if (doubt.status === 'matched') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'This doubt is already matched',
          code: 'ALREADY_MATCHED',
        },
      });
    }

    // Try to find a matching doubt and create a room
    let room = null;
    try {
      room = await matchService.findAndMatch(id);
    } catch (matchError) {
      console.error('Error during doubt matching:', matchError);
    }

    res.status(200).json({
      success: true,
      data: {
        matched: room !== null,
        room: room || null,
      },
    });
  } catch (error) {
    if (error.message === 'Doubt not found') {
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
        message: 'Failed to find match',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Update doubt
 * PUT /api/doubts/:id
 */
export const updateDoubt = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, topic, tags } = req.body;

    // Get the doubt first to check ownership
    const doubt = await doubtService.getDoubtById(id);

    // Check if user owns this doubt - handle both populated and non-populated userId
    const doubtUserId = doubt.userId._id ? doubt.userId._id.toString() : doubt.userId.toString();
    const currentUserId = req.user._id.toString();
    
    if (doubtUserId !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You can only update your own doubts',
          code: 'FORBIDDEN',
        },
      });
    }

    // Update the doubt
    const updatedDoubt = await doubtService.updateDoubt(id, { title, description, topic, tags });

    // Invalidate cache
    await cache.delPattern('doubts:list:');

    res.status(200).json({ success: true, data: { doubt: updatedDoubt } });
  } catch (error) {
    if (error.message === 'Doubt not found') {
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
        message: 'Failed to update doubt',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Delete doubt
 * DELETE /api/doubts/:id
 */
export const deleteDoubt = async (req, res) => {
  try {
    const { id } = req.params;

    // Get the doubt first to check ownership
    const doubt = await doubtService.getDoubtById(id);

    // Check if user owns this doubt - handle both populated and non-populated userId
    const doubtUserId = doubt.userId._id ? doubt.userId._id.toString() : doubt.userId.toString();
    const currentUserId = req.user._id.toString();
    
    if (doubtUserId !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You can only delete your own doubts',
          code: 'FORBIDDEN',
        },
      });
    }

    // Delete the doubt
    await doubtService.deleteDoubt(id);

    // Invalidate cache
    await cache.delPattern('doubts:list:');

    res.status(200).json({ success: true, data: { message: 'Doubt deleted successfully' } });
  } catch (error) {
    if (error.message === 'Doubt not found') {
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
        message: 'Failed to delete doubt',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Add reply to a doubt
 * POST /api/doubts/:id/replies
 */
export const addReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, images } = req.body;

    // At least content or images required
    if ((!content || !content.trim()) && (!images || images.length === 0)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Reply content or images are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const doubt = await doubtService.addReply(id, {
      user: req.user._id,
      content: content?.trim() || '',
      images: images || [], // Array of Cloudinary URLs
    });

    if (!doubt) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Doubt not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Award XP for replying to a doubt
    await addXP(req.user._id, 'doubt_posted'); // Replying is similar effort to posting

    // Send notification to the doubt owner (student) when someone replies
    try {
      console.log('📢 [Reply Notification] Starting notification process...');
      
      // Get the doubt owner ID
      const doubtOwnerId = doubt.userId._id ? doubt.userId._id.toString() : doubt.userId.toString();
      const currentUserId = req.user._id.toString();
      
      // Only send notification if reply is NOT from the doubt owner themselves
      if (doubtOwnerId !== currentUserId) {
        const User = (await import('../models/User.js')).default;
        const Notification = (await import('../models/Notification.js')).default;
        const { sendPushToUser } = await import('../services/webPush.service.js');
        const io = req.app.get('io');
        
        // Get doubt owner details
        const doubtOwner = await User.findById(doubtOwnerId).select('_id name').lean();
        
        if (doubtOwner) {
          console.log(`📢 [Reply Notification] Sending to student: ${doubtOwner.name}`);
          
          // Create in-app notification
          const notification = await Notification.create({
            recipient: doubtOwner._id,
            sender: req.user._id,
            type: 'doubt_reply',
            doubtId: doubt._id,
            message: `${req.user.name} replied to your doubt: "${doubt.title.length > 50 ? doubt.title.substring(0, 50) + '...' : doubt.title}"`,
            read: false,
          });
          console.log(`📢 [Reply Notification] ✅ Created in-app notification`);
          
          // Emit real-time Socket.IO notification
          const room = `user:${doubtOwner._id.toString()}`;
          console.log(`📢 [Reply Notification] Emitting socket to room: ${room}`);
          io.to(room).emit('notification', {
            type: 'doubt_reply',
            doubtId: doubt._id,
            message: `${req.user.name} replied to your doubt`,
            sender: {
              _id: req.user._id,
              name: req.user.name,
              profileImage: req.user.profileImage,
            },
          });
          console.log(`📢 [Reply Notification] ✅ Emitted socket notification`);
          
          // Send Web Push notification
          await sendPushToUser(doubtOwner._id.toString(), {
            title: '💬 New Reply to Your Doubt',
            body: `${req.user.name} replied: ${content?.substring(0, 80) || 'View reply'}`,
            icon: req.user.profileImage || '/icons/icon-192x192.png',
            url: `/doubts/${doubt._id}`,
            type: 'doubt_reply',
          });
          console.log(`📢 [Reply Notification] ✅ Web push sent`);
          
          console.log(`✅ Sent reply notification to student ${doubtOwner.name}`);
        }
      } else {
        console.log(`📢 [Reply Notification] Skipped - reply from doubt owner themselves`);
      }
    } catch (notifError) {
      console.error('❌ [Reply Notification] Error:', notifError);
      // Don't fail reply creation if notification fails
    }

    res.status(200).json({
      success: true,
      data: { doubt },
    });
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to add reply',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Edit a reply
 * PUT /api/doubts/:id/replies/:replyId
 */
export const editReply = async (req, res) => {
  try {
    const { id, replyId } = req.params;
    const { content, images } = req.body;

    // At least content or images required
    if ((!content || !content.trim()) && (!images || images.length === 0)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Reply content or images are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const doubt = await doubtService.editReply(
      id, 
      replyId, 
      req.user._id, 
      content?.trim() || '', 
      images || []
    );

    if (!doubt) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Doubt or reply not found',
          code: 'NOT_FOUND',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: { doubt },
    });
  } catch (error) {
    console.error('Error editing reply:', error);
    if (error.message === 'Unauthorized') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You can only edit your own replies',
          code: 'FORBIDDEN',
        },
      });
    }
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to edit reply',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Delete a reply
 * DELETE /api/doubts/:id/replies/:replyId
 */
export const deleteReply = async (req, res) => {
  try {
    const { id, replyId } = req.params;

    const doubt = await doubtService.deleteReply(id, replyId, req.user._id);

    if (!doubt) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Doubt or reply not found',
          code: 'NOT_FOUND',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: { doubt },
    });
  } catch (error) {
    console.error('Error deleting reply:', error);
    if (error.message === 'Unauthorized') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You can only delete your own replies',
          code: 'FORBIDDEN',
        },
      });
    }
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete reply',
        code: 'SERVER_ERROR',
      },
    });
  }
};


export default {
  createDoubt,
  getDoubts,
  getDoubtById,
  searchDoubts,
  getDoubtsByTopic,
  findMatch,
  updateDoubt,
  deleteDoubt,
  addReply,
  editReply,
  deleteReply,
};
