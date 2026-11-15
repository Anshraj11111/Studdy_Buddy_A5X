/**
 * Security Event Logger Middleware
 * Logs security-related events for monitoring and audit
 */
import logger from '../utils/logger.js';

export const securityLogger = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Log failed authentication attempts
    if (res.statusCode === 401 || res.statusCode === 403) {
      logger.warn('Security: Authentication/Authorization failed', {
        ip: req.ip,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        userId: req.user?._id,
        timestamp: new Date().toISOString(),
      });
    }

    // Log rate limit hits
    if (res.statusCode === 429) {
      logger.warn('Security: Rate limit exceeded', {
        ip: req.ip,
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString(),
      });
    }

    // Log admin access
    if (req.path.includes('/admin') && req.user) {
      logger.info('Security: Admin access', {
        userId: req.user._id,
        ip: req.ip,
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString(),
      });
    }

    return originalJson.call(this, data);
  };

  next();
};

export default securityLogger;
