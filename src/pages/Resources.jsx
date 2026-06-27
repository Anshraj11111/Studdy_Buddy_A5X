import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { resourceAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { uploadToCloudinary } from '../utils/cloudinary'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { Download, Search, Upload, X, FileText, Film, Image, Loader2, ExternalLink, Trash2, Plus, BookOpen } from 'lucide-react'

const TOPICS = ['Robotics', 'Programming', 'AI/ML', 'IoT', 'Electronics', 'Embedded Systems']

const TOPIC_COLORS = {
  'Robotics': '#60a5fa', 'Programming': '#34d399', 'AI/ML': '#a78bfa',
  'IoT': '#38bdf8', 'Electronics': '#fbbf24', 'Embedded Systems': '#f87171',
}

function fileIcon(type) {
  if (!type) return <FileText size={18} style={{ color: '#94a3b8' }} />
  if (type.startsWith('video') || type === 'video') return <Film size={18} style={{ color: '#a78bfa' }} />
  if (type.startsWith('image') || type === 'image') return <Image size={18} style={{ color: '#60a5fa' }} />
  if (type === 'pdf') return <FileText size={18} style={{ color: '#f87171' }} />
  return <FileText size={18} style={{ color: '#34d399' }} />
}

// ─── UPLOAD MODAL ─────────────────────────────────────────────────────────────
function UploadModal({ onClose, onUploaded }) {
  const fileRef = useRef()
  const [form, setForm] = useState({ title: '', description: '', topic: 'Robotics', tags: '' })
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

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

  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: "1px solid var(--border-primary)", color: "var(--text-primary)", borderRadius: '12px', padding: '10px 14px', fontSize: '0.85rem', width: '100%', outline: 'none' }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-x-4 top-20 z-50 rounded-2xl shadow-2xl max-w-lg mx-auto overflow-hidden max-h-[85vh] flex flex-col"
        style={{ background: "var(--bg-card)", border: '1px solid rgba(99,102,241,0.3)', backdropFilter: 'blur(24px)' }}>
        <div className="h-0.5" style={{ background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-secondary)" }}>
          <h2 className="font-bold text-theme-primary flex items-center gap-2"><Upload size={16} style={{ color: '#818cf8' }} /> Upload Resource</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition hover:bg-white/10"><X size={16} style={{ color: '#94a3b8' }} /></button>
        </div>
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition"
            style={{ borderColor: file ? 'rgba(52,211,153,0.5)' : 'rgba(99,102,241,0.3)', background: file ? 'rgba(52,211,153,0.05)' : 'rgba(99,102,241,0.05)' }}>
            {file ? (
              <div className="flex items-center justify-center gap-2">
                {fileIcon(file.type)}
                <span className="text-sm font-medium text-theme-primary truncate max-w-[200px]">{file.name}</span>
                <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }} className="text-red-400 hover:text-red-300 ml-1"><X size={14} /></button>
              </div>
            ) : (
              <>
                <Upload size={28} className="mx-auto mb-2" style={{ color: 'rgba(99,102,241,0.6)' }} />
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Click to select file <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(PDF/doc — max 10MB, video — max 100MB)</span></p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden" onChange={onFileChange} accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*,video/*" />
          {[
            { label: 'Title *', key: 'title', type: 'input', placeholder: 'Resource title' },
            { label: 'Description *', key: 'description', type: 'textarea', placeholder: 'Brief description...' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>{f.label}</label>
              {f.type === 'textarea'
                ? <textarea value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} rows={3} style={{ ...inputStyle, resize: 'none' }} />
                : <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inputStyle} />}
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Topic *</label>
            <select value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
              {TOPICS.map(t => <option key={t} value={t} style={{ background: '#0a0820' }}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Tags <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(comma separated)</span></label>
            <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="e.g. arduino, servo, beginner" style={inputStyle} />
          </div>
          {error && <p className="text-xs text-red-400 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</p>}
        </form>
        <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(99,102,241,0.15)' }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={submit} disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-3 text-theme-primary font-semibold text-sm rounded-xl transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
            {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : <><Upload size={16} /> Upload Resource</>}
          </motion.button>
        </div>
      </motion.div>
    </>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Resources() {
  const { user } = useAuthStore()
  const [resources, setResources] = useState([])
  const [search, setSearch] = useState('')
  const [topic, setTopic] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [showUpload, setShowUpload] = useState(false)
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

      <div className="relative flex-1 lg:ml-[240px] mt-16 px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden" style={{ background: 'var(--bg-primary)' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-theme-primary mb-1.5">Resources</h1>
            <p className="text-theme-secondary text-sm">Learning materials from mentors</p>
          </div>
          {user?.role === 'mentor' && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-lg transition-all"
              style={{ background: '#6366f1' }}>
              <Plus size={16} /> Upload Resource
            </motion.button>
          )}
        </motion.div>

        {/* Search + Filters */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mb-6 space-y-4">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-tertiary" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search resources..."
              className="w-full pl-11 pr-4 py-3 text-sm text-theme-primary placeholder-theme-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setTopic(''); setPage(1) }}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{ 
                background: !topic ? '#e0e7ff' : 'var(--bg-secondary)', 
                color: !topic ? '#6366f1' : 'var(--text-tertiary)',
                border: `1px solid ${!topic ? '#c7d2fe' : 'var(--border-primary)'}`
              }}>
              All
            </button>
            {TOPICS.map(t => (
              <button key={t} onClick={() => { setTopic(t); setPage(1) }}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{ 
                  background: topic === t ? '#e0e7ff' : 'var(--bg-secondary)', 
                  color: topic === t ? '#6366f1' : 'var(--text-tertiary)',
                  border: `1px solid ${topic === t ? '#c7d2fe' : 'var(--border-primary)'}`
                }}>
                {t}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Grid */}
        {loading ? (
          <div className="flex flex-col items-center py-24 gap-3">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Loader2 size={36} className="text-indigo-500" />
            </motion.div>
            <p className="text-theme-secondary text-sm">Loading resources...</p>
          </div>
        ) : resources.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl p-12 text-center"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: '#e0e7ff' }}>
              <FileText size={32} style={{ color: '#6366f1' }} />
            </div>
            <p className="font-semibold text-theme-primary mb-1 text-lg">No resources found</p>
            <p className="text-sm text-theme-secondary mb-4">
              {search ? `No results for "${search}"` : topic ? `No resources in ${topic} yet` : 'No resources uploaded yet'}
            </p>
            {user?.role === 'mentor' && (
              <motion.button whileHover={{ scale: 1.02 }} onClick={() => setShowUpload(true)}
                className="px-5 py-2.5 text-white text-sm font-semibold rounded-lg transition-all"
                style={{ background: '#6366f1' }}>
                Upload Resource
              </motion.button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((r, i) => (
              <motion.div key={r._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.35), type: 'spring', stiffness: 200 }}
                className="group relative rounded-xl overflow-hidden transition-all hover:shadow-lg"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                <div className="p-4 relative">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: '#e0e7ff' }}>
                      {fileIcon(r.fileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-theme-primary line-clamp-2">{r.title}</h3>
                      <p className="text-xs mt-0.5 text-theme-secondary">{r.uploadedBy?.name || 'Mentor'}</p>
                    </div>
                  </div>
                  <p className="text-xs line-clamp-2 mb-3 text-theme-secondary">{r.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-xs px-2 py-1 rounded-md font-medium"
                      style={{ background: '#fef3c7', color: '#d97706' }}>
                      {r.topic}
                    </span>
                    {r.tags?.slice(0, 2).map(tag => (
                      <span key={tag} className="text-xs px-2 py-1 rounded-md"
                        style={{ background: 'var(--bg-primary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-primary)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-theme-tertiary">
                      <Download size={12} /> {r.downloads || 0}
                    </span>
                    <div className="flex items-center gap-2">
                      {user?.role === 'mentor' && String(r.uploadedBy?._id) === String(user?._id) && (
                        <button onClick={() => handleDelete(r._id)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: '#ef4444' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => handleDownload(r)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-all"
                        style={{ background: '#6366f1' }}>
                        <ExternalLink size={12} /> View
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
          <div className="flex justify-center items-center gap-3 mt-8">
            <motion.button whileHover={{ scale: 1.05 }} disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 text-sm font-medium text-theme-primary rounded-xl disabled:opacity-40 transition"
              style={{ background: 'rgba(99,102,241,0.15)', border: "1px solid var(--border-primary)" }}>
              Previous
            </motion.button>
            <span className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: 'monospace' }}>
              {page} / {Math.ceil(total / 12)}
            </span>
            <motion.button whileHover={{ scale: 1.05 }} disabled={page >= Math.ceil(total / 12)} onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-sm font-medium text-theme-primary rounded-xl disabled:opacity-40 transition"
              style={{ background: 'rgba(99,102,241,0.15)', border: "1px solid var(--border-primary)" }}>
              Next
            </motion.button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={fetchResources} />}
      </AnimatePresence>
    </div>
  )
}
