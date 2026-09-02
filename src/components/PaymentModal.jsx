import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, CreditCard, Lock, IndianRupee, AlertCircle, CheckCircle, QrCode } from 'lucide-react'
import { useThemeStore } from '../store/themeStore'
import { paymentAPI } from '../services/api'

export default function PaymentModal({ onClose, onSuccess, amount: initialAmount, courseName = 'Course Access', courseId = 'all-resources' }) {
  const { theme } = useThemeStore()
  const isDark = theme === 'dark'
  const [processing, setProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState(null) // null | 'success' | 'failed'
  const [showQR, setShowQR] = useState(false)
  const [upiId, setUpiId] = useState('8269858259@upi') // Default
  const [amount, setAmount] = useState(initialAmount || 500) // Dynamic amount

  console.log('💳 PaymentModal opened with initialAmount:', initialAmount, 'amount state:', amount)

  // Fetch UPI ID and payment price from backend on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await paymentAPI.getUpiSettings()
        if (res.data?.success && res.data?.data) {
          if (res.data.data.upiId) {
            setUpiId(res.data.data.upiId)
          }
          // Always use backend price if no initialAmount was provided
          // If initialAmount is provided, respect it (for custom pricing)
          if (res.data.data.paymentPrice && !initialAmount) {
            setAmount(res.data.data.paymentPrice)
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error)
        // Use defaults if fetch fails
      }
    }
    fetchSettings()
  }, [initialAmount])
  
  // Update amount when initialAmount prop changes
  useEffect(() => {
    if (initialAmount) {
      console.log('💳 PaymentModal updating amount to:', initialAmount)
      setAmount(initialAmount)
    }
  }, [initialAmount])

  const UPI_NAME = 'A5X Payment'
  
  // Generate UPI payment URL with dynamic UPI ID
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(courseName)}`
  
  // Generate QR code URL using QR Server API (more reliable)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`

  // Submit payment for admin verification
  const handlePayment = async () => {
    setProcessing(true)
    
    try {
      const res = await paymentAPI.submitPayment({
        amount,
        courseName,
        courseId,
        upiId,
      })

      if (res.data?.success) {
        setPaymentStatus('success')
        setProcessing(false)
        
        // Close modal after 3 seconds and show message
        setTimeout(() => {
          onClose()
          if (onSuccess) {
            onSuccess() // Call success callback if provided
          } else {
            alert('✅ Payment submitted successfully! Admin will verify and grant access shortly.')
          }
        }, 3000)
      } else {
        throw new Error('Payment submission failed')
      }
    } catch (error) {
      console.error('Payment submission error:', error)
      setPaymentStatus('failed')
      setProcessing(false)
      alert('❌ Failed to submit payment. Please try again.')
    }
  }

  const bgPrimary = isDark ? '#1a1a2e' : '#ffffff'
  const bgSecondary = isDark ? '#0f0f1a' : '#f8fafc'
  const textPrimary = isDark ? 'rgba(255,255,255,0.95)' : '#0f172a'
  const textSecondary = isDark ? 'rgba(255,255,255,0.7)' : '#64748b'
  const textTertiary = isDark ? 'rgba(255,255,255,0.5)' : '#94a3b8'
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}>
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
          style={{ 
            background: bgPrimary, 
            border: `1px solid ${borderColor}`, 
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            maxHeight: '85vh'
          }}
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0" style={{ borderBottom: `1px solid ${borderColor}` }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#fef3c7' }}>
                <IndianRupee size={18} style={{ color: '#d97706' }} />
              </div>
              <div>
                <h3 className="font-bold text-sm" style={{ color: textPrimary }}>Premium Access Required</h3>
                <p className="text-[10px]" style={{ color: textTertiary }}>One-time payment for lifetime access</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition flex-shrink-0">
              <X size={16} style={{ color: textSecondary }} />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
            {paymentStatus === 'success' ? (
              // Success State
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-4 space-y-4">

                {/* Icon */}
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: '#dcfce7' }}>
                  <CheckCircle size={32} style={{ color: '#16a34a' }} />
                </div>

                {/* Title */}
                <div>
                  <h4 className="text-lg font-bold mb-1" style={{ color: textPrimary }}>Payment Submitted! 🎉</h4>
                  <p className="text-sm font-medium" style={{ color: '#16a34a' }}>Thank you for your payment</p>
                </div>

                {/* Verification Info */}
                <div className="rounded-xl p-4 text-left space-y-3" style={{ background: isDark ? 'rgba(99,102,241,0.1)' : '#f0f4ff', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">🔍</span>
                    <div>
                      <p className="text-sm font-bold mb-0.5" style={{ color: textPrimary }}>Under Verification</p>
                      <p className="text-xs leading-relaxed" style={{ color: textSecondary }}>
                        Your payment is being verified by our admin team. This usually takes <span className="font-bold" style={{ color: '#6366f1' }}>within 24 hours</span>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">✅</span>
                    <div>
                      <p className="text-sm font-bold mb-0.5" style={{ color: textPrimary }}>After Approval</p>
                      <p className="text-xs leading-relaxed" style={{ color: textSecondary }}>
                        Once verified, you'll get <span className="font-bold" style={{ color: '#6366f1' }}>instant access</span> to the full course content.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Support */}
                <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(251,191,36,0.1)' : '#fffbeb', border: '1px solid rgba(251,191,36,0.3)' }}>
                  <p className="text-xs" style={{ color: isDark ? '#fbbf24' : '#92400e' }}>
                    💡 <span className="font-bold">Not received access after 24 hours?</span>
                    <br />
                    Email us at{' '}
                    <a
                      href="mailto:anshrajbaghel30@gmail.com"
                      className="font-bold underline"
                      style={{ color: '#6366f1' }}>
                      anshrajbaghel30@gmail.com
                    </a>
                  </p>
                </div>
              </motion.div>
            ) : showQR ? (
              // QR Code View
              <>
                <div className="text-center space-y-3">
                  <div className="p-4 bg-white rounded-xl mx-auto w-fit border-2 border-gray-200">
                    <img 
                      src={qrCodeUrl} 
                      alt="UPI QR Code" 
                      className="w-48 h-48"
                      onError={(e) => {
                        // Fallback: show UPI ID if QR fails to load
                        e.target.style.display = 'none'
                        console.error('QR code failed to load')
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold" style={{ color: textPrimary }}>Scan QR with any UPI App</p>
                    <p className="text-xs" style={{ color: textSecondary }}>
                      Google Pay, PhonePe, Paytm, or any UPI app
                    </p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: bgSecondary, border: `1px solid ${borderColor}` }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: textTertiary }}>UPI ID</p>
                    <p className="text-xs font-mono font-bold select-all" style={{ color: textPrimary }}>{upiId}</p>
                    <p className="text-[9px] mt-1" style={{ color: textTertiary }}>Tap to copy • You can also pay directly using this UPI ID</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: bgSecondary, border: `1px solid ${borderColor}` }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: textTertiary }}>AMOUNT TO PAY</p>
                    <p className="text-xl font-bold" style={{ color: '#6366f1' }}>₹{amount}</p>
                  </div>
                  <div className="p-3 rounded-lg flex items-start gap-2" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <AlertCircle size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#6366f1' }} />
                    <p className="text-[10px] leading-relaxed text-left" style={{ color: isDark ? '#c7d2fe' : '#6366f1' }}>
                      After payment, click "I have paid" below to confirm and get instant access.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              // Payment Options View
              <>
                {/* Course Info */}
                <div className="p-3.5 rounded-xl" style={{ background: bgSecondary, border: `1px solid ${borderColor}` }}>
                  <p className="text-[10px] font-semibold mb-2 uppercase tracking-wider" style={{ color: textTertiary }}>COURSE</p>
                  <p className="font-bold text-xs mb-2.5 leading-snug" style={{ color: textPrimary }}>{courseName}</p>
                  
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold" style={{ color: '#6366f1' }}>₹{amount}</span>
                    <span className="text-xs line-through" style={{ color: textTertiary }}>₹999</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#16a34a' }}>
                      50% OFF
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textTertiary }}>WHAT'S INCLUDED</p>
                  {[
                    'Lifetime access to all course videos',
                    'Download study materials',
                    'Certificate of completion',
                    'Community support & doubt solving',
                  ].map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#16a34a' }} />
                      <p className="text-xs leading-relaxed" style={{ color: textSecondary }}>{feature}</p>
                    </div>
                  ))}
                </div>

                {/* Info Banner */}
                <div className="p-3 rounded-lg flex items-start gap-2" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <AlertCircle size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#6366f1' }} />
                  <p className="text-[10px] leading-relaxed" style={{ color: isDark ? '#c7d2fe' : '#6366f1' }}>
                    <strong>Note:</strong> Students with school code get free access. Contact your institution for the code.
                  </p>
                </div>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-1.5 py-2">
                  <Lock size={12} style={{ color: textTertiary }} />
                  <p className="text-[10px] font-medium" style={{ color: textTertiary }}>Secure UPI payment</p>
                </div>
              </>
            )}
          </div>

          {/* Footer - Fixed at bottom */}
          {paymentStatus !== 'success' && (
            <div className="px-5 py-3.5 space-y-2.5 flex-shrink-0" style={{ borderTop: `1px solid ${borderColor}` }}>
              {showQR ? (
                // QR Code Actions
                <>
                  <motion.button
                    whileHover={{ scale: processing ? 1 : 1.02 }}
                    whileTap={{ scale: processing ? 1 : 0.98 }}
                    onClick={handlePayment}
                    disabled={processing}
                    className="w-full py-3 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition"
                    style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', boxShadow: '0 4px 20px rgba(22,163,74,0.4)' }}>
                    {processing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying Payment...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        I have paid ₹{amount}
                      </>
                    )}
                  </motion.button>
                  <button
                    onClick={() => setShowQR(false)}
                    className="w-full text-center text-xs py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
                    style={{ color: textSecondary }}>
                    ← Back to Payment Options
                  </button>
                </>
              ) : (
                // Payment Options
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowQR(true)}
                    className="w-full py-3 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
                    <QrCode size={16} />
                    Pay ₹{amount} with UPI QR Code
                  </motion.button>

                  <button
                    onClick={onClose}
                    className="w-full text-center text-xs py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
                    style={{ color: textSecondary }}>
                    Maybe Later
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </>
  )
}
