import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Mail, Lock, User, UserCircle, Loader2, AlertCircle, Sparkles, Eye, EyeOff, Check, Shield } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import ThemeToggle from '../components/ThemeToggle'

const SKILLS = ['Robotics', 'Programming', 'AI/ML', 'IoT', 'Electronics', 'Embedded Systems']
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '867585915737-m2jb6me5u1dpp5vp3dum130lm1rp1sfc.apps.googleusercontent.com'

function FloatingIcon({ icon, style }) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none opacity-[0.07] dark:opacity-[0.12]"
      style={style}
      animate={{ y: [0, -12, 0], rotate: [0, 5, 0] }}
      transition={{ duration: 6 + Math.random() * 3, repeat: Infinity, ease: 'easeInOut', delay: Math.random() * 3 }}
    >
      {icon}
    </motion.div>
  )
}

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', role: 'student', mentorCode: '', skills: [],
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
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleResponse })
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: isDark ? 'filled_black' : 'outline',
        size: 'large', width: '100%', text: 'signup_with', shape: 'rectangular',
      })
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
    if (formData.role === 'mentor' && !formData.mentorCode) e.mentorCode = 'Mentor code is required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setErrors({})
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    try {
      await register(formData.email, formData.password, formData.name, formData.role, formData.mentorCode, formData.skills)
      navigate(formData.role === 'mentor' ? '/mentor-dashboard' : '/dashboard', { replace: true })
    } catch (err) { setErrors({ submit: err.message || 'Registration failed' }) }
  }

  const toggleSkill = (skill) => setFormData(p => ({
    ...p, skills: p.skills.includes(skill) ? p.skills.filter(s => s !== skill) : [...p.skills, skill]
  }))

  const inputClass = `w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all outline-none ${
    isDark
      ? 'bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15'
  }`

  const labelClass = `block text-xs font-semibold mb-1.5 uppercase tracking-wider`
  const labelStyle = { color: isDark ? 'rgba(148,163,184,0.8)' : '#64748b' }
  const errEl = (msg) => msg ? <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} /> {msg}</p> : null

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: isDark ? '#0a0814' : '#f5f0ff' }}>

      {/* Floating icons */}
      <FloatingIcon icon={<span style={{ fontSize: 80 }}>🎓</span>} style={{ top: '3%', left: '4%' }} />
      <FloatingIcon icon={<span style={{ fontSize: 60 }}>📖</span>} style={{ bottom: '12%', left: '6%' }} />
      <FloatingIcon icon={<span style={{ fontSize: 65 }}>⚙️</span>} style={{ bottom: '8%', right: '4%' }} />
      <FloatingIcon icon={<span style={{ fontSize: 55 }}>🤖</span>} style={{ top: '8%', right: '6%' }} />
      <FloatingIcon icon={<span style={{ fontSize: 45 }}>🌐</span>} style={{ top: '42%', left: '1%' }} />
      <FloatingIcon icon={<span style={{ fontSize: 45 }}>💡</span>} style={{ top: '35%', right: '2%' }} />

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `radial-gradient(${isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.18)'} 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
      }} />

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        className="w-full max-w-md relative z-10">

        <div className="rounded-2xl p-8"
          style={{
            background: isDark ? 'rgba(15,12,31,0.92)' : '#ffffff',
            border: isDark ? '1px solid rgba(139,92,246,0.25)' : '1px solid rgba(226,232,240,1)',
            boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(100,116,139,0.15)',
            backdropFilter: isDark ? 'blur(20px)' : 'none',
          }}>

          {/* Logo */}
          <div className="text-center mb-6">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 220 }}
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>
              <Sparkles className="text-white" size={28} />
            </motion.div>
            <h1 className="text-2xl font-bold mb-1.5" style={{ color: isDark ? '#fff' : '#0f172a' }}>Join Studdy Buddy</h1>
            <p className="text-sm" style={{ color: isDark ? 'rgba(148,163,184,0.7)' : '#64748b' }}>
              Create your account to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Name */}
            <div>
              <label className={labelClass} style={labelStyle}>Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: '#8b5cf6' }} />
                <input type="text" name="name" placeholder="John Doe" value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className={inputClass} />
              </div>
              {errEl(errors.name)}
            </div>

            {/* Email */}
            <div>
              <label className={labelClass} style={labelStyle}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: '#8b5cf6' }} />
                <input type="email" name="email" placeholder="you@example.com" value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className={inputClass} />
              </div>
              {errEl(errors.email)}
            </div>

            {/* Password */}
            <div>
              <label className={labelClass} style={labelStyle}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: '#8b5cf6' }} />
                <input type={showPassword ? 'text' : 'password'} name="password" placeholder="••••••••"
                  value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                  className={inputClass + ' pr-10'} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errEl(errors.password)}
            </div>

            {/* Confirm Password */}
            <div>
              <label className={labelClass} style={labelStyle}>Confirm Password</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: '#8b5cf6' }} />
                <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" placeholder="••••••••"
                  value={formData.confirmPassword} onChange={e => setFormData(p => ({ ...p, confirmPassword: e.target.value }))}
                  className={inputClass + ' pr-10'} />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition">
                  {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errEl(errors.confirmPassword)}
            </div>

            {/* Role */}
            <div>
              <label className={labelClass} style={labelStyle}>I am a</label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: '#8b5cf6' }} />
                <select name="role" value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                  className={inputClass + ' appearance-none cursor-pointer'}>
                  <option value="student">Student</option>
                  <option value="mentor">Mentor</option>
                </select>
              </div>
            </div>

            {/* Mentor-only fields */}
            <AnimatePresence>
              {formData.role === 'mentor' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} className="space-y-3.5 overflow-hidden">
                  <div>
                    <label className={labelClass} style={labelStyle}>Mentor Code</label>
                    <input type="text" name="mentorCode" placeholder="Enter your mentor code" value={formData.mentorCode}
                      onChange={e => setFormData(p => ({ ...p, mentorCode: e.target.value }))}
                      className={inputClass.replace('pl-10', 'pl-4')} />
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
                              color: selected ? 'white' : (isDark ? 'rgba(148,163,184,0.7)' : '#64748b'),
                              border: selected ? '1px solid #8b5cf6' : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
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
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                <AlertCircle size={15} /> {errors.submit}
              </div>
            )}

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full py-3 text-white font-semibold rounded-xl flex items-center justify-center gap-2 mt-1 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }}>
              {loading ? <><Loader2 size={17} className="animate-spin" /> Creating account...</> : <><UserPlus size={17} /> Sign Up</>}
            </motion.button>

            {loading && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }}
                className="text-center text-xs" style={{ color: isDark ? 'rgba(148,163,184,0.6)' : '#94a3b8' }}>
                ⚡ Server is waking up, please wait...
              </motion.p>
            )}
          </form>

          {/* Divider + Google */}
          <div className="mt-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }} />
              <span className="text-xs" style={{ color: isDark ? 'rgba(148,163,184,0.5)' : '#94a3b8' }}>or continue with</span>
              <div className="flex-1 h-px" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }} />
            </div>
            <div ref={googleBtnRef} className="flex justify-center" />
            {googleLoading && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <Loader2 size={13} className="animate-spin text-purple-400" />
                <span className="text-xs" style={{ color: isDark ? 'rgba(148,163,184,0.6)' : '#94a3b8' }}>Signing up with Google...</span>
              </div>
            )}
          </div>

          <p className="text-center text-sm mt-5" style={{ color: isDark ? 'rgba(148,163,184,0.6)' : '#64748b' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: '#8b5cf6' }}>Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
