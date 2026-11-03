import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for password reset requests
 * Prevents abuse by limiting requests per IP
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Max 3 requests per 15 minutes
  message: {
    success: false,
    error: {
      message: 'Too many password reset requests. Please try again after 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count all requests
  skipFailedRequests: false,
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many password reset requests. Please try again after 15 minutes.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 15 * 60, // seconds
      },
    });
  },
});

/**
 * Strict rate limiter for password reset verification
 * Prevents brute force attacks on reset codes
 */
export const passwordResetVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Max 5 attempts per 10 minutes
  message: {
    success: false,
    error: {
      message: 'Too many verification attempts. Please request a new reset code.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`⚠️ Password reset verification limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many verification attempts. Please request a new reset code.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 10 * 60, // seconds
      },
    });
  },
});

/**
 * General auth rate limiter
 * Prevents brute force on login/register
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 requests per 15 minutes
  message: {
    success: false,
    error: {
      message: 'Too many authentication requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  passwordResetLimiter,
  passwordResetVerifyLimiter,
  authLimiter,
};
