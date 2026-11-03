import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request object
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'No token provided', code: 'NO_TOKEN' },
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT - fast, no DB call
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: {
          message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
          code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        },
      });
    }

    // Only fetch user from DB if we need full user object
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not found', code: 'USER_NOT_FOUND' },
      });
    }

    // Convert to JSON to apply toJSON transformation (includes hasFreeAccess)
    req.user = user.toJSON();
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: 'Authentication failed', code: 'AUTH_ERROR' },
    });
  }
};

/**
 * Role-based authorization middleware
 * Checks if authenticated user has required role
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Not authenticated',
          code: 'NOT_AUTHENTICATED',
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
        },
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if missing
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token - continue without user
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user) {
        req.user = user.toJSON(); // Apply toJSON transformation (includes hasFreeAccess)
      }
    } catch (err) {
      // Token invalid - continue without user (don't fail)
    }

    next();
  } catch (error) {
    // Error in middleware - continue without user
    next();
  }
};

export default { authenticate, authorize, optionalAuth };
