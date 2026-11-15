import express from 'express';
import Connection from '../models/Connection.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import authMiddleware from '../middleware/auth.middleware.js';
import { sendPushToUser } from '../services/webPush.service.js';
import { escapeRegex } from '../utils/sanitize.js';

const router = express.Router();
const { authenticate } = authMiddleware;

// GET /api/connections/users?search=&page=1  — discover all users
router.get('/users', authenticate, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 200 } = req.query; // Increased to 200 to show all users
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      _id: { $ne: req.user._id },
    };

    if (search.trim()) {
      const sanitized = escapeRegex(search.trim());
      query.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { skills: { $regex: sanitized, $options: 'i' } },
        { role: { $regex: sanitized, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('name email role skills profileImage')
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`📊 GET /users: Found ${users.length} users (excluding current user)`);

    const total = await User.countDocuments(query);

    // Get connection status for each user
    const myConnections = await Connection.find({
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
    });

    const usersWithStatus = users.map(u => {
      const conn = myConnections.find(
        c =>
          String(c.requester) === String(u._id) ||
          String(c.recipient) === String(u._id)
      );
      return {
        ...u.toJSON(),
        connectionStatus: conn ? conn.status : null,
        connectionId: conn ? conn._id : null,
        iRequested: conn ? String(conn.requester) === String(req.user._id) : false,
      };
    });

    res.json({ success: true, data: { users: usersWithStatus, total } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch users' } });
  }
});

// POST /api/connections/request/:userId
router.post('/request/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ success: false, error: { message: 'Cannot connect with yourself' } });
    }

    const existing = await Connection.findOne({
      $or: [
        { requester: req.user._id, recipient: userId },
        { requester: userId, recipient: req.user._id },
      ],
    });

    if (existing) {
      return res.status(400).json({ success: false, error: { message: 'Connection already exists' } });
    }

    const conn = await Connection.create({ requester: req.user._id, recipient: userId });

    // Save notification to DB + emit socket 'notification' event (so frontend bell updates)
    try {
      const notif = await Notification.create({
        recipient: userId,
        sender: req.user._id,
        type: 'connection_request',
        message: `${req.user.name} sent you a connection request`,
      });
      const populated = await Notification.findById(notif._id).populate('sender', 'name profileImage');
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${userId}`).emit('notification', populated);
        // Also emit old event for Communities.jsx pending tab refresh
        io.to(`user:${userId}`).emit('connectionRequest', {
          type: 'connection_request',
          from: { _id: req.user._id, name: req.user.name, profileImage: req.user.profileImage, role: req.user.role },
          connectionId: conn._id,
        });
      }
      // Push to device even if app/browser is closed
      sendPushToUser(userId, {
        title: 'New Connection Request',
        body: `${req.user.name} sent you a connection request`,
        icon: req.user.profileImage || '/icons/icon-192x192.png',
        url: '/community',
        type: 'connection_request',
      });
    } catch { /* notification error shouldn't fail the connection */ }

    res.status(201).json({ success: true, data: { connection: conn } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to send request' } });
  }
});

// PUT /api/connections/:id/accept
router.put('/:id/accept', authenticate, async (req, res) => {
  try {
    const conn = await Connection.findById(req.params.id);
    if (!conn) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    if (String(conn.recipient) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized' } });
    }
    conn.status = 'accepted';
    await conn.save();

    // Notify the requester that their request was accepted
    try {
      const notif = await Notification.create({
        recipient: conn.requester,
        sender: req.user._id,
        type: 'connection',
        message: `${req.user.name} accepted your connection request`,
      });
      const populated = await Notification.findById(notif._id).populate('sender', 'name profileImage');
      const io = req.app.get('io');
      if (io) io.to(`user:${String(conn.requester)}`).emit('notification', populated);
      // Push to device even if app/browser is closed
      sendPushToUser(String(conn.requester), {
        title: 'Connection Accepted',
        body: `${req.user.name} accepted your connection request`,
        icon: req.user.profileImage || '/icons/icon-192x192.png',
        url: '/community',
        type: 'connection',
      });
    } catch { /* ignore */ }

    res.json({ success: true, data: { connection: conn } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to accept' } });
  }
});

// PUT /api/connections/:id/reject
router.put('/:id/reject', authenticate, async (req, res) => {
  try {
    const conn = await Connection.findById(req.params.id);
    if (!conn) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    if (String(conn.recipient) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized' } });
    }
    await conn.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to reject' } });
  }
});

// DELETE /api/connections/:id  — withdraw request or remove connection
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const conn = await Connection.findById(req.params.id);
    if (!conn) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    const uid = String(req.user._id);
    if (String(conn.requester) !== uid && String(conn.recipient) !== uid) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized' } });
    }
    await conn.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to remove' } });
  }
});

// GET /api/connections/pending  — requests I received
router.get('/pending', authenticate, async (req, res) => {
  try {
    const pending = await Connection.find({ recipient: req.user._id, status: 'pending' })
      .populate('requester', 'name email role skills profileImage')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { connections: pending } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch pending' } });
  }
});

// GET /api/connections/my  — my accepted connections
router.get('/my', authenticate, async (req, res) => {
  try {
    const conns = await Connection.find({
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
      status: 'accepted',
    })
      .populate('requester', 'name email role skills profileImage')
      .populate('recipient', 'name email role skills profileImage')
      .sort({ updatedAt: -1 });

    // Filter out connections where populate returned null (deleted users)
    const validConns = conns.filter(c => c.requester && c.recipient);

    console.log(`📊 GET /my: Found ${conns.length} connections, ${validConns.length} valid (after filtering nulls)`);

    const connections = validConns.map(c => {
      const other =
        String(c.requester._id) === String(req.user._id) ? c.recipient : c.requester;
      return { 
        connectionId: c._id, 
        user: other,
        isFollowing: false // Add default value
      };
    });

    res.json({ success: true, data: { connections } });
  } catch (err) {
    console.error('❌ Error in GET /my:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch connections', details: err.message } });
  }
});

export default router;
