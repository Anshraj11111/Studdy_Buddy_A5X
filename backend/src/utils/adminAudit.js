import AdminAuditLog from '../models/AdminAuditLog.js';

/**
 * Log admin action for audit trail
 * @param {Object} params - Log parameters
 * @param {string} params.action - Action type (user_delete, course_create, etc.)
 * @param {string} params.adminSecret - Admin secret used (will be masked)
 * @param {string} params.targetId - ID of affected resource
 * @param {string} params.targetType - Type of affected resource
 * @param {Object} params.details - Additional details
 * @param {Object} params.req - Express request object
 * @param {boolean} params.success - Whether action succeeded
 * @param {string} params.errorMessage - Error message if failed
 */
export async function logAdminAction({
  action,
  adminSecret = '',
  targetId = '',
  targetType = '',
  details = {},
  req = null,
  success = true,
  errorMessage = '',
}) {
  try {
    const logEntry = {
      action,
      adminSecret: AdminAuditLog.maskSecret(adminSecret),
      targetId: String(targetId),
      targetType,
      details,
      success,
      errorMessage,
    };

    // Extract IP and user agent from request if available
    if (req) {
      logEntry.ipAddress = req.ip || req.connection?.remoteAddress || '';
      logEntry.userAgent = req.get('user-agent') || '';
    }

    await AdminAuditLog.create(logEntry);
    
    console.log(`🔒 Admin audit: ${action} on ${targetType} ${targetId} - ${success ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    // Don't throw - audit logging should never break the actual operation
    console.error('❌ Failed to log admin action:', error);
  }
}

/**
 * Get admin audit logs with filters
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>} Audit logs
 */
export async function getAuditLogs(filters = {}) {
  const query = {};
  
  if (filters.action) query.action = filters.action;
  if (filters.targetId) query.targetId = filters.targetId;
  if (filters.targetType) query.targetType = filters.targetType;
  if (filters.success !== undefined) query.success = filters.success;
  
  // Date range
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }
  
  const logs = await AdminAuditLog.find(query)
    .sort({ createdAt: -1 })
    .limit(filters.limit || 100)
    .lean();
  
  return logs;
}

export default { logAdminAction, getAuditLogs };
