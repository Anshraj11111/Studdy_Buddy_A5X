import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, Save, User, Check, X, ZoomIn, Loader2,
  Settings as SettingsIcon, MapPin, FileText, Shield,
  Users, UserCheck, Link2, Github, Linkedin, Instagram,
  Globe, Type, Image as ImageIcon, Plus, Phone, Lock,
  Navigation,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { uploadToCloudinary } from '../utils/cloudinary'
import { followAPI } from '../services/api'

const SUGGESTED_SKILLS = [
  'Robotics', 'Programming', 'AI/ML', 'IoT', 'Electronics',
  'Embedded Systems', 'Web Development', 'Mobile Development',
  'Data Science', 'Cybersecurity', 'Cloud Computing', 'DevOps',
  'UI/UX Design', 'Machine Learning', 'Deep Learning', 'Python',
  'JavaScript', 'React', 'Node.js', 'Java', 'C/C++', 'Arduino',
  'Raspberry Pi', '3D Printing', 'PCB Design',
]

const SKILL_COLORS = [
  '#60a5fa', '#34d399', '#a78bfa', '#38bdf8', '#fbbf24',
  '#f87171', '#fb923c', '#e879f9', '#4ade80', '#f472b6',
]

const getSkillColor = (skill) => {
  let hash = 0
  for (let i = 0; i < skill.length; i++) hash = skill.charCodeAt(i) + ((hash << 5) - hash)
  return SKILL_COLORS[Math.abs(hash) % SKILL_COLORS.length]
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

const SOCIAL_FIELDS = [
  { key: 'github', label: 'GitHub', icon: Github, placeholder: 'https://github.com/username', color: '#e2e8f0' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/username', color: '#60a5fa' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/username', color: '#f472b6' },
  { key: 'website', label: 'Website / Portfolio', icon: Globe, placeholder: 'https://yourwebsite.com', color: '#34d399' },
]

// ── Shared hook for portal dropdown positioning ───────────────────────
function useDropdownPortal(anchorRef) {
  const [rect, setRect] = useState(null)
  const update = useCallback(() => {
    if (!anchorRef.current) return
    const r = anchorRef.current.getBoundingClientRect()
    setRect({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width })
  }, [anchorRef])
  const close = useCallback(() => setRect(null), [])
  return { rect, update, close }
}

// ── Portal Dropdown wrapper ───────────────────────────────────────────
function PortalDropdown({ anchorRect, children }) {
  if (!anchorRect) return null
  return createPortal(
    <div style={{
      position: 'absolute',
      top: anchorRect.top,
      left: anchorRect.left,
      width: anchorRect.width,
      zIndex: 99999,
      background: 'rgba(10,8,35,0.98)',
      border: '1px solid rgba(99,102,241,0.35)',
      borderRadius: '12px',
      boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
      overflow: 'hidden',
    }}>
      {children}
    </div>,
    document.body
  )
}

// ── Location Autocomplete ─────────────────────────────────────────────
function LocationInput({ value, onChange }) {
  const [query, setQuery] = useState(value || '')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const debounceRef = useRef(null)
  const { rect, update, close } = useDropdownPortal(anchorRef)

  useEffect(() => { setQuery(value || '') }, [value])

  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 3) { setSuggestions([]); return }
    setLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      )
      setSuggestions(await res.json())
    } catch { setSuggestions([]) }
    finally { setLoading(false) }
  }, [])

  const handleChange = (e) => {
    const v = e.target.value
    setQuery(v); onChange(v); update(); setOpen(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 400)
  }

  const handleSelect = (item) => {
    setQuery(item.display_name); onChange(item.display_name)
    setSuggestions([]); setOpen(false); close()
  }

  const detectLocation = () => {
    if (!navigator.geolocation) return
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, { headers: { 'Accept-Language': 'en' } })
          const data = await res.json()
          setQuery(data.display_name || ''); onChange(data.display_name || '')
        } catch {}
        finally { setDetecting(false) }
      },
      () => setDetecting(false),
      { timeout: 8000 }
    )
  }

  const showDrop = open && (suggestions.length > 0 || loading)

  return (
    <>
      <div ref={anchorRef} className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <MapPin size={14} style={{ color: '#818cf8' }} />
        </span>
        <input
          value={query}
          onChange={handleChange}
          onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; update(); setOpen(true) }}
          onBlur={e => { e.target.style.borderColor = 'rgba(99,102,241,0.2)'; setTimeout(() => { setSuggestions([]); setOpen(false); close() }, 200) }}
          placeholder="Search city, area or address..."
          style={{ ...inputStyle, paddingLeft: '36px', paddingRight: '40px' }}
          autoComplete="off"
        />
        <button type="button" onClick={detectLocation} title="Detect my location" disabled={detecting}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
          {detecting ? <Loader2 size={13} className="animate-spin" style={{ color: '#818cf8' }} /> : <Navigation size={13} style={{ color: '#818cf8' }} />}
        </button>
      </div>

      <PortalDropdown anchorRect={showDrop ? rect : null}>
        {loading && (
          <div className="flex items-center gap-2 px-4 py-3 text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>
            <Loader2 size={12} className="animate-spin" /> Searching...
          </div>
        )}
        {suggestions.map((s) => (
          <button key={s.place_id} type="button" onMouseDown={() => handleSelect(s)}
            className="w-full text-left px-4 py-2.5 text-xs flex items-start gap-2 transition"
            style={{ color: 'rgba(226,232,240,0.85)', borderBottom: '1px solid rgba(99,102,241,0.08)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}>
            <MapPin size={11} className="flex-shrink-0 mt-0.5" style={{ color: '#818cf8' }} />
            <span style={{ lineHeight: '1.5' }}>{s.display_name}</span>
          </button>
        ))}
      </PortalDropdown>
    </>
  )
}

