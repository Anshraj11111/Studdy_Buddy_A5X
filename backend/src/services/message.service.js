import Message from '../models/Message.js';

class MessageService {
  /**
   * Save a message to the database
   * @param {string} senderId - ID of the user sending the message
   * @param {string} roomId - ID of the room
   * @param {string} content - Message content
   * @returns {Object} - Saved message object
   */
  async saveMessage(senderId, roomId, content) {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error('Message content cannot be empty');
      }

      if (content.length > 5000) {
        throw new Error('Message content cannot exceed 5000 characters');
      }

      const message = new Message({
        senderId,
        roomId,
        content: content.trim(),
      });

      await message.save();
      return message.populate('senderId', 'name profileImage');
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  /**
   * Save a message with image to the database
   * @param {string} senderId - ID of the user sending the message
   * @param {string} roomId - ID of the room
   * @param {string} content - Message content (optional)
   * @param {string} imageUrl - URL of uploaded image
   * @returns {Object} - Saved message object
   */
  async saveMessageWithImage(senderId, roomId, content, imageUrl) {
    try {
      if (!imageUrl) {
        throw new Error('Image URL is required');
      }

      if (content && content.length > 5000) {
        throw new Error('Message content cannot exceed 5000 characters');
      }

      const message = new Message({
        senderId,
        roomId,
        content: content?.trim() || '',
        imageUrl,
      });

      await message.save();
      return message.populate('senderId');
    } catch (error) {
      console.error('Error saving message with image:', error);
      throw error;
    }
  }

  /**
   * Get messages for a room with pagination
   * @param {string} roomId - ID of the room
   * @param {Object} options - Pagination options { page, limit }
   * @returns {Array} - Array of messages in chronological order
   */
  async getMessagesByRoom(roomId, options = {}) {
    try {
      const { page = 1, limit = 50 } = options;
      const skip = (page - 1) * limit;

      const messages = await Message.find({ roomId })
        .populate('senderId', 'name profileImage')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit);

      return messages;
    } catch (error) {
      console.error('Error getting messages by room:', error);
      throw error;
    }
  }

  /**
   * Get total message count for a room
   * @param {string} roomId - ID of the room
   * @returns {number} - Total message count
   */
  async getMessageCount(roomId) {
    try {
      const count = await Message.countDocuments({ roomId });
      return count;
    } catch (error) {
      console.error('Error getting message count:', error);
      throw error;
    }
  }

  /**
   * Delete a message
   * @param {string} messageId - ID of the message
   * @returns {Object} - Deleted message object
   */
  async deleteMessage(messageId) {
    try {
      const message = await Message.findByIdAndDelete(messageId);
      if (!message) {
        throw new Error('Message not found');
      }
      return message;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Get latest messages for a room
   * @param {string} roomId - ID of the room
   * @param {number} limit - Number of latest messages to retrieve
   * @returns {Array} - Array of latest messages
   */
  async getLatestMessages(roomId, limit = 50) {
    try {
      const messages = await Message.find({ roomId })
        .populate('senderId', 'name profileImage')
        .sort({ createdAt: -1 })
        .limit(limit);

      // Reverse to get chronological order
      return messages.reverse();
    } catch (error) {
      console.error('Error getting latest messages:', error);
      throw error;
    }
  }

  /**
   * Get messages between two timestamps
   * @param {string} roomId - ID of the room
   * @param {Date} startTime - Start timestamp
   * @param {Date} endTime - End timestamp
   * @returns {Array} - Array of messages in the time range
   */
  async getMessagesByTimeRange(roomId, startTime, endTime) {
    try {
      const messages = await Message.find({
        roomId,
        createdAt: { $gte: startTime, $lte: endTime },
      })
        .populate('senderId', 'name profileImage')
        .sort({ createdAt: 1 });

      return messages;
    } catch (error) {
      console.error('Error getting messages by time range:', error);
      throw error;
    }
  }
}

export default new MessageService();
