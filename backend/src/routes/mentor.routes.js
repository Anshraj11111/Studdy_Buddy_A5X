import express from 'express';
import mentorController from '../controllers/mentor.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/all', mentorController.getAllMentors);
router.get('/requests/pending', mentorController.getPendingRequests);

// Protected routes
router.post('/request', authMiddleware.authenticate, mentorController.createRequest);
router.get('/requests', authMiddleware.authenticate, mentorController.getMyRequests);
router.put('/requests/:id/accept', authMiddleware.authenticate, mentorController.acceptRequest);
router.put('/requests/:id/reject', authMiddleware.authenticate, mentorController.rejectRequest);
router.put('/requests/:id/complete', authMiddleware.authenticate, mentorController.completeRequest);

export default router;
