import Room from '../models/Room.js';
import Doubt from '../models/Doubt.js';

class MatchService {
  /**
   * Extract keywords from doubt title and description
   * @param {Object} doubt - Doubt object
   * @returns {Array} - Array of keywords
   */
  extractKeywords(doubt) {
    const text = `${doubt.title} ${doubt.description}`.toLowerCase();
    // Remove common words and split into keywords
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were', 'how', 'what', 'why', 'when', 'where', 'i', 'my', 'me', 'can', 'could', 'should', 'would'];
    const words = text.match(/\b\w+\b/g) || [];
    return words.filter(word => word.length > 3 && !commonWords.includes(word));
  }

  /**
   * Calculate keyword match score between two doubts
   * @param {Array} keywords1 - Keywords from first doubt
   * @param {Array} keywords2 - Keywords from second doubt
   * @returns {number} - Number of matching keywords
   */
  calculateMatchScore(keywords1, keywords2) {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    let matches = 0;
    
    for (const keyword of set1) {
      if (set2.has(keyword)) {
        matches++;
      }
    }
    
    return matches;
  }

  /**
   * Find a matching doubt and create a room if found
   * @param {string} doubtId - The newly created doubt ID
   * @returns {Object|null} - Room object if match found, null otherwise
   */
  async findAndMatch(doubtId) {
    try {
      // Get the newly created doubt
      const newDoubt = await Doubt.findById(doubtId).populate('userId');
      if (!newDoubt) {
        throw new Error('Doubt not found');
      }

      console.log('Finding match for doubt:', {
        doubtId: newDoubt._id,
        topic: newDoubt.topic,
        userId: newDoubt.userId._id,
        status: newDoubt.status
      });

      // Extract keywords from new doubt
      const newDoubtKeywords = this.extractKeywords(newDoubt);
      console.log('New doubt keywords:', newDoubtKeywords);

      // Find all open doubts with the same topic (excluding the current doubt and current user's doubts)
      const potentialMatches = await Doubt.find({
        _id: { $ne: doubtId },
        userId: { $ne: newDoubt.userId._id }, // Exclude current user's doubts
        topic: newDoubt.topic,
        status: 'open',
      }).populate('userId');

      console.log('Potential matches found:', potentialMatches.length);

      // Find best match based on keyword similarity
      let bestMatch = null;
      let bestScore = 0;

      for (const doubt of potentialMatches) {
        const doubtKeywords = this.extractKeywords(doubt);
        const score = this.calculateMatchScore(newDoubtKeywords, doubtKeywords);
        
        console.log(`Doubt ${doubt._id} - Keywords:`, doubtKeywords, `Score: ${score}`);
        
        // Require at least 2 matching keywords
        if (score >= 2 && score > bestScore) {
          bestScore = score;
          bestMatch = doubt;
        }
      }

      // If no keyword match found, try exact topic match
      if (!bestMatch && potentialMatches.length > 0) {
        bestMatch = potentialMatches[0];
        console.log('No keyword match found, using first topic match');
      }

      if (!bestMatch) {
        console.log('No match found');
        return null;
      }

      console.log('Best match found:', {
        doubtId: bestMatch._id,
        topic: bestMatch.topic,
        userId: bestMatch.userId._id,
        matchScore: bestScore
      });

      // Create a room with both students
      const room = await this.createRoom(
        newDoubt.userId._id,
        bestMatch.userId._id,
        newDoubt._id,
        bestMatch._id,
        newDoubt.topic
      );

      console.log('Room created:', room._id);

      // Update both doubts to "matched" status
      await Doubt.findByIdAndUpdate(newDoubt._id, { status: 'matched' });
      await Doubt.findByIdAndUpdate(bestMatch._id, { status: 'matched' });

      return room;
    } catch (error) {
      console.error('Error in findAndMatch:', error);
      throw error;
    }
  }

  /**
   * Create a room for two students
   * @param {string} student1Id - First student ID
   * @param {string} student2Id - Second student ID
   * @param {string} doubt1Id - First doubt ID
   * @param {string} doubt2Id - Second doubt ID
   * @param {string} topic - Topic of the doubts
   * @returns {Object} - Created room object
   */
  async createRoom(student1Id, student2Id, doubt1Id, doubt2Id, topic) {
    try {
      const room = new Room({
        student1: student1Id,
        student2: student2Id,
        doubt1: doubt1Id,
        doubt2: doubt2Id,
        topic,
        status: 'active',
      });

      await room.save();
      return room.populate(['student1', 'student2', 'doubt1', 'doubt2']);
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  /**
   * Get room by ID
   * @param {string} roomId - Room ID
   * @returns {Object} - Room object with populated references
   */
  async getRoomById(roomId) {
    try {
      const room = await Room.findById(roomId)
        .populate('student1')
        .populate('student2')
        .populate('doubt1')
        .populate('doubt2');

      if (!room) {
        throw new Error('Room not found');
      }

      return room;
    } catch (error) {
      console.error('Error getting room:', error);
      throw error;
    }
  }

  /**
   * Get rooms for a specific user
   * @param {string} userId - User ID
   * @returns {Array} - Array of room objects
   */
  async getRoomsByUser(userId) {
    try {
      const rooms = await Room.find({
        $or: [{ student1: userId }, { student2: userId }],
      })
        .populate('student1')
        .populate('student2')
        .populate({
          path: 'doubt1',
          populate: { path: 'userId' }
        })
        .populate({
          path: 'doubt2',
          populate: { path: 'userId' }
        })
        .sort({ 'lastMessage.createdAt': -1, createdAt: -1 });

      console.log('getRoomsByUser - Found rooms:', rooms.length);
      return rooms;
    } catch (error) {
      console.error('Error getting rooms by user:', error);
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
        .populate('student1')
        .populate('student2')
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
}

export default new MatchService();
