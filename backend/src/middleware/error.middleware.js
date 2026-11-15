import logger from '../utils/logger.js';

/**
 * Global error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Request error', {
    method: req.method,
    path: req.path,
    status: err.status || 500,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Determine status code
  const status = err.status || err.statusCode || 500;

  // Sanitize error message (no sensitive data)
  let message = err.message || 'Internal server error';
  if (status === 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal server error';
  }

  // Send response
  res.status(status).json({
    success: false,
    error: {
      message,
      code: err.code || 'SERVER_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

/**
 * Async error wrapper
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validation error handler
 */
export const validationErrorHandler = (errors) => {
  const formattedErrors = {};
  errors.forEach((error) => {
    formattedErrors[error.param] = error.msg;
  });
  return formattedErrors;
};

export default errorHandler;
