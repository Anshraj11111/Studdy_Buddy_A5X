/**
 * Enhanced in-memory LRU cache with TTL support for 10K+ users
 * Works without Redis — fast, zero deps, resets on server restart.
 * Optimized for high-traffic scenarios
 */

const MAX_ENTRIES = 2000; // Increased from 500 → 2000 for more caching

class MemoryCache {
  constructor() {
    this._store = new Map(); // key → { value, expiresAt, accessCount }
  }

  _isExpired(entry) {
    return entry.expiresAt && Date.now() > entry.expiresAt;
  }

  _evictIfNeeded() {
    if (this._store.size >= MAX_ENTRIES) {
      // Delete the oldest/least accessed 20% entries (LRU strategy)
      const entries = Array.from(this._store.entries());
      entries.sort((a, b) => (a[1].accessCount || 0) - (b[1].accessCount || 0));
      
      const toDelete = Math.floor(MAX_ENTRIES * 0.2);
      for (let i = 0; i < toDelete; i++) {
        this._store.delete(entries[i][0]);
      }
    }
  }

  async get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (this._isExpired(entry)) {
      this._store.delete(key);
      return null;
    }
    // Track access count for better LRU
    entry.accessCount = (entry.accessCount || 0) + 1;
    return entry.value;
  }

  async set(key, value, ttl = 300) {
    this._evictIfNeeded();
    this._store.set(key, {
      value,
      expiresAt: ttl > 0 ? Date.now() + ttl * 1000 : null,
      accessCount: 0,
    });
    return true;
  }

  async del(key) {
    this._store.delete(key);
    return true;
  }

  async exists(key) {
    const entry = this._store.get(key);
    if (!entry) return false;
    if (this._isExpired(entry)) { this._store.delete(key); return false; }
    return true;
  }

  async clear() {
    this._store.clear();
    return true;
  }

  // Delete all keys matching a prefix pattern (e.g. 'doubts:*')
  async delPattern(prefix) {
    for (const key of this._store.keys()) {
      if (key.startsWith(prefix)) this._store.delete(key);
    }
    return true;
  }

  // ── New: High-performance helpers for 10K+ users ─────────────────────────────
  
  // Cache with automatic refresh
  async getOrSet(key, fetchFn, ttl = 300) {
    let data = await this.get(key);
    if (data !== null) return data;
    
    data = await fetchFn();
    if (data !== null && data !== undefined) {
      await this.set(key, data, ttl);
    }
    return data;
  }

  // Get multiple keys at once (faster than individual gets)
  async mget(keys) {
    const result = {};
    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) result[key] = value;
    }
    return result;
  }

  // Set multiple keys at once
  async mset(entries, ttl = 300) {
    for (const [key, value] of Object.entries(entries)) {
      await this.set(key, value, ttl);
    }
    return true;
  }

  // ── Domain-specific cache helpers ─────────────────────────────────────────────
  
  // User cache (1 hour = 3600s)
  async cacheUser(userId, userData) {
    return this.set(`user:${userId}`, userData, 3600);
  }

  async getUser(userId) {
    return this.get(`user:${userId}`);
  }

  async invalidateUser(userId) {
    return this.del(`user:${userId}`);
  }

  // Communities list (30 min = 1800s)
  async cacheCommunities(communities) {
    return this.set('communities:all', communities, 1800);
  }

  async getCommunities() {
    return this.get('communities:all');
  }

  // Resources (1 hour)
  async cacheResources(subject, resources) {
    return this.set(`resources:${subject}`, resources, 3600);
  }

  async getResources(subject) {
    return this.get(`resources:${subject}`);
  }

  // Doubts (10 min = 600s)
  async cacheDoubts(subject, doubts) {
    return this.set(`doubts:${subject}`, doubts, 600);
  }

  async getDoubts(subject) {
    return this.get(`doubts:${subject}`);
  }

  // Broadcast viewer count (10 seconds - real-time)
  async setViewerCount(channelId, count) {
    return this.set(`broadcast:${channelId}:viewers`, count, 10);
  }

  async getViewerCount(channelId) {
    return this.get(`broadcast:${channelId}:viewers`);
  }

  // Broadcast messages (5 min = 300s)
  async cacheBroadcastMessages(channelId, messages) {
    return this.set(`broadcast:${channelId}:messages`, messages, 300);
  }

  async getBroadcastMessages(channelId) {
    return this.get(`broadcast:${channelId}:messages`);
  }

  // Feed posts (15 min = 900s)
  async cacheFeedPosts(userId, posts) {
    return this.set(`feed:${userId}`, posts, 900);
  }

  async getFeedPosts(userId) {
    return this.get(`feed:${userId}`);
  }

  get size() { return this._store.size; }
  
  // Get cache stats for monitoring
  getStats() {
    return {
      size: this._store.size,
      maxEntries: MAX_ENTRIES,
      utilizationPercent: ((this._store.size / MAX_ENTRIES) * 100).toFixed(2),
    };
  }
}

export default new MemoryCache();
