/**
 * Short-lived signed tokens for secure YouTube video playback.
 * Token = base64url( resourceId:userId:expiry:hmac )
 * HMAC-SHA256 with VIDEO_TOKEN_SECRET (falls back to JWT_SECRET).
 * Default TTL: 90 seconds — enough to load the iframe, too short to share.
 */

import crypto from 'crypto';

const SECRET = () => process.env.VIDEO_TOKEN_SECRET || process.env.JWT_SECRET || 'studdy-buddy-video-secret';
const TTL_MS = 90 * 1000; // 90 seconds

/**
 * Generate a signed token for a specific resource + user.
 * @param {string} resourceId
 * @param {string} userId
 * @returns {string} URL-safe token
 */
export function generateVideoToken(resourceId, userId) {
  const expiry = Date.now() + TTL_MS;
  const payload = `${resourceId}:${userId}:${expiry}`;
  const sig = crypto.createHmac('sha256', SECRET()).update(payload).digest('hex');
  const raw = `${payload}:${sig}`;
  return Buffer.from(raw).toString('base64url');
}

/**
 * Verify a token. Returns { resourceId, userId } or throws.
 * @param {string} token
 * @returns {{ resourceId: string, userId: string }}
 */
export function verifyVideoToken(token) {
  let raw;
  try {
    raw = Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    throw new Error('Invalid token format');
  }

  const parts = raw.split(':');
  if (parts.length !== 4) throw new Error('Invalid token structure');

  const [resourceId, userId, expiry, sig] = parts;

  // Check expiry first
  if (Date.now() > parseInt(expiry, 10)) {
    throw new Error('Token expired');
  }

  // Verify HMAC
  const payload = `${resourceId}:${userId}:${expiry}`;
  const expected = crypto.createHmac('sha256', SECRET()).update(payload).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
    throw new Error('Invalid token signature');
  }

  return { resourceId, userId };
}
