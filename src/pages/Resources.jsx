import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { resourceAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { uploadToCloudinary } from '../utils/cloudinary'
import {
  Download, Search, Upload, X, FileText, Film, Image,
  Loader2, ExternalLink, Trash2, Plus
} from 'lucide-react'

const TOPICS = ['Robotics', 'Programming', 'AI/ML', 'IoT', 'Electronics', 'Embedded Systems']

function fileIcon(type) {
  if (!type) return <FileText size={20} className="text-gray-400" />
  if (type.startsWith('video')) return <Film size={20} className="text-purple-500" />
  if (type.startsWith('image')) return <Image size={20} className="text-blue-500" />
  return <FileText size={20} className="text-green-500" />
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
    if (f.size > 50 * 1024 * 1024) { setError('File must be under 50MB'); return }
    setFile(f)
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.description || !form.topic) { setError('Fill all required fields'); return }
    if (!file) { setError('Please select a file'); return }
    setUploading(true)
    setError('')
    try {
      const { url } = await uploadToCloudinary(file, 'studdy-buddy/resources')
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
      await resourceAPI.create({
        title: form.title,
        description: form.description,
        topic: form.topic,
        tags,
        fileUrl: url,
        fileType: file.type || 'other',
      })
      onUploaded()
      onClose()
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-x-4 top-16 z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg mx-auto overflow-hidden max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-white">Upload Resource</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* File picker */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
              file ? 'border-green-400 bg-green-50 dark:bg-green-900/10' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
            }`}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2">
                {fileIcon(file.type)}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[200px]">{file.name}</span>
                <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }}
                  className="text-red-400 hover:text-red-600 ml-1"><X size={14} /></button>
              </div>
            ) : (
              <>
                <Upload size={28} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Click to select file <span className="text-gray-400">(PDF, video, image, doc — max 50MB)</span></p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden" onChange={onFileChange}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*,video/*" />

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Resource title"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Description *</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of this resource"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Topic *</label>
            <select value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Tags <span className="font-normal text-gray-400">(comma separated)</span></label>
            <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              placeholder="e.g. arduino, servo, beginner"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
        </form>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button onClick={submit} disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition">
            {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : <><Upload size={16} /> Upload Resource</>}
          </button>
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

  const fetchResources = async () => {
    try {
      setLoading(true)
      let res
      if (search) {
        res = await resourceAPI.search(search)
      } else if (topic) {
        res = await resourceAPI.getByTopic(topic, page)
      } else {
        res = await resourceAPI.list(page, 12)
      }
      const d = res.data.data
      setResources(Array.isArray(d) ? d : d?.resources || [])
      setTotal(res.data.data?.pagination?.total || res.data.total || 0)
    } catch {
      setResources([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchResources() }, [page, search, topic])

  const handleDownload = async (resource) => {
    try {
      await resourceAPI.download(resource._id)
      window.open(resource.fileUrl, '_blank')
    } catch {
      window.open(resource.fileUrl, '_blank')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resource?')) return
    try {
      await resourceAPI.delete(id)
      setResources(prev => prev.filter(r => r._id !== id))
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-20">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Resources</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Learning materials from mentors</p>
          </div>
          {user?.role === 'mentor' && (
            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition shadow-sm">
              <Plus size={16} /> Upload
            </button>
          )}
        </div>

        {/* Search + Topic filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm mb-5 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search resources..."
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setTopic(''); setPage(1) }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${!topic ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
              All
            </button>
            {TOPICS.map(t => (
              <button key={t} onClick={() => { setTopic(t); setPage(1) }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${topic === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 className="animate-spin text-indigo-500" size={30} />
            <p className="text-sm text-gray-400">Loading resources...</p>
          </div>
        ) : resources.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-sm">
            <FileText size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="font-semibold text-gray-600 dark:text-gray-300 mb-1">No resources found</p>
            <p className="text-sm text-gray-400">
              {search ? `No results for "${search}"` : topic ? `No resources in ${topic} yet` : 'No resources uploaded yet'}
            </p>
            {user?.role === 'mentor' && (
              <button onClick={() => setShowUpload(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition">
                Upload the first resource
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((r, i) => (
              <motion.div key={r._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      {fileIcon(r.fileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2">{r.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.uploadedBy?.name || 'Mentor'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">{r.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    <span className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">{r.topic}</span>
                    {r.tags?.slice(0, 2).map(tag => (
                      <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Download size={12} /> {r.downloads || 0}
                    </span>
                    <div className="flex items-center gap-1">
                      {user?.role === 'mentor' && String(r.uploadedBy?._id) === String(user?._id) && (
                        <button onClick={() => handleDelete(r._id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                          <Trash2 size={13} />
                        </button>
                      )}
                      <button onClick={() => handleDownload(r)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition">
                        <ExternalLink size={12} /> View
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 12 && (
          <div className="flex justify-center gap-2 mt-8">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-500">Page {page} of {Math.ceil(total / 12)}</span>
            <button disabled={page >= Math.ceil(total / 12)} onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Next
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={fetchResources} />}
      </AnimatePresence>
    </div>
  )
}
