import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Lock, IndianRupee, AlertCircle, CheckCircle,
  QrCode, Tag, Loader2, Gift, Sparkles, ArrowRight
} from 'lucide-react'
import { useThemeStore } from '../store/themeStore'
import { paymentAPI, referralAPI } from '../services/api'

export default function PaymentModal({
  onClose,
  onSuccess,
  amount: initialAmount,
  courseName = 'Course Access',
  courseId = 'all-resources',
}) {
  const { theme } = useThemeStore()
  const isDark = theme === 'dark'

  const [processing, setProcessing]       = useState(false)
  const [paymentStatus, setPaymentStatus] = useState(null)   // null | 'success'
  const [showQR, setShowQR]               = useState(false)
  const [upiId, setUpiId]                 = useState('8269858259@upi')
  const [baseAmount, setBaseAmount]       = useState(initialAmount || 500)

  // Referral state
  const [referralInput, setReferralInput]   = useState('')
  const [referralStatus, setReferralStatus] = useState(null) // null | 'checking' | 'valid' | 'invalid'
  const [referralData, setReferralData]     = useState(null)
  const [referralError, setReferralError]   = useState('')
  const debounceRef   = useRef(null)
  const submittingRef = useRef(false) // synchronous guard — prevents double-submit before React re-render

  const discountAmount = referralData?.discountAmount || 0
  const finalAmount    = referralData?.discountedPrice || baseAmount
  const hasDiscount    = discountAmount > 0

  // ── Fetch UPI settings on mount ───────────────────────────────────────────
  useEffect(() => {
    paymentAPI.getUpiSettings()
      .then(res => {
        if (res.data?.success) {
          if (res.data.data.upiId) setUpiId(res.data.data.upiId)
          if (res.data.data.paymentPrice && !initialAmount)
            setBaseAmount(res.data.data.paymentPrice)
        }
      })
      .catch(() => {})
  }, [initialAmount])

  useEffect(() => {
    if (initialAmount) setBaseAmount(initialAmount)
  }, [initialAmount])

  // ── Debounced referral validation ─────────────────────────────────────────
  useEffect(() => {
    const code = referralInput.trim().toUpperCase()
    setReferralError('')

    if (!code || code.length < 4) {
      setReferralStatus(null)
      setReferralData(null)
      return
    }

    setReferralStatus('checking')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await referralAPI.validate(code)
        if (res.data?.success && res.data?.data?.valid) {
          setReferralStatus('valid')
          setReferralData(res.data.data)
          setReferralError('')
        } else {
          setReferralStatus('invalid')
          setReferralData(null)
        }
      } catch (err) {
        const msg = err.response?.data?.error?.message || ''
        setReferralStatus('invalid')
        setReferralData(null)
        setReferralError(msg)
      }
    }, 600)

    return () => clearTimeout(debounceRef.current)
  }, [referralInput])

  // ── UPI URLs ──────────────────────────────────────────────────────────────
  const upiUrl   = `upi://pay?pa=${upiId}&pn=${encodeURIComponent('A5X Payment')}&am=${finalAmount}&cu=INR&tn=${encodeURIComponent(courseName)}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`

  // ── Submit ────────────────────────────────────────────────────────────────
  const handlePayment = async () => {
    // Synchronous ref guard fires before React state update propagates —
    // prevents a second call sneaking in on rapid double-click.
    if (submittingRef.current) return
    submittingRef.current = true
    setProcessing(true)
    try {
      const res = await paymentAPI.submitPayment({
        amount: finalAmount,
        courseName,
        courseId,
        upiId,
        referralCode: referralStatus === 'valid' ? referralInput.trim().toUpperCase() : undefined,
      })
      if (res.data?.success) {
        setPaymentStatus('success')
        // Keep processing=true so button stays locked until modal closes
        setTimeout(() => {
          submittingRef.current = false
          setProcessing(false)
          onClose()
          if (onSuccess) onSuccess()
          else alert('✅ Payment submitted! Admin will verify and grant access shortly.')
        }, 3000)
      } else throw new Error('failed')
    } catch {
      submittingRef.current = false
      setProcessing(false)
      alert('❌ Failed to submit payment. Please try again.')
    }
  }

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const bg       = isDark ? '#13131f' : '#ffffff'
  const bgCard   = isDark ? '#1a1a2e' : '#f8fafc'
  const txtMain  = isDark ? 'rgba(255,255,255,0.95)' : '#0f172a'
  const txtSub   = isDark ? 'rgba(255,255,255,0.6)'  : '#64748b'
  const txtMuted = isDark ? 'rgba(255,255,255,0.4)'  : '#94a3b8'
  const border   = isDark ? 'rgba(255,255,255,0.1)'  : '#e2e8f0'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 24 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="w-full max-w-md flex flex-col rounded-2xl overflow-hidden"
        style={{ background: bg, border: `1px solid ${border}`, boxShadow: '0 32px 80px rgba(0,0,0,0.5)', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#fef3c7' }}>
              <IndianRupee size={18} style={{ color: '#d97706' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: txtMain }}>Premium Access</p>
              <p className="text-[10px]" style={{ color: txtMuted }}>One-time · Lifetime access</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition hover:bg-black/5 dark:hover:bg-white/5">
            <X size={16} style={{ color: txtSub }} />
          </button>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">

          {paymentStatus === 'success' ? (
            /* ── Success ───────────────────────────────────────────────── */
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-6 space-y-4">
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center" style={{ background: '#dcfce7' }}>
                <CheckCircle size={40} style={{ color: '#16a34a' }} />
              </div>
              <div>
                <h4 className="text-xl font-bold mb-1" style={{ color: txtMain }}>Payment Submitted! 🎉</h4>
                <p className="text-sm" style={{ color: '#16a34a' }}>Admin will verify within 24 hours</p>
              </div>
              <div className="rounded-xl p-4 text-left" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p className="text-xs leading-relaxed" style={{ color: txtSub }}>
                  Once approved, you'll get <strong style={{ color: '#6366f1' }}>instant full access</strong> to all course content. Questions? Email{' '}
                  <a href="mailto:anshrajbaghel30@gmail.com" className="underline font-bold" style={{ color: '#6366f1' }}>anshrajbaghel30@gmail.com</a>
                </p>
              </div>
            </motion.div>

          ) : showQR ? (
            /* ── QR View ───────────────────────────────────────────────── */
            <div className="space-y-4">
              {hasDiscount && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)' }}>
                  <Gift size={14} style={{ color: '#16a34a' }} />
                  <p className="text-xs font-semibold" style={{ color: '#16a34a' }}>
                    Referral by {referralData.referrerName} · ₹{discountAmount} off applied!
                  </p>
                </motion.div>
              )}

              <div className="text-center space-y-3">
                <div className="p-4 bg-white rounded-2xl mx-auto w-fit border-2 border-gray-200 shadow-sm">
                  <img src={qrCodeUrl} alt="UPI QR Code" className="w-52 h-52" />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: txtMain }}>Scan with any UPI App</p>
                  <p className="text-xs mt-0.5" style={{ color: txtSub }}>Google Pay · PhonePe · Paytm · Any UPI</p>
                </div>
              </div>

              {/* UPI ID */}
              <div className="rounded-xl px-4 py-3" style={{ background: bgCard, border: `1px solid ${border}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: txtMuted }}>UPI ID</p>
                <p className="text-sm font-mono font-bold select-all" style={{ color: txtMain }}>{upiId}</p>
              </div>

              {/* Amount */}
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: bgCard, border: `1px solid ${border}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: txtMuted }}>Amount to Pay</p>
                {hasDiscount && (
                  <p className="text-sm line-through" style={{ color: txtMuted }}>₹{baseAmount}</p>
                )}
                <p className="text-3xl font-bold" style={{ color: '#6366f1' }}>₹{finalAmount}</p>
                {hasDiscount && (
                  <p className="text-xs font-bold mt-1" style={{ color: '#16a34a' }}>You saved ₹{discountAmount} 🎉</p>
                )}
              </div>
            </div>

          ) : (
            /* ── Main Payment View ─────────────────────────────────────── */
            <div className="space-y-4">

              {/* ── Price Card ── */}
              <div className="rounded-xl p-4" style={{ background: bgCard, border: `1px solid ${border}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: txtMuted }}>Course</p>
                <p className="text-sm font-bold mb-3 leading-snug" style={{ color: txtMain }}>{courseName}</p>

                {/* Animated price */}
                <div className="flex items-end gap-3">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={finalAmount}
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="text-3xl font-bold"
                      style={{ color: hasDiscount ? '#16a34a' : '#6366f1' }}
                    >
                      ₹{finalAmount}
                    </motion.span>
                  </AnimatePresence>

                  {hasDiscount ? (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm line-through" style={{ color: txtMuted }}>₹{baseAmount}</span>
                      <motion.span
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: '#dcfce7', color: '#16a34a' }}
                      >
                        -{discountAmount} OFF 🎉
                      </motion.span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm line-through" style={{ color: txtMuted }}>₹999</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#dcfce7', color: '#16a34a' }}>50% OFF</span>
                    </div>
                  )}
                </div>

                {/* Referral success banner */}
                <AnimatePresence>
                  {hasDiscount && referralData && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg overflow-hidden"
                      style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.25)' }}
                    >
                      <Sparkles size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
                      <p className="text-[11px] font-semibold" style={{ color: '#16a34a' }}>
                        Referred by {referralData.referrerName} — ₹{discountAmount} discount applied!
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Referral Code Input ── */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: txtMuted }}>
                  <Tag size={11} />
                  Referral Code <span style={{ color: txtMuted, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — get extra discount)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={referralInput}
                    onChange={e => setReferralInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="e.g. ANSH4X2B"
                    maxLength={12}
                    className="w-full px-4 py-3 rounded-xl text-sm font-mono font-bold outline-none transition-all"
                    style={{
                      background: bgCard,
                      border: `2px solid ${
                        referralStatus === 'valid'   ? '#16a34a' :
                        referralStatus === 'invalid' ? '#ef4444' :
                        referralStatus === 'checking' ? '#6366f1' :
                        border
                      }`,
                      color: txtMain,
                      letterSpacing: '0.1em',
                    }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {referralStatus === 'checking' && <Loader2 size={16} className="animate-spin" style={{ color: '#6366f1' }} />}
                    {referralStatus === 'valid'    && <CheckCircle size={16} style={{ color: '#16a34a' }} />}
                    {referralStatus === 'invalid'  && <X size={16} style={{ color: '#ef4444' }} />}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {referralStatus === 'valid' && referralData && (
                    <motion.div key="ok"
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mt-2 flex items-center gap-2"
                    >
                      <CheckCircle size={13} style={{ color: '#16a34a' }} />
                      <p className="text-[11px] font-semibold" style={{ color: '#16a34a' }}>
                        Valid! {referralData.discountPercent}% off → Pay ₹{referralData.discountedPrice} (save ₹{referralData.discountAmount})
                      </p>
                    </motion.div>
                  )}
                  {referralStatus === 'invalid' && referralInput.length >= 4 && (
                    <motion.p key="err"
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mt-2 text-[11px]" style={{ color: '#ef4444' }}
                    >
                      {referralError || 'Invalid referral code. Please check and try again.'}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: txtMuted }}>Included</p>
                {[
                  'Lifetime access to all course videos',
                  'Download study materials & resources',
                  'Certificate of completion',
                  'Community support & doubt solving',
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
                    <p className="text-xs" style={{ color: txtSub }}>{f}</p>
                  </div>
                ))}
              </div>

              {/* Note */}
              <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
                <AlertCircle size={13} style={{ color: '#6366f1', flexShrink: 0, marginTop: 1 }} />
                <p className="text-[10px] leading-relaxed" style={{ color: isDark ? '#c7d2fe' : '#4f46e5' }}>
                  Students with a school code get <strong>free access</strong>. Contact your institution for the code.
                </p>
              </div>

              <div className="flex items-center justify-center gap-1.5">
                <Lock size={11} style={{ color: txtMuted }} />
                <p className="text-[10px]" style={{ color: txtMuted }}>Secure UPI payment · Admin verified</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        {paymentStatus !== 'success' && (
          <div className="px-5 py-4 space-y-2 flex-shrink-0" style={{ borderTop: `1px solid ${border}` }}>
            {showQR ? (
              <>
                <motion.button
                  whileHover={{ scale: processing ? 1 : 1.02 }} whileTap={{ scale: processing ? 1 : 0.97 }}
                  onClick={handlePayment} disabled={processing}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 20px rgba(22,163,74,0.35)' }}
                >
                  {processing
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</>
                    : <><CheckCircle size={17} />I have paid ₹{finalAmount}</>
                  }
                </motion.button>
                <button onClick={() => setShowQR(false)} className="w-full text-center text-xs py-2 rounded-lg transition hover:bg-black/5 dark:hover:bg-white/5" style={{ color: txtSub }}>
                  ← Back
                </button>
              </>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setShowQR(true)}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}
                >
                  <QrCode size={17} />
                  Pay ₹{finalAmount} with UPI
                  {hasDiscount && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(255,255,255,0.2)' }}>-₹{discountAmount}</span>}
                </motion.button>
                <button onClick={onClose} className="w-full text-center text-xs py-2 rounded-lg transition hover:bg-black/5 dark:hover:bg-white/5" style={{ color: txtSub }}>
                  Maybe Later
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
