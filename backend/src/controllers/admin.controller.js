import User from '../models/User.js';
import PreRegisteredStudent from '../models/PreRegisteredStudent.js';
import Payment from '../models/Payment.js';
import AppSettings from '../models/AppSettings.js';
import mongoose from 'mongoose';
import { escapeRegex } from '../utils/sanitize.js';
import bcrypt from 'bcryptjs';

// Lazy-load models to avoid circular deps
const getDoubt = async () => (await import('../models/Doubt.js')).default;
const getResource = async () => (await import('../models/Resource.js')).default;

export const getStats = async (req, res) => {
  try {
    const [totalUsers, totalMentors, totalStudents] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'mentor' }),
      User.countDocuments({ role: 'student' }),
    ]);

    // Count students with course access
    const studentsWithAccess = await User.countDocuments({
      role: 'student',
      $or: [
        { $and: [{ schoolName: { $exists: true, $ne: '' } }, { schoolPassword: { $exists: true, $ne: '' } }] },
        { isPremium: true },
        { 'paidCourses.0': { $exists: true } } // Has at least one paid course
      ]
    });

    let totalDoubts = 0, totalResources = 0;
    try { const Doubt = await getDoubt(); totalDoubts = await Doubt.countDocuments(); } catch {}
    try { const Resource = await getResource(); totalResources = await Resource.countDocuments(); } catch {}

    res.json({
      success: true,
      data: { totalUsers, totalMentors, totalStudents, studentsWithAccess, totalDoubts, totalResources },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      const sanitized = escapeRegex(search);
      filter.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { email: { $regex: sanitized, $options: 'i' } },
      ];
    }

    // select('+schoolPasswordPlain') explicitly includes it for admin view
    const users = await User.find(filter)
      .select('-password +schoolPasswordPlain')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(); // lean() bypasses toJSON so schoolPassword is included

    // Transform users to show plain text password for admin viewing
    const usersWithPlainPassword = users.map(user => {
      // Replace schoolPassword (hashed) with schoolPasswordPlain for display
      if (user.schoolPasswordPlain) {
        user.schoolPassword = user.schoolPasswordPlain;
      }
      return user;
    });

    const total = await User.countDocuments(filter);

    res.json({ success: true, data: { users: usersWithPlainPassword, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, error: { message: 'User not found' } });

    user.isActive = !user.isActive;
    await user.save();

    res.json({ success: true, data: { user } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

export const deleteUser = async (req, res) => {
  const { logAdminAction } = await import('../utils/adminAudit.js');
  
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      await logAdminAction({
        action: 'user_delete',
        adminSecret: req.headers['x-admin-secret'],
        targetId: req.params.id,
        targetType: 'user',
        req,
        success: false,
        errorMessage: 'User not found',
      });
      
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }
    
    // Log successful deletion
    await logAdminAction({
      action: 'user_delete',
      adminSecret: req.headers['x-admin-secret'],
      targetId: user._id,
      targetType: 'user',
      details: {
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
      },
      req,
      success: true,
    });
    
    res.json({ success: true, data: { message: 'User deleted' } });
  } catch (err) {
    await logAdminAction({
      action: 'user_delete',
      adminSecret: req.headers['x-admin-secret'],
      targetId: req.params.id,
      targetType: 'user',
      req,
      success: false,
      errorMessage: err.message,
    });
    
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// Update user fields (schoolName, schoolPassword, city, name) from admin panel
export const updateUser = async (req, res) => {
  try {
    const { name, schoolName, schoolPassword, city } = req.body;

    // Build update object — only set fields that were actually sent
    const update = {};
    if (name !== undefined)           update.name           = name.trim();
    if (schoolName !== undefined)     update.schoolName     = schoolName.trim();
    if (schoolPassword !== undefined) {
      // Store BOTH hashed (for login) and plain (for admin view)
      const trimmed = schoolPassword.trim();
      update.schoolPassword = trimmed ? await bcrypt.hash(trimmed, 10) : '';
      update.schoolPasswordPlain = trimmed; // Store plain for admin to see
    }
    if (city !== undefined)           update.city           = city.trim();

    // Use lean() so toJSON() doesn't strip schoolPassword from the response
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true, lean: true }
    ).select('+schoolPasswordPlain'); // Include plain password for admin
    if (!user) return res.status(404).json({ success: false, error: { message: 'User not found' } });

    // Calculate hasFreeAccess manually since lean() bypasses toJSON()
    user.hasFreeAccess = !!(user.schoolName && user.schoolPassword) || user.isPremium;
    
    // Replace schoolPassword (hashed) with schoolPasswordPlain for display
    if (user.schoolPasswordPlain) {
      user.schoolPassword = user.schoolPasswordPlain;
    }
    
    // Strip login password before sending
    const { password, ...safeUser } = user;
    
    res.json({ 
      success: true, 
      data: { user: safeUser },
      message: 'User updated. They must re-login to see access changes.' 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// Pre-register student with school password
export const preRegisterStudent = async (req, res) => {
  try {
    const { name, email, phone, schoolPassword, schoolName } = req.body;

    // Validation
    if (!name || !email || !schoolPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name, email, and school password are required' },
      });
    }

    // Check if email already pre-registered
    const existing = await PreRegisteredStudent.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { message: 'Email already pre-registered' },
      });
    }

    // Check if email already used by a registered user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // If user exists but doesn't have school code/password, update their account
      if (!existingUser.schoolName && !existingUser.schoolPassword) {
        const updateData = {
          schoolName: schoolName || '',
          schoolPassword: await bcrypt.hash(schoolPassword, 10), // Hash before storing
          schoolPasswordPlain: schoolPassword, // Store plain for admin
        };
        
        // Update user with school credentials
        await User.findByIdAndUpdate(existingUser._id, { $set: updateData });
        
        // ALSO create a PreRegistered entry for tracking/display in admin panel
        // Mark it as "used" immediately since user already exists
        let createdById = req.user?._id;
        if (!createdById) {
          const adminUser = await User.findOne({ role: 'admin' });
          if (!adminUser) {
            const anyUser = await User.findOne();
            createdById = anyUser?._id;
          } else {
            createdById = adminUser._id;
          }
        }
        
        const preRegistered = await PreRegisteredStudent.create({
          name,
          email,
          phone: phone || '',
          schoolName: schoolName || '',
          schoolPassword: await bcrypt.hash(schoolPassword, 10), // Hash before storing
          schoolPasswordPlain: schoolPassword, // Store plain for admin viewing
          createdBy: createdById,
          isUsed: true,
          usedAt: new Date(),
        });
        
        return res.status(201).json({
          success: true,
          message: 'School credentials added to existing user account',
          data: { 
            preRegistered,
            updatedExistingUser: true 
          },
        });
      }
      
      // User already has school credentials
      return res.status(409).json({
        success: false,
        error: { message: 'Email already registered by a user with school credentials' },
      });
    }

    // Use authenticated user if available, otherwise find any admin user
    let createdById = req.user?._id;
    if (!createdById) {
      const adminUser = await User.findOne({ role: 'admin' });
      if (!adminUser) {
        const anyUser = await User.findOne();
        createdById = anyUser?._id;
      } else {
        createdById = adminUser._id;
      }
    }

    // Create pre-registered student
    const preRegistered = await PreRegisteredStudent.create({
      name,
      email,
      phone: phone || '',
      schoolName: schoolName || '',
      schoolPassword: await bcrypt.hash(schoolPassword, 10), // Hash before storing
      schoolPasswordPlain: schoolPassword, // Store plain for admin viewing
      createdBy: createdById,
    });

    res.status(201).json({
      success: true,
      data: { preRegistered },
    });
  } catch (err) {
    console.error('Pre-register error:', err.message, err.stack);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};
