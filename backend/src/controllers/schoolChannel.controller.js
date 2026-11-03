import schoolChannelService from '../services/schoolChannel.service.js';

/**
 * Get user's school channel
 * GET /api/school-channel
 */
export const getUserChannel = async (req, res) => {
  try {
    const channel = await schoolChannelService.getUserSchoolChannel(req.user._id);

    res.status(200).json({
      success: true,
      data: { channel },
    });
  } catch (error) {
    if (error.message === 'User has no school information') {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
          code: 'NO_SCHOOL_INFO',
        },
      });
    }

    if (error.message === 'School channel not found') {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'CHANNEL_NOT_FOUND',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch school channel',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Get channel messages
 * GET /api/school-channel/messages
 */
export const getMessages = async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    const messages = await schoolChannelService.getChannelMessages(
      req.user._id,
      parseInt(limit),
      parseInt(skip)
    );

    res.status(200).json({
      success: true,
      data: { messages },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch messages',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Send message to channel
 * POST /api/school-channel/messages
 */
export const sendMessage = async (req, res) => {
  try {
    const { content, messageType, attachments, isPinned } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Message content is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const message = await schoolChannelService.sendMessage(req.user._id, {
      content,
      messageType,
      attachments,
      isPinned,
    });

    res.status(201).json({
      success: true,
      data: { message },
    });
  } catch (error) {
    if (error.message === 'You are not a member of this channel') {
      return res.status(403).json({
        success: false,
        error: {
          message: error.message,
          code: 'NOT_A_MEMBER',
        },
      });
    }

    if (error.message === 'Only the channel admin can post messages') {
      return res.status(403).json({
        success: false,
        error: {
          message: error.message,
          code: 'ADMIN_ONLY',
        },
      });
    }

    if (error.message === 'Only admins can post in this channel') {
      return res.status(403).json({
        success: false,
        error: {
          message: error.message,
          code: 'PERMISSION_DENIED',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to send message',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Get channel members
 * GET /api/school-channel/members
 */
export const getMembers = async (req, res) => {
  try {
    const members = await schoolChannelService.getChannelMembers(req.user._id);

    res.status(200).json({
      success: true,
      data: { members },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch members',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Delete a message
 * DELETE /api/school-channel/messages/:messageId
 */
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await schoolChannelService.deleteMessage(req.user._id, messageId);

    res.status(200).json({
      success: true,
      data: { message },
    });
  } catch (error) {
    if (error.message === 'Message not found') {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'MESSAGE_NOT_FOUND',
        },
      });
    }

    if (error.message === 'You can only delete your own messages') {
      return res.status(403).json({
        success: false,
        error: {
          message: error.message,
          code: 'PERMISSION_DENIED',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete message',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Pin/Unpin a message
 * PUT /api/school-channel/messages/:messageId/pin
 */
export const pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { pinned } = req.body;

    const message = await schoolChannelService.pinMessage(req.user._id, messageId, pinned);

    res.status(200).json({
      success: true,
      data: { message },
    });
  } catch (error) {
    if (error.message === 'Only admins can pin messages') {
      return res.status(403).json({
        success: false,
        error: {
          message: error.message,
          code: 'PERMISSION_DENIED',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to pin message',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Add reaction to message
 * POST /api/school-channel/messages/:messageId/react
 */
export const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Emoji is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const message = await schoolChannelService.addReaction(req.user._id, messageId, emoji);

    res.status(200).json({
      success: true,
      data: { message },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to add reaction',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Get all school channels (admin only)
 * GET /api/school-channel/admin/all
 */
export const getAllChannels = async (req, res) => {
  try {
    // Allow access for authenticated users (they passed admin panel auth already)
    const channels = await schoolChannelService.getAllChannels();

    res.status(200).json({
      success: true,
      channels,
    });
  } catch (error) {
    console.error('Error fetching all channels:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch channels',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Get channel members with full details (admin only)
 * GET /api/school-channel/admin/:id/members
 */
export const getChannelMembersAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const members = await schoolChannelService.getChannelMembersById(id);

    res.status(200).json({
      success: true,
      members,
    });
  } catch (error) {
    console.error('Error fetching channel members:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch members',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Create a new school channel (admin only)
 * POST /api/school-channel/admin/create
 */
export const createChannel = async (req, res) => {
  try {
    const { schoolName, city, description } = req.body;

    if (!schoolName || !city) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'School name and city are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // For admin routes, req.user might be undefined when using admin secret
    // Find any admin user as fallback
    let userId = req.user?._id;
    if (!userId) {
      const User = (await import('../models/User.js')).default;
      const adminUser = await User.findOne({ role: 'admin' });
      userId = adminUser?._id || (await User.findOne())?._id;
    }

    const channel = await schoolChannelService.createChannel(userId, {
      schoolName,
      city,
      description,
    });

    res.status(201).json({
      success: true,
      data: { channel },
    });
  } catch (error) {
    if (error.message === 'Channel for this school already exists') {
      return res.status(409).json({
        success: false,
        error: {
          message: error.message,
          code: 'CHANNEL_EXISTS',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create channel',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Delete a school channel (admin only)
 * DELETE /api/school-channel/admin/:id
 */
export const deleteChannel = async (req, res) => {
  try {
    const { id } = req.params;
    await schoolChannelService.deleteChannel(id);

    res.status(200).json({
      success: true,
      message: 'Channel deleted successfully',
    });
  } catch (error) {
    if (error.message === 'Channel not found') {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'CHANNEL_NOT_FOUND',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete channel',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Broadcast message to multiple channels (admin only)
 * POST /api/school-channel/admin/broadcast
 */
export const broadcastMessage = async (req, res) => {
  try {
    const { message, channelIds } = req.body;

    if (!message || !channelIds || channelIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Message and channel IDs are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // For admin routes, req.user might be undefined when using admin secret
    let userId = req.user?._id;
    if (!userId) {
      const User = (await import('../models/User.js')).default;
      const adminUser = await User.findOne({ role: 'admin' });
      userId = adminUser?._id || (await User.findOne())?._id;
    }

    const result = await schoolChannelService.broadcastMessage(userId, message, channelIds);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error broadcasting message:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to broadcast message',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Get all messages from all channels (admin only)
 * GET /api/school-channel/admin/messages
 */
export const getAllMessages = async (req, res) => {
  try {
    const { channelId, limit, skip, search, dateFrom, dateTo } = req.query;

    const result = await schoolChannelService.getAllMessagesAdmin({
      channelId,
      limit: limit ? parseInt(limit) : 100,
      skip: skip ? parseInt(skip) : 0,
      search,
      dateFrom,
      dateTo,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching all messages:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch messages',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Delete any message as admin
 * DELETE /api/school-channel/admin/messages/:messageId
 */
export const deleteMessageAdmin = async (req, res) => {
  try {
    const { messageId } = req.params;
    // For admin routes, req.user might be undefined when using admin secret
    const userId = req.user?._id || null;
    const message = await schoolChannelService.deleteMessageAdmin(messageId, userId);

    res.status(200).json({
      success: true,
      data: { message },
    });
  } catch (error) {
    if (error.message === 'Message not found') {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'MESSAGE_NOT_FOUND',
        },
      });
    }

    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete message',
        code: 'SERVER_ERROR',
      },
    });
  }
};

export default {
  getUserChannel,
  getMessages,
  sendMessage,
  getMembers,
  deleteMessage,
  pinMessage,
  addReaction,
  getAllChannels,
  getChannelMembersAdmin,
  createChannel,
  deleteChannel,
  broadcastMessage,
  getAllMessages,
  deleteMessageAdmin,
};
