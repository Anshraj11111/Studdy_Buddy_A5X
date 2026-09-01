import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Mail, Lock, Loader2, AlertCircle, CheckCircle, KeyRound, ArrowLeft } from 'lucide-react'
import { authAPI } from '../services/api'
import a5xLogo from '../assets/studdybuddy-logo.png'

export default function ForgotPassword() {
  const [step, setStep] = useState(1) // 1: Email, 2: Code + New Password
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSendCode = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!email) {
      setError('Please enter your email')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const res = await authAPI.forgotPassword(email)
      setSuccess('Reset code sent to your email! Please check your inbox.')
      setStep(2)
    } catch (err) {
      // Generic message to prevent email enumeration
      setSuccess('If an account exists with this email, a reset code has been sent.')
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!code || !newPassword) {
      setError('Please fill all fields')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await authAPI.resetPassword({ email, code, newPassword })
      setSuccess('Password reset successful! Redirecting to login...')
      setTimeout(() => {
        window.location.href = '/login'
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = `w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all outline-none bg-white/[0.05] border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white/[0.08]`

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)' }}>

      {/* Background Image */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url('/login-bg.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 0.25,
      }} />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        className="w-full max-w-md relative z-10">

        <div className="rounded-3xl p-8 relative overflow-hidden"
          style={{
            background: 'rgba(20,20,30,0.6)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(10px)',
          }}>

          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 mx-auto mb-5 flex items-center justify-center">
              <img src={a5xLogo} alt="A5X Logo" className="w-full h-full object-contain" />
            </motion.div>
            <h1 className="text-3xl font-bold mb-2">
              <span style={{ color: '#6366f1' }}>Forgot</span> Password?
            </h1>
            <p className="text-sm" style={{ color: 'rgba(156,163,175,0.9)' }}>
              {step === 1 ? "We'll send you a reset code" : 'Enter the code and new password'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSendCode}
                className="space-y-4">
                
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-400">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className={inputClass}
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="p-3 rounded-xl text-sm flex items-center gap-2"
                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                    <AlertCircle size={16} /> {error}
                  </motion.div>
                )}

                {success && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="p-3 rounded-xl text-sm flex items-center gap-2"
                    style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }}>
                    <CheckCircle size={16} /> {success}
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.99 }}
                  className="w-full py-3 text-white font-semibold rounded-xl flex items-center justify-center gap-2 mt-5 disabled:opacity-50 transition-all"
                  style={{ 
                    background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)', 
                    boxShadow: '0 4px 15px rgba(99,102,241,0.4)' 
                  }}>
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Sending Code...</>
                  ) : (
                    <><Mail size={18} /> Send Reset Code</>
                  )}
                </motion.button>
              </motion.form>
            ) : (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleResetPassword}
                className="space-y-4">
                
                {/* Info: Check email */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="p-3 rounded-xl text-sm"
                  style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd' }}>
                  <div className="flex items-center gap-2">
                    <Mail size={14} />
                    <span>Check your email for the 6-digit verification code</span>
                  </div>
                </motion.div>

                {/* Reset Code */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-400">Reset Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className={inputClass}
                      maxLength={6}
                      autoFocus
                    />
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-400">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="p-3 rounded-xl text-sm flex items-center gap-2"
                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                    <AlertCircle size={16} /> {error}
                  </motion.div>
                )}

                {success && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="p-3 rounded-xl text-sm flex items-center gap-2"
                    style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }}>
                    <CheckCircle size={16} /> {success}
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.99 }}
                  className="w-full py-3 text-white font-semibold rounded-xl flex items-center justify-center gap-2 mt-5 disabled:opacity-50 transition-all"
                  style={{ 
                    background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)', 
                    boxShadow: '0 4px 15px rgba(99,102,241,0.4)' 
                  }}>
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Resetting...</>
                  ) : (
                    <><Lock size={18} /> Reset Password</>
                  )}
                </motion.button>

                <button
                  type="button"
                  onClick={() => { setStep(1); setCode(''); setNewPassword(''); setError(''); setSuccess('') }}
                  className="w-full text-center text-sm text-gray-400 hover:text-white transition flex items-center justify-center gap-2">
                  <ArrowLeft size={14} /> Back to email
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="text-center text-sm mt-5 text-gray-400">
            Remember your password?{' '}
            <Link to="/login" className="font-semibold hover:underline text-indigo-400">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
