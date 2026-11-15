import express from 'express';
import doubtController from '../controllers/doubt.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/', doubtController.getDoubts);
router.get('/search', doubtController.searchDoubts);
router.get('/topic/:topic', doubtController.getDoubtsByTopic);
router.get('/:id', doubtController.getDoubtById);

// Protected routes
router.post('/', authenticate, doubtController.createDoubt);
router.post('/:id/find-match', authenticate, doubtController.findMatch);
router.post('/:id/replies', authenticate, doubtController.addReply);
router.put('/:id', authenticate, doubtController.updateDoubt);
router.put('/:id/replies/:replyId', authenticate, doubtController.editReply);
router.delete('/:id', authenticate, doubtController.deleteDoubt);
router.delete('/:id/replies/:replyId', authenticate, doubtController.deleteReply);

export default router;
