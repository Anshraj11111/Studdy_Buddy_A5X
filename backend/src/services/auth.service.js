import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import SchoolChannel from '../models/SchoolChannel.js';
import PreRegisteredStudent from '../models/PreRegisteredStudent.js';
import { sendPasswordResetEmail, sendPasswordChangedEmail } from '../config/email.js';

// Generate a unique referral code like "ANSH4X2B"
function generateReferralCode(name) {
  const prefix = (name || 'USER').replace(/\s+/g, '').toUpperCase().slice(0, 4);
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `${prefix}${suffix}`;
}

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user object
   */
  async register(userData) {
    try {
      const { name, email, password, role, skills, mentorCode, schoolName, schoolPassword, city } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Freemium Model: Validate school password ONLY if provided
      if ((role === 'student' || !role) && schoolPassword && schoolName) {
        // STRICT VALIDATION: Check if student is pre-registered by admin
        // Email must match EXACTLY (case-insensitive but exact otherwise)
        const preRegistered = await PreRegisteredStudent.findOne({ 
          email: { $regex: new RegExp(`^${email.trim()}$`, 'i') },
          isUsed: false
        });

        if (preRegistered) {
          // Student is pre-registered - validate password (hashed)
          const isSchoolPasswordValid = await this.comparePassword(schoolPassword, preRegistered.schoolPassword);
          if (!isSchoolPasswordValid) {
            throw new Error('Invalid school password. Please check the password provided by your school.');
          }
          
          // Validate school name matches (case-insensitive)
          const schoolNameMatch = preRegistered.schoolName && 
            preRegistered.schoolName.toLowerCase() === schoolName.toLowerCase();
          
          if (!schoolNameMatch) {
            throw new Error(`School name mismatch. Your pre-registered school is "${preRegistered.schoolName}"`);
          }
          
          // Mark as used with exact email from registration
          preRegistered.isUsed = true;
          preRegistered.usedAt = new Date();
          await preRegistered.save();
          
          console.log(`✅ Pre-registered student signed up: ${email} (${schoolName})`);
        } else {
          // NOT pre-registered - Check if this email was already used
          const alreadyUsed = await PreRegisteredStudent.findOne({ 
            email: { $regex: new RegExp(`^${email.trim()}$`, 'i') },
            isUsed: true
          });

          if (alreadyUsed) {
            throw new Error('This email has already been used for registration. Please login instead.');
          }

          // Student not pre-registered but provided school info - allow freemium
          // Keep schoolName so they can still join school channel
          console.log(`⚠️ Student ${email} signing up without pre-registration (freemium access)`);
          // DO NOT clear schoolName/city - keep them so autoJoinSchoolChannel works
        }
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);
      
      // Hash school password if provided
      const hashedSchoolPassword = schoolPassword ? await this.hashPassword(schoolPassword) : '';

      // Create user
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: role || 'student',
        skills: skills || [],
        mentorCode: mentorCode || null,
        schoolName: schoolName || '',
        schoolPassword: hashedSchoolPassword,
        schoolPasswordPlain: schoolPassword || '', // Store plain for admin
        city: city || '',
        referralCode: generateReferralCode(name),
      });

      // Auto-join school channel for students (only if channel exists AND school info provided)
      if ((role === 'student' || !role) && schoolName && city) {
        await this.autoJoinSchoolChannel(user);
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Auto-join user to their school channel (only if channel exists)
   * @param {Object} user - User object
   * @returns {Promise<void>}
   */
  async autoJoinSchoolChannel(user) {
    try {
      if (!user.schoolName || !user.city) {
        console.log(`⚠️ User ${user.name} has no school info - cannot auto-join`);
        return;
      }

      const channelId = SchoolChannel.generateChannelId(user.schoolName, user.city);
      console.log(`🔍 Looking for channel with ID: ${channelId} for user ${user.name} (school: ${user.schoolName}, city: ${user.city})`);

      // Find existing school channel — try exact channelId first, then by schoolName only as fallback
      let channel = await SchoolChannel.findOne({ channelId });

      // Fallback: if city is empty or wrong, find channel by schoolName alone
      if (!channel && user.schoolName) {
        const schoolNorm = user.schoolName.trim().toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-');
        channel = await SchoolChannel.findOne({ 
          channelId: { $regex: new RegExp(`^${schoolNorm}`) }
        });
        if (channel) {
          console.log(`🔄 Found channel via schoolName fallback: ${channel.channelId}`);
        }
      }

      if (channel) {
        // Add user to existing channel if not already a member
        // Convert ObjectIds to strings for comparison
        const memberIds = channel.members.map(id => String(id));
        const userId = String(user._id);
        
        if (!memberIds.includes(userId)) {
          channel.members.push(user._id);
          channel.stats.totalMembers = channel.members.length;
          channel.stats.lastActivityAt = new Date();
          await channel.save();
          console.log(`✅ Student ${user.name} auto-joined channel: ${channelId} (${channel.schoolName}, ${channel.city})`);
        } else {
          console.log(`ℹ️ Student ${user.name} already a member of channel: ${channelId}`);
        }
      } else {
        // Channel doesn't exist - student will see "no channel" message
        console.log(`⚠️ No channel exists for channelId: ${channelId} (${user.schoolName}, ${user.city}) - student ${user.name} cannot join`);
        
        // List all available channels for debugging
        const allChannels = await SchoolChannel.find({}).select('channelId schoolName city').lean();
        console.log(`📋 Available channels:`, allChannels.map(c => `${c.channelId} (${c.schoolName}, ${c.city})`));
      }
    } catch (error) {
      console.error('Error auto-joining school channel:', error);
      // Don't throw error to prevent registration failure
    }
  }

  /**
   * Login user and generate JWT token
   * @param {string} email - User email
   * @param {string} password - User password (optional for students if schoolPassword provided)
   * @param {string} schoolPassword - School password (optional alternative for students)
   * @returns {Promise<Object>} User object and JWT token
   */
  async login(email, password, schoolPassword) {
    try {
      // Find user by email - select all needed fields including passwords
      const user = await User.findOne({ email })
        .select('_id name email role skills profileImage bannerImage headline bio address socialLinks education experience xp mentorCode password schoolName schoolPassword city')
        .lean();
      
      if (!user) {
        // User doesn't exist - friendly message
        const error = new Error('Account not found. Please create an account first.');
        error.code = 'ACCOUNT_NOT_FOUND';
        throw error;
      }

      let isAuthenticated = false;

      // Try personal password first (if provided)
      if (password) {
        const isPasswordValid = await this.comparePassword(password, user.password);
        if (isPasswordValid) {
          isAuthenticated = true;
        }
      }

      // If personal password didn't work, try school password (for students only)
      if (!isAuthenticated && schoolPassword && user.role === 'student') {
        // SECURITY: School password must match user's own PreReg entry
        // Check if this user has a matching PreReg entry
        const userPreReg = await PreRegisteredStudent.findOne({
          email: { $regex: new RegExp(`^${email.trim()}$`, 'i') },
          isUsed: true
        });

        if (userPreReg && userPreReg.schoolPassword) {
          // Validate against PreReg password
          // Support both plain text (new) and bcrypt hash (legacy)
          let isSchoolPasswordValid = false;
          const storedPassword = userPreReg.schoolPassword;
          
          if (storedPassword.startsWith('$2')) {
            // Bcrypt hash - use bcrypt compare
            isSchoolPasswordValid = await this.comparePassword(schoolPassword, storedPassword);
          } else {
            // Plain text - direct comparison
            isSchoolPasswordValid = schoolPassword === storedPassword;
          }
          
          if (isSchoolPasswordValid) {
            isAuthenticated = true;
            console.log(`✅ School password validated against PreReg for: ${email}`);
          } else {
            console.log(`❌ School password mismatch for PreReg: ${email}`);
          }
        } else {
          // No PreReg entry - check if user has schoolPassword stored (legacy support)
          // But this should eventually be phased out for security
          if (user.schoolPassword) {
            const isSchoolPasswordValid = await this.comparePassword(schoolPassword, user.schoolPassword);
            if (isSchoolPasswordValid) {
              console.log(`⚠️ Legacy school password login for: ${email} (no PreReg match)`);
              isAuthenticated = true;
            }
          }
        }
      }

      if (!isAuthenticated) {
        // Better error message based on what was provided
        let errorMessage = 'Invalid credentials';
        
        if (password && !schoolPassword) {
          errorMessage = 'Invalid password. Try using your school password if you forgot your personal password.';
        } else if (!password && schoolPassword) {
          if (!user.schoolPassword) {
            errorMessage = 'No school password set for this account. Please use your personal password.';
          } else {
            errorMessage = 'Invalid school password. Please check and try again.';
          }
        } else if (password && schoolPassword) {
          errorMessage = 'Both passwords are incorrect. Please check your credentials.';
        }
        
        const error = new Error(errorMessage);
        error.code = 'INVALID_CREDENTIALS';
        throw error;
      }

      // Auto-join school channel for students (if not already joined)
      if ((user.role === 'student' || !user.role) && user.schoolName && user.city) {
        // Convert lean object to mongoose document for auto-join
        const userDoc = await User.findById(user._id);
        await this.autoJoinSchoolChannel(userDoc);
      }

      // Remove passwords from response
      delete user.password;
      delete user.schoolPassword;

      // Add hasFreeAccess flag for frontend
      // Mentors always have free access, students need school credentials or premium
      // Also check PreReg to confirm school access
      user.hasFreeAccess = user.role === 'mentor' || 
        !!(user.schoolName && user.schoolPassword) || 
        user.isPremium ||
        user.hasFreeAccess === true;

      // Generate JWT token
      const token = this.generateToken(user._id);

      return { user, token };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify JWT token and return user
   * @param {string} token - JWT token
   * @returns {Promise<Object>} User object
   */
  async verifyToken(token) {
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user by ID
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 6; // Reduced to 6 for faster hashing
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare plain text password with hashed password
   * @param {string} plaintext - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if passwords match
   */
  async comparePassword(plaintext, hash) {
    return await bcrypt.compare(plaintext, hash);
  }

  /**
   * Generate JWT token
   * @param {string} userId - User ID
   * @returns {string} JWT token
   */
  generateToken(userId) {
    // Ensure expiresIn is in correct format (string like '24h' or number in seconds)
    const expiresIn = process.env.JWT_EXPIRE || '24h';
    
    // Validate format - if it's a plain number without unit, convert to seconds
    const validatedExpiry = /^\d+$/.test(expiresIn) ? parseInt(expiresIn) : expiresIn;
    
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: validatedExpiry }
    );
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user object
   */
  async updateProfile(userId, updateData) {
    try {
      // Don't allow updating email or password through this method
      const { email, password, ...allowedUpdates } = updateData;

      const user = await User.findByIdAndUpdate(
        userId,
        allowedUpdates,
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User object
   */
  async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate password reset code and store in user document
   * @param {String} email - User email
   * @returns {Promise<Object>} Result with success message
   */
  async generatePasswordResetCode(email) {
    const user = await User.findOne({ email });
    
    if (!user) {
      const error = new Error('No account found with this email');
      error.status = 404;
      throw error;
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code and expiry in user document (expires in 10 minutes)
    user.passwordResetCode = resetCode;
    user.passwordResetExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.passwordResetAttempts = 0; // Reset attempts counter
    await user.save();

    // Send email with reset code
    try {
      await sendPasswordResetEmail(email, user.name, resetCode);
      console.log(`✅ Password reset code sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't throw error - code is still valid, user might check console logs in dev
    }
    
    return {
      message: 'If an account exists with this email, a password reset code has been sent.',
      // PRODUCTION: Never return the actual code
      // Code is only sent via email for security
    };
  }

  /**
   * Reset user password with verification code
   * @param {String} email - User email
   * @param {String} code - Reset code
   * @param {String} newPassword - New password
   */
  async resetPassword(email, code, newPassword) {
    const user = await User.findOne({ email });
    
    if (!user) {
      const error = new Error('No account found with this email');
      error.status = 404;
      throw error;
    }

    // Check if code exists and hasn't expired
    if (!user.passwordResetCode || !user.passwordResetExpiry) {
      const error = new Error('No reset code found. Please request a new one.');
      error.status = 400;
      throw error;
    }

    if (new Date() > user.passwordResetExpiry) {
      // Clear expired code
      user.passwordResetCode = undefined;
      user.passwordResetExpiry = undefined;
      user.passwordResetAttempts = 0;
      await user.save();
      
      const error = new Error('Reset code has expired. Please request a new one.');
      error.status = 400;
      throw error;
    }

    // Track failed attempts to prevent brute force
    if (user.passwordResetAttempts >= 5) {
      // Lock after 5 failed attempts
      user.passwordResetCode = undefined;
      user.passwordResetExpiry = undefined;
      user.passwordResetAttempts = 0;
      await user.save();
      
      const error = new Error('Too many failed attempts. Please request a new reset code.');
      error.status = 429;
      throw error;
    }

    // Verify code
    if (user.passwordResetCode !== code) {
      // Increment failed attempts
      user.passwordResetAttempts += 1;
      user.passwordResetLastAttempt = new Date();
      await user.save();
      
      const error = new Error(`Invalid reset code. ${5 - user.passwordResetAttempts} attempts remaining.`);
      error.status = 400;
      throw error;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password and clear reset fields
    user.password = hashedPassword;
    user.passwordResetCode = undefined;
    user.passwordResetExpiry = undefined;
    user.passwordResetAttempts = 0;
    user.passwordResetLastAttempt = undefined;
    
    try {
      await user.save();
      console.log(`✅ Password reset completed for ${email}`);
    } catch (saveError) {
      console.error(`❌ Failed to save password update:`, saveError);
      throw new Error('Failed to update password in database');
    }

    // Send confirmation email
    try {
      await sendPasswordChangedEmail(email, user.name);
      console.log(`✅ Password changed confirmation sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send password changed email:', emailError);
      // Don't throw - password was successfully changed
    }

    // Log security event
    console.log(`🔐 Password reset completed for user: ${email} at ${new Date().toISOString()}`);

    return { message: 'Password reset successful' };
  }
}

export default new AuthService();
