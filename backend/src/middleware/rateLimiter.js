import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter for High-Traffic Endpoints
 * Prevents abuse and ensures fair usage across 10K+ users
 */

// General API rate limiter - 100 requests per 15 minutes per IP
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { 
    success: false, 
    error: { message: 'Too many requests, please try again later.' } 
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict limiter for write operations (post, vote, comment) - 30 per 15 min
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { 
    success: false, 
    error: { message: 'Too many posts/votes, please slow down.' } 
  },
  skip: (req) => {
    // Skip rate limiting for admins/mentors
    return req.user && ['admin', 'mentor'].includes(req.user.role);
  },
});

// Poll voting limiter - prevent spam voting - 50 per 15 min
export const pollVoteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { 
    success: false, 
    error: { message: 'Too many poll votes, please try again later.' } 
  },
  keyGenerator: (req) => {
    // Rate limit by user ID instead of IP
    return req.user?._id?.toString() || req.ip;
  },
});

// Search limiter - prevent expensive search queries - 60 per 15 min
export const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { 
    success: false, 
    error: { message: 'Too many search requests, please try again later.' } 
  },
});

export default {
  generalLimiter,
  writeLimiter,
  pollVoteLimiter,
  searchLimiter,
};
