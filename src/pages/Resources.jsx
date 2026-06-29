import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { resourceAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { uploadToCloudinary } from '../utils/cloudinary'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { Download, Search, Upload, X, FileText, Film, Image, Loader2, ExternalLink, Trash2, Plus, BookOpen, Youtube, Link, Play, Maximize, Minimize } from 'lucide-react'

const TOPICS = ['Robotics', 'Programming', 'AI/ML', 'IoT', 'Electronics', 'Embedded Systems']

const TOPIC_COLORS = {
  'Robotics': '#60a5fa', 'Programming': '#34d399', 'AI/ML': '#a78bfa',
  'IoT': '#38bdf8', 'Electronics': '#fbbf24', 'Embedded Systems': '#f87171',
}

function fileIcon(type) {
  if (!type) return <FileText size={18} style={{ color: '#94a3b8' }} />
  if (type === 'link') return <Youtube size={18} style={{ color: '#ef4444' }} />
  if (type.startsWith('video') || type === 'video') return <Film size={18} style={{ color: '#a78bfa' }} />
  if (type.startsWith('image') || type === 'image') return <Image size={18} style={{ color: '#60a5fa' }} />
  if (type === 'pdf') return <FileText size={18} style={{ color: '#f87171' }} />
  return <FileText size={18} style={{ color: '#34d399' }} />
}

// â”€â”€â”€ YouTube helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getYouTubeId(url) {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
  return null
}
function isYouTubeUrl(url) {
  return !!(url && (url.includes('youtube.com') || url.includes('youtu.be')))
}

