import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Edit, Youtube, Loader2, FileText, Upload as UploadIcon, Trash2 } from 'lucide-react'
import { resourceAPI } from '../services/api'

const TOPICS = ['Robotics', 'Programming', 'AI/ML', 'IoT', 'Electronics', 'Embedded Systems']

// YouTube helpers
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

export default function EditResourceModal({ resource, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: resource.title || '',
    description: resource.description || '',
    topic: resource.topic || 'Robotics',
    tags: (resource.tags || []).join(', '),
    youtubeUrl: resource.fileUrl || '',
  })
  const [notesFile, setNotesFile] = useState(null)
  const [existingNotes, setExistingNotes] = useState(resource.notesUrl || '')
  const [deletingNotes, setDeletingNotes] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  const inputStyle = {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '0.8rem',
    width: '100%',
    outline: 'none'
  }

  const submit = async (e) => {
    e.preventDefault()
    // Only Title and Topic are required - Description is optional
    if (!form.title || !form.topic) {
      setError('Fill all required fields (Title and Topic)')
      return
    }

    // For YouTube videos, validate URL
    if (resource.fileType === 'link') {
      if (!form.youtubeUrl.trim()) {
        setError('YouTube URL is required')
        return
      }
      if (!isYouTubeUrl(form.youtubeUrl)) {
        setError('Please enter a valid YouTube URL')
        return
      }
    }

    setUpdating(true)
    setError('')

    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
      const updateData = {
        title: form.title.trim(),
        description: form.description.trim() || '', // Optional - can be empty
        topic: form.topic,
        tags,
      }

      // If it's a YouTube video, include the URL
      if (resource.fileType === 'link') {
        updateData.fileUrl = form.youtubeUrl.trim()
      }

      // Upload new notes file if provided
      if (notesFile) {
        const formData = new FormData()
        formData.append('notes', notesFile)
        const uploadRes = await resourceAPI.uploadNotes(formData)
        if (uploadRes.data?.success) {
          updateData.notesUrl = uploadRes.data.data.url
        }
      } else if (!deletingNotes && existingNotes) {
        // Keep existing notes if not deleted
        updateData.notesUrl = existingNotes
      } else {
        // Remove notes if deleted
        updateData.notesUrl = ''
      }

      console.log('Updating resource with data:', updateData)
      const res = await resourceAPI.update(resource._id, updateData)
      console.log('Update response:', res.data)
      
      if (!res.data?.success) throw new Error(res.data?.error?.message || 'Update failed')
      
      onUpdated()
      onClose()
    } catch (err) {
      console.error('Update error:', err)
      setError(err.response?.data?.error?.message || err.message || 'Update failed')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="fixed inset-x-4 top-16 z-50 rounded-2xl max-w-xl mx-auto overflow-hidden flex flex-col"
        style={{
          maxHeight: '90vh',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
        }}>
        
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-primary)' }}>
          <h2 className="font-bold text-theme-primary flex items-center gap-2">
            <Edit size={17} style={{ color: '#6366f1' }} /> Edit Resource
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10">
            <X size={16} className="text-theme-tertiary" />
          </button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* YouTube URL field (only for video links) */}
          {resource.fileType === 'link' && (
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-theme-secondary">YouTube URL *</label>
              <div className="relative">
                <Youtube size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#ef4444' }} />
                <input
                  value={form.youtubeUrl}
                  onChange={e => setForm(p => ({ ...p, youtubeUrl: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  style={{ ...inputStyle, paddingLeft: '36px' }}
                />
              </div>
              {form.youtubeUrl && getYouTubeId(form.youtubeUrl) && (
                <div className="mt-2 flex items-center gap-2.5 p-2 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <img
                    src={`https://img.youtube.com/vi/${getYouTubeId(form.youtubeUrl)}/mqdefault.jpg`}
                    alt="thumb"
                    className="w-16 h-10 rounded object-cover flex-shrink-0"
                  />
                  <span className="text-xs font-medium" style={{ color: '#16a34a' }}>✓ Valid YouTube video</span>
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-theme-secondary">Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Resource title"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-theme-secondary">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Brief description..."
              rows={3}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

          {/* Topic */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-theme-secondary">Topic *</label>
            <select
              value={form.topic}
              onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-theme-secondary">
              Tags <span className="text-theme-tertiary font-normal">(comma separated)</span>
            </label>
            <input
              value={form.tags}
              onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              placeholder="e.g. arduino, servo, beginner"
              style={inputStyle}
            />
          </div>

          {/* Notes Upload/Delete */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-theme-secondary">
              Notes (PDF/DOC) <span className="text-theme-tertiary font-normal">(optional)</span>
            </label>
            
            {/* Show existing notes */}
            {existingNotes && !deletingNotes && !notesFile && (
              <div className="flex items-center justify-between p-3 rounded-lg mb-2" 
                   style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div className="flex items-center gap-2">
                  <FileText size={16} style={{ color: '#10b981' }} />
                  <span className="text-xs font-medium text-theme-primary">Notes attached</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeletingNotes(true)
                    setExistingNotes('')
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 rounded">
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            )}

            {/* Upload new notes */}
            {(!existingNotes || deletingNotes) && !notesFile && (
              <label
                className="flex flex-col items-center justify-center p-4 rounded-lg cursor-pointer transition-all hover:border-indigo-500"
                style={{ border: '2px dashed var(--border-primary)', background: 'var(--bg-primary)' }}>
                <UploadIcon size={20} className="text-theme-tertiary mb-2" />
                <span className="text-xs text-theme-secondary">Click to upload notes (PDF/DOC)</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={e => setNotesFile(e.target.files[0])}
                  className="hidden"
                />
              </label>
            )}

            {/* Show selected new file */}
            {notesFile && (
              <div className="flex items-center justify-between p-3 rounded-lg" 
                   style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <div className="flex items-center gap-2">
                  <FileText size={16} style={{ color: '#6366f1' }} />
                  <span className="text-xs font-medium text-theme-primary truncate max-w-[200px]">{notesFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNotesFile(null)}
                  className="text-red-400 ml-1">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-500 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}
        </form>

        <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={submit}
            disabled={updating}
            className="w-full flex items-center justify-center gap-2 py-3 text-white font-semibold text-sm rounded-xl transition disabled:opacity-50"
            style={{ background: '#6366f1' }}>
            {updating ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Updating...
              </>
            ) : (
              <>
                <Edit size={16} /> Update Resource
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </>
  )
}
