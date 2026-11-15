import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import User from '../models/User.js';
import FeedPost from '../models/FeedPost.js';
import { getLevel, XP_LEVELS, XP_REWARDS, XP_PER_TOKEN } from '../services/xp.service.js';

const router = express.Router();
const { authenticate } = authMiddleware;

// GET /api/rewards/me  — full rewards profile for the logged-in user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('name profileImage xp tokens streak xpHistory')
      .lean();

    if (!user) return res.status(404).json({ success: false, error: { message: 'User not found' } });

    const xp      = user.xp || 0;
    const tokens  = user.tokens || 0;
    const current = getLevel(xp);
    const nextIdx = XP_LEVELS.findIndex(l => l.level === current.level) + 1;
    const next    = XP_LEVELS[nextIdx] || null;

    // XP needed for next level
    const xpInLevel   = xp - current.min;
    const xpForLevel  = next ? (current.max - current.min + 1) : 1;
    const progressPct = next ? Math.min(Math.round((xpInLevel / xpForLevel) * 100), 100) : 100;

    // Last 7 days activity from xpHistory
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const recentHistory = (user.xpHistory || [])
      .filter(h => new Date(h.createdAt) >= sevenDaysAgo)
      .slice(-50);

    // Group XP by day for chart (last 7 days)
    const dailyXP = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyXP[key] = 0;
    }
    recentHistory.forEach(h => {
      const key = new Date(h.createdAt).toISOString().slice(0, 10);
      if (key in dailyXP) dailyXP[key] += h.amount;
    });

    // Breakdown totals from xpHistory
    const breakdown = {};
    (user.xpHistory || []).forEach(h => {
      breakdown[h.action] = (breakdown[h.action] || 0) + h.amount;
    });

    // Total posts this user made
    const totalPosts = await FeedPost.countDocuments({ userId: req.user._id });

    res.json({
      success: true,
      data: {
        xp,
        tokens,
        level: {
          ...current,
          xpInLevel,
          xpForLevel,
          progressPct,
          nextLevel: next ? { level: next.level, name: next.name, icon: next.icon } : null,
          xpToNext: next ? (current.max - xp + 1) : 0,
        },
        streak: {
          current: user.streak?.current || 0,
          longest: user.streak?.longest || 0,
          lastActivityDate: user.streak?.lastActivityDate || null,
        },
        dailyXP,       // { '2026-06-01': 45, ... }
        breakdown,     // { post: 120, like_received: 35, ... }
        totalPosts,
        xpHistory: (user.xpHistory || []).slice(-20).reverse(), // latest 20
        xpPerToken: XP_PER_TOKEN,
        xpRewards: XP_REWARDS,
        allLevels: XP_LEVELS,
      },
    });
  } catch (err) {
    console.error('Rewards fetch error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch rewards' } });
  }
});

// GET /api/rewards/leaderboard  — top 10 by XP
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('name profileImage xp tokens streak')
      .sort({ xp: -1 })
      .limit(10)
      .lean();

    const leaderboard = users.map((u, i) => ({
      rank:    i + 1,
      _id:     u._id,
      name:    u.name,
      profileImage: u.profileImage,
      xp:      u.xp || 0,
      tokens:  u.tokens || 0,
      streak:  u.streak?.current || 0,
      level:   getLevel(u.xp || 0),
    }));

    res.json({ success: true, data: { leaderboard } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch leaderboard' } });
  }
});

export default router;
