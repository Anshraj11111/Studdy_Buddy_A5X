import express from 'express';
import resourceController from '../controllers/resource.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = express.Router();

// Public routes
router.get('/', resourceController.getResources);
router.get('/search', resourceController.searchResources);
router.get('/topic/:topic', resourceController.getResourcesByTopic);

// ── Secure video watch — token IS the auth, no JWT header needed ──────────
// Must be before /:id to avoid being shadowed
router.get('/watch/:token', resourceController.watchVideo);

// Admin routes - must be before /:id routes
router.delete('/clear-all', authMiddleware.authenticate, resourceController.clearAllResources);

router.get('/:id', resourceController.getResourceById);

// Protected routes
router.post('/', authMiddleware.authenticate, resourceController.createResource);
router.post('/upload-notes', authMiddleware.authenticate, upload.single('notes'), resourceController.uploadNotes);
router.post('/:id/download', authMiddleware.authenticate, resourceController.downloadResource);
router.post('/:id/token', authMiddleware.authenticate, resourceController.getVideoToken);
router.put('/:id', authMiddleware.authenticate, resourceController.updateResource);
router.delete('/:id', authMiddleware.authenticate, resourceController.deleteResource);

export default router;
