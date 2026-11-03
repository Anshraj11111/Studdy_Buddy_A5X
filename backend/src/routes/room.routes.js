import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { uploadSingle } from '../middleware/upload.middleware.js';
import matchService from '../services/match.service.js';
import messageService from '../services/message.service.js';
import Room from '../models/Room.js';
import { checkContent } from '../utils/contentFilter.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Create or get a direct room between student and mentor
 * POST /api/rooms/direct
 */
router.post('/direct', authenticate, async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const userId = req.user._id;

    if (!otherUserId) {
      return res.status(400).json({ success: false, error: { message: 'otherUserId is required' } });
    }

    // Check if room already exists between these two users
    let room = await Room.findOne({
      $or: [
        { student1: userId, student2: otherUserId },
        { student1: otherUserId, student2: userId },
      ],
    }).populate('student1').populate('student2');

    if (!room) {
      // Create new direct room
      room = new Room({
        student1: userId,
        student2: otherUserId,
        topic: 'Direct Message',
        status: 'active',
      });
      await room.save();
      room = await room.populate(['student1', 'student2']);
    }

    res.status(200).json({ success: true, data: { room } });
  } catch (error) {
    console.error('Error creating direct room:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to create room' } });
  }
});

/**
 * Get all rooms for the current user (works for both students and mentors)
 * GET /api/rooms
 */
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('Fetching rooms for user:', req.user._id);
    const rooms = await matchService.getRoomsByUser(req.user._id);
    console.log('Found rooms:', rooms.length);
    
    res.status(200).json({
      success: true,
      data: { rooms },
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch rooms', code: 'SERVER_ERROR', details: error.message },
    });
  }
});

/**
 * Get room by ID with messages
 * GET /api/rooms/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get room details
    const room = await matchService.getRoomById(id);
    
    // ── Authorization: students must be participants, mentors can access all ──
    const userId = req.user._id.toString();
    const userRole = req.user.role;
    const student1Id = room.student1._id.toString();
    const student2Id = room.student2._id.toString();
    
    // Allow if: (1) user is a participant OR (2) user is a mentor
    const isParticipant = userId === student1Id || userId === student2Id;
    const isMentor = userRole === 'mentor';
    
    if (!isParticipant && !isMentor) {
      return res.status(403).json({
        success: false,
        error: { message: 'You are not authorized to access this room', code: 'FORBIDDEN' },
      });
    }
    
    // Get messages for this room
    const messages = await messageService.getMessagesByRoom(id);
    
    res.status(200).json({
      success: true,
      data: {
        room,
        messages,
      },
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    
    if (error.message === 'Room not found') {
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
        message: 'Failed to fetch room',
        code: 'SERVER_ERROR',
      },
    });
  }
});

/**
 * Send image message in a room
 * POST /api/rooms/send-image
 */
router.post('/send-image', authenticate, uploadSingle('image'), async (req, res) => {
  try {
    const { roomId, userId, content } = req.body;
    const imageFile = req.file;

    if (!roomId || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'roomId and userId are required' } 
      });
    }

    if (!imageFile) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Image file is required' } 
      });
    }

    // Verify user is participant in room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Room not found' } 
      });
    }

    const isParticipant = 
      room.student1.toString() === userId.toString() || 
      room.student2.toString() === userId.toString();

    if (!isParticipant) {
      return res.status(403).json({ 
        success: false, 
        error: { message: 'You are not authorized to send messages in this room' } 
      });
    }

    // Check content if text is provided
    if (content && content.trim()) {
      const modResult = checkContent(content);
      if (modResult.blocked) {
        return res.status(400).json({
          success: false,
          error: { message: modResult.reason },
        });
      }
    }

    // Upload image to Cloudinary
    let imageUrl = '';
    if (imageFile.buffer) {
      // Upload from memory buffer
      const cloudinary = await import('../config/cloudinary.js').then(m => m.default);
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'chat-images',
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(imageFile.buffer);
      });
      imageUrl = uploadResult.secure_url;
    } else if (imageFile.path) {
      imageUrl = imageFile.path;
    }

    // Save message with image
    const message = await messageService.saveMessageWithImage(
      userId, 
      roomId, 
      content?.trim() || '', 
      imageUrl
    );

    // Emit via socket
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('messageReceived', {
        _id: message._id,
        senderId: message.senderId,
        content: message.content,
        imageUrl: message.imageUrl,
        createdAt: message.createdAt,
        temp: false,
      });

      // Send notification to other user
      try {
        const recipientId = room.student1.toString() === userId.toString()
          ? room.student2.toString()
          : room.student1.toString();

        const Notification = await import('../models/Notification.js').then(m => m.default);
        const notif = await Notification.create({
          recipient: recipientId,
          sender: userId,
          type: 'message',
          message: `sent you an image${content ? `: "${content.substring(0, 30)}..."` : ''}`,
        });

        const populatedNotif = await Notification.findById(notif._id).populate('sender', 'name profileImage');
        io.to(`user:${recipientId}`).emit('notification', {
          _id: populatedNotif._id,
          type: 'message',
          sender: populatedNotif.sender,
          message: populatedNotif.message,
          createdAt: populatedNotif.createdAt,
          read: false,
        });
      } catch (notifErr) {
        logger.warn('Image message notification failed', { error: notifErr.message });
      }
    }

    res.status(200).json({
      success: true,
      data: { message },
    });
  } catch (error) {
    console.error('Error sending image message:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to send image', details: error.message },
    });
  }
});

export default router;
