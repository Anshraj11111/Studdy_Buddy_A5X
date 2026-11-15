import User from '../models/User.js';

// ── XP earned per action ──────────────────────────────────────────────────
export const XP_REWARDS = {
  post:            20,   // create a feed post
  like_received:    5,   // someone liked your post
  comment:         10,   // comment on any post
  comment_received: 8,   // someone commented on your post
  doubt_posted:    15,   // post a doubt
  doubt_resolved:  30,   // your doubt gets resolved / answered
  resource_upload: 25,   // upload a resource
  daily_login:     20,   // first visit/activity of the day (changed from 10 to 20)
  streak_bonus:    15,   // bonus for maintaining streak
};

// ── Level thresholds ──────────────────────────────────────────────────────
export const XP_LEVELS = [
  { level: 1, name: 'Novice',       icon: '🌱', min: 0,    max: 149,  color: '#6366f1' },
  { level: 2, name: 'Learner',      icon: '📚', min: 150,  max: 349,  color: '#8b5cf6' },
  { level: 3, name: 'Explorer',     icon: '🔭', min: 350,  max: 699,  color: '#06b6d4' },
  { level: 4, name: 'Scholar',      icon: '🎓', min: 700,  max: 1299, color: '#3b82f6' },
  { level: 5, name: 'Expert',       icon: '⚡', min: 1300, max: 2199, color: '#f59e0b' },
  { level: 6, name: 'Master',       icon: '🏆', min: 2200, max: 3499, color: '#f97316' },
  { level: 7, name: 'Legend',       icon: '👑', min: 3500, max: 5999, color: '#ef4444' },
  { level: 8, name: 'Grandmaster',  icon: '🌟', min: 6000, max: 999999, color: '#ec4899' },
];

export const getLevel = (xp) => {
  return XP_LEVELS.slice().reverse().find(l => xp >= l.min) || XP_LEVELS[0];
};

// XP to token conversion rate: every 100 XP = 1 token
export const XP_PER_TOKEN = 100;

/**
 * Core XP grant function.
 * Handles: XP increment, streak update, daily login bonus, token conversion, history log.
 *
 * @param {string} userId
 * @param {string} action   - key from XP_REWARDS
 * @param {number} [override] - custom amount (skips XP_REWARDS lookup)
 */
