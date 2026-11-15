import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';
import logger from '../utils/logger.js';

// Configure VAPID once at module load
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Send a push notification to a single user (all their devices).
 * @param {string} userId  - MongoDB user _id
 * @param {object} payload - { title, body, icon, url, type }
 */
export async function sendPushToUser(userId, payload) {
  try {
    const subscriptions = await PushSubscription.find({ user: userId });
    logger.info(`[WebPush] Sending push to user ${userId} — ${subscriptions.length} subscription(s) found`);
    if (!subscriptions.length) return;

    const data = JSON.stringify({
      title: payload.title || 'Studdy Buddy',
      body: payload.body || '',
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      url: payload.url || '/',
      type: payload.type || 'general',
      timestamp: Date.now(),
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          data
        )
      )
    );

    logger.info(`[WebPush] Push sent to ${userId} — ${results.filter(r => r.status === 'fulfilled').length} success, ${results.filter(r => r.status === 'rejected').length} failed`);

    // Remove stale subscriptions (410 Gone = unsubscribed, 404 = invalid)
    const staleEndpoints = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const status = result.reason?.statusCode;
        if (status === 410 || status === 404) {
          staleEndpoints.push(subscriptions[index].endpoint);
        } else {
          logger.warn('[WebPush] Failed to send push', {
            userId,
            statusCode: status,
            error: result.reason?.message,
          });
        }
      }
    });

    if (staleEndpoints.length) {
      await PushSubscription.deleteMany({ endpoint: { $in: staleEndpoints } });
      logger.info(`[WebPush] Removed ${staleEndpoints.length} stale subscriptions`);
    }
  } catch (err) {
    logger.error('[WebPush] sendPushToUser error', { userId, error: err.message });
  }
}

/**
 * Map notification type to a deep-link URL inside the app.
 */
export function getNotificationUrl(type, referenceId) {
  const map = {
    message: '/chat',
    follow: '/profile',
    like: '/feed',
    comment: '/feed',
    doubt: '/doubts',
    doubt_answer: `/doubts/${referenceId || ''}`,
    resource: '/resources',
    community: '/community',
    general: '/',
  };
  return map[type] || '/';
}
