import express from "express";
import rateLimit from "express-rate-limit";
import { chatWithAI } from "../controllers/chatController.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Per-user AI rate limiter: 20 requests per minute.
// Keyed by authenticated user ID so shared IPs (e.g. school NAT) are not
// penalised together.  Falls back to IP if user somehow not attached.
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  keyGenerator: (req) => req.user?._id?.toString() || req.user?.id?.toString() || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message: "Too many AI requests. Please wait a moment before trying again.",
        code: "AI_RATE_LIMIT_EXCEEDED",
        retryAfter: 60,
      },
    });
  },
});

// authenticate first so keyGenerator can use req.user._id
router.post("/chat", authenticate, aiRateLimiter, chatWithAI);

export default router;