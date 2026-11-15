import Payment from '../models/Payment.js';
import User from '../models/User.js';
import AppSettings from '../models/AppSettings.js';
import { REFERRAL_DISCOUNT_PERCENT, REFERRAL_MAX_DISCOUNT } from '../routes/referral.routes.js';

/**
 * Submit payment for verification
 * POST /api/payments/submit
 */
export const submitPayment = async (req, res) => {
  try {
    const { amount: rawAmount, courseName, courseId, transactionId, upiId, referralCode } = req.body;
    const userId = req.user._id;

    if (!rawAmount || !courseName) {
      return res.status(400).json({
        success: false,
        error: { message: 'Amount and course name are required', code: 'VALIDATION_ERROR' },
      });
    }

    let finalAmount = Number(rawAmount);
    let referrerId = null;
    let referralDiscount = 0;
    let usedCode = null;

    // ── Apply referral discount if code provided ───────────────────────────
    if (referralCode && referralCode.trim()) {
      const code = referralCode.trim().toUpperCase();

      // Find referrer
      const referrer = await User.findOne({ referralCode: code }).select('_id name');
      if (referrer && String(referrer._id) !== String(userId)) {
        // Valid, non-self referral
        referrerId = referrer._id;
        usedCode = code;

        // Get base price from settings for discount calculation
        let basePrice = finalAmount;
        const discount = Math.min(
          Math.round((basePrice * REFERRAL_DISCOUNT_PERCENT) / 100),
          REFERRAL_MAX_DISCOUNT
        );
        referralDiscount = discount;
        finalAmount = Math.max(1, finalAmount - discount); // never go below ₹1
      }
    }

    // Create payment record
    const payment = await Payment.create({
      userId,
      userName: req.user.name,
      userEmail: req.user.email,
      amount: finalAmount,
      courseName,
      courseId: courseId || 'all-resources',
      transactionId: transactionId || '',
      upiId: upiId || '',
      status: 'pending',
      referralCode: usedCode,
      referrerId,
      referralDiscount,
    });

    res.status(201).json({
      success: true,
      data: { payment, referralApplied: !!referrerId, referralDiscount },
      message: 'Payment submitted for verification. Admin will review shortly.',
    });
  } catch (error) {
    console.error('Submit payment error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to submit payment', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Get user's payment history
 * GET /api/payments/my-payments
 */
export const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .sort({ submittedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { payments },
    });
  } catch (error) {
    console.error('Get my payments error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch payments', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Get UPI ID and payment price for QR code generation
 * GET /api/payments/upi-settings
 */
export const getUpiSettings = async (req, res) => {
  try {
    // Get UPI ID from settings
    let upiSetting = await AppSettings.findOne({ key: 'upi_id' });
    let priceSetting = await AppSettings.findOne({ key: 'payment_price' });
    
    // If not found, create defaults
    if (!upiSetting) {
      upiSetting = await AppSettings.create({
        key: 'upi_id',
        value: '8269858259@upi',
        description: 'UPI ID for payment QR code',
      });
    }

    if (!priceSetting) {
      priceSetting = await AppSettings.create({
        key: 'payment_price',
        value: '500',
        description: 'Price per course in INR',
      });
    }

    res.status(200).json({
      success: true,
      data: { 
        upiId: upiSetting.value,
        paymentPrice: parseInt(priceSetting.value) || 500,
      },
    });
  } catch (error) {
    console.error('Get UPI settings error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch UPI settings', code: 'SERVER_ERROR' },
    });
  }
};

export default {
  submitPayment,
  getMyPayments,
  getUpiSettings,
};