export const getPreRegisteredStudents = async (req, res) => {
  try {
    const { search, page = 1, limit = 500, status = 'all', schoolName } = req.query;
    const filter = {};
    
    if (status === 'unused') filter.isUsed = false;
    if (status === 'used') filter.isUsed = true;
    
    if (schoolName && schoolName !== 'all') {
      filter.schoolName = schoolName;
    }
    
    if (search) {
      const sanitized = escapeRegex(search);
      filter.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { email: { $regex: sanitized, $options: 'i' } },
      ];
    }

    const students = await PreRegisteredStudent.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await PreRegisteredStudent.countDocuments(filter);

    // Transform students to show plain text password for admin viewing
    const studentsWithPlainPassword = students.map(student => {
      const studentObj = student.toObject();
      // Replace schoolPassword (hashed) with schoolPasswordPlain for display
      studentObj.schoolPassword = studentObj.schoolPasswordPlain || studentObj.schoolPassword;
      return studentObj;
    });

    res.json({
      success: true,
      data: { students: studentsWithPlainPassword, total, page: Number(page) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// Get unique school codes
export const getSchoolCodes = async (req, res) => {
  try {
    const schoolCodes = await PreRegisteredStudent.distinct('schoolName');
    // Filter out empty/null values and sort
    const validCodes = schoolCodes.filter(code => code && code.trim()).sort();
    
    res.json({
      success: true,
      data: { schoolCodes: validCodes },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// Delete pre-registered student
export const deletePreRegisteredStudent = async (req, res) => {
  try {
    const student = await PreRegisteredStudent.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: { message: 'Pre-registered student not found' },
      });
    }

    res.json({
      success: true,
      data: { message: 'Pre-registered student deleted' },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// Update pre-registered student
export const updatePreRegisteredStudent = async (req, res) => {
  try {
    const { name, email, phone, schoolPassword } = req.body;
    
    const student = await PreRegisteredStudent.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: { message: 'Pre-registered student not found' },
      });
    }

    if (student.isUsed) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot update - student already registered' },
      });
    }

    if (name) student.name = name;
    if (email) student.email = email;
    if (phone !== undefined) student.phone = phone;
    if (schoolPassword) {
      student.schoolPassword = await bcrypt.hash(schoolPassword, 10); // Hash before storing
      student.schoolPasswordPlain = schoolPassword; // Store plain for admin viewing
    }

    await student.save();

    // Transform student to show plain text password for admin viewing
    const studentObj = student.toObject();
    studentObj.schoolPassword = studentObj.schoolPasswordPlain || studentObj.schoolPassword;

    res.json({
      success: true,
      data: { student: studentObj },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};


// ========== PAYMENT MANAGEMENT ==========

/**
 * Get all payments (pending, approved, rejected)
 * GET /api/admin/payments
 */
export const getAllPayments = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 50 } = req.query;
    const filter = {};
    
    if (status !== 'all') {
      filter.status = status;
    }

    const payments = await Payment.find(filter)
      .populate('userId', 'name email profileImage')
      .populate('reviewedBy', 'name email')
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Payment.countDocuments(filter);
    const pendingCount = await Payment.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      data: { payments, total, pendingCount, page: Number(page) },
    });
  } catch (err) {
    console.error('Get all payments error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Approve payment - grants user access
 * PUT /api/admin/payments/:id/approve
 */
export const approvePayment = async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Payment not found' },
      });
    }

    console.log('Approving payment:', { id: req.params.id, currentStatus: payment.status });

    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { message: `Payment already ${payment.status}` },
      });
    }

    // Update payment status
    payment.status = 'approved';
    payment.adminNotes = adminNotes || '';
    payment.reviewedAt = new Date();
    
    // Use authenticated user if available, otherwise find admin
    let reviewedById = req.user?._id;
    if (!reviewedById) {
      const adminUser = await User.findOne({ role: 'admin' });
      reviewedById = adminUser?._id;
    }
    payment.reviewedBy = reviewedById;
    
    await payment.save();

    console.log('Payment approved, now granting user access:', payment.userId);

    // Grant user access by setting hasFreeAccess flag
    const user = await User.findById(payment.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' },
      });
    }

    console.log('User found, updating premium status:', { userId: user._id, currentPremium: user.isPremium });
    
    // Set isPremium to true
    user.isPremium = true;
    
    // Add to paidCourses array
    user.paidCourses.push({
      courseId: payment.courseId,
      amount: payment.amount,
      transactionId: payment.transactionId,
      paidAt: new Date(),
    });
    
    // Update totalPaid
    user.totalPaid = (user.totalPaid || 0) + payment.amount;
    
    await user.save();

    // ── Credit XP to referrer (only once per payment) ─────────────────────
    const REFERRER_XP_REWARD = 50;
    if (payment.referrerId && !payment.referralXpGranted) {
      try {
        const referrer = await User.findById(payment.referrerId);
        if (referrer) {
          referrer.xp = (referrer.xp || 0) + REFERRER_XP_REWARD;
          referrer.referralsMade = (referrer.referralsMade || 0) + 1;
          referrer.xpHistory = referrer.xpHistory || [];
          referrer.xpHistory.push({
            action: 'referral_reward',
            amount: REFERRER_XP_REWARD,
            createdAt: new Date(),
          });
          await referrer.save();

          // Mark XP as granted so we don't double-credit
          payment.referralXpGranted = true;
          await payment.save();

          console.log(`✅ Referral XP +${REFERRER_XP_REWARD} credited to ${referrer.name} (${referrer._id})`);
        }
      } catch (xpErr) {
        // Non-fatal: log but don't fail the approval
        console.error('Failed to credit referral XP:', xpErr.message);
      }
    }

    res.json({
      success: true,
      data: { payment },
      message: 'Payment approved and access granted',
    });
  } catch (err) {
    console.error('Approve payment error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Reject payment
 * PUT /api/admin/payments/:id/reject
 */
export const rejectPayment = async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Payment not found' },
      });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { message: `Payment already ${payment.status}` },
      });
    }

    // Update payment status
    payment.status = 'rejected';
    payment.adminNotes = adminNotes || '';
    payment.reviewedAt = new Date();
    
    // Use authenticated user if available, otherwise find admin
    let reviewedById = req.user?._id;
    if (!reviewedById) {
      const adminUser = await User.findOne({ role: 'admin' });
      reviewedById = adminUser?._id;
    }
    payment.reviewedBy = reviewedById;
    
    await payment.save();

    res.json({
      success: true,
      data: { payment },
      message: 'Payment rejected',
    });
  } catch (err) {
    console.error('Reject payment error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Get UPI settings
 * GET /api/admin/upi-settings
 */
export const getUpiSettings = async (req, res) => {
  try {
    let upiSetting = await AppSettings.findOne({ key: 'upi_id' });
    let priceSetting = await AppSettings.findOne({ key: 'payment_price' });
    
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

    res.json({
      success: true,
      data: { 
        upiId: upiSetting.value,
        paymentPrice: parseInt(priceSetting.value) || 500,
      },
    });
  } catch (err) {
    console.error('Get UPI settings error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Update UPI settings
 * PUT /api/admin/upi-settings
 */
export const updateUpiSettings = async (req, res) => {
  try {
    const { upiId, paymentPrice } = req.body;

    if (!upiId && paymentPrice === undefined) {
      return res.status(400).json({
        success: false,
        error: { message: 'UPI ID or payment price is required' },
      });
    }

    const updates = {};

    // Update UPI ID
    if (upiId) {
      let upiSetting = await AppSettings.findOne({ key: 'upi_id' });
      
      if (upiSetting) {
        upiSetting.value = upiId;
        await upiSetting.save();
      } else {
        upiSetting = await AppSettings.create({
          key: 'upi_id',
          value: upiId,
          description: 'UPI ID for payment QR code',
        });
      }
      updates.upiId = upiSetting.value;
    }

    // Update payment price
    if (paymentPrice !== undefined) {
      const price = parseInt(paymentPrice);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid payment price' },
        });
      }

      let priceSetting = await AppSettings.findOne({ key: 'payment_price' });
      
      if (priceSetting) {
        priceSetting.value = price.toString();
        await priceSetting.save();
      } else {
        priceSetting = await AppSettings.create({
          key: 'payment_price',
          value: price.toString(),
          description: 'Price per course in INR',
        });
      }
      updates.paymentPrice = price;
    }

    res.json({
      success: true,
      data: updates,
      message: 'Settings updated successfully',
    });
  } catch (err) {
    console.error('Update UPI settings error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

// ========== COURSE MANAGEMENT ==========

import Course from '../models/Course.js';
import Module from '../models/Module.js';

/**
 * Get all courses for admin
 * GET /api/admin/courses
 */
export const getAllCourses = async (req, res) => {
  try {
    const { topic, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    
    if (topic) filter.topic = topic;
    if (search) {
      const sanitized = escapeRegex(search);
      filter.$or = [
        { title: { $regex: sanitized, $options: 'i' } },
        { description: { $regex: sanitized, $options: 'i' } },
      ];
    }

    const courses = await Course.find(filter)
      .populate('createdBy', 'name email')
      .populate('modules')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Course.countDocuments(filter);

    res.json({
      success: true,
      data: { courses, total, page: Number(page) },
    });
  } catch (err) {
    console.error('Get all courses error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Create new course
 * POST /api/admin/courses
 */
export const createCourse = async (req, res) => {
  try {
    const courseData = req.body;
    
    // Use authenticated user if available
    let createdById = req.user?._id;
    if (!createdById) {
      const mentorUser = await User.findOne({ role: 'mentor' });
      if (!mentorUser) {
        const anyUser = await User.findOne();
        createdById = anyUser?._id;
      } else {
        createdById = mentorUser._id;
      }
    }
    
    courseData.createdBy = createdById;
    
    const course = await Course.create(courseData);

    res.status(201).json({
      success: true,
      data: { course },
      message: 'Course created successfully',
    });
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Update course
 * PUT /api/admin/courses/:id
 */
export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        error: { message: 'Course not found' },
      });
    }

    res.json({
      success: true,
      data: { course },
      message: 'Course updated successfully',
    });
  } catch (err) {
    console.error('Update course error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Delete course
 * DELETE /api/admin/courses/:id
 */
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        error: { message: 'Course not found' },
      });
    }

    // Delete associated modules
    await Module.deleteMany({ courseId: course._id });

    res.json({
      success: true,
      data: { message: 'Course deleted successfully' },
    });
  } catch (err) {
    console.error('Delete course error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Create module in course
 * POST /api/admin/courses/:courseId/modules
 */
export const createModule = async (req, res) => {
  try {
    const { courseId } = req.params;
    const moduleData = { ...req.body, courseId };

    const module = await Module.create(moduleData);

    // Add module to course
    await Course.findByIdAndUpdate(courseId, {
      $push: { modules: module._id },
    });

    res.status(201).json({
      success: true,
      data: { module },
      message: 'Module created successfully',
    });
  } catch (err) {
    console.error('Create module error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Update module
 * PUT /api/admin/modules/:id
 */
export const updateModule = async (req, res) => {
  try {
    const module = await Module.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!module) {
      return res.status(404).json({
        success: false,
        error: { message: 'Module not found' },
      });
    }

    res.json({
      success: true,
      data: { module },
      message: 'Module updated successfully',
    });
  } catch (err) {
    console.error('Update module error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Delete module
 * DELETE /api/admin/modules/:id
 */
export const deleteModule = async (req, res) => {
  try {
    const module = await Module.findByIdAndDelete(req.params.id);

    if (!module) {
      return res.status(404).json({
        success: false,
        error: { message: 'Module not found' },
      });
    }

    // Remove module from course
    await Course.findByIdAndUpdate(module.courseId, {
      $pull: { modules: module._id },
    });

    res.json({
      success: true,
      data: { message: 'Module deleted successfully' },
    });
  } catch (err) {
    console.error('Delete module error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

import Resource from '../models/Resource.js';

/**
 * Get course modules with lectures
 * GET /api/admin/courses/:courseId/modules
 */
export const getCourseModules = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const modules = await Module.find({ courseId })
      .populate('resources')
      .sort({ order: 1 });

    res.json({
      success: true,
      data: { modules },
    });
  } catch (err) {
    console.error('Get course modules error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Create module
 * POST /api/admin/modules
 */
export const createModuleStandalone = async (req, res) => {
  try {
    const moduleData = req.body;
    const module = await Module.create(moduleData);

    // Add module to course
    await Course.findByIdAndUpdate(moduleData.courseId, {
      $push: { modules: module._id },
    });

    res.status(201).json({
      success: true,
      data: { module },
      message: 'Module created successfully',
    });
  } catch (err) {
    console.error('Create module error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Create lecture (resource) in module
 * POST /api/admin/lectures
 */
export const createLecture = async (req, res) => {
  try {
    const lectureData = req.body;
    
    // Use authenticated user if available
    let uploadedById = req.user?._id;
    if (!uploadedById) {
      const mentorUser = await User.findOne({ role: 'mentor' });
      if (!mentorUser) {
        const anyUser = await User.findOne();
        uploadedById = anyUser?._id;
      } else {
        uploadedById = mentorUser._id;
      }
    }
    
    lectureData.uploadedBy = uploadedById;
    lectureData.isPublic = false; // Course lectures are not public by default
    
    const lecture = await Resource.create(lectureData);

    // Add lecture to module
    await Module.findByIdAndUpdate(lectureData.moduleId, {
      $push: { resources: lecture._id },
      $inc: { videoCount: 1 },
    });

    // Update course totalVideos count
    if (lectureData.courseId) {
      await Course.findByIdAndUpdate(lectureData.courseId, {
        $inc: { totalVideos: 1 },
      });
    }

    res.status(201).json({
      success: true,
      data: { lecture },
      message: 'Lecture created successfully',
    });
  } catch (err) {
    console.error('Create lecture error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
/**
 * Get single lecture with fileUrl (admin only)
 * GET /api/admin/lectures/:id
 */
export const getLecture = async (req, res) => {
  try {
    const lecture = await Resource.findById(req.params.id).lean();
    if (!lecture) return res.status(404).json({ success: false, error: { message: 'Lecture not found' } });
    res.json({ success: true, data: { lecture } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Update lecture
 * PUT /api/admin/lectures/:id
 */
export const updateLecture = async (req, res) => {
  try {
    const lecture = await Resource.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!lecture) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lecture not found' },
      });
    }

    res.json({
      success: true,
      data: { lecture },
      message: 'Lecture updated successfully',
    });
  } catch (err) {
    console.error('Update lecture error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Delete lecture
 * DELETE /api/admin/lectures/:id
 */
export const deleteLecture = async (req, res) => {
  try {
    const lecture = await Resource.findByIdAndDelete(req.params.id);

    if (!lecture) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lecture not found' },
      });
    }

    // Remove lecture from module
    if (lecture.moduleId) {
      await Module.findByIdAndUpdate(lecture.moduleId, {
        $pull: { resources: lecture._id },
        $inc: { videoCount: -1 },
      });
    }

    // Update course totalVideos count
    if (lecture.courseId) {
      await Course.findByIdAndUpdate(lecture.courseId, {
        $inc: { totalVideos: -1 },
      });
    }

    res.json({
      success: true,
      data: { message: 'Lecture deleted successfully' },
    });
  } catch (err) {
    console.error('Delete lecture error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Get all community feed posts (with pagination + search)
 * GET /api/admin/posts
 */
export const getAllPosts = async (req, res) => {
  try {
    const FeedPost = (await import('../models/FeedPost.js')).default;
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = search
      ? { content: { $regex: escapeRegex(search), $options: 'i' } }
      : {};

    const [posts, total] = await Promise.all([
      FeedPost.find(filter)
        .populate('userId', 'name profileImage role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      FeedPost.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { posts, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    console.error('Admin getAllPosts error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * Admin delete any post
 * DELETE /api/admin/posts/:id
 */
export const adminDeletePost = async (req, res) => {
  try {
    const FeedPost = (await import('../models/FeedPost.js')).default;
    const post = await FeedPost.findByIdAndDelete(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: { message: 'Post not found' },
      });
    }

    res.json({
      success: true,
      data: { message: 'Post deleted successfully' },
    });
  } catch (err) {
    console.error('Admin deletePost error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};


// ══════════════════════════════════════════════════════════════════════════════
// Doubts Management
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get all doubts with replies (Admin Only)
 * GET /api/admin/doubts
 */
export const getAllDoubts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, topic, search } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (topic) query.topic = topic;
    if (search) {
      // Sanitize search input to prevent regex injection
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    const Doubt = await getDoubt();
    const skip = (page - 1) * limit;

    const doubts = await Doubt.find(query)
      .populate('userId', 'name email profileImage school')
      .populate('replies.user', 'name email profileImage role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Doubt.countDocuments(query);

    res.json({
      success: true,
      data: {
        doubts,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching doubts:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch doubts', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Update doubt (Admin Only)
 * PUT /api/admin/doubts/:id
 */
export const adminUpdateDoubt = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, topic, status } = req.body;

    const Doubt = await getDoubt();
    const doubt = await Doubt.findById(id);

    if (!doubt) {
      return res.status(404).json({
        success: false,
        error: { message: 'Doubt not found', code: 'NOT_FOUND' },
      });
    }

    if (title) doubt.title = title;
    if (description) doubt.description = description;
    if (topic) doubt.topic = topic;
    if (status) doubt.status = status;

    await doubt.save();

    const updatedDoubt = await Doubt.findById(id)
      .populate('userId', 'name email profileImage')
      .populate('replies.user', 'name email profileImage role');

    res.json({
      success: true,
      data: { doubt: updatedDoubt },
      message: 'Doubt updated successfully',
    });
  } catch (error) {
    console.error('Error updating doubt:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update doubt', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Delete doubt (Admin Only)
 * DELETE /api/admin/doubts/:id
 */
export const adminDeleteDoubt = async (req, res) => {
  try {
    const { id } = req.params;

    const Doubt = await getDoubt();
    const doubt = await Doubt.findByIdAndDelete(id);

    if (!doubt) {
      return res.status(404).json({
        success: false,
        error: { message: 'Doubt not found', code: 'NOT_FOUND' },
      });
    }

    res.json({
      success: true,
      message: 'Doubt deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting doubt:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete doubt', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Update reply (Admin Only)
 * PUT /api/admin/doubts/:doubtId/replies/:replyId
 */
export const adminUpdateReply = async (req, res) => {
  try {
    const { doubtId, replyId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Reply content is required', code: 'VALIDATION_ERROR' },
      });
    }

    const Doubt = await getDoubt();
    const doubt = await Doubt.findById(doubtId);

    if (!doubt) {
      return res.status(404).json({
        success: false,
        error: { message: 'Doubt not found', code: 'NOT_FOUND' },
      });
    }

    const reply = doubt.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({
        success: false,
        error: { message: 'Reply not found', code: 'NOT_FOUND' },
      });
    }

    reply.content = content.trim();
    reply.isEdited = true;
    reply.editedAt = new Date();

    await doubt.save();

    const updatedDoubt = await Doubt.findById(doubtId)
      .populate('userId', 'name email profileImage')
      .populate('replies.user', 'name email profileImage role');

    res.json({
      success: true,
      data: { doubt: updatedDoubt },
      message: 'Reply updated successfully',
    });
  } catch (error) {
    console.error('Error updating reply:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update reply', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Delete reply (Admin Only)
 * DELETE /api/admin/doubts/:doubtId/replies/:replyId
 */
export const adminDeleteReply = async (req, res) => {
  try {
    const { doubtId, replyId } = req.params;

    const Doubt = await getDoubt();
    const doubt = await Doubt.findById(doubtId);

    if (!doubt) {
      return res.status(404).json({
        success: false,
        error: { message: 'Doubt not found', code: 'NOT_FOUND' },
      });
    }

    const reply = doubt.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({
        success: false,
        error: { message: 'Reply not found', code: 'NOT_FOUND' },
      });
    }

    reply.remove();
    await doubt.save();

    const updatedDoubt = await Doubt.findById(doubtId)
      .populate('userId', 'name email profileImage')
      .populate('replies.user', 'name email profileImage role');

    res.json({
      success: true,
      data: { doubt: updatedDoubt },
      message: 'Reply deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting reply:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete reply', code: 'SERVER_ERROR' },
    });
  }
};


/**
 * Get all quizzes (Admin Only)
 * GET /api/admin/quizzes
 */
export const getAllQuizzes = async (req, res) => {
  try {
    const Quiz = (await import('../models/Quiz.js')).default;
    
    const quizzes = await Quiz.find()
      .populate('courseId', 'title')
      .populate('moduleId', 'title')
      .populate('lectureId', 'title')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { quizzes },
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch quizzes', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Create quiz (Admin Only)
 * POST /api/admin/quizzes
 */
export const createQuiz = async (req, res) => {
  try {
    const Quiz = (await import('../models/Quiz.js')).default;
    const { lectureId, courseId, moduleId, title, description, questions, passingScore, duration, maxAttempts } = req.body;

    // Check if quiz already exists for this lecture
    const existingQuiz = await Quiz.findOne({ lectureId });
    if (existingQuiz) {
      return res.status(400).json({
        success: false,
        error: { message: 'Quiz already exists for this lecture' },
      });
    }

    const quiz = await Quiz.create({
      lectureId,
      courseId,
      moduleId,
      title,
      description,
      questions,
      passingScore: passingScore || 60,
      duration: duration || 0,
      maxAttempts: maxAttempts || 3,
      createdBy: req.user._id,
    });

    await quiz.populate('courseId', 'title');
    await quiz.populate('moduleId', 'title');
    await quiz.populate('lectureId', 'title');

    res.status(201).json({
      success: true,
      data: { quiz },
    });
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create quiz', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Update quiz (Admin Only)
 * PUT /api/admin/quizzes/:id
 */
export const updateQuiz = async (req, res) => {
  try {
    const Quiz = (await import('../models/Quiz.js')).default;
    const { id } = req.params;
    const { title, description, questions, passingScore, duration, maxAttempts } = req.body;

    const quiz = await Quiz.findByIdAndUpdate(
      id,
      {
        title,
        description,
        questions,
        passingScore,
        duration,
        maxAttempts,
      },
      { new: true, runValidators: true }
    )
      .populate('courseId', 'title')
      .populate('moduleId', 'title')
      .populate('lectureId', 'title');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: { message: 'Quiz not found' },
      });
    }

    res.json({
      success: true,
      data: { quiz },
    });
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update quiz', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Delete quiz (Admin Only)
 * DELETE /api/admin/quizzes/:id
 */
export const deleteQuiz = async (req, res) => {
  try {
    const Quiz = (await import('../models/Quiz.js')).default;
    const { id } = req.params;

    const quiz = await Quiz.findByIdAndDelete(id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: { message: 'Quiz not found' },
      });
    }

    res.json({
      success: true,
      data: { message: 'Quiz deleted successfully' },
    });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete quiz', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Get lectures for a module (Admin Only)
 * GET /api/admin/modules/:moduleId/lectures
 */
export const getModuleLectures = async (req, res) => {
  try {
    const Module = (await import('../models/Module.js')).default;
    const { moduleId } = req.params;

    const module = await Module.findById(moduleId).populate('resources');
    
    if (!module) {
      return res.status(404).json({
        success: false,
        error: { message: 'Module not found' },
      });
    }

    res.json({
      success: true,
      data: { lectures: module.resources || [] },
    });
  } catch (error) {
    console.error('Error fetching lectures:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch lectures', code: 'SERVER_ERROR' },
    });
  }
};


// Get all quiz attempts with student details
export const getQuizAttempts = async (req, res) => {
  try {
    const { courseId, moduleId, lectureId, studentId, page = 1, limit = 50 } = req.query;
    
    const QuizAttempt = (await import('../models/QuizAttempt.js')).default;
    const Quiz = (await import('../models/Quiz.js')).default;
    const Course = (await import('../models/Course.js')).default;
    const Module = (await import('../models/Module.js')).default;
    const Resource = (await import('../models/Resource.js')).default;

    // Build filter
    const filter = { status: 'completed' }; // Only show completed attempts
    if (studentId) filter.userId = studentId; // userId in model, studentId in query

    // If lectureId specified, find quiz for that lecture
    if (lectureId) {
      const quiz = await Quiz.findOne({ lectureId }).lean();
      if (quiz) filter.quizId = quiz._id;
    }

    // Get all attempts with populated data
    const attempts = await QuizAttempt.find(filter)
      .populate('userId', 'name email schoolName')
      .populate('quizId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    // Enrich with course/module/lecture info
    const enrichedAttempts = await Promise.all(
      attempts.map(async (attempt) => {
        if (!attempt.quizId) return attempt;

        const quiz = attempt.quizId;
        const [course, module, lecture] = await Promise.all([
          Course.findById(quiz.courseId).select('title').lean(),
          Module.findById(quiz.moduleId).select('title').lean(),
          Resource.findById(quiz.lectureId).select('title').lean(),
        ]);

        return {
          ...attempt,
          studentId: attempt.userId, // Map userId to studentId for frontend
          score: attempt.score?.percentage || 0, // Flatten score
          course: course || null,
          module: module || null,
          lecture: lecture || null,
        };
      })
    );

    const total = await QuizAttempt.countDocuments(filter);

    res.json({
      success: true,
      data: {
        attempts: enrichedAttempts,
        total,
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (err) {
    console.error('Error fetching quiz attempts:', err);
    res.status(500).json({
      success: false,
      error: { message: err.message || 'Failed to fetch quiz attempts' },
    });
  }
};

// Get detailed quiz attempt by ID
export const getQuizAttemptDetail = async (req, res) => {
  try {
    const QuizAttempt = (await import('../models/QuizAttempt.js')).default;
    const Quiz = (await import('../models/Quiz.js')).default;
    const Course = (await import('../models/Course.js')).default;
    const Module = (await import('../models/Module.js')).default;
    const Resource = (await import('../models/Resource.js')).default;

    const attempt = await QuizAttempt.findById(req.params.id)
      .populate('userId', 'name email schoolName city')
      .populate('quizId')
      .lean();

    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: { message: 'Quiz attempt not found' },
      });
    }

    // Get course/module/lecture details
    if (attempt.quizId) {
      const quiz = attempt.quizId;
      const [course, module, lecture] = await Promise.all([
        Course.findById(quiz.courseId).select('title').lean(),
        Module.findById(quiz.moduleId).select('title').lean(),
        Resource.findById(quiz.lectureId).select('title').lean(),
      ]);

      attempt.course = course;
      attempt.module = module;
      attempt.lecture = lecture;
      attempt.studentId = attempt.userId; // Map userId to studentId for frontend
      attempt.score = attempt.score?.percentage || 0; // Flatten score for frontend
    }

    res.json({
      success: true,
      data: { attempt },
    });
  } catch (err) {
    console.error('Error fetching quiz attempt detail:', err);
    res.status(500).json({
      success: false,
      error: { message: err.message || 'Failed to fetch quiz attempt' },
    });
  }
};

// Get quiz statistics (pass rate, average score, etc.)
export const getQuizStats = async (req, res) => {
  try {
    const QuizAttempt = (await import('../models/QuizAttempt.js')).default;
    const Quiz = (await import('../models/Quiz.js')).default;

    const { lectureId, courseId } = req.query;

    // Build filter - only completed attempts
    const filter = { status: 'completed' };
    
    let quizIds = [];
    if (lectureId) {
      const quiz = await Quiz.findOne({ lectureId }).lean();
      if (quiz) quizIds = [quiz._id];
    } else if (courseId) {
      const quizzes = await Quiz.find({ courseId }).select('_id').lean();
      quizIds = quizzes.map(q => q._id);
    } else {
      const quizzes = await Quiz.find().select('_id').lean();
      quizIds = quizzes.map(q => q._id);
    }

    if (quizIds.length > 0) {
      filter.quizId = { $in: quizIds };
    }

    // Aggregate stats
    const [totalAttempts, passedAttempts, avgScoreResult] = await Promise.all([
      QuizAttempt.countDocuments(filter),
      QuizAttempt.countDocuments({ ...filter, isPassed: true }),
      QuizAttempt.aggregate([
        { $match: filter },
        { $group: { _id: null, avgScore: { $avg: '$score.percentage' } } },
      ]),
    ]);

    const avgScore = avgScoreResult[0]?.avgScore || 0;
    const passRate = totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0;

    res.json({
      success: true,
      data: {
        totalAttempts,
        passedAttempts,
        failedAttempts: totalAttempts - passedAttempts,
        passRate: Math.round(passRate * 100) / 100,
        avgScore: Math.round(avgScore * 100) / 100,
      },
    });
  } catch (err) {
    console.error('Error fetching quiz stats:', err);
    res.status(500).json({
      success: false,
      error: { message: err.message || 'Failed to fetch quiz statistics' },
    });
  }
};
