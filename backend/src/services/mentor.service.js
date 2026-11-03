import MentorRequest from '../models/MentorRequest.js';

class MentorService {
  /**
   * Create a mentor request
   * @param {string} studentId - Student ID
   * @param {string} roomId - Room ID
   * @param {string} message - Request message
   * @returns {Object} - Created mentor request
   */
  async createRequest(studentId, roomId, message) {
    try {
      if (!studentId || !roomId) {
        throw new Error('Student ID and Room ID are required');
      }

      const request = new MentorRequest({
        studentId,
        roomId,
        message: message || '',
        status: 'pending',
      });

      await request.save();
      return request.populate('studentId', 'name profileImage').populate('roomId');
    } catch (error) {
      console.error('Error creating mentor request:', error);
      throw error;
    }
  }

  /**
   * Get pending mentor requests
   * @param {Object} options - Pagination options
   * @returns {Array} - Array of pending requests
   */
  async getPendingRequests(options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      const requests = await MentorRequest.find({ status: 'pending' })
        .populate('studentId', 'name profileImage')
        .populate('roomId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return requests;
    } catch (error) {
      console.error('Error getting pending requests:', error);
      throw error;
    }
  }

  /**
   * Get pending requests count
   * @returns {number} - Total pending requests count
   */
  async getPendingRequestsCount() {
    try {
      const count = await MentorRequest.countDocuments({ status: 'pending' });
      return count;
    } catch (error) {
      console.error('Error getting pending requests count:', error);
      throw error;
    }
  }

  /**
   * Get requests for a specific mentor
   * @param {string} mentorId - Mentor ID
   * @param {Object} options - Pagination options
   * @returns {Array} - Array of requests
   */
  async getRequestsByMentor(mentorId, options = {}) {
    try {
      const { page = 1, limit = 10, status } = options;
      const skip = (page - 1) * limit;

      const query = { mentorId };
      if (status) {
        query.status = status;
      }

      const requests = await MentorRequest.find(query)
        .populate('studentId', 'name profileImage')
        .populate('roomId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return requests;
    } catch (error) {
      console.error('Error getting requests by mentor:', error);
      throw error;
    }
  }

  /**
   * Get requests for a specific student
   * @param {string} studentId - Student ID
   * @param {Object} options - Pagination options
   * @returns {Array} - Array of requests
   */
  async getRequestsByStudent(studentId, options = {}) {
    try {
      const { page = 1, limit = 10, status } = options;
      const skip = (page - 1) * limit;

      const query = { studentId };
      if (status) {
        query.status = status;
      }

      const requests = await MentorRequest.find(query)
        .populate('mentorId', 'name profileImage')
        .populate('roomId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return requests;
    } catch (error) {
      console.error('Error getting requests by student:', error);
      throw error;
    }
  }

  /**
   * Accept a mentor request
   * @param {string} requestId - Request ID
   * @param {string} mentorId - Mentor ID
   * @returns {Object} - Updated request
   */
  async acceptRequest(requestId, mentorId) {
    try {
      const request = await MentorRequest.findByIdAndUpdate(
        requestId,
        { status: 'accepted', mentorId },
        { new: true }
      )
        .populate('studentId', 'name profileImage')
        .populate('mentorId', 'name profileImage')
        .populate('roomId');

      if (!request) {
        throw new Error('Request not found');
      }

      return request;
    } catch (error) {
      console.error('Error accepting request:', error);
      throw error;
    }
  }

  /**
   * Reject a mentor request
   * @param {string} requestId - Request ID
   * @returns {Object} - Updated request
   */
  async rejectRequest(requestId) {
    try {
      const request = await MentorRequest.findByIdAndUpdate(
        requestId,
        { status: 'rejected' },
        { new: true }
      )
        .populate('studentId', 'name profileImage')
        .populate('roomId');

      if (!request) {
        throw new Error('Request not found');
      }

      return request;
    } catch (error) {
      console.error('Error rejecting request:', error);
      throw error;
    }
  }

  /**
   * Complete a mentor request
   * @param {string} requestId - Request ID
   * @returns {Object} - Updated request
   */
  async completeRequest(requestId) {
    try {
      const request = await MentorRequest.findByIdAndUpdate(
        requestId,
        { status: 'completed' },
        { new: true }
      )
        .populate('studentId', 'name profileImage')
        .populate('mentorId', 'name profileImage')
        .populate('roomId');

      if (!request) {
        throw new Error('Request not found');
      }

      return request;
    } catch (error) {
      console.error('Error completing request:', error);
      throw error;
    }
  }

  /**
   * Get request by ID
   * @param {string} requestId - Request ID
   * @returns {Object} - Request object
   */
  async getRequestById(requestId) {
    try {
      const request = await MentorRequest.findById(requestId)
        .populate('studentId', 'name profileImage')
        .populate('mentorId', 'name profileImage')
        .populate('roomId');

      if (!request) {
        throw new Error('Request not found');
      }

      return request;
    } catch (error) {
      console.error('Error getting request by ID:', error);
      throw error;
    }
  }
}

export default new MentorService();
