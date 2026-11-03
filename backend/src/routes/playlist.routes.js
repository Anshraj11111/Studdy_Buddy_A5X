import express from 'express';
import playlistController from '../controllers/playlist.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// Public
router.get('/', playlistController.getPlaylists);
router.get('/:id', playlistController.getPlaylistById);

// Protected
router.post('/', authMiddleware.authenticate, playlistController.createPlaylist);
router.put('/:id', authMiddleware.authenticate, playlistController.updatePlaylist);
router.post('/:id/videos/:videoId/token', authMiddleware.authenticate, playlistController.getPlaylistVideoToken);
router.delete('/:id', authMiddleware.authenticate, playlistController.deletePlaylist);

export default router;
