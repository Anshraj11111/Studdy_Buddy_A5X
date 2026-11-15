import express from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { passwordResetLimiter, passwordResetVerifyLimiter, authLimiter } from '../middleware/rate-limit.middleware.js';
import mongoose from 'mongoose';
import { getConnection } from '../config/db-multi.js';

const router = express.Router();

// Public routes with rate limiting
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password', passwordResetVerifyLimiter, authController.resetPassword);

// Public — returns all school names from SchoolChannel collection for the signup dropdown.
// Automatically includes every new school channel added in the admin panel.
// Tries all DB connections so no school is missed regardless of multi-DB setup.
router.get('/schools', async (req, res) => {
  try {
    const schoolChannelSchema = new mongoose.Schema({ schoolName: String, city: String }, { strict: false });

    const allSchools = new Set();

    // Query across all possible connections (primary, secondary, default)
    const connNames = ['primary', 'secondary', 'tertiary'];
    await Promise.allSettled(
      connNames.map(async (name) => {
        try {
          const conn = getConnection(name);
          if (!conn || conn.readyState !== 1) return;
          // Reuse existing model if registered, else create one
          const Model = conn.models?.SchoolChannel
            || conn.model('SchoolChannel', schoolChannelSchema);
          const docs = await Model.find({}, 'schoolName').lean();
          docs.forEach(d => { if (d.schoolName?.trim()) allSchools.add(d.schoolName.trim()); });
        } catch { /* skip failed connection */ }
      })
    );

    // Also try default mongoose connection
    try {
      const DefaultModel = mongoose.models?.SchoolChannel
        || mongoose.model('SchoolChannel', schoolChannelSchema);
      const docs = await DefaultModel.find({}, 'schoolName').lean();
      docs.forEach(d => { if (d.schoolName?.trim()) allSchools.add(d.schoolName.trim()); });
    } catch { /* ignore */ }

    const schools = [...allSchools].sort();
    res.json({ success: true, data: { schools } });
  } catch {
    res.json({ success: true, data: { schools: [] } });
  }
});

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/daily-visit', authenticate, authController.dailyVisit);
router.post('/refresh-token', authenticate, authController.refreshToken);

export default router;