// â”€â”€â”€ YOUTUBE PLAYER MODAL (Secure â€” video ID via signed token) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function YouTubeModal({ resource, onClose }) {
  const [videoId, setVideoId] = useState(null)
  const [tokenError, setTokenError] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    resourceAPI.getVideoToken(resource._id)
      .then(res => {
        if (!cancelled) {
          // Backend returns the video ID (not the full URL)
          // Full YouTube URL is never sent to frontend
          const vid = res.data?.data?.videoId
          if (vid) setVideoId(vid)
          else setTokenError('Could not load video. Please try again.')
        }
      })
      .catch(() => {
        if (!cancelled) setTokenError('Could not load video. Please try again.')
      })
    return () => { cancelled = true }
  }, [resource._id])

  // Track native fullscreen state changes
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  // Build embed URL only in the browser â€” never stored or logged
  const embedSrc = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&fs=0&disablekb=0`
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-[256px]" style={{ background: 'rgba(0,0,0,0.9)' }}
      onClick={onClose}>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="flex flex-col w-full"
        style={{
          maxWidth: 960,
          maxHeight: 'calc(100vh - 32px)',
          background: isFullscreen ? '#000' : 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: isFullscreen ? 0 : 16,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          width: isFullscreen ? '100vw' : undefined,
          height: isFullscreen ? '100vh' : undefined,
          maxWidth: isFullscreen ? '100vw' : 960,
          maxHeight: isFullscreen ? '100vh' : 'calc(100vh - 32px)',
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{
            borderBottom: '1px solid var(--border-primary)',
            background: isFullscreen ? '#111' : 'var(--bg-secondary)',
          }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fef2f2' }}>
              <Youtube size={18} style={{ color: '#ef4444' }} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-bold truncate ${isFullscreen ? 'text-white' : 'text-theme-primary'}`}>{resource.title}</p>
              <p className={`text-xs ${isFullscreen ? 'text-white/50' : 'text-theme-tertiary'}`}>by {resource.uploadedBy?.name || 'Mentor'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {embedSrc && (
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg transition"
                style={{ color: isFullscreen ? 'rgba(255,255,255,0.7)' : undefined }}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                {isFullscreen
                  ? <Minimize size={17} />
                  : <Maximize size={17} className="text-theme-secondary" />}
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg transition"
              style={{ color: isFullscreen ? 'rgba(255,255,255,0.7)' : undefined }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Video area â€” 16:9 ratio with YouTube logo blocker */}
        <div className="relative w-full"
          style={{
            aspectRatio: isFullscreen ? undefined : '16/9',
            flex: isFullscreen ? '1' : undefined,
            background: '#000',
          }}>
          {tokenError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Youtube size={48} style={{ color: '#ef4444', opacity: 0.5 }} />
              <p className="text-white/70 text-sm text-center px-4">{tokenError}</p>
              <button
                onClick={() => {
                  setTokenError(''); setVideoId(null)
                  resourceAPI.getVideoToken(resource._id)
                    .then(r => setVideoId(r.data?.data?.videoId))
                    .catch(() => setTokenError('Could not load video.'))
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: '#ef4444' }}>
                Try Again
              </button>
            </div>
          ) : !embedSrc ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 size={40} className="animate-spin" style={{ color: '#ef4444' }} />
              <p className="text-white/50 text-xs">Loading video...</p>
            </div>
          ) : (
            <>
              <iframe
                key={embedSrc}
                src={embedSrc}
                title={resource.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="strict-origin"
                className="absolute inset-0 w-full h-full"
                style={{ border: 'none' }}
              />
              {/* Block ALL YouTube UI overlays â€” covers entire bottom bar + top bar + YouTube logo */}
              {/* Top bar â€” channel name, title */}
              <div className="absolute top-0 left-0 right-0" style={{ height: '64px', zIndex: 10, cursor: 'default' }}
                onClick={e => e.preventDefault()} onContextMenu={e => e.preventDefault()} />
              {/* Bottom controls bar â€” copy link, YouTube logo, progress bar area */}
              <div className="absolute bottom-0 left-0 right-0" style={{ height: '60px', zIndex: 10, cursor: 'default' }}
                onClick={e => e.preventDefault()} onContextMenu={e => e.preventDefault()} />
            </>
          )}
        </div>

        {/* Footer */}
        {resource.description && (
          <div className="px-5 py-3 flex items-start gap-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border-primary)' }}>
            <p className="text-xs text-theme-secondary leading-relaxed flex-1">{resource.description}</p>
            <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-medium"
              style={{ background: '#fef3c7', color: '#d97706' }}>
              {resource.topic}
            </span>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function UploadModal({ onClose, onUploaded }) {
  const fileRef = useRef()
  const [uploadMode, setUploadMode] = useState('file') // 'file' | 'youtube'
  const [form, setForm] = useState({ title: '', description: '', topic: 'Robotics', tags: '', youtubeUrl: '' })
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const onFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    const isVideo = f.type.startsWith('video/')
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024
    if (f.size > maxSize) { setError(isVideo ? 'Video must be under 100MB' : 'File must be under 10MB'); return }
    setFile(f); setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.description || !form.topic) { setError('Fill all required fields'); return }
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)

    if (uploadMode === 'youtube') {
      if (!form.youtubeUrl.trim()) { setError('Please enter a YouTube URL'); return }
      if (!isYouTubeUrl(form.youtubeUrl)) { setError('Please enter a valid YouTube URL'); return }
      if (!getYouTubeId(form.youtubeUrl)) { setError('Could not extract video ID. Check the YouTube link.'); return }
      setUploading(true); setError('')
      try {
        const res = await resourceAPI.create({ title: form.title.trim(), description: form.description.trim(), topic: form.topic, tags, fileUrl: form.youtubeUrl.trim(), fileType: 'link', isPublic: true })
        if (!res.data?.success) throw new Error(res.data?.error?.message || 'Failed')
        onUploaded(); onClose()
      } catch (err) { setError(err.response?.data?.error?.message || err.message || 'Failed') }
      finally { setUploading(false) }
      return
    }

    if (!file) { setError('Please select a file'); return }
    setUploading(true); setError('')
    try {
      const { url } = await uploadToCloudinary(file, 'studdy-buddy/resources')
      const mime = file.type || ''
      const fileType = mime.startsWith('image') ? 'image' : mime.startsWith('video') ? 'video' : mime === 'application/pdf' ? 'pdf' : mime.includes('word') || mime.includes('doc') ? 'doc' : 'other'
      const res = await resourceAPI.create({ title: form.title.trim(), description: form.description.trim(), topic: form.topic, tags, fileUrl: url, fileType, isPublic: true })
      if (!res.data?.success) throw new Error(res.data?.error?.message || 'Upload failed')
      onUploaded(); onClose()
    } catch (err) { setError(err.response?.data?.error?.message || err.message || 'Upload failed') }
    finally { setUploading(false) }
  }

  const inputStyle = { background: 'var(--bg-primary)', border: "1px solid var(--border-primary)", color: "var(--text-primary)", borderRadius: '10px', padding: '10px 14px', fontSize: '0.85rem', width: '100%', outline: 'none' }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-x-4 top-16 z-50 rounded-2xl shadow-2xl max-w-lg mx-auto overflow-hidden max-h-[88vh] flex flex-col"
        style={{ background: "var(--bg-secondary)", border: '1px solid var(--border-primary)' }}>

        {/* Title bar */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
          <h2 className="font-bold text-theme-primary flex items-center gap-2">
            <Upload size={16} style={{ color: '#6366f1' }} /> Upload Resource
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition hover:bg-gray-100 dark:hover:bg-white/10">
            <X size={16} className="text-theme-tertiary" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="px-5 pt-4">
          <div className="flex gap-1.5 p-1 rounded-lg" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}>
            <button type="button" onClick={() => { setUploadMode('file'); setError('') }}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all"
              style={{ background: uploadMode === 'file' ? '#6366f1' : 'transparent', color: uploadMode === 'file' ? 'white' : 'var(--text-tertiary)' }}>
              <Upload size={14} /> Upload File
            </button>
            <button type="button" onClick={() => { setUploadMode('youtube'); setError('') }}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all"
              style={{ background: uploadMode === 'youtube' ? '#ef4444' : 'transparent', color: uploadMode === 'youtube' ? 'white' : 'var(--text-tertiary)' }}>
              <Youtube size={14} /> YouTube Link
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* File zone OR YouTube URL */}
          {uploadMode === 'file' ? (
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition"
              style={{ borderColor: file ? 'rgba(52,211,153,0.5)' : 'var(--border-primary)', background: file ? 'rgba(52,211,153,0.05)' : 'var(--bg-primary)' }}>
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  {fileIcon(file.type)}
                  <span className="text-sm font-medium text-theme-primary truncate max-w-[200px]">{file.name}</span>
                  <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }} className="text-red-400 ml-1"><X size={14} /></button>
                </div>
              ) : (
                <>
                  <Upload size={28} className="mx-auto mb-2 text-indigo-400" />
                  <p className="text-sm text-theme-secondary">Click to select file <span className="text-theme-tertiary font-normal">(PDF/doc â€” 10MB, video â€” 100MB)</span></p>
                </>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-theme-secondary">YouTube URL *</label>
              <div className="relative">
                <Youtube size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#ef4444' }} />
                <input value={form.youtubeUrl} onChange={e => setForm(p => ({ ...p, youtubeUrl: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..." style={{ ...inputStyle, paddingLeft: '36px' }} />
              </div>
              {form.youtubeUrl && getYouTubeId(form.youtubeUrl) && (
                <div className="mt-2 flex items-center gap-2.5 p-2 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <img src={`https://img.youtube.com/vi/${getYouTubeId(form.youtubeUrl)}/mqdefault.jpg`}
                    alt="thumb" className="w-16 h-10 rounded object-cover flex-shrink-0" />
                  <span className="text-xs font-medium" style={{ color: '#16a34a' }}>âœ“ Valid YouTube video detected</span>
                </div>
              )}
            </div>
          )}

          <input ref={fileRef} type="file" className="hidden" onChange={onFileChange} accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*,video/*" />

          {[
            { label: 'Title *', key: 'title', type: 'input', placeholder: 'Resource title' },
            { label: 'Description *', key: 'description', type: 'textarea', placeholder: 'Brief description...' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold mb-1.5 text-theme-secondary">{f.label}</label>
              {f.type === 'textarea'
                ? <textarea value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} rows={3} style={{ ...inputStyle, resize: 'none' }} />
                : <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inputStyle} />}
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-theme-secondary">Topic *</label>
            <select value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
              {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-theme-secondary">Tags <span className="text-theme-tertiary font-normal">(comma separated)</span></label>
            <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="e.g. arduino, servo, beginner" style={inputStyle} />
          </div>

          {error && <p className="text-xs text-red-500 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</p>}
        </form>

        <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={submit} disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-3 text-white font-semibold text-sm rounded-xl transition disabled:opacity-50"
            style={{ background: uploadMode === 'youtube' ? '#ef4444' : '#6366f1' }}>
            {uploading
              ? <><Loader2 size={16} className="animate-spin" /> {uploadMode === 'youtube' ? 'Saving...' : 'Uploading...'}</>
              : uploadMode === 'youtube' ? <><Youtube size={16} /> Save YouTube Resource</> : <><Upload size={16} /> Upload Resource</>}
          </motion.button>
        </div>
      </motion.div>
    </>
  )
}

  const onFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    const isVideo = f.type.startsWith('video/')
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024 // 100MB video, 10MB others
    if (f.size > maxSize) {
      setError(isVideo ? 'Video must be under 100MB' : 'File must be under 10MB')
      return
    }
    setFile(f); setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.description || !form.topic) { setError('Fill all required fields'); return }
    if (!file) { setError('Please select a file'); return }
    setUploading(true); setError('')
    try {
      const { url } = await uploadToCloudinary(file, 'studdy-buddy/resources')
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
      const mime = file.type || ''
      const fileType = mime.startsWith('image') ? 'image' : mime.startsWith('video') ? 'video'
        : mime === 'application/pdf' ? 'pdf' : mime.includes('word') || mime.includes('doc') ? 'doc' : 'other'
      const res = await resourceAPI.create({ title: form.title.trim(), description: form.description.trim(), topic: form.topic, tags, fileUrl: url, fileType, isPublic: true })
      if (!res.data?.success) throw new Error(res.data?.error?.message || 'Upload failed')
      onUploaded(); onClose()
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Upload failed')
    } finally { setUploading(false) }
  }

// â”€â”€â”€ MAIN PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Resources() {
  const { user } = useAuthStore()
  const [resources, setResources] = useState([])
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const fetchResources = async () => {
    try {
      setLoading(true)
      let res
      if (search) res = await resourceAPI.search(search)
      else if (topic) res = await resourceAPI.getByTopic(topic, page)
      else res = await resourceAPI.list(page, 12)
      const d = res.data.data
      setResources(Array.isArray(d) ? d : d?.resources || [])
      setTotal(res.data.data?.pagination?.total || res.data.total || 0)
    } catch { setResources([]) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const timer = setTimeout(() => { fetchResources() }, 300)
    return () => clearTimeout(timer)
  }, [page, search, topic])

  const handleDownload = async (resource) => {
    // YouTube/link resources open in the secure in-app player
    if (resource.fileType === 'link') {
      setSelectedVideo(resource)
      return
    }
    try { await resourceAPI.download(resource._id); window.open(resource.fileUrl, '_blank') }
    catch { window.open(resource.fileUrl, '_blank') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resource?')) return
    try { await resourceAPI.delete(id); setResources(prev => prev.filter(r => r._id !== id)) }
    catch { /* ignore */ }
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div style={{ position: 'relative', zIndex: 60 }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="relative flex-1 lg:ml-[240px] mt-16 overflow-x-hidden" style={{ background: 'var(--bg-primary)' }}>

        {/* â”€â”€ Hero Header â”€â”€ */}
        <div className="px-4 sm:px-6 lg:px-8 py-8" style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#6366f1' }}>
                  <BookOpen size={18} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-theme-primary tracking-tight">Resources</h1>
              </div>
              <p className="text-sm text-theme-secondary">Premium learning materials curated by expert mentors</p>
            </div>
            {user?.role === 'mentor' && (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-lg"
                style={{ background: '#6366f1' }}>
                <Plus size={16} /> Upload Resource
              </motion.button>
            )}
          </motion.div>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-5">
            <div className="relative max-w-2xl">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-tertiary" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search by title, topic, or keyword..."
                className="w-full pl-11 pr-4 py-3 text-sm rounded-xl focus:outline-none transition-all text-theme-primary"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
                onFocus={e => e.target.style.border = '1px solid #6366f1'}
                onBlur={e => e.target.style.border = '1px solid var(--border-primary)'} />
            </div>
          </motion.div>

          {/* Topic Filters */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="flex flex-wrap gap-2 mt-4">
            {['All', ...TOPICS].map(t => {
              const active = t === 'All' ? !topic : topic === t
              return (
                <button key={t} onClick={() => { setTopic(t === 'All' ? '' : t); setPage(1) }}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: active ? '#6366f1' : 'var(--bg-primary)',
                    color: active ? 'white' : 'var(--text-tertiary)',
                    border: `1px solid ${active ? '#6366f1' : 'var(--border-primary)'}`,
                  }}>
                  {t}
                </button>
              )
            })}
          </motion.div>
        </div>

        {/* â”€â”€ Content â”€â”€ */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
            <div className="flex flex-col items-center py-24 gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Loader2 size={36} className="text-indigo-500" />
              </motion.div>
              <p className="text-theme-secondary text-sm">Loading resources...</p>
            </div>
          ) : resources.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-2xl p-16 text-center mx-auto max-w-md mt-8"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: '#e0e7ff' }}>
                <BookOpen size={32} style={{ color: '#6366f1' }} />
              </div>
              <p className="font-bold text-theme-primary mb-2 text-xl">No resources found</p>
              <p className="text-sm text-theme-secondary mb-6">
                {search ? `No results for "${search}"` : topic ? `No resources in ${topic} yet` : 'No resources uploaded yet'}
              </p>
              {user?.role === 'mentor' && (
                <motion.button whileHover={{ scale: 1.02 }} onClick={() => setShowUpload(true)}
                  className="px-6 py-3 text-white text-sm font-semibold rounded-xl transition-all"
                  style={{ background: '#6366f1' }}>
                  Upload First Resource
                </motion.button>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {resources.map((r, i) => (
                <motion.div key={r._id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.3), type: 'spring', stiffness: 200 }}
                  className="group rounded-2xl overflow-hidden flex flex-col"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                  whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>

                  {/* Thumbnail / Preview area */}
                  {r.fileType === 'link' ? (
                    <div className="relative cursor-pointer overflow-hidden"
                      style={{ aspectRatio: '16/9', background: '#0f0f0f' }}
                      onClick={() => handleDownload(r)}>
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)' }}>
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                          style={{ background: '#ef4444' }}>
                          <Play size={26} className="text-white ml-1" fill="white" />
                        </motion.div>
                        <div className="text-center px-4">
                          <p className="text-white/80 text-xs font-medium">Click to Watch</p>
                        </div>
                      </div>
                      {/* YouTube badge */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
                        <Youtube size={12} style={{ color: '#ef4444' }} />
                        <span className="text-white text-[10px] font-semibold">Video</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center"
                      style={{ aspectRatio: '16/9', background: r.fileType === 'pdf' ? '#fef2f2' : r.fileType === 'image' ? '#f0f9ff' : '#f5f3ff' }}>
                      <div className="flex flex-col items-center gap-2 opacity-60">
                        {fileIcon(r.fileType)}
                        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                          {r.fileType === 'pdf' ? 'PDF Document' : r.fileType === 'doc' ? 'Document' : r.fileType === 'image' ? 'Image' : 'File'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Card body */}
                  <div className="flex flex-col flex-1 p-4">
                    {/* Author */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: '#6366f1' }}>
                        {r.uploadedBy?.name?.charAt(0)?.toUpperCase() || 'M'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-theme-primary truncate">{r.uploadedBy?.name || 'Mentor'}</p>
                      </div>
                      <div className="ml-auto flex-shrink-0">
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                          style={{
                            background: TOPIC_COLORS[r.topic] ? TOPIC_COLORS[r.topic] + '20' : '#e0e7ff',
                            color: TOPIC_COLORS[r.topic] || '#6366f1'
                          }}>
                          {r.topic}
                        </span>
                      </div>
                    </div>

                    {/* Title + description */}
                    <h3 className="font-bold text-sm text-theme-primary line-clamp-2 mb-1.5 leading-snug">{r.title}</h3>
                    <p className="text-xs text-theme-secondary line-clamp-2 flex-1 leading-relaxed">{r.description}</p>

                    {/* Tags */}
                    {r.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {r.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md font-medium text-theme-tertiary"
                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4 pt-3"
                      style={{ borderTop: '1px solid var(--border-primary)' }}>
                      <span className="flex items-center gap-1.5 text-xs text-theme-tertiary">
                        <Download size={12} /> <span>{r.downloads || 0} views</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {user?.role === 'mentor' && String(r.uploadedBy?._id) === String(user?._id) && (
                          <button onClick={() => handleDelete(r._id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            style={{ color: '#ef4444' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                          onClick={() => handleDownload(r)}
                          className="flex items-center gap-1.5 px-4 py-2 text-white text-xs font-semibold rounded-lg"
                          style={{ background: r.fileType === 'link' ? '#ef4444' : '#6366f1' }}>
                          {r.fileType === 'link' ? <><Play size={12} fill="white" /> Watch</> : <><ExternalLink size={12} /> View</>}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > 12 && (
            <div className="flex justify-center items-center gap-3 mt-10">
              <motion.button whileHover={{ scale: 1.05 }} disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-5 py-2 text-sm font-medium rounded-xl disabled:opacity-40 transition text-theme-primary"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                â† Previous
              </motion.button>
              <span className="text-sm font-medium text-theme-secondary">
                Page {page} of {Math.ceil(total / 12)}
              </span>
              <motion.button whileHover={{ scale: 1.05 }} disabled={page >= Math.ceil(total / 12)} onClick={() => setPage(p => p + 1)}
                className="px-5 py-2 text-sm font-medium rounded-xl disabled:opacity-40 transition text-theme-primary"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                Next â†’
              </motion.button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={fetchResources} />}
        {selectedVideo && <YouTubeModal resource={selectedVideo} onClose={() => setSelectedVideo(null)} />}
      </AnimatePresence>
    </div>
  )
}
