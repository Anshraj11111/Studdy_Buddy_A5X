import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { feedAPI, connectionAPI, followAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { uploadToCloudinary } from '../utils/cloudinary'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { getSocket } from '../services/socket'
import {
  Heart, MessageCircle, Trash2, Send, Users, UserPlus, UserCheck,
  UserX, Search, Loader2, Image, Video, X, Cpu, Wifi, BrainCircuit,
  Zap, FolderKanban, GraduationCap, Globe2, TrendingUp, BookOpen,
  Sparkles, ChevronDown, Bell, BellOff
} from 'lucide-react'

const CATEGORIES = [
  { label: 'All', icon: Globe2 },
  { label: 'Robotics', icon: Cpu },
  { label: 'IoT', icon: Wifi },
  { label: 'Embedded Systems', icon: Zap },
  { label: 'AI/ML', icon: BrainCircuit },
  { label: 'Projects', icon: FolderKanban },
  { label: 'Mentorship', icon: GraduationCap },
]

const CAT_COLOR = {
  Robotics: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  IoT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'Embedded Systems': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'AI/ML': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Projects: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  Mentorship: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  All: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

const CAT_GRADIENT = {
  Robotics: 'from-blue-500 to-cyan-500',
  IoT: 'from-emerald-500 to-teal-500',
  'Embedded Systems': 'from-amber-500 to-orange-500',
  'AI/ML': 'from-purple-500 to-violet-600',
  Projects: 'from-pink-500 to-rose-500',
  Mentorship: 'from-indigo-500 to-blue-600',
  All: 'from-indigo-500 to-purple-600',
}

function Avatar({ src, name, size = 9 }) {
  const palette = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500']
  const bg = palette[(name?.charCodeAt(0) || 0) % palette.length]
  const sz = `w-${size} h-${size}`
  if (src) return <img src={src} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-gray-800`} />
  return (
    <div className={`${sz} rounded-full ${bg} flex items-center justify-center flex-shrink-0 text-white font-bold text-sm ring-2 ring-white dark:ring-gray-800`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-semibold ${
      role === 'mentor'
        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    }`}>
      {role === 'mentor' ? '✦ Mentor' : '● Student'}
    </span>
  )
}

