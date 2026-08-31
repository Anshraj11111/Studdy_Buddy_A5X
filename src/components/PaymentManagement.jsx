import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { DollarSign, RefreshCw, Loader2, Settings, Edit2, Save, CheckCircle, XCircle, Clock } from "lucide-react"
import { adminPaymentAPI } from '../services/api'

// ── Payment Management Component ────────────────────────────────────────────
export default function PaymentManagement({ showToast }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [pendingCount, setPendingCount] = useState(0)
  const [actionLoading, setActionLoading] = useState(null)
  
  // UPI Settings
  const [upiId, setUpiId] = useState('')
  const [editingUpi, setEditingUpi] = useState(false)
  const [newUpiId, setNewUpiId] = useState('')
  const [updatingUpi, setUpdatingUpi] = useState(false)
  
  // Payment Price Settings
  const [paymentPrice, setPaymentPrice] = useState(500)
  const [editingPrice, setEditingPrice] = useState(false)
  const [newPrice, setNewPrice] = useState(500)
  const [updatingPrice, setUpdatingPrice] = useState(false)

  const fetchPayments = async () => {
    setLoading(true)
    try {
      // Add timestamp to prevent caching
      const res = await adminPaymentAPI.getAllPayments({ status: statusFilter, _t: Date.now() })
      setPayments(res.data.data.payments || [])
      setPendingCount(res.data.data.pendingCount || 0)
    } catch (err) {
      console.error('Error fetching payments:', err)
      showToast(err.response?.data?.error?.message || 'Failed to load payments', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchUpiSettings = async () => {
    try {
      const res = await adminPaymentAPI.getUpiSettings()
      setUpiId(res.data.data.upiId || '')
      setNewUpiId(res.data.data.upiId || '')
      setPaymentPrice(res.data.data.paymentPrice || 500)
      setNewPrice(res.data.data.paymentPrice || 500)
    } catch (err) {
      console.error('Error fetching UPI settings:', err)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [statusFilter])

  useEffect(() => {
    fetchUpiSettings()
  }, [])

  const handleApprove = async (paymentId, userName) => {
    if (!window.confirm(`Approve payment for "${userName}"? This will grant them premium access.`)) return
    
    setActionLoading(paymentId + '_approve')
    try {
      await adminPaymentAPI.approvePayment(paymentId, {})
      showToast(`Payment approved for ${userName}!`, 'success')
      // Small delay to ensure DB is updated
      setTimeout(() => fetchPayments(), 500)
    } catch (err) {
      console.error('Error approving payment:', err)
      console.error('Error response:', err.response?.data)
      const errorMsg = err.response?.data?.error?.message || err.message || 'Failed to approve payment'
      showToast(errorMsg, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (paymentId, userName) => {
    const reason = window.prompt(`Reject payment for "${userName}"?\n\nEnter rejection reason (optional):`)
    if (reason === null) return // User cancelled
    
    setActionLoading(paymentId + '_reject')
    try {
      await adminPaymentAPI.rejectPayment(paymentId, { adminNotes: reason })
      showToast(`Payment rejected for ${userName}`, 'success')
      // Small delay to ensure DB is updated
      setTimeout(() => fetchPayments(), 500)
    } catch (err) {
      console.error('Error rejecting payment:', err)
      showToast(err.response?.data?.error?.message || 'Failed to reject payment', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpdateUpi = async () => {
    if (!newUpiId.trim()) {
      showToast('UPI ID cannot be empty', 'error')
      return
    }

    setUpdatingUpi(true)
    try {
      await adminPaymentAPI.updateUpiSettings({ upiId: newUpiId })
      setUpiId(newUpiId)
      setEditingUpi(false)
      showToast('UPI ID updated successfully!', 'success')
    } catch (err) {
      console.error('Error updating UPI:', err)
      showToast(err.response?.data?.error?.message || 'Failed to update UPI ID', 'error')
    } finally {
      setUpdatingUpi(false)
    }
  }

  const handleUpdatePrice = async () => {
    const price = parseInt(newPrice)
    if (isNaN(price) || price < 0) {
      showToast('Invalid price amount', 'error')
      return
    }
    
    setUpdatingPrice(true)
    try {
      await adminPaymentAPI.updateUpiSettings({ paymentPrice: price })
      setPaymentPrice(price)
      setEditingPrice(false)
      showToast('Payment price updated successfully!', 'success')
    } catch (err) {
      console.error('Error updating price:', err)
      showToast(err.response?.data?.error?.message || 'Failed to update price', 'error')
    } finally {
      setUpdatingPrice(false)
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: 'rgba(251,191,36,0.2)', border: 'rgba(251,191,36,0.4)', color: '#fbbf24', icon: Clock },
      approved: { bg: 'rgba(34,197,94,0.2)', border: 'rgba(34,197,94,0.4)', color: '#22c55e', icon: CheckCircle },
      rejected: { bg: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.4)', color: '#ef4444', icon: XCircle },
    }
    const style = styles[status] || styles.pending
    const Icon = style.icon
    
    return (
      <span style={{ 
        background: style.bg, 
        border: `1px solid ${style.border}`, 
        color: style.color, 
        padding: '4px 10px', 
        borderRadius: 6, 
        fontSize: 10, 
        fontWeight: 700, 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: 4,
        textTransform: 'uppercase'
      }}>
        <Icon size={10} /> {status}
      </span>
    )
  }

  return (
    <div>
      {/* UPI Settings Section */}
      <div style={{ borderRadius: 18, background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', backdropFilter: 'blur(20px)', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#8b5cf6,#6366f1,transparent)' }} />
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={18} color="#a78bfa" />
            <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 15 }}>UPI Settings</span>
          </div>
        </div>
        <div style={{ padding: '20px' }}>
          {editingUpi ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>UPI ID</label>
                <input
                  type="text"
                  value={newUpiId}
                  onChange={e => setNewUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
                />
              </div>
              <button
                onClick={handleUpdateUpi}
                disabled={updatingUpi}
                style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: updatingUpi ? 'rgba(148,163,184,0.3)' : 'linear-gradient(135deg,#10b981,#059669)', color: 'var(--text-primary)', cursor: updatingUpi ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, opacity: updatingUpi ? 0.6 : 1 }}
              >
                {updatingUpi ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Saving...</> : <><Save size={16} />Save</>}
              </button>
              <button
                onClick={() => { setEditingUpi(false); setNewUpiId(upiId) }}
                disabled={updatingUpi}
                style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(148,163,184,0.1)', color: '#94a3b8', cursor: updatingUpi ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, opacity: updatingUpi ? 0.6 : 1 }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10 }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>Current UPI ID</div>
                <div style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>{upiId || 'Not set'}</div>
              </div>
              <button
                onClick={() => setEditingUpi(true)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Edit2 size={14} /> Edit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Price Setting */}
      <div style={{ borderRadius: 18, background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', backdropFilter: 'blur(20px)', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#22c55e,#16a34a,transparent)' }} />
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={18} color="#22c55e" />
            <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 15 }}>Payment Price</span>
          </div>
        </div>
        <div style={{ padding: '20px' }}>
          {editingPrice ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Price per Course (₹)</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value)}
                  placeholder="500"
                  min="0"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
                />
              </div>
              <button
                onClick={handleUpdatePrice}
                disabled={updatingPrice}
                style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: updatingPrice ? 'rgba(148,163,184,0.3)' : 'linear-gradient(135deg,#10b981,#059669)', color: 'var(--text-primary)', cursor: updatingPrice ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, opacity: updatingPrice ? 0.6 : 1 }}
              >
                {updatingPrice ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Saving...</> : <><Save size={16} />Save</>}
              </button>
              <button
                onClick={() => { setEditingPrice(false); setNewPrice(paymentPrice) }}
                disabled={updatingPrice}
                style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(148,163,184,0.1)', color: '#94a3b8', cursor: updatingPrice ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, opacity: updatingPrice ? 0.6 : 1 }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10 }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>Current Price</div>
                <div style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, fontFamily: 'monospace' }}>₹{paymentPrice}</div>
              </div>
              <button
                onClick={() => setEditingPrice(true)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.15)', color: '#22c55e', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Edit2 size={14} /> Edit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Records */}
      <div style={{ borderRadius: 18, background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', backdropFilter: 'blur(20px)', overflow: 'hidden' }}>
        <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#f59e0b,#d97706,transparent)' }} />
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(245,158,11,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={18} color="#fbbf24" />
              <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 15 }}>Payment Records</span>
              {payments.length > 0 && (
                <span style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                  {payments.length}
                </span>
              )}
              {pendingCount > 0 && statusFilter !== 'pending' && (
                <span style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                  {pendingCount} pending
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.15)', border: '1px solid var(--border-primary)', color: '#fbbf24', fontSize: 13, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
              >
                <option value="all" style={{ background: '#1e293b', color: '#fbbf24', fontWeight: 600 }}>All Status</option>
                <option value="pending" style={{ background: '#1e293b', color: '#fbbf24', fontWeight: 600 }}>Pending</option>
                <option value="approved" style={{ background: '#1e293b', color: '#fbbf24', fontWeight: 600 }}>Approved</option>
                <option value="rejected" style={{ background: '#1e293b', color: '#fbbf24', fontWeight: 600 }}>Rejected</option>
              </select>
              <button
                onClick={fetchPayments}
                style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid var(--border-primary)', borderRadius: 8, color: '#fbbf24', cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center' }}
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px', maxHeight: 600, overflowY: 'auto', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Loader2 size={28} style={{ color: '#fbbf24', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 12 }}>Loading payments...</p>
            </div>
          ) : payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <DollarSign size={48} style={{ color: 'rgba(148,163,184,0.3)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No payment records</p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 4 }}>
                {statusFilter === 'pending' ? 'No pending payments at the moment' : 'No payments found with this filter'}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr style={{ background: 'rgba(245,158,11,0.1)', borderRadius: 8 }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(245,158,11,0.9)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }}>Student</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(245,158,11,0.9)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Course</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(245,158,11,0.9)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(245,158,11,0.9)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Transaction ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(245,158,11,0.9)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submitted</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: 'rgba(245,158,11,0.9)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: 'rgba(245,158,11,0.9)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderTopRightRadius: 8, borderBottomRightRadius: 8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, i) => (
                  <motion.tr
                    key={payment._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{
                      background: payment.status === 'approved' ? 'rgba(34,197,94,0.08)' : payment.status === 'rejected' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
                      border: payment.status === 'approved' ? '1px solid rgba(34,197,94,0.2)' : payment.status === 'rejected' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(245,158,11,0.1)'
                    }}
                  >
                    <td style={{ padding: '14px 16px', borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {payment.userId?.profileImage ? (
                          <img src={payment.userId.profileImage} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectCover: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {payment.userName?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{payment.userName}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{payment.userEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>{payment.courseName}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
                        ₹{payment.amount || paymentPrice}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'monospace' }}>
                      {payment.transactionId || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 11 }}>
                      {formatDate(payment.submittedAt)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {getStatusBadge(payment.status)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', borderTopRightRadius: 8, borderBottomRightRadius: 8 }}>
                      {payment.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            onClick={() => handleApprove(payment._id, payment.userName)}
                            disabled={actionLoading === payment._id + '_approve'}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: '1px solid rgba(34,197,94,0.4)',
                              background: 'rgba(34,197,94,0.12)',
                              color: '#22c55e',
                              cursor: actionLoading ? 'not-allowed' : 'pointer',
                              fontSize: 11,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              opacity: actionLoading ? 0.6 : 1
                            }}
                          >
                            {actionLoading === payment._id + '_approve' ? (
                              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                              <><CheckCircle size={12} /> Approve</>
                            )}
                          </button>
                          <button
                            onClick={() => handleReject(payment._id, payment.userName)}
                            disabled={actionLoading === payment._id + '_reject'}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: '1px solid rgba(239,68,68,0.4)',
                              background: 'rgba(239,68,68,0.12)',
                              color: '#f87171',
                              cursor: actionLoading ? 'not-allowed' : 'pointer',
                              fontSize: 11,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              opacity: actionLoading ? 0.6 : 1
                            }}
                          >
                            {actionLoading === payment._id + '_reject' ? (
                              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                              <><XCircle size={12} /> Reject</>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                          {payment.reviewedAt && <>Reviewed {formatDate(payment.reviewedAt)}</>}
                          {payment.adminNotes && (
                            <div style={{ marginTop: 4, fontSize: 10, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                              Note: {payment.adminNotes}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
