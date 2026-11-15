import mongoose from 'mongoose';
import { getConnection } from '../config/db-multi.js';

const adminAuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'user_delete',
        'user_update',
        'user_toggle_active',
        'payment_approve',
        'payment_reject',
        'course_create',
        'course_update',
        'course_delete',
        'module_create',
        'module_update',
        'module_delete',
        'lecture_create',
        'lecture_update',
        'lecture_delete',
        'quiz_create',
        'quiz_update',
        'quiz_delete',
        'post_delete',
        'doubt_delete',
        'pre_register_student',
        'pre_register_update',
        'pre_register_delete',
      ],
    },
    adminSecret: {
      type: String,
      required: true,
      // Store masked version for identification (last 4 chars only)
    },
    targetId: {
      type: String,
      default: '',
      // ID of affected resource (user ID, course ID, etc.)
    },
    targetType: {
      type: String,
      default: '',
      // Type of affected resource (user, course, payment, etc.)
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Additional action details
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying logs efficiently
adminAuditLogSchema.index({ action: 1, createdAt: -1 });
adminAuditLogSchema.index({ targetId: 1, createdAt: -1 });
adminAuditLogSchema.index({ createdAt: -1 });

// Method to mask admin secret (show only last 4 chars)
adminAuditLogSchema.statics.maskSecret = function(secret) {
  if (!secret || secret.length < 4) return '****';
  return '***' + secret.slice(-4);
};

const conn = getConnection('primary');
const AdminAuditLog = conn.model('AdminAuditLog', adminAuditLogSchema);

export default AdminAuditLog;
