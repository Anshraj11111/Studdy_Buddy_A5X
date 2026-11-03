/**
 * Validate email format
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  // At least 6 characters
  return password && password.length >= 6;
};

/**
 * Validate MongoDB ObjectId
 */
export const validateObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Sanitize string input
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (page, limit) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
  return { page: pageNum, limit: limitNum };
};

/**
 * Validate request payload size
 */
export const validatePayloadSize = (maxSize = 10 * 1024 * 1024) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'], 10);
    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        error: {
          message: 'Payload too large',
          code: 'PAYLOAD_TOO_LARGE',
        },
      });
    }
    next();
  };
};

/**
 * Validate required fields
 */
export const validateRequiredFields = (fields) => {
  return (req, res, next) => {
    const missing = fields.filter((field) => !req.body[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Missing required fields: ${missing.join(', ')}`,
          code: 'VALIDATION_ERROR',
        },
      });
    }
    next();
  };
};

export default {
  validateEmail,
  validatePassword,
  validateObjectId,
  sanitizeString,
  validatePagination,
  validatePayloadSize,
  validateRequiredFields,
};
