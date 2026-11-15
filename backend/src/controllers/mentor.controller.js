import mentorService from '../services/mentor.service.js';
import User from '../models/User.js';
import { addXP } from '../services/xp.service.js';

/**
 * Get all mentors
 * GET /api/mentor/all
 */
export const getAllMentors = async (req, res) => {
  try {
    const mentors = await User.find({ role: 'mentor' }).select('-password -mentorCode');
    res.status(200).json({
      success: true,
      data: { mentors },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch mentors', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Create a mentor request
 * POST /api/mentor/request
 */
export const createRequest = async (req, res) => {
  try {
    const { roomId, message } = req.body;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide roomId',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const request = await mentorService.createRequest(
      req.user._id,
      roomId,
      message
    );

    res.status(201).json({
      success: true,
      data: {
        request,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message || 'Failed to create mentor request',
        code: 'VALIDATION_ERROR',
      },
    });
  }
};

/**
 * Get pending mentor requests
 * GET /api/mentor/requests/pending
 */
export const getPendingRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const requests = await mentorService.getPendingRequests({
      page: pageNum,
      limit: limitNum,
    });

    const total = await mentorService.getPendingRequestsCount();

    res.status(200).json({
      success: true,
      data: {
        requests,
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
        message: 'Failed to fetch pending requests',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Get requests for current mentor
 * GET /api/mentor/requests
 */
export const getMyRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const requests = await mentorService.getRequestsByMentor(req.user._id, {
      page: pageNum,
      limit: limitNum,
      status,
    });

    res.status(200).json({
      success: true,
      data: {
        requests,
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
        message: 'Failed to fetch requests',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Accept a mentor request
 * PUT /api/mentor/requests/:id/accept
 */
export const acceptRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await mentorService.acceptRequest(id, req.user._id);

    res.status(200).json({
      success: true,
      data: {
        request,
        message: 'Mentor request accepted',
      },
    });
  } catch (error) {
    if (error.message === 'Request not found') {
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
        message: 'Failed to accept request',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Reject a mentor request
 * PUT /api/mentor/requests/:id/reject
 */
export const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await mentorService.rejectRequest(id);

    res.status(200).json({
      success: true,
      data: {
        request,
        message: 'Mentor request rejected',
      },
    });
  } catch (error) {
    if (error.message === 'Request not found') {
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
        message: 'Failed to reject request',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Complete a mentor request
 * PUT /api/mentor/requests/:id/complete
 */
export const completeRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await mentorService.completeRequest(id);

    // Award XP to mentor and student on session complete
    if (request.mentorId?._id) await addXP(request.mentorId._id, 50);
    if (request.studentId?._id) await addXP(request.studentId._id, 30);

    res.status(200).json({
      success: true,
      data: {
        request,
        message: 'Mentor request completed',
      },
    });
  } catch (error) {
    if (error.message === 'Request not found') {
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
        message: 'Failed to complete request',
        code: 'SERVER_ERROR',
      },
    });
  }
};

export default {
  getAllMentors,
  createRequest,
  getPendingRequests,
  getMyRequests,
  acceptRequest,
  rejectRequest,
  completeRequest,
};
