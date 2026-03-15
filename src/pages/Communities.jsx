import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { feedAPI, connectionAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import {
  Heart, MessageCircle, Trash2, Send, Users, UserPlus, UserCheck,
  UserX, Search, ChevronDown, ChevronUp, Loader2, Image, Video,
  X, Cpu, Wifi, BrainCircuit, Zap, FolderKanban, GraduationCap,
  Globe2, TrendingUp, BookOpen, Sparkles
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
  'Embedded Systems': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-700',
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
  All: 'from-gray-500 to-gray-600',
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
      role === 'mentor' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    }`}>
      {role === 'mentor' ? '✦ Mentor' : '● Student'}
    </span>
  )
}

// ─── POST COMPOSER (LinkedIn style) ──────────────────────────────────────────
function PostComposer({ user, onPost }) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('All')
  const [media, setMedia] = useState(null)       // { dataUrl, type: 'image'|'video', name }
  const [posting, setPosting] = useState(false)
  const fileRef = useRef()
  const textRef = useRef()

  const openFull = () => { setOpen(true); setTimeout(() => textRef.current?.focus(), 80) }

  const pickFile = (accept, type) => {
    fileRef.current.accept = accept
    fileRef.current._type = type
    fileRef.current.click()
  }

  const onFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (fileRef.current._type === 'image') {
      // Compress image before storing — resize to max 1024px, quality 0.75
      const img = new window.Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        const MAX = 1024
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX }
          else { width = Math.round(width * MAX / height); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
        setMedia({ dataUrl, type: 'image', name: file.name })
      }
      img.src = objectUrl
    } else {
      // Video — just read as-is (no compression possible in browser)
      const reader = new FileReader()
      reader.onload = ev => setMedia({ dataUrl: ev.target.result, type: 'video', name: file.name })
      reader.readAsDataURL(file)
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Avatar src={user?.profileImage} name={user?.name} size={10} />
            <button
              onClick={openFull}
              className="flex-1 text-left px-4 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-400 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Start a post...
            </button>
          </div>
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button onClick={() => { openFull(); setTimeout(() => pickFile('image/*', 'image'), 200) }}
              className="flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors">
              <Image size={16} className="text-blue-500" /> Photo
            </button>
            <button onClick={() => { openFull(); setTimeout(() => pickFile('video/*', 'video'), 200) }}
              className="flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors">
              <Video size={16} className="text-green-500" /> Video
            </button>
            <button onClick={openFull}
              className="flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-colors">
              <BookOpen size={16} className="text-amber-500" /> Article
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
              className="fixed inset-x-4 top-16 z-50 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-lg mx-auto overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Avatar src={user?.profileImage} name={user?.name} size={10} />
                  <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{user?.name}</p>
                    <select value={category} onChange={e => setCategory(e.target.value)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 bg-transparent focus:outline-none font-semibold cursor-pointer mt-0.5">
                      {CATEGORIES.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              {/* Textarea */}
              <div className="px-5 py-4 flex-1 overflow-y-auto">
                <textarea ref={textRef} value={content} onChange={e => setContent(e.target.value)}
                  placeholder="What do you want to talk about?"
                  rows={5}
                  className="w-full bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none leading-relaxed"
                />

                {/* Media preview */}
                {media && (
                  <div className="relative mt-2 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    {media.type === 'image'
                      ? <img src={media.dataUrl} alt="preview" className="w-full max-h-64 object-cover" />
                      : <video src={media.dataUrl} controls className="w-full max-h-64" />
                    }
                    <button onClick={() => setMedia(null)}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-1">
                  <button onClick={() => pickFile('image/*', 'image')}
                    className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors" title="Add photo">
                    <Image size={18} />
                  </button>
                  <button onClick={() => pickFile('video/*', 'video')}
                    className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors" title="Add video">
                    <Video size={18} />
                  </button>
                </div>
                <button onClick={submit} disabled={posting || (!content.trim() && !media)}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-full transition-colors shadow-md">
                  {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Post
                </button>
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
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Category accent */}
      <div className={`h-1 bg-gradient-to-r ${grad}`} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar src={post.userId?.profileImage} name={post.userId?.name} size={10} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-gray-900 dark:text-white">{post.userId?.name}</span>
                <RoleBadge role={post.userId?.role} />
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-gray-400">
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
              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0">
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Content */}
        {post.content && (
          <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed mb-3">{post.content}</p>
        )}

        {/* Media */}
        {post.mediaUrl && (
          <div className="rounded-xl overflow-hidden mb-3 border border-gray-100 dark:border-gray-700">
            {post.mediaType === 'image'
              ? <img src={post.mediaUrl} alt="post media" className="w-full max-h-96 object-cover" />
              : <video src={post.mediaUrl} controls className="w-full max-h-96" />
            }
          </div>
        )}

        {/* Stats row */}
        {((post.likes?.length > 0) || (post.comments?.length > 0)) && (
          <div className="flex items-center justify-between text-xs text-gray-400 pb-2 mb-2 border-b border-gray-100 dark:border-gray-700">
            {post.likes?.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <Heart size={9} fill="white" className="text-white" />
                </span>
                {post.likes.length}
              </span>
            )}
            {post.comments?.length > 0 && (
              <button onClick={() => setShowComments(v => !v)} className="hover:underline ml-auto">
                {post.comments.length} comment{post.comments.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button onClick={() => onLike(post._id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-xl transition-colors ${
              isLiked ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}>
            <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
            Like
          </button>
          <button onClick={() => setShowComments(v => !v)}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <MessageCircle size={16} />
            Comment
          </button>
        </div>

        {/* Comments section */}
        <AnimatePresence>
          {showComments && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-3 space-y-3">
              {(post.comments || []).map(c => (
                <div key={c._id} className="flex gap-2.5 items-start">
                  <Avatar src={c.userId?.profileImage} name={c.userId?.name} size={8} />
                  <div className="bg-gray-50 dark:bg-gray-700/60 rounded-2xl px-3 py-2 flex-1">
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-100">{c.userId?.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 items-center">
                <Avatar src={user?.profileImage} name={user?.name} size={8} />
                <div className="flex-1 flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-2">
                  <input value={commentText} onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitComment()}
                    placeholder="Add a comment..."
                    className="flex-1 bg-transparent text-xs focus:outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400" />
                  <button onClick={submitComment} disabled={submitting || !commentText.trim()}
                    className="text-indigo-500 hover:text-indigo-700 disabled:opacity-40 transition-colors">
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
  const [showFilters, setShowFilters] = useState(false)

  const fetchPosts = useCallback(async (cat = filterCat, q = activeSearch) => {
    setLoading(true)
    try {
      const res = await feedAPI.getPosts(cat, 1, q)
      setPosts(res.data.data?.posts || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [filterCat, activeSearch])

  useEffect(() => { fetchPosts() }, [fetchPosts])

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
    setShowFilters(false)
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

  return (
    <div className="space-y-4">
      {/* Search + Filter bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search posts..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button onClick={handleSearch}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
            Search
          </button>
          <button onClick={() => setShowFilters(v => !v)}
            className={`px-3 py-2 text-sm font-semibold rounded-xl border transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-600' : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-indigo-300'}`}>
            Filter
          </button>
        </div>

        {/* Active search/filter indicator */}
        {(activeSearch || filterCat !== 'All') && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-400">Showing:</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${CAT_COLOR[filterCat] || CAT_COLOR.All}`}>
              {activeSearch ? `"${activeSearch}"` : filterCat}
              <button onClick={() => { setActiveSearch(''); setSearch(''); setFilterCat('All'); fetchPosts('All', '') }}>
                <X size={11} />
              </button>
            </span>
          </div>
        )}

        {/* Category filter pills */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                {CATEGORIES.map(({ label, icon: Icon }) => (
                  <button key={label} onClick={() => handleCatFilter(label)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                      filterCat === label
                        ? `bg-gradient-to-r ${CAT_GRADIENT[label]} text-white shadow-sm`
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}>
                    <Icon size={12} /> {label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Composer */}
      <PostComposer user={user} onPost={handlePost} />

      {/* Posts */}
      {loading ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={30} />
          <p className="text-sm text-gray-400">Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-indigo-400" />
          </div>
          <p className="font-bold text-gray-700 dark:text-gray-200 mb-1">
            {activeSearch ? `No posts found for "${activeSearch}"` : filterCat !== 'All' ? `No posts in ${filterCat} yet` : 'No posts yet'}
          </p>
          <p className="text-sm text-gray-400">
            {activeSearch ? 'Try a different keyword or browse all posts' : 'Be the first to share something with the community!'}
          </p>
          {activeSearch && (
            <button onClick={() => { setActiveSearch(''); setSearch(''); fetchPosts('All', '') }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">
              Browse all posts
            </button>
          )}
        </div>
      ) : (
        <AnimatePresence>
          {posts.map((post, i) => (
            <motion.div key={post._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }}>
              <PostCard post={post} user={user} onLike={handleLike} onDelete={handleDelete} onComment={handleComment} />
            </motion.div>
          ))}
        </AnimatePresence>
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
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <Avatar src={u.profileImage || u.user?.profileImage} name={u.name || u.user?.name} size={12} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{u.name || u.user?.name}</p>
          <RoleBadge role={u.role || u.user?.role} />
        </div>
      </div>
      {(u.skills || u.user?.skills)?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {(u.skills || u.user?.skills).slice(0, 3).map(s => (
            <span key={s} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{s}</span>
          ))}
        </div>
      )}
      {actions}
    </motion.div>
  )

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
        {[
          { key: 'discover', label: 'Discover', icon: Search },
          { key: 'pending', label: `Pending${pending.length ? ` (${pending.length})` : ''}`, icon: UserPlus },
          { key: 'connections', label: 'Connected', icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setSubTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold py-2.5 rounded-xl transition-all ${
              subTab === key ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            <Icon size={14} /><span>{label}</span>
          </button>
        ))}
      </div>

      {subTab === 'discover' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchDiscover(search)}
                placeholder="Search by name, skill, or role..."
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button onClick={() => fetchDiscover(search)}
              className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
              Search
            </button>
          </div>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500" size={26} /></div>
          : discoverUsers.length === 0 ? <div className="text-center py-12 text-gray-400 text-sm">No users found</div>
          : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {discoverUsers.map(u => (
                <UserCard key={u._id} u={u} actions={
                  !u.connectionStatus ? (
                    <button onClick={() => sendReq(u._id)} disabled={actionLoading[u._id]}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-xl transition-colors">
                      {actionLoading[u._id] ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />} Connect
                    </button>
                  ) : u.connectionStatus === 'pending' && u.iRequested ? (
                    <div className="w-full text-center text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 py-2 rounded-xl">Request Sent</div>
                  ) : u.connectionStatus === 'pending' ? (
                    <div className="w-full text-center text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 py-2 rounded-xl font-medium">Incoming Request</div>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-1.5 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 py-2 rounded-xl font-semibold">
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
          {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500" size={26} /></div>
          : pending.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-gray-400">
              <UserPlus size={36} className="opacity-30" /><p className="text-sm">No pending requests</p>
            </div>
          ) : pending.map(c => (
            <UserCard key={c._id} u={c.requester} actions={
              <div className="flex gap-2">
                <button onClick={() => accept(c._id)} disabled={actionLoading[c._id]}
                  className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-2 rounded-xl transition-colors">
                  {actionLoading[c._id] ? <Loader2 size={11} className="animate-spin" /> : <UserCheck size={11} />} Accept
                </button>
                <button onClick={() => reject(c._id)} disabled={actionLoading[c._id]}
                  className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-red-50 hover:bg-red-100 dark:bg-red-900/30 text-red-500 py-2 rounded-xl transition-colors">
                  <UserX size={11} /> Decline
                </button>
              </div>
            } />
          ))}
        </div>
      )}

      {subTab === 'connections' && (
        <div className="space-y-3">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500" size={26} /></div>
          : myConns.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-gray-400">
              <Users size={36} className="opacity-30" />
              <p className="text-sm font-medium">No connections yet</p>
              <p className="text-xs">Start discovering people!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {myConns.map(c => (
                <UserCard key={c.connectionId} u={c.user} actions={
                  <button onClick={() => remove(c.connectionId)} disabled={actionLoading[c.connectionId]}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 rounded-xl transition-colors">
                    {actionLoading[c.connectionId] ? <Loader2 size={12} className="animate-spin" /> : <UserX size={12} />} Remove
                  </button>
                } />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── LEFT SIDEBAR ─────────────────────────────────────────────────────────────
function ProfileSidebar({ user }) {
  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {/* Banner */}
        <div className="h-16 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-600" />
        <div className="px-4 pb-4 -mt-8">
          <div className="mb-3">
            <Avatar src={user?.profileImage} name={user?.name} size={14} />
          </div>
          <p className="font-bold text-gray-900 dark:text-white">{user?.name}</p>
          <RoleBadge role={user?.role} />
          {user?.skills?.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">{user.skills.join(' · ')}</p>
          )}
        </div>
      </div>

      {/* Topics */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Topics</p>
        <div className="space-y-1">
          {CATEGORIES.filter(c => c.label !== 'All').map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2.5 py-1.5 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 cursor-default transition-colors">
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${CAT_GRADIENT[label]} flex items-center justify-center flex-shrink-0`}>
                <Icon size={13} className="text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
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
  ]
  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={15} className="text-indigo-500" />
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trending Topics</p>
        </div>
        <div className="space-y-3">
          {tips.map((t, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-xl">{t.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t.title}</p>
                <p className="text-xs text-gray-400">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Communities() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState('feed')

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-4 py-6 pb-16">

        {/* Top Tabs */}
        <div className="flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1 rounded-2xl mb-5 shadow-sm max-w-xs">
          <button onClick={() => setTab('feed')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-xl transition-all ${
              tab === 'feed' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}>
            <MessageCircle size={15} /> Feed
          </button>
          <button onClick={() => setTab('connections')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-xl transition-all ${
              tab === 'connections' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}>
            <Users size={15} /> Network
          </button>
        </div>

        {/* 3-column layout for feed, 1-col for connections */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {tab === 'feed' ? (
              <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_240px] gap-5">
                {/* Left sidebar — hidden on mobile */}
                <div className="hidden lg:block">
                  <div className="sticky top-6"><ProfileSidebar user={user} /></div>
                </div>
                {/* Main feed */}
                <div><FeedTab user={user} /></div>
                {/* Right sidebar — hidden on mobile */}
                <div className="hidden lg:block">
                  <div className="sticky top-6"><TrendingSidebar /></div>
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
  )
}
