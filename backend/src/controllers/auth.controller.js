import authService from '../services/auth.service.js';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, role, skills, mentorCode, schoolName, schoolPassword, city } = req.body;

    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide name, email, and password',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password must be at least 6 characters',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // School info is now optional for students (freemium model)
    // Students WITH school code get free access
    // Students WITHOUT school code can signup but need to pay for resources
    
    // IMPORTANT: If providing school credentials, BOTH schoolName and schoolPassword required
    if ((role === 'student' || !role)) {
      const hasSchoolName = schoolName && schoolName.trim() !== '';
      const hasSchoolPassword = schoolPassword && schoolPassword.trim() !== '';
      
      // Either provide BOTH or provide NEITHER
      if (hasSchoolName !== hasSchoolPassword) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Both school name and school password are required. Please provide both or leave both empty.',
            code: 'INCOMPLETE_SCHOOL_INFO',
          },
        });
      }
    }

    // Validate mentor code if role is mentor
    if (role === 'mentor') {
      const validMentorCode = process.env.MENTOR_CODE || 'H5'; // Default to H5
      if (!mentorCode || mentorCode !== validMentorCode) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Invalid mentor code',
            code: 'INVALID_MENTOR_CODE',
          },
        });
      }
    }

    // Register user
    const user = await authService.register({
      name,
      email,
      password,
      role,
      skills,
      mentorCode: role === 'mentor' ? mentorCode : null,
      schoolName: role === 'student' || !role ? schoolName : null,
      schoolPassword: role === 'student' || !role ? schoolPassword : null,
      city: role === 'student' || !role ? city : null,
    });

    // Generate token
    const token = authService.generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    if (error.message === 'Email already exists') {
      return res.status(409).json({
        success: false,
        error: {
          message: error.message,
          code: 'EMAIL_EXISTS',
        },
      });
    }

    if (error.message === 'Invalid school password') {
      return res.status(403).json({
        success: false,
        error: {
          message: error.message,
          code: 'INVALID_SCHOOL_PASSWORD',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Registration failed',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password, role, mentorCode, schoolPassword } = req.body;

    // Input validation - for students, either password OR schoolPassword is required
    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide email',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // For students: either password OR schoolPassword must be provided
    if (role === 'student') {
      if (!password && !schoolPassword) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Please provide either password or school password',
            code: 'VALIDATION_ERROR',
          },
        });
      }
    } else {
      // For mentors: password is mandatory
      if (!password) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Please provide password',
            code: 'VALIDATION_ERROR',
          },
        });
      }
    }

    // Validate mentor code if role is mentor
    if (role === 'mentor') {
      const validMentorCode = process.env.MENTOR_CODE || 'H5';
      if (!mentorCode || mentorCode !== validMentorCode) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Invalid mentor code',
            code: 'INVALID_MENTOR_CODE',
          },
        });
      }
    }

    // Login user with alternative authentication support
    const { user, token } = await authService.login(email, password, schoolPassword);

    // Verify role matches if provided
    if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        error: {
          message: `This account is registered as ${user.role}, not ${role}`,
          code: 'ROLE_MISMATCH',
        },
      });
    }

    // Award daily login XP (automatic streak tracking happens in addXP)
    try {
      const { addXP } = await import('../services/xp.service.js');
      await addXP(user._id, 'daily_login');
    } catch (xpError) {
      console.error('Failed to award daily login XP:', xpError);
      // Don't fail the login if XP update fails
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    // Handle specific error codes from auth service
    if (error.code === 'ACCOUNT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'ACCOUNT_NOT_FOUND',
        },
      });
    }

    if (error.code === 'INVALID_CREDENTIALS' || error.message.includes('Invalid password') || error.message.includes('Invalid school password')) {
      return res.status(401).json({
        success: false,
        error: {
          message: error.message,
          code: 'INVALID_CREDENTIALS',
        },
      });
    }

    console.error('Login error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      error: {
        message: 'Login failed',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/profile
 */
/**
 * Award daily visit XP (first visit of the day)
 * POST /api/auth/daily-visit
 */
export const dailyVisit = async (req, res) => {
  try {
    const { addXP } = await import('../services/xp.service.js');
    await addXP(req.user._id, 'daily_login');

    res.status(200).json({
      success: true,
      message: 'Daily visit recorded',
    });
  } catch (error) {
    console.error('Daily visit XP failed:', error);
    // Don't fail the request, XP is bonus
    res.status(200).json({
      success: true,
      message: 'Visit recorded',
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await authService.getUserById(req.user._id);

    // Use toOwnerJSON if available (includes private fields), otherwise fall back to toJSON
    const userData = typeof user.toOwnerJSON === 'function' ? user.toOwnerJSON() : user.toJSON();

    // DEBUG: Log XP value to confirm it's being sent
    console.log(`[DEBUG] getProfile: user=${user.name}, xp=${user.xp}, userData.xp=${userData.xp}`);

    res.status(200).json({
      success: true,
      data: { user: userData },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch profile', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const { name, skills, profileImage, bannerImage, headline, bio, address, socialLinks, phone, privateAddress, education, experience } = req.body;

    const user = await authService.updateProfile(req.user._id, {
      name, skills, profileImage, bannerImage, headline, bio, address,
      socialLinks, phone, privateAddress, education, experience,
    });

    // Use toOwnerJSON if available (includes private fields), otherwise fall back to toJSON
    const userData = typeof user.toOwnerJSON === 'function' ? user.toOwnerJSON() : user.toJSON();

    res.status(200).json({
      success: true,
      data: { user: userData },
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'USER_NOT_FOUND',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update profile',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Forgot Password - Send reset code to email
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email is required' },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid email format' },
      });
    }

    // Log request for security monitoring
    console.log(`🔐 Password reset requested for: ${email} from IP: ${req.ip}`);

    const result = await authService.generatePasswordResetCode(email);
    
    // Always return same message to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset code has been sent.',
      data: result,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    
    // Always return generic message to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset code has been sent.',
    });
  }
};

/**
 * Reset Password - Verify code and update password
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email, code, and new password are required' },
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: { message: 'Password must be at least 6 characters' },
      });
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid code format' },
      });
    }

    // Log attempt for security monitoring
    console.log(`🔐 Password reset attempt for: ${email} from IP: ${req.ip}`);

    await authService.resetPassword(email, code, newPassword);
    
    res.json({
      success: true,
      message: 'Password reset successful! You can now login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    
    // Return specific error for better UX (code already validated on backend)
    res.status(error.status || 500).json({
      success: false,
      error: { message: error.message || 'Failed to reset password' },
    });
  }
};

/**
 * Refresh JWT token - issues a new 30-day token
 * POST /api/auth/refresh-token
 * Requires: valid (non-expired) token in Authorization header
 */
const refreshToken = async (req, res) => {
  try {
    // req.user is set by authenticate middleware — token already verified
    const newToken = authService.generateToken(req.user._id);
    res.json({
      success: true,
      data: { token: newToken },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to refresh token' },
    });
  }
};

export default {
  register,
  login,
  getProfile,
  dailyVisit,
  updateProfile,
  forgotPassword,
  resetPassword,
  refreshToken,
};
