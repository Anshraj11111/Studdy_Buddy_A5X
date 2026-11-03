import express from 'express';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import authMiddleware from '../middleware/auth.middleware.js';
import { sendPushToUser } from '../services/webPush.service.js';

const router = express.Router();
const { authenticate } = authMiddleware;

// In-memory follow store using User model fields would require schema changes.
// We'll use a simple Follow collection via a lean Map stored on User OR
// a separate lightweight approach: store followingIds in User.following array.
// For now use a separate Follow model pattern with the existing User model:
// We add followers/following virtual arrays. But since schema doesn't have them,
// we use a separate Follow tracking via a simple in-memory approach that stores
// follows in a lightweight map with MongoDB.

// Better: create a Follow collection document approach
import mongoose from 'mongoose';

// Simple Follow schema (created inline)
let Follow;
try {
  Follow = mongoose.model('Follow');
} catch {
  const followSchema = new mongoose.Schema({
    follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    following: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  });
  followSchema.index({ follower: 1, following: 1 }, { unique: true });
  Follow = mongoose.model('Follow', followSchema);
}

// POST /api/follow/:userId  — follow a user
router.post('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ success: false, error: { message: 'Cannot follow yourself' } });
    }
    const exists = await Follow.findOne({ follower: req.user._id, following: userId });
    if (exists) return res.json({ success: true, data: { message: 'Already following' } });

    await Follow.create({ follower: req.user._id, following: userId });

    // Create notification + emit socket event to followed user
    try {
      const notif = await Notification.create({
        recipient: userId,
        sender: req.user._id,
        type: 'follow',
        message: `${req.user.name} started following you`,
      });
      const populated = await Notification.findById(notif._id).populate('sender', 'name profileImage');
      const io = req.app.get('io');
      if (io) io.to(`user:${userId}`).emit('notification', populated);
      // Push to device even if app/browser is closed
      sendPushToUser(userId, {
        title: 'Studdy Buddy',
        body: `${req.user.name} started following you`,
        icon: req.user.profileImage || '/icons/icon-192x192.png',
        url: '/profile',
        type: 'follow',
      });
    } catch { /* Notification error shouldn't fail the follow */ }

    res.status(201).json({ success: true, data: { message: 'Followed successfully' } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to follow' } });
  }
});

// DELETE /api/follow/:userId  — unfollow a user
router.delete('/:userId', authenticate, async (req, res) => {
  try {
    await Follow.deleteOne({ follower: req.user._id, following: req.params.userId });
    res.json({ success: true, data: { message: 'Unfollowed successfully' } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to unfollow' } });
  }
});

// GET /api/follow/status/:userId  — check if I follow this user
router.get('/status/:userId', authenticate, async (req, res) => {
  try {
    const exists = await Follow.findOne({ follower: req.user._id, following: req.params.userId });
    res.json({ success: true, data: { isFollowing: !!exists } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to check status' } });
  }
});

// GET /api/follow/followers/:userId  — get followers list
router.get('/followers/:userId', authenticate, async (req, res) => {
  try {
    const docs = await Follow.find({ following: req.params.userId })
      .populate('follower', 'name email role skills profileImage headline')
      .sort({ createdAt: -1 });
    const followers = docs.map(d => d.follower);
    res.json({ success: true, data: { followers } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch followers' } });
  }
});

// GET /api/follow/following/:userId  — get following list
router.get('/following/:userId', authenticate, async (req, res) => {
  try {
    const docs = await Follow.find({ follower: req.params.userId })
      .populate('following', 'name email role skills profileImage headline')
      .sort({ createdAt: -1 });
    const following = docs.map(d => d.following);
    res.json({ success: true, data: { following } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch following' } });
  }
});

// GET /api/follow/counts/:userId  — get follower/following/connection counts
router.get('/counts/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: userId }),
      Follow.countDocuments({ follower: userId }),
    ]);

    // Connection count from Connection model
    let connectionsCount = 0;
    try {
      const Connection = mongoose.model('Connection');
      connectionsCount = await Connection.countDocuments({
        $or: [{ requester: userId }, { recipient: userId }],
        status: 'accepted',
      });
    } catch {}

    res.json({ success: true, data: { followersCount, followingCount, connectionsCount } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch counts' } });
  }
});

// GET /api/follow/profile/:userId  — get any user's public profile
router.get('/profile/:userId', authenticate, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId)
      .select('name email role skills profileImage bannerImage headline bio address socialLinks education experience xp createdAt');
    if (!targetUser) return res.status(404).json({ success: false, error: { message: 'User not found' } });

    const isFollowing = !!(await Follow.findOne({ follower: req.user._id, following: req.params.userId }));
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: req.params.userId }),
      Follow.countDocuments({ follower: req.params.userId }),
    ]);

    res.json({ success: true, data: { user: targetUser.toJSON(), isFollowing, followersCount, followingCount } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch profile' } });
  }
});

export default router;
