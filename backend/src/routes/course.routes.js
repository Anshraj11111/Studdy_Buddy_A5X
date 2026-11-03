import express from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import {
  getAllCourses,
  getCourseById,
  getModuleLectures,
  getSecureVideoUrl,
  playVideoWithToken,
  enrollInCourse,
  markVideoCompleted,
  getMyCourses,
} from '../controllers/course.controller.js';

const router = express.Router();

// Public routes (with optional auth for enrollment status)
router.get('/', optionalAuth, getAllCourses);
router.get('/:id', optionalAuth, getCourseById);
router.get('/modules/:id/lectures', optionalAuth, getModuleLectures);

// Protected routes
router.get('/lectures/:lectureId/video-url', authenticate, getSecureVideoUrl);
router.get('/play/:token', authenticate, playVideoWithToken); // New: Get actual URL with token
router.post('/:id/enroll', authenticate, enrollInCourse);
router.post('/:courseId/videos/:videoId/complete', authenticate, markVideoCompleted);
router.get('/my/enrolled', authenticate, getMyCourses);

export default router;