// ── Custom Skills Input ───────────────────────────────────────────────
function SkillsInput({ skills, onChange }) {
  const [inputVal, setInputVal] = useState('')
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const { rect, update, close } = useDropdownPortal(anchorRef)

  const filtered = SUGGESTED_SKILLS.filter(
    s => s.toLowerCase().includes(inputVal.toLowerCase()) && !skills.includes(s)
  )

  const addSkill = (skill) => {
    const t = skill.trim()
    if (!t || skills.includes(t)) return
    onChange([...skills, t]); setInputVal(''); setOpen(false); close()
  }

  const removeSkill = (skill) => onChange(skills.filter(s => s !== skill))

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addSkill(inputVal) }
    if (e.key === 'Backspace' && !inputVal && skills.length) removeSkill(skills[skills.length - 1])
    if (e.key === 'Escape') { setOpen(false); close() }
  }

  const showDrop = open && filtered.length > 0

  return (
    <>
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {skills.map(skill => {
            const c = getSkillColor(skill)
            return (
              <motion.span key={skill} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: `${c}18`, border: `1px solid ${c}45`, color: c }}>
                {skill}
                <button type="button" onClick={() => removeSkill(skill)}
                  className="ml-0.5 rounded-full hover:bg-white/10 p-0.5 transition">
                  <X size={10} />
                </button>
              </motion.span>
            )
          })}
        </div>
      )}

      <div ref={anchorRef} className="relative">
        <input
          value={inputVal}
          onChange={e => { setInputVal(e.target.value); update(); setOpen(true) }}
          onKeyDown={handleKeyDown}
          onFocus={() => { update(); setOpen(true) }}
          onBlur={() => setTimeout(() => { setOpen(false); close() }, 200)}
          placeholder="Type a skill and press Enter, or pick from suggestions..."
          style={inputStyle}
          autoComplete="off"
          onFocusCapture={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
          onBlurCapture={e => e.target.style.borderColor = 'rgba(99,102,241,0.2)'}
        />
        {inputVal && (
          <button type="button" onMouseDown={() => addSkill(inputVal)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
            style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc' }}>
            <Plus size={11} /> Add
          </button>
        )}
      </div>

      <PortalDropdown anchorRect={showDrop ? rect : null}>
        <p className="px-3 pt-2 pb-1 text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>Suggestions</p>
        <div className="flex flex-wrap gap-1.5 px-3 pb-3" style={{ maxHeight: '160px', overflowY: 'auto' }}>
          {filtered.map(s => {
            const c = getSkillColor(s)
            return (
              <button key={s} type="button" onMouseDown={() => addSkill(s)}
                className="px-2.5 py-1 rounded-full text-xs font-medium transition"
                style={{ background: `${c}15`, border: `1px solid ${c}35`, color: c }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = ''}>
                + {s}
              </button>
            )
          })}
        </div>
      </PortalDropdown>

      <p className="text-xs mt-1.5" style={{ color: 'rgba(148,163,184,0.4)' }}>
        Press Enter or click Add to add custom skills. Backspace removes the last one.
      </p>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────

export default function Settings() {
  const { user, updateProfile, loading } = useAuthStore()
  const fileInputRef = useRef(null)
  const bannerInputRef = useRef(null)

  const [formData, setFormData] = useState({
    name: user?.name || '',
    skills: user?.skills || [],
    profileImage: user?.profileImage || '',
    bannerImage: user?.bannerImage || '',
    headline: user?.headline || '',
    bio: user?.bio || '',
    address: user?.address || '',
    socialLinks: {
      github: user?.socialLinks?.github || '',
      linkedin: user?.socialLinks?.linkedin || '',
      instagram: user?.socialLinks?.instagram || '',
      website: user?.socialLinks?.website || '',
    },
    phone: user?.phone || '',
    privateAddress: user?.privateAddress || '',
    education: {
      institution: user?.education?.institution || '',
      degree: user?.education?.degree || '',
      field: user?.education?.field || '',
      startYear: user?.education?.startYear || '',
      endYear: user?.education?.endYear || '',
      description: user?.education?.description || '',
    },
    experience: {
      company: user?.experience?.company || '',
      role: user?.experience?.role || '',
      startYear: user?.experience?.startYear || '',
      endYear: user?.experience?.endYear || '',
      description: user?.experience?.description || '',
    },
  })

  const [preview, setPreview] = useState(user?.profileImage || '')
  const [bannerPreview, setBannerPreview] = useState(user?.bannerImage || '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [zoomed, setZoomed] = useState(false)
  const [zoomedBanner, setZoomedBanner] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [counts, setCounts] = useState({ followersCount: 0, followingCount: 0, connectionsCount: 0 })

  useEffect(() => {
    if (user?._id) {
      followAPI.getCounts(user._id).then(res => setCounts(res.data.data)).catch(() => {})
    }
  }, [user?._id])

  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return }
    setError(''); setUploading(true)
    try {
      setPreview(URL.createObjectURL(file))
      const { url } = await uploadToCloudinary(file, 'studdy-buddy/profiles')
      setPreview(url); setFormData(prev => ({ ...prev, profileImage: url }))
    } catch { setError('Failed to upload image.'); setPreview(user?.profileImage || '') }
    finally { setUploading(false) }
  }

  const handleBannerChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('Banner must be under 10MB'); return }
    setError(''); setUploadingBanner(true)
    try {
      setBannerPreview(URL.createObjectURL(file))
      const { url } = await uploadToCloudinary(file, 'studdy-buddy/banners')
      setBannerPreview(url); setFormData(prev => ({ ...prev, bannerImage: url }))
    } catch { setError('Failed to upload banner.'); setBannerPreview(user?.bannerImage || '') }
    finally { setUploadingBanner(false) }
  }

  const handleSocialChange = (key, value) => {
    setFormData(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, [key]: value } }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    try {
      await updateProfile({
        name: formData.name, skills: formData.skills,
        profileImage: formData.profileImage, bannerImage: formData.bannerImage,
        headline: formData.headline, bio: formData.bio, address: formData.address,
        socialLinks: formData.socialLinks, phone: formData.phone, privateAddress: formData.privateAddress,
        education: formData.education, experience: formData.experience,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to save settings'
      setError(msg)
    }
  }

  return (
    <div className="flex min-h-screen" style={{ position: 'relative' }}>
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* ── Toast Notifications ──────────────────────────── */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -60, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -60, x: '-50%' }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            style={{
              position: 'fixed', top: 72, left: '50%',
              zIndex: 99999,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 20px', borderRadius: 16,
              background: 'rgba(5,150,105,0.95)',
              border: '1px solid rgba(52,211,153,0.4)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(52,211,153,0.25)',
              backdropFilter: 'blur(16px)',
              color: 'white', fontWeight: 700, fontSize: '0.9rem',
              whiteSpace: 'nowrap',
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Profile saved successfully!
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -60, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -60, x: '-50%' }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            style={{
              position: 'fixed', top: 72, left: '50%',
              zIndex: 99999,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 20px', borderRadius: 16,
              background: 'rgba(220,38,38,0.95)',
              border: '1px solid rgba(248,113,113,0.4)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(16px)',
              color: 'white', fontWeight: 700, fontSize: '0.9rem',
              maxWidth: '80vw',
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Save failed: {error}</span>
            <button onClick={() => setError('')}
              style={{ marginLeft: 8, opacity: 0.7, cursor: 'pointer', background: 'none', border: 'none', color: 'white' }}>
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(/image.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(5,3,20,0.80)' }} />
      <div style={{ position: 'relative', zIndex: 60 }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="relative flex-1 lg:ml-[240px] mt-16 px-3 sm:px-5 py-5 overflow-x-hidden" style={{ zIndex: 5 }}>
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-6">
            <motion.div
              animate={{ boxShadow: ['0 0 0px rgba(99,102,241,0)', '0 0 24px rgba(99,102,241,0.5)', '0 0 0px rgba(99,102,241,0)'] }}
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

          {/* Profile Preview Card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            style={glassCard} className="p-5 sm:p-6 mb-4 overflow-hidden">
            <div className="h-0.5 -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-0 rounded-t-2xl"
              style={{ background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
            <div className="h-20 -mx-5 sm:-mx-6 mb-5 relative overflow-hidden"
              style={{ background: bannerPreview ? `url(${bannerPreview}) center/cover no-repeat` : 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.15))' }}>
              {!bannerPreview && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span style={{ color: 'rgba(148,163,184,0.3)', fontSize: '0.7rem', fontFamily: 'monospace' }}>No banner set</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-2xl flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
                {preview ? <img src={preview} alt={user?.name} className="w-full h-full object-cover" /> : user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-white text-lg leading-tight">{user?.name}</p>
                {user?.headline && <p className="text-xs mt-0.5" style={{ color: '#a5b4fc' }}>{user.headline}</p>}
                <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>{user?.email}</p>
                <span className="inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full capitalize font-semibold"
                  style={{ background: user?.role === 'mentor' ? 'rgba(196,181,253,0.15)' : 'rgba(96,165,250,0.15)', border: user?.role === 'mentor' ? '1px solid rgba(196,181,253,0.3)' : '1px solid rgba(96,165,250,0.3)', color: user?.role === 'mentor' ? '#c4b5fd' : '#93c5fd' }}>
                  <Shield size={10} /> {user?.role}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Users, label: 'Connections', value: counts.connectionsCount, color: '#6366f1' },
                { icon: UserCheck, label: 'Followers', value: counts.followersCount, color: '#8b5cf6' },
                { icon: User, label: 'Following', value: counts.followingCount, color: '#06b6d4' },
              ].map(s => { const Icon = s.icon; return (
                <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: `${s.color}12`, border: `1px solid ${s.color}30` }}>
                  <Icon size={16} className="mx-auto mb-1" style={{ color: s.color }} />
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>{s.label}</p>
                </div>
              )})}
            </div>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Banner Image */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              style={glassCard} className="p-5 sm:p-6">
              <div className="h-0.5 -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-5 rounded-t-2xl" style={{ background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: '#a5b4fc', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <ImageIcon size={14} /> Banner Image
              </h2>
              <div className="relative w-full h-32 rounded-xl overflow-hidden mb-4 cursor-pointer"
                style={{ background: bannerPreview ? `url(${bannerPreview}) center/cover no-repeat` : 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.2)' }}
                onClick={() => bannerPreview && setZoomedBanner(true)}>
                {!bannerPreview && <div className="absolute inset-0 flex flex-col items-center justify-center gap-1"><ImageIcon size={24} style={{ color: 'rgba(148,163,184,0.3)' }} /><span style={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.75rem' }}>No banner uploaded</span></div>}
                {bannerPreview && <div className="absolute inset-0 opacity-0 hover:opacity-100 transition flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}><ZoomIn size={22} className="text-white" /></div>}
                {uploadingBanner && <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}><Loader2 size={22} className="animate-spin text-white" /></div>}
              </div>
              <div className="flex gap-2 flex-wrap">
                <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner}
                  className="px-4 py-2 text-sm font-medium text-white rounded-xl" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)' }}>
                  {uploadingBanner ? 'Uploading...' : 'Upload Banner'}
                </motion.button>
                {bannerPreview && (
                  <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setBannerPreview(''); setFormData(p => ({ ...p, bannerImage: '' })) }}
                    className="px-4 py-2 text-sm font-medium rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                    Remove
                  </motion.button>
                )}
              </div>
              <p className="text-xs mt-2" style={{ color: 'rgba(148,163,184,0.4)' }}>Recommended: 1500×500px, max 10MB.</p>
              <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
            </motion.div>

            {/* Profile Photo */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              style={glassCard} className="p-5 sm:p-6">
              <div className="h-0.5 -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-5 rounded-t-2xl" style={{ background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: '#a5b4fc', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Camera size={14} /> Profile Photo
              </h2>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <div className="relative flex-shrink-0">
                  <motion.div whileHover={{ scale: 1.05 }} className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center cursor-pointer"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 24px rgba(99,102,241,0.4)' }} onClick={() => preview && setZoomed(true)}>
                    {preview ? (<><img src={preview} alt="Profile" className="w-full h-full object-cover" /><div className="absolute inset-0 rounded-full opacity-0 hover:opacity-100 transition flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}><ZoomIn size={20} className="text-white" /></div></>) : (<span className="text-white text-3xl font-bold">{user?.name?.charAt(0).toUpperCase()}</span>)}
                  </motion.div>
                  <motion.button type="button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => !uploading && fileInputRef.current?.click()} disabled={uploading}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: '2px solid rgba(10,8,30,0.9)' }}>
                    {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                  </motion.button>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-sm mb-3" style={{ color: 'rgba(148,163,184,0.7)' }}>{uploading ? 'Uploading...' : 'Upload a profile photo (max 10MB)'}</p>
                  <div className="flex gap-2 justify-center sm:justify-start flex-wrap">
                    <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 text-sm font-medium text-white rounded-xl" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)' }}>
                      Choose Photo
                    </motion.button>
                    {preview && (
                      <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setPreview(''); setFormData(p => ({ ...p, profileImage: '' })) }}
                        className="px-4 py-2 text-sm font-medium rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                        Remove
                      </motion.button>
                    )}
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </div>
            </motion.div>

            {/* Account Info */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
              style={glassCard} className="p-5 sm:p-6">
              <div className="h-0.5 -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-5 rounded-t-2xl" style={{ background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: '#a5b4fc', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <User size={14} /> Account Info
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>Full Name</label>
                  <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Your name" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.2)'} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
                    <span className="flex items-center gap-1"><Type size={12} /> Headline</span>
                  </label>
                  <input value={formData.headline} onChange={e => setFormData(p => ({ ...p, headline: e.target.value }))} maxLength={120}
                    placeholder="e.g., Full-Stack Developer | AI Enthusiast" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.2)'} />
                  <p className="text-xs text-right mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>{formData.headline.length}/120</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>Email</label>
                  <div className="px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(148,163,184,0.6)' }}>{user?.email}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>Role</label>
                  <div className="px-4 py-2.5 rounded-xl text-sm capitalize flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(148,163,184,0.6)' }}>
                    <Shield size={13} style={{ color: user?.role === 'mentor' ? '#c4b5fd' : '#93c5fd' }} />{user?.role}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
                    <span className="flex items-center gap-1"><FileText size={12} /> Bio</span>
                  </label>
                  <textarea value={formData.bio} onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))} maxLength={300} rows={3}
                    placeholder="Tell others about yourself..." style={{ ...inputStyle, resize: 'none' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.2)'} />
                  <p className="text-xs text-right mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>{formData.bio.length}/300</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
                    <span className="flex items-center gap-1"><MapPin size={12} /> Location (Public)</span>
                  </label>
                  <LocationInput value={formData.address} onChange={val => setFormData(p => ({ ...p, address: val }))} />
                  <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>
                    Shown on your public profile. Click <Navigation size={10} style={{ display: 'inline' }} /> to auto-detect.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Social Links */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
              style={glassCard} className="p-5 sm:p-6">
              <div className="h-0.5 -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-5 rounded-t-2xl" style={{ background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
              <h2 className="text-sm font-bold mb-1 flex items-center gap-2" style={{ color: '#a5b4fc', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Link2 size={14} /> Social Links
              </h2>
              <p className="text-xs mb-4" style={{ color: 'rgba(148,163,184,0.5)' }}>Add your profiles so others can connect with you</p>
              <div className="space-y-3">
                {SOCIAL_FIELDS.map(({ key, label, icon: Icon, placeholder, color }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
                      <Icon size={12} style={{ color }} /> {label}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><Icon size={14} style={{ color }} /></span>
                      <input type="url" value={formData.socialLinks[key]} onChange={e => handleSocialChange(key, e.target.value)} placeholder={placeholder}
                        style={{ ...inputStyle, paddingLeft: '36px' }}
                        onFocus={e => e.target.style.borderColor = color + '80'} onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.2)'} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Skills */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }}
              style={glassCard} className="p-5 sm:p-6">
              <div className="h-0.5 -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-5 rounded-t-2xl" style={{ background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
              <h2 className="text-sm font-bold mb-1 flex items-center gap-2" style={{ color: '#a5b4fc', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <Check size={14} /> {user?.role === 'mentor' ? 'Expertise / Skills' : 'Skills'}
              </h2>
              <p className="text-xs mb-4" style={{ color: 'rgba(148,163,184,0.5)' }}>Add any skill — pick from suggestions or type your own</p>
              <SkillsInput skills={formData.skills} onChange={skills => setFormData(p => ({ ...p, skills }))} />
            </motion.div>

            {/* Education / Experience */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }}
              style={{ ...glassCard, border: user?.role === 'mentor' ? '1px solid rgba(139,92,246,0.2)' : '1px solid rgba(52,211,153,0.15)' }}
              className="p-5 sm:p-6">
              <div className="h-0.5 -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-5 rounded-t-2xl"
                style={{ background: user?.role === 'mentor' ? 'linear-gradient(90deg,transparent,#8b5cf6,#c4b5fd,transparent)' : 'linear-gradient(90deg,transparent,#34d399,#6ee7b7,transparent)' }} />
              <h2 className="text-sm font-bold mb-1 flex items-center gap-2"
                style={{ color: user?.role === 'mentor' ? '#c4b5fd' : '#6ee7b7', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {user?.role === 'mentor' ? '🏢' : '🎓'} {user?.role === 'mentor' ? 'Work Experience' : 'Education'}
              </h2>
              <p className="text-xs mb-4" style={{ color: 'rgba(148,163,184,0.5)' }}>
                {user?.role === 'mentor' ? 'Add your company, role, and professional background' : 'Add your school, college, or institution details'}
              </p>

              {user?.role === 'mentor' ? (
                <div className="space-y-3">
                  {[
                    { key: 'company', label: 'Company / Organization', placeholder: 'e.g., Google, IIT Bombay, Startup' },
                    { key: 'role', label: 'Role / Designation', placeholder: 'e.g., Senior Engineer, Research Scientist' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>{label}</label>
                      <input value={formData.experience[key]} onChange={e => setFormData(p => ({ ...p, experience: { ...p.experience, [key]: e.target.value } }))}
                        placeholder={placeholder} style={{ ...inputStyle, borderColor: 'rgba(139,92,246,0.2)' }}
                        onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.5)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(139,92,246,0.2)'} />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    {[{ key: 'startYear', label: 'Start Year', placeholder: '2018' }, { key: 'endYear', label: 'End Year', placeholder: 'Present' }].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>{label}</label>
                        <input value={formData.experience[key]} onChange={e => setFormData(p => ({ ...p, experience: { ...p.experience, [key]: e.target.value } }))}
                          placeholder={placeholder} style={{ ...inputStyle, borderColor: 'rgba(139,92,246,0.2)' }}
                          onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.5)'}
                          onBlur={e => e.target.style.borderColor = 'rgba(139,92,246,0.2)'} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>Description</label>
                    <textarea value={formData.experience.description} onChange={e => setFormData(p => ({ ...p, experience: { ...p.experience, description: e.target.value } }))}
                      maxLength={500} rows={3} placeholder="Briefly describe your role and responsibilities..."
                      style={{ ...inputStyle, resize: 'none', borderColor: 'rgba(139,92,246,0.2)' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(139,92,246,0.2)'} />
                    <p className="text-xs text-right mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>{formData.experience.description.length}/500</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { key: 'institution', label: 'School / College / University', placeholder: 'e.g., IIT Bombay, MIT, Delhi University' },
                    { key: 'degree', label: 'Degree / Class', placeholder: 'e.g., B.Tech, 12th Grade, B.Sc' },
                    { key: 'field', label: 'Field of Study / Stream', placeholder: 'e.g., Computer Science, PCM, Electronics' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>{label}</label>
                      <input value={formData.education[key]} onChange={e => setFormData(p => ({ ...p, education: { ...p.education, [key]: e.target.value } }))}
                        placeholder={placeholder} style={{ ...inputStyle, borderColor: 'rgba(52,211,153,0.2)' }}
                        onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,0.5)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(52,211,153,0.2)'} />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    {[{ key: 'startYear', label: 'Start Year', placeholder: '2021' }, { key: 'endYear', label: 'End Year', placeholder: '2025' }].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>{label}</label>
                        <input value={formData.education[key]} onChange={e => setFormData(p => ({ ...p, education: { ...p.education, [key]: e.target.value } }))}
                          placeholder={placeholder} style={{ ...inputStyle, borderColor: 'rgba(52,211,153,0.2)' }}
                          onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,0.5)'}
                          onBlur={e => e.target.style.borderColor = 'rgba(52,211,153,0.2)'} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>Description</label>
                    <textarea value={formData.education.description} onChange={e => setFormData(p => ({ ...p, education: { ...p.education, description: e.target.value } }))}
                      maxLength={500} rows={3} placeholder="Clubs, achievements, projects, activities..."
                      style={{ ...inputStyle, resize: 'none', borderColor: 'rgba(52,211,153,0.2)' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(52,211,153,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(52,211,153,0.2)'} />
                    <p className="text-xs text-right mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>{formData.education.description.length}/500</p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Private Contact Info */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
              style={{ ...glassCard, border: '1px solid rgba(251,191,36,0.15)' }} className="p-5 sm:p-6">
              <div className="h-0.5 -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-5 rounded-t-2xl" style={{ background: 'linear-gradient(90deg,transparent,#f59e0b,#fbbf24,transparent)' }} />
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: '#fcd34d', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  <Lock size={14} /> Private Contact Info
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fcd34d' }}>
                  Only you
                </span>
              </div>
              <p className="text-xs mb-4" style={{ color: 'rgba(148,163,184,0.5)' }}>This information is private and will never be shown to other users.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
                    <span className="flex items-center gap-1"><Phone size={12} /> Phone Number</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><Phone size={14} style={{ color: '#fbbf24' }} /></span>
                    <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} maxLength={20}
                      placeholder="+91 98765 43210" style={{ ...inputStyle, paddingLeft: '36px', borderColor: 'rgba(251,191,36,0.2)' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(251,191,36,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(251,191,36,0.2)'} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
                    <span className="flex items-center gap-1"><MapPin size={12} /> Full Address (Private)</span>
                  </label>
                  <textarea value={formData.privateAddress} onChange={e => setFormData(p => ({ ...p, privateAddress: e.target.value }))} maxLength={300} rows={3}
                    placeholder="Flat no., Street, City, State, PIN..." style={{ ...inputStyle, resize: 'none', borderColor: 'rgba(251,191,36,0.2)' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(251,191,36,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(251,191,36,0.2)'} />
                  <p className="text-xs text-right mt-1" style={{ color: 'rgba(148,163,184,0.4)' }}>{formData.privateAddress.length}/300</p>
                </div>
              </div>
            </motion.div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                {error}
              </motion.div>
            )}

            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-white font-semibold rounded-xl transition disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
              {saved ? <><Check size={18} /> Saved!</> : loading ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : <><Save size={18} /> Save Changes</>}
            </motion.button>
          </form>
        </div>
      </div>

      {/* Profile Photo Zoom */}
      <AnimatePresence>
        {zoomed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} onClick={() => setZoomed(false)}>
            <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} exit={{ scale: 0.7 }} className="relative w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <img src={preview} alt="Profile" className="w-full rounded-2xl shadow-2xl object-cover" style={{ boxShadow: '0 0 40px rgba(99,102,241,0.4)' }} />
              <button onClick={() => setZoomed(false)} className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-white"
                style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}><X size={16} /></button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Banner Zoom */}
      <AnimatePresence>
        {zoomedBanner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} onClick={() => setZoomedBanner(false)}>
            <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }} className="relative w-full max-w-2xl" onClick={e => e.stopPropagation()}>
              <img src={bannerPreview} alt="Banner" className="w-full rounded-2xl shadow-2xl object-cover" style={{ boxShadow: '0 0 40px rgba(99,102,241,0.4)', maxHeight: '60vh' }} />
              <button onClick={() => setZoomedBanner(false)} className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-white"
                style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}><X size={16} /></button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