// ─── USER PROFILE MODAL (LinkedIn-style) ─────────────────────────────────────
function UserProfileModal({ userId, currentUserId, onClose }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    followAPI.getProfile(userId)
      .then(res => {
        setProfile(res.data.data)
        setFollowing(res.data.data.isFollowing || false)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const handleFollow = async () => {
    setFollowLoading(true)
    try {
      if (following) {
        await followAPI.unfollow(userId)
        setFollowing(false)
        setProfile(p => ({ ...p, followersCount: Math.max(0, (p.followersCount || 1) - 1) }))
      } else {
        await followAPI.follow(userId)
        setFollowing(true)
        setProfile(p => ({ ...p, followersCount: (p.followersCount || 0) + 1 }))
      }
    } catch {}
    finally { setFollowLoading(false) }
  }

  const u = profile?.user
  const isOwn = String(userId) === String(currentUserId)
  const hasEdu = u?.education?.institution
  const hasExp = u?.experience?.company
  const hasSocial = u?.socialLinks && Object.values(u.socialLinks).some(Boolean)

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          zIndex: 99998,
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 24 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: 0, left: 0,
          right: 0, bottom: 0,
          margin: 'auto',
          width: 'min(560px, calc(100vw - 24px))',
          height: 'fit-content',
          maxHeight: '90vh',
          zIndex: 99999,
          background: 'rgba(8,6,28,0.98)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '24px',
          boxShadow: '0 28px 80px rgba(0,0,0,0.9)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
        {/* Gradient top line */}
        <div style={{ height: 2, flexShrink: 0, background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, flexDirection: 'column', gap: 12 }}>
            <Loader2 size={30} className="animate-spin" style={{ color: '#818cf8' }} />
            <span style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.8rem' }}>Loading profile...</span>
          </div>
        ) : !u ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'rgba(148,163,184,0.6)' }}>Profile not found</div>
        ) : (
          /* Scrollable body */
          <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {/* Banner */}
            <div style={{
              height: 140, position: 'relative', flexShrink: 0,
              background: u.bannerImage
                ? `url(${u.bannerImage}) center/cover no-repeat`
                : 'linear-gradient(135deg,rgba(99,102,241,0.5),rgba(139,92,246,0.5))',
            }}>
              {!u.bannerImage && (
                <div style={{ position: 'absolute', inset: 0, opacity: 0.2, backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
              )}
              {/* Close button */}
              <button onClick={onClose}
                style={{ position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', flexShrink: 0 }}>
                <X size={16} color="white" />
              </button>
            </div>

            {/* Profile content */}
            <div style={{ padding: '0 22px 28px' }}>
              {/* Avatar — overlaps banner */}
              <div style={{
                marginTop: -46, marginBottom: 14,
                width: 92, height: 92, borderRadius: '50%', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                boxShadow: '0 0 28px rgba(99,102,241,0.55)',
                border: '4px solid rgba(8,6,28,0.98)',
                color: 'white', fontWeight: 700, fontSize: 28, flexShrink: 0,
              }}>
                {u.profileImage
                  ? <img src={u.profileImage} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : u.name?.[0]?.toUpperCase()}
              </div>

              {/* Name + info row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{u.name}</h2>
                  {u.headline && (
                    <p style={{ margin: '5px 0 0', fontSize: '0.88rem', color: 'rgba(148,163,184,0.85)', lineHeight: 1.4 }}>{u.headline}</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <RoleBadge role={u.role} />
                    {u.address && (
                      <span style={{ fontSize: '0.75rem', color: 'rgba(148,163,184,0.5)' }}>
                        📍 {u.address.split(',').slice(0, 2).join(',')}
                      </span>
                    )}
                  </div>
                </div>
                {/* Follower count */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>{profile?.followersCount ?? 0}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'rgba(148,163,184,0.5)' }}>followers</p>
                </div>
              </div>

              {/* Action buttons */}
              {!isOwn && (
                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={handleFollow} disabled={followLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '9px 22px', borderRadius: 22,
                      fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                      border: following ? '1px solid rgba(139,92,246,0.45)' : 'none',
                      background: following ? 'rgba(139,92,246,0.18)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      color: following ? '#c4b5fd' : 'white',
                      boxShadow: following ? 'none' : '0 2px 16px rgba(99,102,241,0.45)',
                      opacity: followLoading ? 0.7 : 1,
                    }}>
                    {followLoading ? <Loader2 size={14} className="animate-spin" /> : following ? <UserCheck size={14} /> : <UserPlus size={14} />}
                    {following ? 'Following' : '+ Follow'}
                  </motion.button>
                </div>
              )}

              {/* ── About ─────────────────────────────────────── */}
              {u.bio && (
                <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(99,102,241,0.12)' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(99,102,241,0.7)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>About</p>
                  <p style={{ margin: 0, fontSize: '0.87rem', lineHeight: 1.65, color: 'rgba(226,232,240,0.85)' }}>{u.bio}</p>
                </div>
              )}

              {/* ── Education ─────────────────────────────────── */}
              {hasEdu && (
                <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(99,102,241,0.12)' }}>
                  <p style={{ margin: '0 0 12px', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(52,211,153,0.7)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🎓 Education</p>
                  <div style={{ display: 'flex', gap: 13 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}>🎓</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: 'white' }}>{u.education.institution}</p>
                      {u.education.degree && <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'rgba(148,163,184,0.75)' }}>{u.education.degree}{u.education.field ? ` · ${u.education.field}` : ''}</p>}
                      {(u.education.startYear || u.education.endYear) && <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'rgba(148,163,184,0.5)' }}>{u.education.startYear}{u.education.startYear && u.education.endYear ? ' – ' : ''}{u.education.endYear}</p>}
                      {u.education.description && <p style={{ margin: '7px 0 0', fontSize: '0.78rem', lineHeight: 1.5, color: 'rgba(148,163,184,0.65)' }}>{u.education.description}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Experience ────────────────────────────────── */}
              {hasExp && (
                <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(99,102,241,0.12)' }}>
                  <p style={{ margin: '0 0 12px', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(196,181,253,0.7)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🏢 Experience</p>
                  <div style={{ display: 'flex', gap: 13 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}>🏢</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: 'white' }}>{u.experience.role || u.experience.company}</p>
                      {u.experience.role && <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'rgba(148,163,184,0.75)' }}>{u.experience.company}</p>}
                      {(u.experience.startYear || u.experience.endYear) && <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'rgba(148,163,184,0.5)' }}>{u.experience.startYear}{u.experience.startYear && u.experience.endYear ? ' – ' : ''}{u.experience.endYear || 'Present'}</p>}
                      {u.experience.description && <p style={{ margin: '7px 0 0', fontSize: '0.78rem', lineHeight: 1.5, color: 'rgba(148,163,184,0.65)' }}>{u.experience.description}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Skills ────────────────────────────────────── */}
              {u.skills?.length > 0 && (
                <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(99,102,241,0.12)' }}>
                  <p style={{ margin: '0 0 12px', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(99,102,241,0.7)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Skills</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {u.skills.map(s => (
                      <span key={s} style={{ fontSize: '0.78rem', padding: '4px 11px', borderRadius: 20, fontWeight: 600, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Social Links ──────────────────────────────── */}
              {hasSocial && (
                <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(99,102,241,0.12)' }}>
                  <p style={{ margin: '0 0 12px', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(99,102,241,0.7)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Links</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {u.socialLinks?.github && (
                      <a href={u.socialLinks.github} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600, background: 'rgba(226,232,240,0.08)', border: '1px solid rgba(226,232,240,0.15)', color: '#e2e8f0', textDecoration: 'none' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                        GitHub
                      </a>
                    )}
                    {u.socialLinks?.linkedin && (
                      <a href={u.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', color: '#60a5fa', textDecoration: 'none' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        LinkedIn
                      </a>
                    )}
                    {u.socialLinks?.instagram && (
                      <a href={u.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600, background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.2)', color: '#f472b6', textDecoration: 'none' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                        Instagram
                      </a>
                    )}
                    {u.socialLinks?.website && (
                      <a href={u.socialLinks.website} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399', textDecoration: 'none' }}>
                        🌐 Portfolio
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

// ─── POST COMPOSER ────────────────────────────────────────────────────────────
function PostComposer({ user, onPost }) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('All')
  const [media, setMedia] = useState(null)
  const [posting, setPosting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const textRef = useRef()

  const openFull = () => { setOpen(true); setTimeout(() => textRef.current?.focus(), 80) }

  const pickFile = (accept, type) => {
    fileRef.current.accept = accept
    fileRef.current._type = type
    fileRef.current.click()
  }

  const onFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const type = fileRef.current._type
    // Show local preview immediately
    const localUrl = URL.createObjectURL(file)
    setMedia({ dataUrl: localUrl, type, name: file.name, uploading: true })
    setUploading(true)
    try {
      const { url } = await uploadToCloudinary(file, 'studdy-buddy/posts')
      setMedia({ dataUrl: url, type, name: file.name, uploading: false })
    } catch {
      setMedia(null)
    } finally {
      setUploading(false)
    }
    e.target.value = ''
  }

  const submit = async () => {
    if (!content.trim() && !media) return
    setPosting(true)
    try {
      await onPost({ content, category, mediaUrl: media?.dataUrl || null, mediaType: media?.type || null })
      setContent(''); setCategory('All'); setMedia(null); setOpen(false)
    } finally { setPosting(false) }
  }

  return (
    <>
      <input ref={fileRef} type="file" className="hidden" onChange={onFileChange} />

      {/* Collapsed bar */}
      {!open && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(10,8,30,0.7)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center gap-3">
            <Avatar src={user?.profileImage} name={user?.name} size={10} />
            <button onClick={openFull}
              className="flex-1 text-left px-4 py-2.5 rounded-full text-sm transition"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', color: 'rgba(148,163,184,0.5)' }}>
              Share something with the community...
            </button>
          </div>
          <div className="flex items-center gap-1 mt-3 pt-3" style={{ borderTop: '1px solid rgba(99,102,241,0.15)' }}>
            <button onClick={() => { openFull(); setTimeout(() => pickFile('image/*', 'image'), 200) }}
              className="flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-xl transition hover:bg-white/5"
              style={{ color: '#60a5fa' }}>
              <Image size={15} /> Photo
            </button>
            <button onClick={() => { openFull(); setTimeout(() => pickFile('video/*', 'video'), 200) }}
              className="flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-xl transition hover:bg-white/5"
              style={{ color: '#34d399' }}>
              <Video size={15} /> Video
            </button>
            <button onClick={openFull}
              className="flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-xl transition hover:bg-white/5"
              style={{ color: '#fbbf24' }}>
              <BookOpen size={15} /> Article
            </button>
          </div>
        </div>
      )}

      {/* Expanded modal */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-20 z-50 rounded-3xl shadow-2xl max-w-lg mx-auto overflow-hidden max-h-[80vh] flex flex-col"
              style={{ background: 'rgba(10,8,30,0.95)', border: '1px solid rgba(99,102,241,0.3)', backdropFilter: 'blur(24px)' }}
            >
              <div className="h-0.5" style={{ background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                <div className="flex items-center gap-3">
                  <Avatar src={user?.profileImage} name={user?.name} size={10} />
                  <div>
                    <p className="font-bold text-sm text-white">{user?.name}</p>
                    <select value={category} onChange={e => setCategory(e.target.value)}
                      className="text-xs font-semibold cursor-pointer mt-0.5 focus:outline-none"
                      style={{ background: 'transparent', color: '#a5b4fc' }}>
                      {CATEGORIES.map(c => <option key={c.label} value={c.label} style={{ background: '#0a0820' }}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="p-2 rounded-full transition hover:bg-white/10">
                  <X size={18} style={{ color: 'rgba(148,163,184,0.7)' }} />
                </button>
              </div>

              <div className="px-5 py-4 flex-1 overflow-y-auto">
                <textarea ref={textRef} value={content} onChange={e => setContent(e.target.value)}
                  placeholder="What do you want to talk about?"
                  rows={5}
                  className="w-full bg-transparent text-sm text-white placeholder-gray-500 resize-none focus:outline-none leading-relaxed" />
                {media && (
                  <div className="relative mt-2 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.25)' }}>
                    {media.type === 'image'
                      ? <img src={media.dataUrl} alt="preview" className="w-full max-h-64 object-cover" />
                      : <video src={media.dataUrl} controls className="w-full max-h-64" />
                    }
                    <button onClick={() => setMedia(null)}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid rgba(99,102,241,0.15)', background: 'rgba(5,3,20,0.5)' }}>
                <div className="flex items-center gap-1">
                  <button onClick={() => pickFile('image/*', 'image')}
                    className="p-2 rounded-xl transition hover:bg-white/10" style={{ color: '#60a5fa' }} title="Add photo">
                    <Image size={18} />
                  </button>
                  <button onClick={() => pickFile('video/*', 'video')}
                    className="p-2 rounded-xl transition hover:bg-white/10" style={{ color: '#34d399' }} title="Add video">
                    <Video size={18} />
                  </button>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={submit} disabled={posting || uploading || (!content.trim() && !media)}
                  className="flex items-center gap-2 px-5 py-2 text-white text-sm font-semibold rounded-full transition disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 2px 12px rgba(99,102,241,0.4)' }}>
                  {posting || uploading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {posting ? 'Posting...' : uploading ? 'Uploading...' : 'Post'}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── SINGLE POST CARD ─────────────────────────────────────────────────────────
function PostCard({ post, user, onLike, onDelete, onComment, onFollow }) {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [copied, setCopied] = useState(false)
  const [viewProfileId, setViewProfileId] = useState(null)
  const shareRef = useRef(null)
  const isLiked = (post.likes || []).map(String).includes(String(user?._id))
  const isOwner = String(post.userId?._id) === String(user?._id)
  const grad = CAT_GRADIENT[post.category] || CAT_GRADIENT.All

  // Close share dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (shareRef.current && !shareRef.current.contains(e.target)) setShowShare(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleFollow = async () => {
    setFollowLoading(true)
    try {
      if (following) {
        await followAPI.unfollow(post.userId?._id)
        setFollowing(false)
      } else {
        await followAPI.follow(post.userId?._id)
        setFollowing(true)
      }
    } catch {}
    finally { setFollowLoading(false) }
  }

  const postUrl = `${window.location.origin}/community?post=${post._id}`
  const shareText = `${post.userId?.name} posted on Studdy Buddy: ${post.content?.slice(0, 100) || ''}...`

  const shareOptions = [
    {
      label: 'WhatsApp',
      color: '#25D366',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + postUrl)}`, '_blank'),
    },
    {
      label: 'Twitter / X',
      color: '#1DA1F2',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.254 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(postUrl)}`, '_blank'),
    },
    {
      label: 'Copy Link',
      color: '#a5b4fc',
      icon: copied
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
      action: () => {
        navigator.clipboard.writeText(postUrl)
        setCopied(true)
        setTimeout(() => { setCopied(false); setShowShare(false) }, 1800)
      },
    },
  ]

  const submitComment = async () => {
    if (!commentText.trim()) return
    setSubmitting(true)
    await onComment(post._id, commentText)
    setCommentText('')
    setSubmitting(false)
    setShowComments(true)
  }

  return (
    <>
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(10,8,30,0.7)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)' }}>
      <div className={`h-0.5 bg-gradient-to-r ${grad}`} />
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="cursor-pointer flex-shrink-0" onClick={() => setViewProfileId(post.userId?._id)}>
              <Avatar src={post.userId?.profileImage} name={post.userId?.name} size={10} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-white cursor-pointer hover:text-indigo-300 transition"
                  onClick={() => setViewProfileId(post.userId?._id)}>{post.userId?.name}</span>
                <RoleBadge role={post.userId?.role} />
                {/* Follow button — only for other users' posts */}
                {!isOwner && (
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={handleFollow} disabled={followLoading}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold transition disabled:opacity-50"
                    style={following
                      ? { background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', color: '#c4b5fd' }
                      : { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: '#a5b4fc' }}>
                    {followLoading
                      ? <Loader2 size={10} className="animate-spin" />
                      : following ? <UserCheck size={10} /> : <UserPlus size={10} />}
                    {following ? 'Following' : '+ Follow'}
                  </motion.button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>
                  {new Date(post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {post.category && post.category !== 'All' && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLOR[post.category]}`}>{post.category}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right side — delete (owner) + 3-dot share menu */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isOwner && (
              <button onClick={() => onDelete(post._id)}
                className="p-1.5 rounded-lg transition hover:bg-red-500/20"
                style={{ color: 'rgba(148,163,184,0.4)' }}>
                <Trash2 size={14} />
              </button>
            )}
            {/* 3-dot share menu */}
            <div className="relative" ref={shareRef}>
              <button onClick={() => setShowShare(v => !v)}
                className="p-1.5 rounded-lg transition hover:bg-white/10"
                style={{ color: 'rgba(148,163,184,0.5)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>
              <AnimatePresence>
                {showShare && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 rounded-2xl overflow-hidden z-30"
                    style={{ background: 'rgba(10,8,35,0.97)', border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', minWidth: '160px' }}>
                    <div className="px-3 pt-2.5 pb-1">
                      <p className="text-xs font-bold" style={{ color: 'rgba(148,163,184,0.5)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Share post</p>
                    </div>
                    {shareOptions.map(opt => (
                      <button key={opt.label} onClick={opt.action}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition"
                        style={{ color: opt.color }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ color: opt.color }}>{opt.icon}</span>
                        {opt.label === 'Copy Link' && copied ? 'Copied!' : opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {post.content && (
          <p className="text-sm text-white whitespace-pre-wrap leading-relaxed mb-3" style={{ color: 'rgba(226,232,240,0.9)' }}>{post.content}</p>
        )}

        {post.mediaUrl && (
          <div className="rounded-xl overflow-hidden mb-3" style={{ border: '1px solid rgba(99,102,241,0.2)' }}>
            {post.mediaType === 'image'
              ? <img src={post.mediaUrl} alt="post media" className="w-full max-h-96 object-cover" />
              : <video src={post.mediaUrl} controls className="w-full max-h-96" />}
          </div>
        )}

        {/* Stats */}
        {((post.likes?.length > 0) || (post.comments?.length > 0)) && (
          <div className="flex items-center justify-between text-xs pb-2 mb-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.15)', color: 'rgba(148,163,184,0.5)' }}>
            {post.likes?.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <Heart size={9} fill="white" className="text-white" />
                </span>
                {post.likes.length}
              </span>
            )}
            {post.comments?.length > 0 && (
              <button onClick={() => setShowComments(v => !v)} className="hover:underline ml-auto" style={{ color: 'rgba(148,163,184,0.6)' }}>
                {post.comments.length} comment{post.comments.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button onClick={() => onLike(post._id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-xl transition"
            style={{ background: isLiked ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)', color: isLiked ? '#f87171' : 'rgba(148,163,184,0.7)', border: `1px solid ${isLiked ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
            <Heart size={15} fill={isLiked ? 'currentColor' : 'none'} /> Like
          </button>
          <button onClick={() => setShowComments(v => !v)}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-xl transition"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(148,163,184,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <MessageCircle size={15} /> Comment
          </button>
        </div>

        {/* Comments */}
        <AnimatePresence>
          {showComments && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-3 space-y-3">
              {(post.comments || []).map(c => (
                <div key={c._id} className="flex gap-2.5 items-start">
                  <Avatar src={c.userId?.profileImage} name={c.userId?.name} size={8} />
                  <div className="rounded-2xl px-3 py-2 flex-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
                    <p className="text-xs font-bold text-white">{c.userId?.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.8)' }}>{c.content}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 items-center">
                <Avatar src={user?.profileImage} name={user?.name} size={8} />
                <div className="flex-1 flex items-center gap-2 rounded-full px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <input value={commentText} onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitComment()}
                    placeholder="Add a comment..."
                    className="flex-1 bg-transparent text-xs focus:outline-none text-white placeholder-gray-500" />
                  <button onClick={submitComment} disabled={submitting || !commentText.trim()}
                    style={{ color: '#818cf8' }} className="disabled:opacity-40 transition">
                    {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>

    {/* LinkedIn-style profile modal on author click */}
    <AnimatePresence>
      {viewProfileId && (
        <UserProfileModal
          userId={viewProfileId}
          currentUserId={user?._id}
          onClose={() => setViewProfileId(null)}
        />
      )}
    </AnimatePresence>
  </>
  )
}

// ─── FEED TAB ─────────────────────────────────────────────────────────────────
function FeedTab({ user }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [catOpen, setCatOpen] = useState(false)
  const catRef = useRef()

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchPosts = useCallback(async (cat, q) => {
    setLoading(true)
    try {
      const res = await feedAPI.getPosts(cat, 1, q)
      setPosts(res.data.data?.posts || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { 
    const timer = setTimeout(() => {
      fetchPosts('All', '')
    }, 200)
    return () => clearTimeout(timer)
  }, [fetchPosts])

  const handleSearch = () => {
    setActiveSearch(search)
    setFilterCat('All')
    fetchPosts('All', search)
  }

  const handleCatFilter = (cat) => {
    setFilterCat(cat)
    setActiveSearch('')
    setSearch('')
    fetchPosts(cat, '')
    setCatOpen(false)
  }

  const clearFilter = () => {
    setActiveSearch(''); setSearch(''); setFilterCat('All')
    fetchPosts('All', '')
  }

  const handlePost = async (data) => {
    const res = await feedAPI.createPost(data)
    setPosts(prev => [res.data.data.post, ...prev])
  }

  const handleLike = async (id) => {
    try {
      await feedAPI.likePost(id)
      setPosts(prev => prev.map(p => {
        if (p._id !== id) return p
        const liked = (p.likes || []).map(String).includes(String(user._id))
        return { ...p, likes: liked ? (p.likes || []).filter(l => String(l) !== String(user._id)) : [...(p.likes || []), user._id] }
      }))
    } catch { /* ignore */ }
  }

  const handleDelete = async (id) => {
    try { await feedAPI.deletePost(id); setPosts(prev => prev.filter(p => p._id !== id)) } catch { /* ignore */ }
  }

  const handleComment = async (postId, text) => {
    try {
      const res = await feedAPI.addComment(postId, { content: text })
      setPosts(prev => prev.map(p => p._id === postId ? res.data.data.post : p))
    } catch { /* ignore */ }
  }

  const activeCat = CATEGORIES.find(c => c.label === filterCat)

  return (
    <div className="space-y-4">
      {/* Search + Category bar */}
      <div className="rounded-2xl p-3 mb-4" style={{ background: 'rgba(10,8,30,0.7)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)' }}>
        <div className="flex gap-2">
          {/* Category dropdown */}
          <div className="relative" ref={catRef}>
            <button onClick={() => setCatOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-xl border transition-colors whitespace-nowrap"
              style={{
                background: filterCat !== 'All' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${filterCat !== 'All' ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: filterCat !== 'All' ? '#a5b4fc' : 'rgba(148,163,184,0.7)',
              }}>
              {activeCat && <activeCat.icon size={14} />}
              <span className="hidden sm:inline">{filterCat}</span>
              <ChevronDown size={13} className={`transition-transform ${catOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {catOpen && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="absolute left-0 top-full mt-1 z-30 rounded-2xl shadow-xl overflow-hidden min-w-[160px]"
                  style={{ background: 'rgba(10,8,30,0.95)', border: '1px solid rgba(99,102,241,0.25)', backdropFilter: 'blur(20px)' }}>
                  {CATEGORIES.map(({ label, icon: Icon }) => (
                    <button key={label} onClick={() => handleCatFilter(label)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition"
                      style={{ background: filterCat === label ? 'rgba(99,102,241,0.2)' : 'transparent', color: filterCat === label ? '#a5b4fc' : 'rgba(148,163,184,0.8)' }}>
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search input */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(148,163,184,0.5)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search posts..."
              className="w-full pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)' }} />
          </div>
          <button onClick={handleSearch}
            className="px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 2px 10px rgba(99,102,241,0.35)' }}>
            Search
          </button>
        </div>

        {/* Active filter chip */}
        {(activeSearch || filterCat !== 'All') && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>Showing:</span>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1"
              style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)', color: '#a5b4fc' }}>
              {activeSearch ? `"${activeSearch}"` : filterCat}
              <button onClick={clearFilter} className="ml-0.5 hover:opacity-70"><X size={11} /></button>
            </span>
          </div>
        )}
      </div>

      {/* Composer */}
      <PostComposer user={user} onPost={handlePost} />

      {/* Posts */}
      {loading ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <Loader2 size={30} style={{ color: '#818cf8' }} />
          </motion.div>
          <p className="text-sm" style={{ color: 'rgba(148,163,184,0.6)', fontFamily: 'monospace' }}>Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(10,8,30,0.7)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Sparkles size={28} style={{ color: 'rgba(99,102,241,0.6)' }} />
          </div>
          <p className="font-bold text-white mb-1">
            {activeSearch ? `No posts found for "${activeSearch}"` : filterCat !== 'All' ? `No posts in ${filterCat} yet` : 'No posts yet'}
          </p>
          <p className="text-sm" style={{ color: 'rgba(148,163,184,0.6)' }}>
            {activeSearch ? 'Try a different keyword or browse all posts' : 'Be the first to share something!'}
          </p>
          {(activeSearch || filterCat !== 'All') && (
            <button onClick={clearFilter}
              className="mt-4 px-4 py-2 text-white text-sm font-medium rounded-xl transition"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 2px 10px rgba(99,102,241,0.35)' }}>
              Browse all posts
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => (
            <motion.div key={post._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}>
              <PostCard post={post} user={user} onLike={handleLike} onDelete={handleDelete} onComment={handleComment} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── CONNECTIONS TAB ──────────────────────────────────────────────────────────
function ConnectionsTab({ user }) {
  const [subTab, setSubTab] = useState('discover')
  const [discoverUsers, setDiscoverUsers] = useState([])
  const [search, setSearch] = useState('')
  const [pending, setPending] = useState([])
  const [myConns, setMyConns] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  const fetchDiscover = useCallback(async (q = '') => {
    setLoading(true)
    try {
      const [usersRes, followingRes] = await Promise.all([
        connectionAPI.getUsers(q),
        followAPI.getFollowing(user._id),
      ])
      const users = usersRes.data.data?.users || []
      const followingIds = new Set((followingRes.data.data?.following || []).map(f => String(f._id)))
      setDiscoverUsers(users.map(u => ({ ...u, isFollowing: followingIds.has(String(u._id)) })))
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [user._id])

  const fetchPending = useCallback(async () => {
    setLoading(true)
    try { const res = await connectionAPI.getPending(); setPending(res.data.data?.connections || []) }
    catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  const fetchMyConns = useCallback(async () => {
    setLoading(true)
    try {
      const [connsRes, followingRes] = await Promise.all([
        connectionAPI.getMyConnections(),
        followAPI.getFollowing(user._id),
      ])
      const conns = connsRes.data.data?.connections || []
      const followingIds = new Set((followingRes.data.data?.following || []).map(f => String(f._id)))
      setMyConns(conns.map(c => ({ ...c, isFollowing: followingIds.has(String(c.user?._id)) })))
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [user._id])

  useEffect(() => {
    if (subTab === 'discover') fetchDiscover('')
    else if (subTab === 'pending') fetchPending()
    else fetchMyConns()
  }, [subTab])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const handleConnectionRequest = () => { if (subTab === 'pending') fetchPending() }
    socket.on('connectionRequest', handleConnectionRequest)
    return () => socket.off('connectionRequest', handleConnectionRequest)
  }, [subTab])

  const act = async (key, fn) => {
    setActionLoading(p => ({ ...p, [key]: true }))
    try { await fn() } catch { /* ignore */ }
    finally { setActionLoading(p => ({ ...p, [key]: false })) }
  }

  const sendReq = (uid) => act(uid + '_conn', async () => {
    await connectionAPI.sendRequest(uid)
    setDiscoverUsers(p => p.map(u => u._id === uid ? { ...u, connectionStatus: 'pending', iRequested: true } : u))
  })
  const toggleFollow = (uid, isFollowing) => act(uid + '_follow', async () => {
    if (isFollowing) {
      await followAPI.unfollow(uid)
      setDiscoverUsers(p => p.map(u => u._id === uid ? { ...u, isFollowing: false } : u))
      setMyConns(p => p.map(c => String(c.user?._id) === uid ? { ...c, isFollowing: false } : c))
    } else {
      await followAPI.follow(uid)
      setDiscoverUsers(p => p.map(u => u._id === uid ? { ...u, isFollowing: true } : u))
      setMyConns(p => p.map(c => String(c.user?._id) === uid ? { ...c, isFollowing: true } : c))
    }
  })
  const accept = (id, requesterId) => act(id, async () => {
    await connectionAPI.accept(id)
    setPending(p => p.filter(c => c._id !== id))
    setDiscoverUsers(p => p.map(u => String(u._id) === String(requesterId)
      ? { ...u, connectionStatus: 'accepted', isFollowing: true } : u))
  })
  const reject = (id) => act(id, async () => { await connectionAPI.reject(id); setPending(p => p.filter(c => c._id !== id)) })
  const remove = (id) => act(id, async () => { await connectionAPI.remove(id); setMyConns(p => p.filter(c => c.connectionId !== id)) })

  // ── Reusable User Card ──────────────────────────────────────────────────────
  const UserCard = ({ u, connId, isConn, showRemove }) => {
    const uid = String(u._id || u.user?._id || '')
    const name = u.name || u.user?.name
    const role = u.role || u.user?.role
    const skills = u.skills || u.user?.skills || []
    const profileImage = u.profileImage || u.user?.profileImage
    const isFollowing = !!u.isFollowing
    const connStatus = u.connectionStatus
    const iReq = u.iRequested
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(10,8,30,0.7)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)' }}>
        <div className="h-0.5" style={{ background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar src={profileImage} name={name} size={12} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-white truncate">{name}</p>
              <RoleBadge role={role} />
            </div>
          </div>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {skills.slice(0, 3).map(s => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>{s}</span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            {/* Connect / status */}
            {!isConn && !showRemove && (
              !connStatus ? (
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => sendReq(uid)} disabled={!!actionLoading[uid + '_conn']}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white py-2 rounded-xl disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}>
                  {actionLoading[uid + '_conn'] ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />} Connect
                </motion.button>
              ) : connStatus === 'pending' && iReq ? (
                <div className="flex-1 text-center text-xs py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(148,163,184,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>Pending</div>
              ) : connStatus === 'accepted' ? (
                <div className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-semibold"
                  style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                  <UserCheck size={12} /> Connected
                </div>
              ) : null
            )}
            {/* Remove (connected tab) */}
            {showRemove && (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => remove(connId)} disabled={!!actionLoading[connId]}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                {actionLoading[connId] ? <Loader2 size={12} className="animate-spin" /> : <UserX size={12} />} Remove
              </motion.button>
            )}
            {/* Follow / Unfollow */}
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => toggleFollow(uid, isFollowing)} disabled={!!actionLoading[uid + '_follow']}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl disabled:opacity-50"
              style={isFollowing
                ? { background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)' }
                : { background: 'rgba(139,92,246,0.08)', color: 'rgba(196,181,253,0.7)', border: '1px solid rgba(139,92,246,0.2)' }}>
              {actionLoading[uid + '_follow']
                ? <Loader2 size={12} className="animate-spin" />
                : isFollowing ? <BellOff size={12} /> : <Bell size={12} />}
              {isFollowing ? 'Following' : 'Follow'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-2xl"
        style={{ background: 'rgba(10,8,30,0.6)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)' }}>
        {[
          { key: 'discover', label: 'Discover', icon: Search },
          { key: 'pending', label: `Pending${pending.length ? ` (${pending.length})` : ''}`, icon: UserPlus },
          { key: 'connections', label: 'Connected', icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setSubTab(key)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold py-2.5 rounded-xl transition-all"
            style={{
              background: subTab === key ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
              color: subTab === key ? 'white' : 'rgba(148,163,184,0.7)',
              boxShadow: subTab === key ? '0 2px 10px rgba(99,102,241,0.35)' : 'none',
            }}>
            <Icon size={14} /><span>{label}</span>
          </button>
        ))}
      </div>

      {subTab === 'discover' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(148,163,184,0.5)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchDiscover(search)}
                placeholder="Search by name, skill, or role..."
                className="w-full pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)' }} />
            </div>
            <button onClick={() => fetchDiscover(search)}
              className="px-4 py-2.5 text-white text-sm font-semibold rounded-xl"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 2px 10px rgba(99,102,241,0.35)' }}>
              Search
            </button>
          </div>
          {loading
            ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={26} style={{ color: '#818cf8' }} /></div>
            : discoverUsers.length === 0
              ? <div className="text-center py-12 text-sm" style={{ color: 'rgba(148,163,184,0.5)' }}>No users found</div>
              : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {discoverUsers.map(u => <UserCard key={u._id} u={u} />)}
                </div>}
        </div>
      )}

      {subTab === 'pending' && (
        <div className="space-y-3">
          {loading
            ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={26} style={{ color: '#818cf8' }} /></div>
            : pending.length === 0
              ? <div className="flex flex-col items-center py-16 gap-3" style={{ color: 'rgba(148,163,184,0.5)' }}>
                  <UserPlus size={36} className="opacity-30" /><p className="text-sm">No pending requests</p>
                </div>
              : pending.map(c => (
                  <motion.div key={c._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl overflow-hidden"
                    style={{ background: 'rgba(10,8,30,0.7)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)' }}>
                    <div className="h-0.5" style={{ background: 'linear-gradient(90deg,transparent,#fbbf24,transparent)' }} />
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar src={c.requester?.profileImage} name={c.requester?.name} size={12} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-white truncate">{c.requester?.name}</p>
                          <RoleBadge role={c.requester?.role} />
                        </div>
                      </div>
                      {c.requester?.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {c.requester.skills.slice(0, 3).map(s => (
                            <span key={s} className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>{s}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={() => accept(c._id, c.requester?._id)} disabled={!!actionLoading[c._id]}
                          className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-white py-2 rounded-xl disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: '0 2px 8px rgba(5,150,105,0.35)' }}>
                          {actionLoading[c._id] ? <Loader2 size={11} className="animate-spin" /> : <UserCheck size={11} />} Accept & Follow
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={() => reject(c._id)} disabled={!!actionLoading[c._id]}
                          className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-2 rounded-xl disabled:opacity-50"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                          <UserX size={11} /> Decline
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))
          }
        </div>
      )}

      {subTab === 'connections' && (
        <div className="space-y-3">
          {loading
            ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={26} style={{ color: '#818cf8' }} /></div>
            : myConns.length === 0
              ? <div className="flex flex-col items-center py-16 gap-3" style={{ color: 'rgba(148,163,184,0.5)' }}>
                  <Users size={36} className="opacity-30" />
                  <p className="text-sm font-medium">No connections yet</p>
                  <p className="text-xs">Start discovering people!</p>
                </div>
              : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {myConns.map(c => (
                    <UserCard key={c.connectionId} u={{ ...c.user, isFollowing: c.isFollowing }}
                      connId={c.connectionId} isConn showRemove />
                  ))}
                </div>
          }
        </div>
      )}
    </div>
  )
}

// ─── LEFT SIDEBAR ─────────────────────────────────────────────────────────────
function ProfileSidebar({ user }) {
  const [expanded, setExpanded] = useState(false)

  const hasEducation = user?.education?.institution
  const hasExperience = user?.experience?.company
  const hasSocialLinks = user?.socialLinks && Object.values(user.socialLinks).some(v => v)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(10,8,30,0.7)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)' }}>
        {/* Banner */}
        <div className="h-20 relative overflow-hidden"
          style={{
            background: user?.bannerImage
              ? `url(${user.bannerImage}) center/cover no-repeat`
              : 'linear-gradient(135deg,rgba(99,102,241,0.5),rgba(139,92,246,0.5))',
          }}>
          {!user?.bannerImage && (
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          )}
        </div>

        <div className="px-4 pb-4">
          {/* Avatar */}
          <div className="-mt-8 mb-2 w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xl flex-shrink-0 relative"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 20px rgba(99,102,241,0.5)', border: '3px solid rgba(10,8,30,0.95)' }}>
            {user?.profileImage
              ? <img src={user.profileImage} alt={user?.name} className="w-full h-full object-cover" />
              : user?.name?.[0]?.toUpperCase() || '?'}
          </div>

          {/* Name + Headline */}
          <p className="font-bold text-white text-sm leading-tight">{user?.name}</p>
          {user?.headline && (
            <p className="text-xs mt-0.5 leading-snug" style={{ color: 'rgba(148,163,184,0.7)' }}>{user.headline}</p>
          )}
          <div className="mt-1.5"><RoleBadge role={user?.role} /></div>

          {/* Location */}
          {user?.address && (
            <p className="flex items-center gap-1 text-xs mt-1.5" style={{ color: 'rgba(148,163,184,0.5)' }}>
              📍 <span className="truncate">{user.address.split(',').slice(0, 2).join(',')}</span>
            </p>
          )}

          {/* Bio preview */}
          {user?.bio && (
            <p className="text-xs mt-2 leading-relaxed line-clamp-2" style={{ color: 'rgba(148,163,184,0.65)' }}>{user.bio}</p>
          )}

          {/* Skills preview */}
          {user?.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {user.skills.slice(0, 3).map(s => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>{s}</span>
              ))}
              {user.skills.length > 3 && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: 'rgba(165,180,252,0.6)' }}>
                  +{user.skills.length - 3}
                </span>
              )}
            </div>
          )}

          {/* View Full Profile toggle button */}
          <button onClick={() => setExpanded(v => !v)}
            className="mt-3 w-full py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
            style={{ background: expanded ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
            {expanded ? '▲ Show Less' : '▼ View Full Profile'}
          </button>
        </div>

        {/* ── Inline expanded section ─────────────────────────── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}>
              <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid rgba(99,102,241,0.12)' }}>

                {/* Full bio */}
                {user?.bio && (
                  <div className="pt-3">
                    <p className="text-xs font-bold mb-1.5" style={{ color: 'rgba(99,102,241,0.7)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>About</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(226,232,240,0.8)' }}>{user.bio}</p>
                  </div>
                )}

                {/* Education */}
                {hasEducation && (
                  <div>
                    <p className="text-xs font-bold mb-2" style={{ color: 'rgba(52,211,153,0.7)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🎓 Education</p>
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                        style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>🎓</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-white">{user.education.institution}</p>
                        {user.education.degree && <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>{user.education.degree}{user.education.field ? ` · ${user.education.field}` : ''}</p>}
                        {(user.education.startYear || user.education.endYear) && (
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>
                            {user.education.startYear}{user.education.startYear && user.education.endYear ? ' – ' : ''}{user.education.endYear}
                          </p>
                        )}
                        {user.education.description && (
                          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'rgba(148,163,184,0.6)' }}>{user.education.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Experience */}
                {hasExperience && (
                  <div>
                    <p className="text-xs font-bold mb-2" style={{ color: 'rgba(196,181,253,0.7)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🏢 Experience</p>
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                        style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>🏢</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-white">{user.experience.role || user.experience.company}</p>
                        {user.experience.role && <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>{user.experience.company}</p>}
                        {(user.experience.startYear || user.experience.endYear) && (
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>
                            {user.experience.startYear}{user.experience.startYear && user.experience.endYear ? ' – ' : ''}{user.experience.endYear || 'Present'}
                          </p>
                        )}
                        {user.experience.description && (
                          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'rgba(148,163,184,0.6)' }}>{user.experience.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* All Skills */}
                {user?.skills?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold mb-2" style={{ color: 'rgba(99,102,241,0.7)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {user.skills.map(s => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Links */}
                {hasSocialLinks && (
                  <div>
                    <p className="text-xs font-bold mb-2" style={{ color: 'rgba(99,102,241,0.7)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Links</p>
                    <div className="flex flex-wrap gap-1.5">
                      {user.socialLinks?.github && (
                        <a href={user.socialLinks.github} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition hover:scale-105"
                          style={{ background: 'rgba(226,232,240,0.08)', border: '1px solid rgba(226,232,240,0.15)', color: '#e2e8f0', textDecoration: 'none' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                          GitHub
                        </a>
                      )}
                      {user.socialLinks?.linkedin && (
                        <a href={user.socialLinks.linkedin} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition hover:scale-105"
                          style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', color: '#60a5fa', textDecoration: 'none' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                          LinkedIn
                        </a>
                      )}
                      {user.socialLinks?.instagram && (
                        <a href={user.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition hover:scale-105"
                          style={{ background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.2)', color: '#f472b6', textDecoration: 'none' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                          Instagram
                        </a>
                      )}
                      {user.socialLinks?.website && (
                        <a href={user.socialLinks.website} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition hover:scale-105"
                          style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399', textDecoration: 'none' }}>
                          🌐 Portfolio
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Topics */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(10,8,30,0.7)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)' }}>
        <p className="text-xs font-bold mb-3" style={{ color: 'rgba(99,102,241,0.7)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Topics</p>
        <div className="space-y-0.5">
          {CATEGORIES.filter(c => c.label !== 'All').map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2.5 py-2 px-2 rounded-xl transition-colors cursor-default hover:bg-white/5">
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${CAT_GRADIENT[label]} flex items-center justify-center flex-shrink-0`}>
                <Icon size={13} className="text-white" />
              </div>
              <span className="text-sm font-medium" style={{ color: 'rgba(148,163,184,0.8)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── RIGHT SIDEBAR ────────────────────────────────────────────────────────────
function TrendingSidebar() {
  const tips = [
    { icon: '🤖', title: 'Robotics Basics', desc: 'Start with servo motors and Arduino' },
    { icon: '📡', title: 'IoT with ESP32', desc: 'Connect sensors to the cloud easily' },
    { icon: '🧠', title: 'ML on Edge', desc: 'Run TensorFlow Lite on microcontrollers' },
    { icon: '⚡', title: 'RTOS Fundamentals', desc: 'FreeRTOS task scheduling explained' },
    { icon: '🔌', title: 'Embedded C Tips', desc: 'Memory-efficient coding patterns' },
  ]
  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-4" style={{ background: 'rgba(10,8,30,0.7)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
            <TrendingUp size={14} className="text-white" />
          </div>
          <p className="text-sm font-bold text-white">Trending Topics</p>
        </div>
        <div className="space-y-2">
          {tips.map((t, i) => (
            <div key={i} className="flex items-start gap-3 p-2 rounded-xl transition-colors cursor-default hover:bg-white/5">
              <span className="text-lg leading-none mt-0.5">{t.icon}</span>
              <div>
                <p className="text-sm font-semibold text-white">{t.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.3))', border: '1px solid rgba(99,102,241,0.3)', backdropFilter: 'blur(20px)' }}>
        <p className="font-bold text-sm mb-1">🚀 Share your project!</p>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>Post your robotics or IoT project and get feedback from the community.</p>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Communities() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState('feed')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen" style={{ position: 'relative' }}>
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(/src/assets/image.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(5,3,20,0.80)' }} />

      <div style={{ position: 'relative', zIndex: 60 }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 lg:ml-[240px] mt-16" style={{ position: 'relative', zIndex: 5 }}>
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5 pb-20">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-5">
            <motion.div animate={{ boxShadow: ['0 0 0px rgba(99,102,241,0)', '0 0 24px rgba(99,102,241,0.5)', '0 0 0px rgba(99,102,241,0)'] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.25))', border: '1px solid rgba(99,102,241,0.4)' }}>
              <Users size={22} style={{ color: '#818cf8' }} />
            </motion.div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold"
                style={{ background: 'linear-gradient(135deg,#a5b4fc,#818cf8,#c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Community
              </h1>
              <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.75rem', fontFamily: 'monospace' }}>Connect, share, and learn with fellow tech enthusiasts</p>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-2xl mb-5 overflow-x-auto"
            style={{ background: 'rgba(10,8,30,0.6)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)' }}>
            {[
              { key: 'feed', label: 'Feed', icon: MessageCircle },
              { key: 'connections', label: 'Network', icon: Users },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all whitespace-nowrap flex-1"
                style={{
                  background: tab === key ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
                  color: tab === key ? 'white' : 'rgba(148,163,184,0.7)',
                  boxShadow: tab === key ? '0 2px 12px rgba(99,102,241,0.35)' : 'none',
                }}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {tab === 'feed' ? (
                <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_200px] gap-4">
                  <div className="hidden lg:block">
                    <div className="sticky top-20"><ProfileSidebar user={user} /></div>
                  </div>
                  <div className="min-w-0"><FeedTab user={user} /></div>
                  <div className="hidden lg:block">
                    <div className="sticky top-20"><TrendingSidebar /></div>
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto">
                  <ConnectionsTab user={user} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
