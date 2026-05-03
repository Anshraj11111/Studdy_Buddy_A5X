import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Save, User, Check, X, ZoomIn, Loader2, Settings as SettingsIcon, MapPin, FileText, Shield } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { uploadToCloudinary } from '../utils/cloudinary'

const SKILLS = ['Robotics', 'Programming', 'AI/ML', 'IoT', 'Electronics', 'Embedded Systems']
const SKILL_COLORS = {
  'Robotics': '#60a5fa', 'Programming': '#34d399', 'AI/ML': '#a78bfa',
  'IoT': '#38bdf8', 'Electronics': '#fbbf24', 'Embedded Systems': '#f87171',
}

const glassCard = {
  background: 'rgba(10,8,30,0.7)',
  border: '1px solid rgba(99,102,241,0.15)',
  backdropFilter: 'blur(20px)',
  borderRadius: '16px',
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(99,102,241,0.2)',
  color: 'white',
  borderRadius: '12px',
  padding: '10px 14px',
  fontSize: '0.85rem',
  width: '100%',
  outline: 'none',
}

export default function Settings() {
  const { user, updateProfile, loading } = useAuthStore()
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    skills: user?.skills || [],
    profileImage: user?.profileImage || '',
    bio: user?.bio || '',
    address: user?.address || '',
  })
  const [preview, setPreview] = useState(user?.profileImage || '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [zoomed, setZoomed] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return }
    setError(''); setUploading(true)
    try {
      setPreview(URL.createObjectURL(file))
      const { url } = await uploadToCloudinary(file, 'studdy-buddy/profiles')
      setPreview(url)
      setFormData(prev => ({ ...prev, profileImage: url }))
    } catch {
      setError('Failed to upload image.')
      setPreview(user?.profileImage || '')
    } finally { setUploading(false) }
  }

  const toggleSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    try {
      await updateProfile({ name: formData.name, skills: formData.skills, profileImage: formData.profileImage, bio: formData.bio, address: formData.address })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { setError('Failed to save settings') }
  }

  return (
    <div className="flex min-h-screen" style={{ position: 'relative' }}>
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(/src/assets/image.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(5,3,20,0.80)' }} />

      <div style={{ position: 'relative', zIndex: 60 }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="relative flex-1 lg:ml-[240px] mt-16 px-3 sm:px-5 py-5 overflow-x-hidden" style={{ zIndex: 5 }}>
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-6">
            <motion.div animate={{ boxShadow: ['0 0 0px rgba(99,102,241,0)', '0 0 24px rgba(99,102,241,0.5)', '0 0 0px rgba(99,102,241,0)'] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.25))', border: '1px solid rgba(99,102,241,0.4)' }}>
              <SettingsIcon size={26} style={{ color: '#818cf8' }} />
            </motion.div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold"
                style={{ background: 'linear-gradient(135deg,#a5b4fc,#818cf8,#c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Settings
              </h1>
              <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.8rem', fontFamily: 'monospace' }}>Manage your profile and preferences</p>
            </div>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Profile Photo */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              style={glassCard} className="p-5 sm:p-6">
              <div className="h-0.5 -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-5 rounded-t-2xl"
                style={{ background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2"
                style={{ color: '#a5b4fc', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Camera size={14} /> Profile Photo
              </h2>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <div className="relative flex-shrink-0">
                  <motion.div whileHover={{ scale: 1.05 }}
                    className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center cursor-pointer"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 24px rgba(99,102,241,0.4)' }}
                    onClick={() => preview && setZoomed(true)}>
                    {preview ? (
                      <>
                        <img src={preview} alt="Profile" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 rounded-full opacity-0 hover:opacity-100 transition flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.4)' }}>
                          <ZoomIn size={20} className="text-white" />
                        </div>
                      </>
                    ) : (
                      <span className="text-white text-3xl font-bold">
                        {user?.name?.charAt(0).toUpperCase() || <User size={28} />}
                      </span>
                    )}
                  </motion.div>
                  <motion.button type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg transition"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: '2px solid rgba(10,8,30,0.9)' }}
                    disabled={uploading}>
                    {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                  </motion.button>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-sm mb-3" style={{ color: 'rgba(148,163,184,0.7)' }}>
                    {uploading ? 'Uploading...' : 'Upload a profile photo (max 10MB)'}
                  </p>
                  <div className="flex gap-2 justify-center sm:justify-start flex-wrap">
                    <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 text-sm font-medium text-white rounded-xl transition"
                      style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)' }}>
                      Choose Photo
                    </motion.button>
                    {preview && (
                      <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => { setPreview(''); setFormData(p => ({ ...p, profileImage: '' })) }}
                        className="px-4 py-2 text-sm font-medium rounded-xl transition"
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                        Remove
                      </motion.button>
                    )}
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </div>
            </motion.div>

            {/* Account Info */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              style={glassCard} className="p-5 sm:p-6">
              <div className="h-0.5 -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-5 rounded-t-2xl"
                style={{ background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2"
                style={{ color: '#a5b4fc', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <User size={14} /> Account Info
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>Full Name</label>
                  <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Your name" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.2)'} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>Email</label>
                  <div className="px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(148,163,184,0.6)' }}>
                    {user?.email}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>Role</label>
                  <div className="px-4 py-2.5 rounded-xl text-sm capitalize flex items-center gap-2"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(148,163,184,0.6)' }}>
                    <Shield size={13} style={{ color: user?.role === 'mentor' ? '#c4b5fd' : '#93c5fd' }} />
                    {user?.role}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
                    <span className="flex items-center gap-1"><FileText size={12} /> Bio</span>
                  </label>
                  <textarea value={formData.bio} onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))}
                    maxLength={300} rows={3} placeholder="Tell others about yourself..."
                    style={{ ...inputStyle, resize: 'none' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.2)'} />
                  <p className="text-xs text-right mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>{formData.bio.length}/300</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
                    <span className="flex items-center gap-1"><MapPin size={12} /> Location</span>
                  </label>
                  <input value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                    maxLength={200} placeholder="e.g., Mumbai, India" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.2)'} />
                </div>
              </div>
            </motion.div>

            {/* Skills */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              style={glassCard} className="p-5 sm:p-6">
              <div className="h-0.5 -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-5 rounded-t-2xl"
                style={{ background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
              <h2 className="text-sm font-bold mb-1 flex items-center gap-2"
                style={{ color: '#a5b4fc', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Check size={14} /> {user?.role === 'mentor' ? 'Expertise / Streams' : 'Skills'}
              </h2>
              <p className="text-xs mb-4" style={{ color: 'rgba(148,163,184,0.5)' }}>Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {SKILLS.map(skill => {
                  const selected = formData.skills.includes(skill)
                  const c = SKILL_COLORS[skill] || '#818cf8'
                  return (
                    <motion.button key={skill} type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => toggleSkill(skill)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition"
                      style={{
                        background: selected ? `${c}20` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${selected ? c + '50' : 'rgba(255,255,255,0.1)'}`,
                        color: selected ? c : 'rgba(148,163,184,0.7)',
                        boxShadow: selected ? `0 0 10px ${c}25` : 'none',
                      }}>
                      {selected && <Check size={10} />}
                      {skill}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-3 rounded-xl text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                {error}
              </motion.div>
            )}

            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-white font-semibold rounded-xl transition disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
              {saved ? (
                <><Check size={18} /> Saved!</>
              ) : loading ? (
                <><Loader2 size={18} className="animate-spin" /> Saving...</>
              ) : (
                <><Save size={18} /> Save Changes</>
              )}
            </motion.button>
          </form>
        </div>
      </div>

      {/* Zoom Modal */}
      <AnimatePresence>
        {zoomed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={() => setZoomed(false)}>
            <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} exit={{ scale: 0.7 }}
              className="relative w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <img src={preview} alt="Profile" className="w-full rounded-2xl shadow-2xl object-cover"
                style={{ boxShadow: '0 0 40px rgba(99,102,241,0.4)' }} />
              <button onClick={() => setZoomed(false)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-white transition"
                style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <X size={16} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