export const addXP = async (userId, action, override) => {
  try {
    const amount = override ?? XP_REWARDS[action] ?? 0;
    if (!amount) return;

    const user = await User.findById(userId).select('xp tokens streak xpHistory dailyPostCount lastPostDate');
    if (!user) return;

    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // ── Daily login check (MUST be first visit of the day) ───────────────
    if (action === 'daily_login') {
      const lastDate  = user.streak?.lastActivityDate
        ? new Date(user.streak.lastActivityDate)
        : null;
      const lastDay   = lastDate
        ? new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate())
        : null;

      const isFirstToday = !lastDay || lastDay < today;
      
      if (!isFirstToday) {
        // Already awarded XP today, skip
        console.log(`⛔ Daily login XP already awarded today for user ${userId}`);
        return;
      }
    }

    // ── Daily post limit check (3 posts per day get XP) ──────────────────
    if (action === 'post') {
      const lastPostDate = user.lastPostDate 
        ? new Date(user.lastPostDate.getFullYear(), user.lastPostDate.getMonth(), user.lastPostDate.getDate())
        : null;
      
      const isSameDay = lastPostDate && lastPostDate.getTime() === today.getTime();
      
      // Check current count
      const currentCount = isSameDay ? (user.dailyPostCount || 0) : 0;
      
      if (currentCount >= 3) {
        // User has already posted 3 times today, no XP awarded
        console.log(`⛔ Daily post limit reached for user ${userId}: ${currentCount}/3 posts`);
        return;
      }
      
      // Atomically increment the counter
      if (isSameDay) {
        await User.findByIdAndUpdate(userId, {
          $inc: { dailyPostCount: 1 },
          $set: { lastPostDate: now }
        });
      } else {
        // New day, reset count to 1
        await User.findByIdAndUpdate(userId, {
          $set: { dailyPostCount: 1, lastPostDate: now }
        });
      }
      
      // Re-fetch updated count to verify (race condition protection)
      const updatedUser = await User.findById(userId).select('dailyPostCount lastPostDate');
      const updatedLastPostDate = updatedUser.lastPostDate 
        ? new Date(updatedUser.lastPostDate.getFullYear(), updatedUser.lastPostDate.getMonth(), updatedUser.lastPostDate.getDate())
        : null;
      const stillSameDay = updatedLastPostDate && updatedLastPostDate.getTime() === today.getTime();
      
      if (stillSameDay && updatedUser.dailyPostCount > 3) {
        // Race condition: another request incremented before us, revert
        console.log(`⛔ Race condition detected for user ${userId}: ${updatedUser.dailyPostCount}/3 posts - reverting XP`);
        return;
      }
      
      console.log(`✅ Post XP awarded to user ${userId}: ${stillSameDay ? updatedUser.dailyPostCount : 1}/3 posts today`);
    }

    // ── Streak logic ──────────────────────────────────────────────────────
    let streakBonus = 0;
    const lastDate  = user.streak?.lastActivityDate
      ? new Date(user.streak.lastActivityDate)
      : null;
    const lastDay   = lastDate
      ? new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate())
      : null;

    const isFirstToday  = !lastDay || lastDay < today;
    const isConsecutive = lastDay &&
      today - lastDay === 86400000; // exactly 1 day gap

    let newStreak = user.streak?.current ?? 0;

    // Only apply streak logic for daily_login action
    if (action === 'daily_login' && isFirstToday) {
      if (isConsecutive) {
        newStreak += 1;
        // Extra streak bonus every day
        streakBonus += XP_REWARDS.streak_bonus;
        // Double streak bonus at milestones (7, 14, 30 days)
        if ([7, 14, 30, 60, 100].includes(newStreak)) {
          streakBonus += XP_REWARDS.streak_bonus * 2;
        }
      } else if (!lastDay) {
        newStreak = 1; // first ever activity
      } else {
        newStreak = 1; // streak broken, reset to 1
      }
    }

    const totalXP   = amount + streakBonus;

    // ── Build history entries ─────────────────────────────────────────────
    const historyEntries = [{ action, amount, createdAt: now }];
    // Only add streak_bonus entry for daily_login action
    if (streakBonus > 0 && action === 'daily_login') {
      historyEntries.push({ action: 'streak_bonus', amount: streakBonus, createdAt: now });
    }

    // ── Persist ───────────────────────────────────────────────────────────
    // Use $inc for xp so concurrent calls don't overwrite each other.
    // Tokens must be recalculated after the atomic increment; we derive the
    // new token count from the document returned by findByIdAndUpdate.
    const updateFields = {
      $inc: { xp: totalXP },
      $push: {
        xpHistory: { $each: historyEntries, $slice: -200 },
      },
    };

    // Only update streak data for daily_login action
    if (action === 'daily_login' && isFirstToday) {
      updateFields.$set = {
        'streak.current':          newStreak,
        'streak.longest':          Math.max(newStreak, user.streak?.longest ?? 0),
        'streak.lastActivityDate': now,
      };
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true, select: 'xp' }, // return updated doc to recalculate tokens
    );

    // Recalculate tokens based on the authoritative post-increment xp value
    if (updated) {
      const newTokens = Math.floor(updated.xp / XP_PER_TOKEN);
      await User.findByIdAndUpdate(userId, { $set: { tokens: newTokens } });
    }
  } catch (err) {
    console.error('XP update failed:', err.message);
  }
};

export default { addXP, getLevel, XP_LEVELS, XP_REWARDS, XP_PER_TOKEN };
