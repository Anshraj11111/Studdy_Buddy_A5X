import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getQuiz,
  startQuizAttempt,
  submitQuiz,
  getQuizAttempts,
  getAttemptDetails,
} from '../controllers/quiz.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Quiz access (requires 100% lecture completion)
router.get('/lectures/:lectureId/quiz', getQuiz);

// Start quiz attempt
router.post('/lectures/:lectureId/quiz/start', startQuizAttempt);

// Submit quiz answers
router.post('/lectures/:lectureId/quiz/submit', submitQuiz);

// Get quiz attempt history
router.get('/lectures/:lectureId/quiz/attempts', getQuizAttempts);

// Get detailed results of a specific attempt
router.get('/quiz-attempts/:attemptId', getAttemptDetails);

export default router;
