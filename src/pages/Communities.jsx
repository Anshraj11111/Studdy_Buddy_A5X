import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { feedAPI, connectionAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { uploadToCloudinary } from '../utils/cloudinary'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { getSocket } from '../services/socket'
import {
  Heart, MessageCircle, Trash2, Send, Users, UserPlus, UserCheck,
  UserX, Search, Loader2, Image, Video, X, Cpu, Wifi, BrainCircuit,
  Zap, FolderKanban, GraduationCap, Globe2, TrendingUp, BookOpen,
  Sparkles, ChevronDown
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
function PostCard({ post, user, onLike, onDelete, onComment }) {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isLiked = (post.likes || []).map(String).includes(String(user?._id))
  const isOwner = String(post.userId?._id) === String(user?._id)
  const grad = CAT_GRADIENT[post.category] || CAT_GRADIENT.All

  const submitComment = async () => {
    if (!commentText.trim()) return
    setSubmitting(true)
    await onComment(post._id, commentText)
    setCommentText('')
    setSubmitting(false)
    setShowComments(true)
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(10,8,30,0.7)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)' }}>
      <div className={`h-0.5 bg-gradient-to-r ${grad}`} />
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar src={post.userId?.profileImage} name={post.userId?.name} size={10} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-white">{post.userId?.name}</span>
                <RoleBadge role={post.userId?.role} />
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
          {isOwner && (
            <button onClick={() => onDelete(post._id)}
              className="p-1.5 rounded-lg transition flex-shrink-0 hover:bg-red-500/20"
              style={{ color: 'rgba(148,163,184,0.4)' }}>
              <Trash2 size={14} />
            </button>
          )}
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
    try { const res = await connectionAPI.getUsers(q); setDiscoverUsers(res.data.data?.users || []) }
    catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  const fetchPending = useCallback(async () => {
    setLoading(true)
    try { const res = await connectionAPI.getPending(); setPending(res.data.data?.connections || []) }
    catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  const fetchMyConns = useCallback(async () => {
    setLoading(true)
    try { const res = await connectionAPI.getMyConnections(); setMyConns(res.data.data?.connections || []) }
    catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (subTab === 'discover') fetchDiscover('')
    else if (subTab === 'pending') fetchPending()
    else fetchMyConns()
  }, [subTab])

  // Listen for real-time connection requests
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const handleConnectionRequest = () => {
      // If on pending tab, refresh it
      if (subTab === 'pending') fetchPending()
    }
    socket.on('connectionRequest', handleConnectionRequest)
    return () => socket.off('connectionRequest', handleConnectionRequest)
  }, [subTab])

  const act = async (key, fn) => {
    setActionLoading(p => ({ ...p, [key]: true }))
    try { await fn() } catch { /* ignore */ }
    finally { setActionLoading(p => ({ ...p, [key]: false })) }
  }

  const sendReq = (uid) => act(uid, async () => {
    await connectionAPI.sendRequest(uid)
    setDiscoverUsers(p => p.map(u => u._id === uid ? { ...u, connectionStatus: 'pending', iRequested: true } : u))
  })
  const accept = (id) => act(id, async () => { await connectionAPI.accept(id); setPending(p => p.filter(c => c._id !== id)) })
  const reject = (id) => act(id, async () => { await connectionAPI.reject(id); setPending(p => p.filter(c => c._id !== id)) })
  const remove = (id) => act(id, async () => { await connectionAPI.remove(id); setMyConns(p => p.filter(c => c.connectionId !== id)) })

  const UserCard = ({ u, actions }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 hover:border-indigo-500/30 transition-all"
      style={{ background: 'rgba(10,8,30,0.7)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)' }}>
      <div className="flex items-center gap-3 mb-3">
        <Avatar src={u.profileImage || u.user?.profileImage} name={u.name || u.user?.name} size={12} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white truncate">{u.name || u.user?.name}</p>
          <RoleBadge role={u.role || u.user?.role} />
        </div>
      </div>
      {(u.skills || u.user?.skills)?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {(u.skills || u.user?.skills).slice(0, 3).map(s => (
            <span key={s} className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
              {s}
            </span>
          ))}
        </div>
      )}
      {actions}
    </motion.div>
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(10,8,30,0.6)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)' }}>
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
              className="px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 2px 10px rgba(99,102,241,0.35)' }}>
              Search
            </button>
          </div>
          {loading
            ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={26} style={{ color: '#818cf8' }} /></div>
            : discoverUsers.length === 0
              ? <div className="text-center py-12 text-sm" style={{ color: 'rgba(148,163,184,0.5)' }}>No users found</div>
              : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {discoverUsers.map(u => (
                    <UserCard key={u._id} u={u} actions={
                      !u.connectionStatus ? (
                        <button onClick={() => sendReq(u._id)} disabled={actionLoading[u._id]}
                          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white py-2 rounded-xl transition disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}>
                          {actionLoading[u._id] ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />} Connect
                        </button>
                      ) : u.connectionStatus === 'pending' && u.iRequested ? (
                        <div className="w-full text-center text-xs py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(148,163,184,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>Request Sent</div>
                      ) : u.connectionStatus === 'pending' ? (
                        <div className="w-full text-center text-xs py-2 rounded-xl font-medium" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>Incoming Request</div>
                      ) : (
                        <div className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-semibold" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                          <UserCheck size={12} /> Connected
                        </div>
                      )
                    } />
                  ))}
                </div>
          }
        </div>
      )}

      {subTab === 'pending' && (
        <div className="space-y-3">
          {loading
            ? <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={26} style={{ color: '#818cf8' }} /></div>
            : pending.length === 0
              ? <div className="flex flex-col items-center py-16 gap-3" style={{ color: 'rgba(148,163,184,0.5)' }}><UserPlus size={36} className="opacity-30" /><p className="text-sm">No pending requests</p></div>
              : pending.map(c => (
                  <UserCard key={c._id} u={c.requester} actions={
                    <div className="flex gap-2">
                      <button onClick={() => accept(c._id)} disabled={actionLoading[c._id]}
                        className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-white py-2 rounded-xl transition disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: '0 2px 8px rgba(5,150,105,0.35)' }}>
                        {actionLoading[c._id] ? <Loader2 size={11} className="animate-spin" /> : <UserCheck size={11} />} Accept
                      </button>
                      <button onClick={() => reject(c._id)} disabled={actionLoading[c._id]}
                        className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-2 rounded-xl transition disabled:opacity-50"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                        <UserX size={11} /> Decline
                      </button>
                    </div>
                  } />
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
                    <UserCard key={c.connectionId} u={c.user} actions={
                      <button onClick={() => remove(c.connectionId)} disabled={actionLoading[c.connectionId]}
                        className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl transition disabled:opacity-50"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                        {actionLoading[c.connectionId] ? <Loader2 size={12} className="animate-spin" /> : <UserX size={12} />} Remove
                      </button>
                    } />
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
  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(10,8,30,0.7)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(20px)' }}>
        <div className="h-16 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.4),rgba(139,92,246,0.4))' }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        </div>
        <div className="px-4 pb-4">
          <div className="-mt-7 mb-2 w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-lg flex-shrink-0 relative z-10"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 16px rgba(99,102,241,0.4)', border: '3px solid rgba(10,8,30,0.9)' }}>
            {user?.profileImage
              ? <img src={user.profileImage} alt={user?.name} className="w-full h-full object-cover" />
              : user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <p className="font-bold text-white text-sm">{user?.name}</p>
          <div className="mt-1"><RoleBadge role={user?.role} /></div>
          {user?.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {user.skills.map(s => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

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
