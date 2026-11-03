import logger from '../utils/logger.js';

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
  // Skip logging for health check and ping endpoints (too noisy)
  const skipPaths = ['/health', '/ping'];
  if (skipPaths.includes(req.path)) {
    return next();
  }

  const startTime = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;

    // Log response
    logger.info('Response sent', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
    });

    // Call original send
    return originalSend.call(this, data);
  };

  next();
};

export default requestLogger;
