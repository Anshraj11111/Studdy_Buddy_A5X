import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, Mail, Lock, UserCircle, Loader2, AlertCircle, Sparkles, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import ThemeToggle from '../components/ThemeToggle'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '867585915737-m2jb6me5u1dpp5vp3dum130lm1rp1sfc.apps.googleusercontent.com'

// Floating background icon element
function FloatingIcon({ icon, style }) {
  return (
    <motion.div
      className="absolute opacity-[0.07] dark:opacity-[0.12] pointer-events-none select-none"
      style={style}
      animate={{ y: [0, -12, 0], rotate: [0, 5, 0] }}
      transition={{ duration: 6 + Math.random() * 3, repeat: Infinity, ease: 'easeInOut', delay: Math.random() * 3 }}
    >
      {icon}
    </motion.div>
  )
}

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '', role: 'student', mentorCode: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { login, googleLogin, loading } = useAuthStore()
  const { theme } = useThemeStore()
  const isDark = theme === 'dark'
  const navigate = useNavigate()
  const googleBtnRef = useRef(null)

  useEffect(() => {
    if (window.google && googleBtnRef.current) {
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleResponse })
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: isDark ? 'filled_black' : 'outline',
        size: 'large', width: '100%', text: 'signin_with', shape: 'rectangular',
      })
    }
  }, [isDark])

  const handleGoogleResponse = async (response) => {
    setGoogleLoading(true)
    try {
      const { user } = await googleLogin(response.credential, formData.role, formData.mentorCode)
      navigate(user.role === 'mentor' ? '/mentor-dashboard' : '/dashboard', { replace: true })
    } catch (err) { setErrors({ submit: err.message || 'Google login failed' }) }
    finally { setGoogleLoading(false) }
  }

  const validate = () => {
    const e = {}
    if (!formData.email) e.email = 'Email is required'
    if (!formData.password) e.password = 'Password is required'
    if (formData.role === 'mentor' && !formData.mentorCode) e.mentorCode = 'Mentor code is required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setErrors({})
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    try {
      const { user } = await login(formData.email, formData.password, formData.role, formData.mentorCode)
      navigate(user.role === 'mentor' ? '/mentor-dashboard' : '/dashboard', { replace: true })
    } catch (err) { setErrors({ submit: err.message || 'Login failed' }) }
  }

  const inputClass = `w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all outline-none ${
    isDark
      ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15'
  }`

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: isDark ? '#0a0814' : '#f0f2ff' }}>

      {/* Floating background icons */}
      <FloatingIcon icon={<span style={{ fontSize: 80 }}>🎓</span>} style={{ top: '5%', left: '5%' }} />
      <FloatingIcon icon={<span style={{ fontSize: 64 }}>📖</span>} style={{ bottom: '15%', left: '8%' }} />
      <FloatingIcon icon={<span style={{ fontSize: 70 }}>⚙️</span>} style={{ bottom: '10%', right: '5%' }} />
      <FloatingIcon icon={<span style={{ fontSize: 60 }}>🤖</span>} style={{ top: '10%', right: '8%' }} />
      <FloatingIcon icon={<span style={{ fontSize: 50 }}>🌐</span>} style={{ top: '40%', left: '2%' }} />
      <FloatingIcon icon={<span style={{ fontSize: 50 }}>💡</span>} style={{ top: '30%', right: '3%' }} />

      {/* Subtle dot grid background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `radial-gradient(${isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.2)'} 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
      }} />

      {/* Theme Toggle — top right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        className="w-full max-w-md relative z-10">

        <div className="rounded-2xl p-8"
          style={{
            background: isDark ? 'rgba(15,12,31,0.92)' : '#ffffff',
            border: isDark ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(226,232,240,1)',
            boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(100,116,139,0.15)',
            backdropFilter: isDark ? 'blur(20px)' : 'none',
          }}>

          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 220 }}
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Sparkles className="text-white" size={28} />
            </motion.div>
            <h1 className="text-2xl font-bold mb-1.5" style={{ color: isDark ? '#fff' : '#0f172a' }}>Welcome Back</h1>
            <p className="text-sm" style={{ color: isDark ? 'rgba(148,163,184,0.7)' : '#64748b' }}>
              Sign in to your Studdy Buddy account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: isDark ? 'rgba(148,163,184,0.8)' : '#64748b' }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: isDark ? '#6366f1' : '#6366f1' }} />
                <input type="email" name="email" placeholder="you@example.com"
                  value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  className={inputClass} />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: isDark ? 'rgba(148,163,184,0.8)' : '#64748b' }}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: '#6366f1' }} />
                <input type={showPassword ? 'text' : 'password'} name="password" placeholder="••••••••"
                  value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                  className={inputClass + ' pr-10'} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.password}</p>}
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: isDark ? 'rgba(148,163,184,0.8)' : '#64748b' }}>I am a</label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: '#6366f1' }} />
                <select name="role" value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                  className={inputClass + ' appearance-none cursor-pointer'}>
                  <option value="student">Student</option>
                  <option value="mentor">Mentor</option>
                </select>
              </div>
            </div>

            {/* Mentor Code */}
            {formData.role === 'mentor' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: isDark ? 'rgba(148,163,184,0.8)' : '#64748b' }}>Mentor Code</label>
                <input type="text" name="mentorCode" placeholder="Enter your mentor code"
                  value={formData.mentorCode} onChange={e => setFormData(p => ({ ...p, mentorCode: e.target.value }))}
                  className={inputClass.replace('pl-10', 'pl-4')} />
                {errors.mentorCode && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.mentorCode}</p>}
              </motion.div>
            )}

            {errors.submit && (
              <div className="p-3 rounded-xl text-sm flex items-center gap-2"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                <AlertCircle size={15} /> {errors.submit}
              </div>
            )}

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full py-3 text-white font-semibold rounded-xl flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
              {loading ? <><Loader2 size={17} className="animate-spin" /> Signing in...</> : <><LogIn size={17} /> Sign In</>}
            </motion.button>

            {loading && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }}
                className="text-center text-xs" style={{ color: isDark ? 'rgba(148,163,184,0.6)' : '#94a3b8' }}>
                ⚡ Server is waking up, please wait...
              </motion.p>
            )}
          </form>

          {/* Divider + Google */}
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }} />
              <span className="text-xs" style={{ color: isDark ? 'rgba(148,163,184,0.5)' : '#94a3b8' }}>or continue with</span>
              <div className="flex-1 h-px" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }} />
            </div>
            <div ref={googleBtnRef} className="flex justify-center" />
            {googleLoading && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <Loader2 size={13} className="animate-spin text-indigo-400" />
                <span className="text-xs" style={{ color: isDark ? 'rgba(148,163,184,0.6)' : '#94a3b8' }}>Signing in with Google...</span>
              </div>
            )}
          </div>

          <p className="text-center text-sm mt-5" style={{ color: isDark ? 'rgba(148,163,184,0.6)' : '#64748b' }}>
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold hover:underline" style={{ color: '#6366f1' }}>Sign up</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
