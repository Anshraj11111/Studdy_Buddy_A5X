import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, Mail, Lock, UserCircle, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import ThemeToggle from '../components/ThemeToggle'
import a5xLogo from '../assets/studdybuddy-logo.png'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '867585915737-m2jb6me5u1dpp5vp3dum130lm1rp1sfc.apps.googleusercontent.com'

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '', role: 'student', mentorCode: '', schoolPassword: '' })
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
      try {
        window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleResponse })
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: isDark ? 'filled_black' : 'outline',
          size: 'large', width: 380, text: 'signin_with', shape: 'rectangular',
        })
      } catch (error) {
        // Silently handle Google Sign-In initialization errors
        // This prevents 403 errors from breaking the page
        console.warn('Google Sign-In initialization failed:', error)
      }
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
    // School password is now optional - students without it can pay to access resources
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

  const inputClass = `w-full pl-11 pr-4 py-3 rounded-xl text-sm transition-all outline-none bg-white/[0.05] border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white/[0.08]`

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)' }}>

      {/* Background Image - Drone */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url('/login-bg.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 0.25,
      }} />

      {/* Theme Toggle — top right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        className="w-full max-w-md relative z-10">

        <div className="rounded-3xl p-8 relative overflow-hidden"
          style={{
            background: 'rgba(20,20,30,0.6)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(10px)',
          }}>

          {/* A5X Logo */}
          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 mx-auto mb-5 flex items-center justify-center">
              <img src={a5xLogo} alt="A5X Logo" className="w-full h-full object-contain" />
            </motion.div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome <span style={{ color: '#6366f1' }}>Back!</span>
            </h1>
            <p className="text-sm" style={{ color: 'rgba(156,163,175,0.9)' }}>
              Sign in to your <span style={{ color: '#6366f1' }}>Studdy Buddy</span> account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input type="email" name="email" placeholder="you@example.com"
                  value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  className={inputClass} />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input type={showPassword ? 'text' : 'password'} name="password" placeholder="••••••••"
                  value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                  className={inputClass + ' pr-11'} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {errors.password}</p>}
              <div className="flex justify-end mt-1.5">
                <Link to="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline transition">
                  Forgot Password?
                </Link>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">I am a</label>
              <div className="relative">
                <UserCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <select name="role" value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                  className={inputClass + ' appearance-none cursor-pointer'}
                  style={{ colorScheme: 'dark' }}>
                  <option value="student" className="bg-gray-800 text-white">Student</option>
                  <option value="mentor" className="bg-gray-800 text-white">Mentor</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1.5L6 6.5L11 1.5" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Student School Password */}
            {formData.role === 'student' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-sm font-medium mb-2 text-gray-400">
                  School Password <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <input type="password" name="schoolPassword" placeholder="Enter your school password (optional)"
                  value={formData.schoolPassword} onChange={e => setFormData(p => ({ ...p, schoolPassword: e.target.value }))}
                  className={inputClass.replace('pl-11', 'pl-4')} />
                {errors.schoolPassword && <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {errors.schoolPassword}</p>}
                <p className="text-xs text-gray-500 mt-1.5">
                  💡 Have a school code? Get free access to all resources !
                </p>
              </motion.div>
            )}

            {/* Mentor Code */}
            {formData.role === 'mentor' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-sm font-medium mb-2 text-gray-400">Mentor Code</label>
                <input type="text" name="mentorCode" placeholder="Enter your mentor code"
                  value={formData.mentorCode} onChange={e => setFormData(p => ({ ...p, mentorCode: e.target.value }))}
                  className={inputClass.replace('pl-11', 'pl-4')} />
                {errors.mentorCode && <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {errors.mentorCode}</p>}
              </motion.div>
            )}

            {errors.submit && (
              <div className="p-3 rounded-xl text-sm flex items-center gap-2"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                <AlertCircle size={16} /> {errors.submit}
              </div>
            )}

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.99 }}
              className="w-full py-3 text-white font-semibold rounded-xl flex items-center justify-center gap-2 mt-5 disabled:opacity-50 transition-all"
              style={{ 
                background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)', 
                boxShadow: '0 4px 15px rgba(99,102,241,0.4)' 
              }}>
              {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in...</> : <><LogIn size={18} /> Sign In</>}
            </motion.button>

            {loading && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }}
                className="text-center text-xs text-gray-500">
                ⚡ Server is waking up, please wait...
              </motion.p>
            )}
          </form>

          {/* Divider + Google */}
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-700" />
              <span className="text-xs text-gray-500">or continue with</span>
              <div className="flex-1 h-px bg-gray-700" />
            </div>
            <div ref={googleBtnRef} className="flex justify-center" />
            {googleLoading && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <Loader2 size={14} className="animate-spin text-indigo-400" />
                <span className="text-xs text-gray-500">Signing in with Google...</span>
              </div>
            )}
          </div>

          <p className="text-center text-sm mt-5 text-gray-400">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold hover:underline text-indigo-400">Sign up</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
