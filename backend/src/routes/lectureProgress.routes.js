import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  updateProgress,
  getProgress,
  getCourseProgress,
  getModuleProgress,
} from '../controllers/lectureProgress.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Lecture progress
router.post('/lectures/:lectureId/progress', updateProgress);
router.get('/lectures/:lectureId/progress', getProgress);

// Course progress summary
router.get('/courses/:courseId/progress', getCourseProgress);

// Module progress summary
router.get('/modules/:moduleId/progress', getModuleProgress);

export default router;
