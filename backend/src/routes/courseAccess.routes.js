/**
 * Course Access Routes - Admin panel
 */

import express from 'express';
import { getCourseAccessStats, getCourseAccessList, getSchoolsList } from '../controllers/courseAccess.controller.js';

const router = express.Router();

// Admin auth — checks x-admin-secret header against ADMIN_SECRET env var.
const adminAuth = (req, res, next) => {
  const secret   = req.headers['x-admin-secret'];
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    return res.status(500).json({ success: false, error: { message: 'ADMIN_SECRET not configured on server' } });
  }
  if (!secret || secret !== expected) {
    return res.status(401).json({ success: false, error: { message: 'Unauthorized - Invalid admin secret' } });
  }
  next();
};

// All routes require admin authentication (admin secret only, no JWT)
router.use(adminAuth);

// Get course access stats
router.get('/stats', getCourseAccessStats);

// Get filtered list
router.get('/list', getCourseAccessList);

// Get schools list
router.get('/schools', getSchoolsList);

export default router;
