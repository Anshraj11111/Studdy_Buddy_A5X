import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { submitPayment, getMyPayments, getUpiSettings } from '../controllers/payment.controller.js';

const router = express.Router();

// Public routes
router.get('/upi-settings', getUpiSettings);

// Protected routes (require authentication)
router.post('/submit', authenticate, submitPayment);
router.get('/my-payments', authenticate, getMyPayments);

export default router;
