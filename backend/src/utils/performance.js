/**
 * Performance Monitoring Utilities for 10K Users
 * Tracks response times, memory usage, and database performance
 */

import logger from './logger.js';

// ── Performance Metrics Storage ─────────────────────────────────────────────
const metrics = {
  requests: 0,
  errors: 0,
  totalResponseTime: 0,
  slowQueries: 0,
  cacheHits: 0,
  cacheMisses: 0,
  startTime: Date.now(),
};

// ── Track Request Performance ───────────────────────────────────────────────
export const trackRequest = (req, res, startTime) => {
  const responseTime = Date.now() - startTime;
  
  metrics.requests++;
  metrics.totalResponseTime += responseTime;

  // Log slow requests (> 1 second)
  if (responseTime > 1000) {
    logger.warn('Slow request detected', {
      method: req.method,
      url: req.url,
      responseTime: `${responseTime}ms`,
      statusCode: res.statusCode,
    });
    metrics.slowQueries++;
  }

  // Log errors
  if (res.statusCode >= 400) {
    metrics.errors++;
  }
};

// ── Get Current Performance Stats ───────────────────────────────────────────
export const getPerformanceStats = () => {
  const uptime = Date.now() - metrics.startTime;
  const avgResponseTime = metrics.requests > 0 
    ? Math.round(metrics.totalResponseTime / metrics.requests) 
    : 0;

  return {
    uptime: Math.round(uptime / 1000), // seconds
    uptimeFormatted: formatUptime(uptime),
    requests: metrics.requests,
    errors: metrics.errors,
    errorRate: metrics.requests > 0 
      ? ((metrics.errors / metrics.requests) * 100).toFixed(2) + '%' 
      : '0%',
    avgResponseTime: `${avgResponseTime}ms`,
    slowQueries: metrics.slowQueries,
    cacheHits: metrics.cacheHits,
    cacheMisses: metrics.cacheMisses,
    cacheHitRate: (metrics.cacheHits + metrics.cacheMisses) > 0
      ? ((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(2) + '%'
      : '0%',
    memory: getMemoryUsage(),
    requestsPerSecond: Math.round((metrics.requests / uptime) * 1000),
  };
};

// ── Memory Usage ────────────────────────────────────────────────────────────
export const getMemoryUsage = () => {
  const usage = process.memoryUsage();
  return {
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`,
    heapPercentage: ((usage.heapUsed / usage.heapTotal) * 100).toFixed(1) + '%',
  };
};

// ── Check System Health ─────────────────────────────────────────────────────
export const checkSystemHealth = () => {
  const mem = process.memoryUsage();
  const heapPercentage = (mem.heapUsed / mem.heapTotal) * 100;
  
  // Warn if memory usage is high (> 85%)
  if (heapPercentage > 85) {
    logger.warn('High memory usage detected', {
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      percentage: `${heapPercentage.toFixed(1)}%`,
    });
    return 'warning';
  }

  // Error if memory usage is critical (> 95%)
  if (heapPercentage > 95) {
    logger.error('Critical memory usage', {
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      percentage: `${heapPercentage.toFixed(1)}%`,
    });
    return 'critical';
  }

  return 'healthy';
};

// ── Track Cache Performance ─────────────────────────────────────────────────
export const trackCacheHit = () => {
  metrics.cacheHits++;
};

export const trackCacheMiss = () => {
  metrics.cacheMisses++;
};

// ── Format Uptime ───────────────────────────────────────────────────────────
const formatUptime = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

// ── Performance Middleware ──────────────────────────────────────────────────
export const performanceMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Track when response finishes
  res.on('finish', () => {
    trackRequest(req, res, startTime);
  });

  next();
};

// ── Periodic Health Check (every 5 minutes) ─────────────────────────────────
let healthCheckInterval;

export const startHealthMonitoring = () => {
  if (healthCheckInterval) return; // Already running

  healthCheckInterval = setInterval(() => {
    const health = checkSystemHealth();
    const stats = getPerformanceStats();

    if (health === 'warning' || health === 'critical') {
      logger.warn('System health check', { health, stats });
    } else {
      logger.info('System health check', { health, stats });
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  logger.info('Health monitoring started (checks every 5 minutes)');
};

export const stopHealthMonitoring = () => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    logger.info('Health monitoring stopped');
  }
};

// ── Reset Metrics (for testing) ─────────────────────────────────────────────
export const resetMetrics = () => {
  metrics.requests = 0;
  metrics.errors = 0;
  metrics.totalResponseTime = 0;
  metrics.slowQueries = 0;
  metrics.cacheHits = 0;
  metrics.cacheMisses = 0;
  metrics.startTime = Date.now();
};

export default {
  trackRequest,
  getPerformanceStats,
  getMemoryUsage,
  checkSystemHealth,
  trackCacheHit,
  trackCacheMiss,
  performanceMiddleware,
  startHealthMonitoring,
  stopHealthMonitoring,
  resetMetrics,
};
