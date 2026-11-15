import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  joinGroup,
  leaveGroup,
  getStatus,
  getMessages,
  getMembers,
  deleteMessage,
} from '../controllers/generalGroup.controller.js';

const router = express.Router();

// All routes require auth
router.use(authenticate);

router.post('/join',          joinGroup);
router.post('/leave',         leaveGroup);
router.get('/status',         getStatus);
router.get('/messages',       getMessages);
router.get('/members',        getMembers);       // mentor only (enforced in controller)
router.delete('/messages/:id', deleteMessage);

export default router;
