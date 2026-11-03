import SchoolChannel from '../models/SchoolChannel.js';
import SchoolChannelMessage from '../models/SchoolChannelMessage.js';
import User from '../models/User.js';
import { escapeRegex } from '../utils/sanitize.js';

class SchoolChannelService {
  /**
   * Get user's school channel
   * @param {string} userId - User ID
   * @returns {Promise<Object>} School channel
   */
  async getUserSchoolChannel(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.schoolName || !user.city) {
        throw new Error('User has no school information');
      }

      // Try to find channel by channelId first (exact match)
      const channelId = SchoolChannel.generateChannelId(user.schoolName, user.city);
      let channel = await SchoolChannel.findOne({ channelId })
        .populate('createdBy', 'name email profileImage')
        .lean();

      // If not found by channelId, try case-insensitive search on schoolName and city
      if (!channel) {
        const sanitizedSchool = escapeRegex(user.schoolName.trim());
        const sanitizedCity = escapeRegex(user.city.trim());
        channel = await SchoolChannel.findOne({
          schoolName: { $regex: new RegExp(`^${sanitizedSchool}$`, 'i') },
          city: { $regex: new RegExp(`^${sanitizedCity}$`, 'i') },
        })
          .populate('createdBy', 'name email profileImage')
          .lean();
      }

      if (!channel) {
        throw new Error('School channel not found');
      }

      // Auto-add user to channel if not already a member
      if (!channel.members.some(m => m.toString() === userId)) {
        await SchoolChannel.findByIdAndUpdate(channel._id, {
          $addToSet: { members: userId },
        });
        // Reload channel to get updated members
        channel = await SchoolChannel.findById(channel._id)
          .populate('createdBy', 'name email profileImage')
          .lean();
      }

      // Clean up duplicates in members array and verify all members exist
      const uniqueMembers = [...new Set(channel.members?.map(id => String(id)) || [])];
      
      // Verify each member exists in database
      const existingUsers = await User.find({ 
        _id: { $in: uniqueMembers } 
      }).select('_id').lean();
      
      const validMemberIds = existingUsers.map(u => String(u._id));
      
      // Update channel if we found duplicates or orphaned members
      if (uniqueMembers.length !== channel.members.length || validMemberIds.length !== uniqueMembers.length) {
        await SchoolChannel.findByIdAndUpdate(channel._id, {
          members: validMemberIds,
          'stats.totalMembers': validMemberIds.length,
        });
        
        // Reload to get updated data
        channel = await SchoolChannel.findById(channel._id)
          .populate('createdBy', 'name email profileImage')
          .lean();
      }

      // Ensure stats.totalMembers matches actual member count
      channel.stats.totalMembers = channel.members.length;

