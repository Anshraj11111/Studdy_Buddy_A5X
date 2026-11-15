import express from 'express';
import communityController from '../controllers/community.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/', communityController.getCommunities);
router.get('/:id', communityController.getCommunityById);
router.get('/:id/posts', communityController.getPostsByCommunity);

// Protected routes
router.post('/', authMiddleware.authenticate, communityController.createCommunity);
router.post('/:id/join', authMiddleware.authenticate, communityController.joinCommunity);
router.post('/:id/leave', authMiddleware.authenticate, communityController.leaveCommunity);
router.post('/:id/posts', authMiddleware.authenticate, communityController.createPost);

export default router;
