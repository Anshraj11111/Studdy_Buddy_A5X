import express from 'express';
import PushSubscription from '../models/PushSubscription.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();
const { authenticate } = authMiddleware;

// GET /api/push/vapid-public-key — frontend needs this to subscribe
router.get('/vapid-public-key', (req, res) => {
  res.json({ success: true, data: { publicKey: process.env.VAPID_PUBLIC_KEY } });
});

// POST /api/push/subscribe — save user's push subscription
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    
    console.log('[Push Subscribe] Request from user:', req.user._id);
    console.log('[Push Subscribe] Endpoint:', endpoint?.substring(0, 50) + '...');
    console.log('[Push Subscribe] Has keys:', !!keys?.p256dh, !!keys?.auth);

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      console.log('[Push Subscribe] ❌ Invalid subscription object');
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid subscription object' },
      });
    }

    const userAgent = req.headers['user-agent'] || '';

    // Check if this is a refresh (existing subscription)
    const existingSub = await PushSubscription.findOne({ endpoint });
    const isRefresh = !!existingSub;

    // Upsert: update if endpoint exists, insert if new
    // On new subscription, createdAt is set automatically by mongoose
    // On update, we preserve original createdAt
    const result = await PushSubscription.findOneAndUpdate(
      { endpoint },
      { 
        user: req.user._id, 
        endpoint, 
        keys, 
        userAgent,
        // Only set createdAt on new documents (not on update)
        ...(!isRefresh && { createdAt: new Date() })
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const action = isRefresh ? 'refreshed' : 'created';
    console.log(`[Push Subscribe] ✅ Subscription ${action}:`, result._id);
    
    res.status(201).json({ 
      success: true, 
      data: { 
        message: 'Subscribed to push notifications',
        isRefresh,
        createdAt: result.createdAt
      } 
    });
  } catch (err) {
    console.error('[Push Subscribe] ❌ Error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to save subscription' } });
  }
});

// POST /api/push/check-subscription-age — check if subscription is stale (>30 days)
router.post('/check-subscription-age', authenticate, async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: { message: 'Endpoint required' },
      });
    }

    const subscription = await PushSubscription.findOne({ endpoint, user: req.user._id });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: { message: 'Subscription not found' },
      });
    }

    // Calculate age in days
    const createdAt = subscription.createdAt || subscription._id.getTimestamp();
    const ageInMs = Date.now() - createdAt.getTime();
    const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      data: {
        ageInDays,
        createdAt: createdAt.toISOString(),
        isStale: ageInDays > 30,
      },
    });
  } catch (err) {
    console.error('[Push Check Age] ❌ Error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to check subscription age' } });
  }
});

// DELETE /api/push/unsubscribe — remove subscription on logout/unsubscribe
router.delete('/unsubscribe', authenticate, async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (endpoint) {
      // Remove specific device subscription
      await PushSubscription.deleteOne({ user: req.user._id, endpoint });
    } else {
      // Remove all subscriptions for this user
      await PushSubscription.deleteMany({ user: req.user._id });
    }

    res.json({ success: true, data: { message: 'Unsubscribed from push notifications' } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to remove subscription' } });
  }
});

export default router;