      return channel;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get channel messages
   * @param {string} userId - User ID
   * @param {number} limit - Message limit
   * @param {number} skip - Messages to skip
   * @returns {Promise<Array>} Channel messages
   */
  async getChannelMessages(userId, limit = 50, skip = 0) {
    try {
      const channel = await this.getUserSchoolChannel(userId);

      const messages = await SchoolChannelMessage.find({
        channelId: channel.channelId,
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('sender', 'name profileImage role')
        .lean();

      return messages.reverse(); // Return in chronological order
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send message to school channel
   * @param {string} userId - User ID
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} Created message
   */
  async sendMessage(userId, messageData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const channel = await this.getUserSchoolChannel(userId);

      // Check if user is a member of this channel
      if (!channel.members.some(m => m.toString() === userId)) {
        throw new Error('You are not a member of this channel');
      }

      // Only channel creator (admin) can post messages
      if (channel.createdBy.toString() !== userId) {
        throw new Error('Only the channel admin can post messages');
      }

      // Create message
      const message = await SchoolChannelMessage.create({
        channelId: channel.channelId,
        channel: channel._id,
        sender: userId,
        content: messageData.content,
        messageType: messageData.messageType || 'text',
        attachments: messageData.attachments || [],
        isPinned: messageData.isPinned || false,
      });

      // Update channel stats
      await SchoolChannel.findByIdAndUpdate(channel._id, {
        'stats.totalMessages': channel.stats.totalMessages + 1,
        'stats.lastActivityAt': new Date(),
      });

      // Populate sender info
      await message.populate('sender', 'name profileImage role');

      return message;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get channel members
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Channel members
   */
  async getChannelMembers(userId) {
    try {
      const channel = await this.getUserSchoolChannel(userId);

      // Remove duplicates from members array
      const uniqueMemberIds = [...new Set(channel.members?.map(id => String(id)) || [])];

      const members = await User.find({
        _id: { $in: uniqueMemberIds },
      })
        .select('name email profileImage role xp')
        .lean();

      // Filter out any null results
      const validMembers = members.filter(m => m !== null);

      return validMembers;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a message (only sender can delete)
   * @param {string} userId - User ID
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Deleted message
   */
  async deleteMessage(userId, messageId) {
    try {
      const message = await SchoolChannelMessage.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Only sender can delete their own message
      if (message.sender.toString() !== userId) {
        throw new Error('You can only delete your own messages');
      }

      message.isDeleted = true;
      await message.save();

      return message;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Pin/Unpin a message (admin only)
   * @param {string} userId - User ID
   * @param {string} messageId - Message ID
   * @param {boolean} pinned - Pin status
   * @returns {Promise<Object>} Updated message
   */
  async pinMessage(userId, messageId, pinned) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Only mentors/admins can pin messages
      if (user.role !== 'mentor') {
        throw new Error('Only admins can pin messages');
      }

      const message = await SchoolChannelMessage.findByIdAndUpdate(
        messageId,
        { isPinned: pinned },
        { new: true }
      ).populate('sender', 'name profileImage role');

      if (!message) {
        throw new Error('Message not found');
      }

      return message;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add reaction to a message
   * @param {string} userId - User ID
   * @param {string} messageId - Message ID
   * @param {string} emoji - Emoji reaction
   * @returns {Promise<Object>} Updated message
   */
  async addReaction(userId, messageId, emoji) {
    try {
      console.log(`\n🔔 REST API Reaction: User ${userId} → ${emoji} on message ${messageId}`);
      
      // Fetch current message
      const message = await SchoolChannelMessage.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      console.log(`📊 BEFORE: ${message.reactions.length} reactions`);

      // Convert to plain array for manipulation
      const userIdStr = String(userId);
      let reactions = message.reactions.map(r => ({
        emoji: r.emoji,
        userId: String(r.userId)
      }));

      // Check if user already has this exact emoji
      const hasThisEmoji = reactions.some(
        r => r.userId === userIdStr && r.emoji === emoji
      );

      if (hasThisEmoji) {
        // Toggle OFF - remove this reaction
        reactions = reactions.filter(
          r => !(r.userId === userIdStr && r.emoji === emoji)
        );
        console.log(`❌ Toggled OFF: Removed ${emoji}`);
      } else {
        // Remove ALL existing reactions from this user first (WhatsApp style)
        const beforeCount = reactions.length;
        reactions = reactions.filter(r => r.userId !== userIdStr);
        console.log(`🗑️ Removed ${beforeCount - reactions.length} old reactions`);
        
        // Add new reaction
        reactions.push({ emoji, userId: userIdStr });
        console.log(`✅ Added new: ${emoji}`);
      }

      console.log(`📊 AFTER: ${reactions.length} reactions`);

      // Direct MongoDB update
      const updated = await SchoolChannelMessage.findByIdAndUpdate(
        messageId,
        { $set: { reactions: reactions } },
        { new: true }
      ).populate('sender', 'name profileImage role');

      console.log(`✅ Database updated via REST API\n`);

      return updated;
    } catch (error) {
      console.error('❌ Error in addReaction:', error);
      throw error;
    }
  }

  /**
   * Get all school channels (admin only)
   * @returns {Promise<Array>} All school channels
   */
  async getAllChannels() {
    try {
      const channels = await SchoolChannel.find({ isActive: true })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      // Add member count to each channel (remove duplicates first)
      const channelsWithCount = channels.map(channel => {
        // Remove duplicate member IDs
        const uniqueMembers = [...new Set(channel.members?.map(id => String(id)) || [])];
        
        return {
          ...channel,
          memberCount: uniqueMembers.length,
          members: uniqueMembers, // Return cleaned members array
          stats: {
            ...channel.stats,
            totalMembers: uniqueMembers.length, // Fix stats.totalMembers
          },
        };
      });

      return channelsWithCount;
    } catch (error) {
      console.error('Error in getAllChannels:', error);
      throw error;
    }
  }

  /**
   * Get channel members by channel ID (admin only)
   * @param {string} channelId - Channel ID
   * @returns {Promise<Array>} Array of member details
   */
  async getChannelMembersById(channelId) {
    try {
      const channel = await SchoolChannel.findById(channelId);
      if (!channel) {
        throw new Error('Channel not found');
      }

      const members = await User.find({
        _id: { $in: channel.members }
      })
        .select('name email profileImage role xp schoolName city createdAt')
        .sort({ createdAt: -1 })
        .lean();

      return members;
    } catch (error) {
      console.error('Error in getChannelMembersById:', error);
      throw error;
    }
  }

  /**
   * Create a new school channel (admin only)
   * @param {string} adminId - Admin user ID
   * @param {Object} channelData - Channel data
   * @returns {Promise<Object>} Created channel
   */
  async createChannel(adminId, channelData) {
    try {
      const { schoolName, city, description } = channelData;

      if (!schoolName || !city) {
        throw new Error('School name and city are required');
      }

      const channelId = SchoolChannel.generateChannelId(schoolName, city);

      // Check if channel already exists
      const existingChannel = await SchoolChannel.findOne({ channelId });
      if (existingChannel) {
        throw new Error('Channel for this school already exists');
      }

      // Create channel
      const channel = await SchoolChannel.create({
        schoolName,
        city,
        channelId,
        description: description || `Official channel for ${schoolName}, ${city}`,
        createdBy: adminId,
        members: [],
        stats: {
          totalMembers: 0,
          totalMessages: 0,
          lastActivityAt: new Date(),
        },
      });

      // Auto-add all students from this school
      const students = await User.find({
        schoolName,
        city,
        role: 'student',
      });

      if (students.length > 0) {
        channel.members = students.map(s => s._id);
        channel.stats.totalMembers = students.length;
        await channel.save();
      }

      return channel;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a school channel (admin only)
   * @param {string} channelId - Channel ID
   * @returns {Promise<void>}
   */
  async deleteChannel(channelId) {
    try {
      const channel = await SchoolChannel.findById(channelId);
      if (!channel) {
        throw new Error('Channel not found');
      }

      // Delete all messages in this channel
      await SchoolChannelMessage.deleteMany({ channel: channelId });

      // Delete the channel
      await SchoolChannel.findByIdAndDelete(channelId);
    } catch (error) {
      throw error;
    }
  }
  /**
   * Broadcast message to multiple channels (admin only)
   * @param {string} adminId - Admin user ID
   * @param {string} message - Message content
   * @param {Array} channelIds - Array of channel IDs
   * @returns {Promise<Object>} Broadcast result
   */
  async broadcastMessage(adminId, message, channelIds) {
    try {
      const results = [];
      
      for (const channelId of channelIds) {
        try {
          const channel = await SchoolChannel.findById(channelId);
          
          if (!channel) {
            results.push({ channelId, success: false, error: 'Channel not found' });
            continue;
          }

          // Create message
          const newMessage = await SchoolChannelMessage.create({
            channelId: channel.channelId,
            channel: channel._id,
            sender: adminId,
            content: message,
            messageType: 'text',
            attachments: [],
            isPinned: false,
          });

          // Update channel stats
          await SchoolChannel.findByIdAndUpdate(channel._id, {
            'stats.totalMessages': channel.stats.totalMessages + 1,
            'stats.lastActivityAt': new Date(),
          });

          results.push({ 
            channelId, 
            channelName: `${channel.schoolName} (${channel.city})`,
            success: true,
            messageId: newMessage._id
          });
        } catch (error) {
          console.error(`Error broadcasting to channel ${channelId}:`, error);
          results.push({ channelId, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      return {
        total: channelIds.length,
        success: successCount,
        failed: failureCount,
        results
      };
    } catch (error) {
      console.error('Error in broadcastMessage:', error);
      throw error;
    }
  }

  /**
   * Get all messages across all channels (admin only)
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Messages with metadata
   */
  async getAllMessagesAdmin(filters = {}) {
    try {
      const { channelId, limit = 100, skip = 0, search, dateFrom, dateTo } = filters;

      // Build query
      const query = { isDeleted: false };

      if (channelId) {
        query.channel = channelId;
      }

      if (search) {
        query.content = { $regex: escapeRegex(search), $options: 'i' };
      }

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      // Fetch messages with channel and sender info
      const messages = await SchoolChannelMessage.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('sender', 'name email profileImage role')
        .populate('channel', 'schoolName city channelId')
        .lean();

      const total = await SchoolChannelMessage.countDocuments(query);

      return {
        messages,
        total,
        limit,
        skip,
        hasMore: skip + messages.length < total
      };
    } catch (error) {
      console.error('Error in getAllMessagesAdmin:', error);
      throw error;
    }
  }

  /**
   * Delete any message (admin only)
   * @param {string} messageId - Message ID
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Deleted message
   */
  async deleteMessageAdmin(messageId, adminId) {
    try {
      const message = await SchoolChannelMessage.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      message.isDeleted = true;
      await message.save();

      return message;
    } catch (error) {
      console.error('Error in deleteMessageAdmin:', error);
      throw error;
    }
  }
}

export default new SchoolChannelService();
