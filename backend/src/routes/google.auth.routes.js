import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import authService from '../services/auth.service.js';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * POST /api/auth/google
 * Verify Google ID token and login/register user
 */
router.post('/google', async (req, res) => {
  try {
    const { credential, role = 'student', mentorCode } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, error: { message: 'Google credential is required' } });
    }

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    if (!email) {
      return res.status(400).json({ success: false, error: { message: 'Could not get email from Google account' } });
    }

    // Validate mentor code if role is mentor
    if (role === 'mentor') {
      const validMentorCode = process.env.MENTOR_CODE || 'H5';
      if (!mentorCode || mentorCode !== validMentorCode) {
        return res.status(403).json({ success: false, error: { message: 'Invalid mentor code', code: 'INVALID_MENTOR_CODE' } });
      }
    }

    // Find or create user
    let user = await User.findOne({ email });

    if (user) {
      // Update profile image if not set
      if (!user.profileImage && picture) {
        user.profileImage = picture;
        await user.save();
      }
    } else {
      // Create new user with Google account
      // Generate a random password (they won't use it since they login via Google)
      const randomPassword = await authService.hashPassword(googleId + Date.now());
      
      user = await User.create({
        name,
        email,
        password: randomPassword,
        role: role || 'student',
        profileImage: picture || '',
        googleId,
        skills: [],
      });
    }

    // Generate JWT token
    const token = authService.generateToken(user._id);

    // Return user without password
    const userObj = user.toJSON ? user.toJSON() : { ...user._doc };
    delete userObj.password;

    res.status(200).json({
      success: true,
      data: { user: userObj, token },
    });

  } catch (error) {
    console.error('Google auth error:', error.message);
    
    if (error.message?.includes('Token used too late') || error.message?.includes('Invalid token')) {
      return res.status(401).json({ success: false, error: { message: 'Invalid or expired Google token' } });
    }

    res.status(500).json({ success: false, error: { message: 'Google authentication failed' } });
  }
});

export default router;
