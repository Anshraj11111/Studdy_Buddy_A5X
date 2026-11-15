import Room from '../models/Room.js';

class RoomService {
  /**
   * Get room by ID
   * @param {string} roomId - Room ID
   * @returns {Object} - Room object with populated references
   */
  async getRoomById(roomId) {
    try {
      const room = await Room.findById(roomId)
        .populate('student1', 'name email profileImage')
        .populate('student2', 'name email profileImage')
        .populate('doubt1')
        .populate('doubt2');

      if (!room) {
        throw new Error('Room not found');
      }

      return room;
    } catch (error) {
      console.error('Error getting room by ID:', error);
      throw error;
    }
  }

  /**
   * Get all rooms for a user
   * @param {string} userId - User ID
   * @param {Object} options - Options { page, limit, status }
   * @returns {Array} - Array of room objects
   */
  async getRoomsByUser(userId, options = {}) {
    try {
      const { page = 1, limit = 10, status } = options;
      const skip = (page - 1) * limit;

      const query = {
        $or: [{ student1: userId }, { student2: userId }],
      };

      if (status) {
        query.status = status;
      }

      const rooms = await Room.find(query)
        .populate('student1', 'name email profileImage')
        .populate('student2', 'name email profileImage')
        .populate('doubt1')
        .populate('doubt2')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return rooms;
    } catch (error) {
      console.error('Error getting rooms by user:', error);
      throw error;
    }
  }

  /**
   * Get count of rooms for a user
   * @param {string} userId - User ID
   * @param {string} status - Optional status filter
   * @returns {number} - Count of rooms
   */
  async getRoomCountByUser(userId, status) {
    try {
      const query = {
        $or: [{ student1: userId }, { student2: userId }],
      };

      if (status) {
        query.status = status;
      }

      const count = await Room.countDocuments(query);
      return count;
    } catch (error) {
      console.error('Error getting room count by user:', error);
      throw error;
    }
  }

  /**
   * Update room status
   * @param {string} roomId - Room ID
   * @param {string} status - New status (active, completed, abandoned)
   * @returns {Object} - Updated room object
   */
  async updateRoomStatus(roomId, status) {
    try {
      if (!['active', 'completed', 'abandoned'].includes(status)) {
        throw new Error('Invalid room status');
      }

      const room = await Room.findByIdAndUpdate(
        roomId,
        { status },
        { new: true }
      )
        .populate('student1', 'name email profileImage')
        .populate('student2', 'name email profileImage')
        .populate('doubt1')
        .populate('doubt2');

      if (!room) {
        throw new Error('Room not found');
      }

      return room;
    } catch (error) {
      console.error('Error updating room status:', error);
      throw error;
    }
  }

  /**
   * Get active rooms count
   * @returns {number} - Count of active rooms
   */
  async getActiveRoomsCount() {
    try {
      const count = await Room.countDocuments({ status: 'active' });
      return count;
    } catch (error) {
      console.error('Error getting active rooms count:', error);
      throw error;
    }
  }

  /**
   * Get rooms by topic
   * @param {string} topic - Topic name
   * @param {Object} options - Options { page, limit }
   * @returns {Array} - Array of room objects
   */
  async getRoomsByTopic(topic, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      const rooms = await Room.find({ topic })
        .populate('student1', 'name email profileImage')
        .populate('student2', 'name email profileImage')
        .populate('doubt1')
        .populate('doubt2')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return rooms;
    } catch (error) {
      console.error('Error getting rooms by topic:', error);
      throw error;
    }
  }

  /**
   * Get room statistics
   * @returns {Object} - Statistics object
   */
  async getRoomStatistics() {
    try {
      const totalRooms = await Room.countDocuments({});
      const activeRooms = await Room.countDocuments({ status: 'active' });
      const completedRooms = await Room.countDocuments({ status: 'completed' });
      const abandonedRooms = await Room.countDocuments({ status: 'abandoned' });

      return {
        total: totalRooms,
        active: activeRooms,
        completed: completedRooms,
        abandoned: abandonedRooms,
      };
    } catch (error) {
      console.error('Error getting room statistics:', error);
      throw error;
    }
  }
}

export default new RoomService();
