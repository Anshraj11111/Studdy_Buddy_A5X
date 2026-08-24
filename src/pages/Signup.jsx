import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Mail, Lock, User, UserCircle, Loader2, AlertCircle, Eye, EyeOff, Check, Shield } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import ThemeToggle from '../components/ThemeToggle'
import a5xLogo from '../assets/A5X logo.png'

const SKILLS = ['Robotics', 'Programming', 'AI/ML', 'IoT', 'Electronics', 'Embedded Systems']
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '867585915737-m2jb6me5u1dpp5vp3dum130lm1rp1sfc.apps.googleusercontent.com'

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', role: 'student', mentorCode: '', skills: [], schoolName: '', city: '',
  })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { register, googleLogin, loading } = useAuthStore()
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
          size: 'large', width: '100%', text: 'signup_with', shape: 'rectangular',
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
    } catch (err) { setErrors({ submit: err.message || 'Google signup failed' }) }
    finally { setGoogleLoading(false) }
  }

  const validate = () => {
    const e = {}
    if (!formData.name) e.name = 'Name is required'
    if (!formData.email) e.email = 'Email is required'
    if (!formData.password) e.password = 'Password is required'
    if (formData.password.length < 6) e.password = 'Password must be at least 6 characters'
    if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match'
    if (formData.role === 'student') {
      if (!formData.schoolName) e.schoolName = 'School name is required'
      if (!formData.city) e.city = 'City is required'
    }
    if (formData.role === 'mentor' && !formData.mentorCode) e.mentorCode = 'Mentor code is required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setErrors({})
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    try {
      await register(formData.email, formData.password, formData.name, formData.role, formData.mentorCode, formData.skills, formData.schoolName, formData.city)
      navigate(formData.role === 'mentor' ? '/mentor-dashboard' : '/dashboard', { replace: true })
    } catch (err) { setErrors({ submit: err.message || 'Registration failed' }) }
  }

  const toggleSkill = (skill) => setFormData(p => ({
    ...p, skills: p.skills.includes(skill) ? p.skills.filter(s => s !== skill) : [...p.skills, skill]
  }))

  const inputClass = `w-full pl-11 pr-4 py-2.5 rounded-xl text-sm transition-all outline-none bg-white/[0.05] border border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:bg-white/[0.08]`

  const labelClass = `block text-sm font-medium mb-2 text-gray-400`
  const labelStyle = {}
  const errEl = (msg) => msg ? <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {msg}</p> : null

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)' }}>

      {/* Background Image - Drone */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url('/login-bg.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 0.25,
      }} />

      {/* Theme toggle */}
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
          <div className="text-center mb-6">
            <motion.div 
              initial={{ scale: 0, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <img src={a5xLogo} alt="A5X Logo" className="w-full h-full object-contain" />
            </motion.div>
            <h1 className="text-3xl font-bold mb-2">
              Join <span style={{ color: '#8b5cf6' }}>Studdy Buddy!</span>
            </h1>
            <p className="text-sm" style={{ color: 'rgba(156,163,175,0.9)' }}>
              Create your <span style={{ color: '#8b5cf6' }}>Studdy Buddy</span> account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Name */}
            <div>
              <label className={labelClass} style={labelStyle}>Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input type="text" name="name" placeholder="John Doe" value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className={inputClass} />
              </div>
              {errEl(errors.name)}
            </div>

            {/* Email */}
            <div>
              <label className={labelClass} style={labelStyle}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input type="email" name="email" placeholder="you@example.com" value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className={inputClass} />
              </div>
              {errEl(errors.email)}
            </div>

            {/* Password */}
            <div>
              <label className={labelClass} style={labelStyle}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input type={showPassword ? 'text' : 'password'} name="password" placeholder="••••••••"
                  value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                  className={inputClass + ' pr-10'} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errEl(errors.password)}
            </div>

            {/* Confirm Password */}
            <div>
              <label className={labelClass} style={labelStyle}>Confirm Password</label>
              <div className="relative">
                <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" placeholder="••••••••"
                  value={formData.confirmPassword} onChange={e => setFormData(p => ({ ...p, confirmPassword: e.target.value }))}
                  className={inputClass + ' pr-10'} />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition">
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errEl(errors.confirmPassword)}
            </div>

            {/* Role */}
            <div>
              <label className={labelClass} style={labelStyle}>I am a</label>
              <div className="relative">
                <UserCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
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

            {/* Student-only fields (School & City) */}
            <AnimatePresence>
              {formData.role === 'student' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                  <div>
                    <label className={labelClass} style={labelStyle}>School Name</label>
                    <input type="text" name="schoolName" placeholder="Enter your school name" value={formData.schoolName}
                      onChange={e => setFormData(p => ({ ...p, schoolName: e.target.value }))}
                      className={inputClass.replace('pl-11', 'pl-4')} />
                    {errEl(errors.schoolName)}
                  </div>
                  <div>
                    <label className={labelClass} style={labelStyle}>City</label>
                    <input type="text" name="city" placeholder="Enter your city" value={formData.city}
                      onChange={e => setFormData(p => ({ ...p, city: e.target.value }))}
                      className={inputClass.replace('pl-11', 'pl-4')} />
                    {errEl(errors.city)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mentor-only fields */}
            <AnimatePresence>
              {formData.role === 'mentor' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                  <div>
                    <label className={labelClass} style={labelStyle}>Mentor Code</label>
                    <input type="text" name="mentorCode" placeholder="Enter your mentor code" value={formData.mentorCode}
                      onChange={e => setFormData(p => ({ ...p, mentorCode: e.target.value }))}
                      className={inputClass.replace('pl-11', 'pl-4')} />
                    {errEl(errors.mentorCode)}
                  </div>
                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Expertise / Streams <span className="font-normal normal-case tracking-normal ml-1 text-xs opacity-60">(select all that apply)</span>
                    </label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {SKILLS.map(skill => {
                        const selected = formData.skills.includes(skill)
                        return (
                          <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                            style={{
                              background: selected ? '#8b5cf6' : 'transparent',
                              color: selected ? 'white' : 'rgba(148,163,184,0.7)',
                              border: selected ? '1px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                            }}>
                            {selected && <Check size={11} />} {skill}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {errors.submit && (
              <div className="p-3 rounded-xl text-sm flex items-center gap-2"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                <AlertCircle size={16} /> {errors.submit}
              </div>
            )}

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.99 }}
              className="w-full py-3 text-white font-semibold rounded-xl flex items-center justify-center gap-2 mt-4 disabled:opacity-50 transition-all"
              style={{ 
                background: 'linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%)', 
                boxShadow: '0 4px 15px rgba(139,92,246,0.4)' 
              }}>
              {loading ? <><Loader2 size={18} className="animate-spin" /> Creating account...</> : <><UserPlus size={18} /> Sign Up</>}
            </motion.button>

            {loading && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }}
                className="text-center text-xs text-gray-500">
                ⚡ Server is waking up, please wait...
              </motion.p>
            )}
          </form>

          {/* Divider + Google */}
          <div className="mt-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-700" />
              <span className="text-xs text-gray-500">or continue with</span>
              <div className="flex-1 h-px bg-gray-700" />
            </div>
            <div ref={googleBtnRef} className="flex justify-center" />
            {googleLoading && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <Loader2 size={14} className="animate-spin text-purple-400" />
                <span className="text-xs text-gray-500">Signing up with Google...</span>
              </div>
            )}
          </div>

          <p className="text-center text-sm mt-5 text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold hover:underline text-purple-400">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
