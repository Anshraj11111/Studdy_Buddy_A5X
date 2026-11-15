import express from 'express';
import User from '../models/User.js';
import AppSettings from '../models/AppSettings.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// ── Constants ─────────────────────────────────────────────────────────────────
const REFERRAL_DISCOUNT_PERCENT = 10;   // 10% off
const REFERRAL_MAX_DISCOUNT     = 100;  // cap at ₹100
const REFERRER_XP_REWARD        = 50;   // XP for referrer on successful payment

// ── GET /api/referral/validate/:code ─────────────────────────────────────────
// Validate a referral code and return discount info
// Requires auth (so we know who is validating - to block self-referral)
router.get('/validate/:code', authenticate, async (req, res) => {
  try {
    const { code } = req.params;
    const currentUserId = String(req.user._id);

    if (!code || code.trim().length < 4) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid referral code format' },
      });
    }

    // Find referrer by code
    const referrer = await User.findOne({
      referralCode: code.trim().toUpperCase(),
    }).select('_id name referralCode referralsMade');

    if (!referrer) {
      return res.status(404).json({
        success: false,
        error: { message: 'Referral code not found' },
      });
    }

    // Block self-referral
    if (String(referrer._id) === currentUserId) {
      return res.status(400).json({
        success: false,
        error: { message: "You can't use your own referral code" },
      });
    }

    // Get current course price to calculate discount
    let basePrice = 500;
    try {
      const priceSetting = await AppSettings.findOne({ key: 'payment_price' });
      if (priceSetting) basePrice = parseInt(priceSetting.value) || 500;
    } catch { /* use default */ }

    const discountAmount = Math.min(
      Math.round((basePrice * REFERRAL_DISCOUNT_PERCENT) / 100),
      REFERRAL_MAX_DISCOUNT
    );
    const discountedPrice = basePrice - discountAmount;

    res.json({
      success: true,
      data: {
        valid: true,
        referrerName: referrer.name,
        discountPercent: REFERRAL_DISCOUNT_PERCENT,
        discountAmount,
        originalPrice: basePrice,
        discountedPrice,
      },
    });
  } catch (err) {
    console.error('Referral validate error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to validate referral code' } });
  }
});

// ── GET /api/referral/my-code ─────────────────────────────────────────────────
// Get current user's referral code + stats
router.get('/my-code', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('referralCode referralsMade name');

    // If user somehow doesn't have a code yet, generate one
    if (!user.referralCode) {
      const prefix = (user.name || 'USER').replace(/\s+/g, '').toUpperCase().slice(0, 4);
      const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
      user.referralCode = `${prefix}${suffix}`;
      await user.save();
    }

    res.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        referralsMade: user.referralsMade || 0,
        xpEarned: (user.referralsMade || 0) * REFERRER_XP_REWARD,
        rewardPerReferral: REFERRER_XP_REWARD,
        discountPercent: REFERRAL_DISCOUNT_PERCENT,
      },
    });
  } catch (err) {
    console.error('My referral code error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to get referral code' } });
  }
});

export { REFERRAL_DISCOUNT_PERCENT, REFERRAL_MAX_DISCOUNT, REFERRER_XP_REWARD };
export default router;
