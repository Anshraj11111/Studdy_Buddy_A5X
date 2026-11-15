import { createClient } from 'redis';

let redisClient = null;

const connectRedis = async () => {
  try {
    // Skip Redis in development if URL is localhost (optional)
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const isLocalhost = redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1');
    
    if (isLocalhost && process.env.NODE_ENV === 'development') {
      console.log('ℹ️  Redis skipped in development (localhost not available)');
      console.log('💡 For production: Add Upstash Redis URL to environment variables');
      console.log('   Visit: https://upstash.com (FREE 10K commands/day)');
      return null;
    }

    // For production with 10K users, Redis enables:
    // 1. Session storage
    // 2. Socket.IO adapter (multi-server scaling)
    // 3. Rate limiting
    // 4. Caching frequent queries
    
    const redisConfig = {
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.warn('⚠️ Redis reconnection failed - running without cache');
            return false; // Stop retrying after 3 attempts
          }
          return Math.min(retries * 500, 2000); // Exponential backoff
        },
        connectTimeout: 10000,       // 10s timeout for Upstash
        keepAlive: 30000,            // Keep connection alive
        noDelay: true,               // Disable Nagle's algorithm
      },
      commandsQueueMaxLength: 1000,  // Max queued commands
      disableOfflineQueue: true,     // Fail fast if not connected
    };
    
    redisClient = createClient(redisConfig);

    redisClient.on('error', (err) => {
      // Silently handle errors in development, log in production
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ Redis error:', err.message);
      }
      redisClient = null;
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis Connected - Caching enabled for 10K users!');
      console.log('   Provider: Upstash (Serverless Redis)');
    });

    redisClient.on('reconnecting', () => {
      if (process.env.NODE_ENV === 'production') {
        console.log('🔄 Redis reconnecting...');
      }
    });

    // Try to connect with timeout
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
      )
    ]);

    return redisClient;
  } catch (error) {
    console.warn('⚠️ Redis unavailable - running without cache (performance may be slower)');
    console.warn('💡 For 10K users, consider adding free Redis from:');
    console.warn('   - Upstash: https://upstash.com (10K commands/day FREE)');
    console.warn('   - Redis Cloud: https://redis.com (30MB FREE)');
    redisClient = null;
    return null;
  }
};

const getRedisClient = () => redisClient;

const disconnectRedis = async () => {
  if (redisClient) {
    try { 
      await redisClient.quit();
      console.log('✓ Redis disconnected');
    } catch (err) {
      console.warn('⚠️ Error disconnecting Redis:', err.message);
    }
    redisClient = null;
  }
};

// ── Helper Functions for 10K Users ───────────────────────────────────────

/**
 * Cache data with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: 5 minutes)
 */
export const setCache = async (key, value, ttl = 300) => {
  if (!redisClient) return false;
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('⚠️ Cache set failed:', err.message);
    return false;
  }
};

/**
 * Get cached data
 * @param {string} key - Cache key
 * @returns {any|null} - Cached value or null
 */
export const getCache = async (key) => {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn('⚠️ Cache get failed:', err.message);
    return null;
  }
};

/**
 * Delete cached data — supports exact key or prefix pattern ending with *
 * e.g. deleteCache('feed:*') deletes all keys starting with 'feed:'
 */
export const deleteCache = async (key) => {
  if (!redisClient) return false;
  try {
    if (key.endsWith('*')) {
      // Pattern delete — scan and delete all matching keys
      const prefix = key.slice(0, -1);
      let cursor = '0'; // Redis SCAN returns string cursor
      let deletedCount = 0;
      
      do {
        const result = await redisClient.scan(cursor, { MATCH: key, COUNT: 100 });
        cursor = result.cursor;
        
        if (result.keys.length > 0) {
          // Use spread operator to pass keys as individual arguments
          await redisClient.del(...result.keys);
          deletedCount += result.keys.length;
        }
      } while (cursor !== '0'); // Compare with string '0'
      
      if (deletedCount > 0) {
        console.log(`🗑️ Deleted ${deletedCount} cached keys matching ${key}`);
      }
    } else {
      await redisClient.del(key);
    }
    return true;
  } catch (err) {
    console.warn('⚠️ Cache delete failed:', err.message);
    return false;
  }
};

/**
 * Clear all cache (use with caution!)
 */
export const clearAllCache = async () => {
  if (!redisClient) return false;
  try {
    await redisClient.flushAll();
    console.log('🗑️ All cache cleared');
    return true;
  } catch (err) {
    console.warn('⚠️ Cache clear failed:', err.message);
    return false;
  }
};

export { connectRedis, getRedisClient, disconnectRedis };
export default connectRedis;
