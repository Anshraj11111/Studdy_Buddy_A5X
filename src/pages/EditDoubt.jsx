import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { doubtAPI } from '../services/api'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Save, X, Edit3, Tag, BookOpen, AlignLeft, Loader2, FileQuestion } from 'lucide-react'

const TOPICS = ['Robotics', 'Programming', 'Electronics', 'Mechanics', 'AI/ML']

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(99,102,241,0.2)',
  color: 'white',
  borderRadius: '12px',
  padding: '12px 16px',
  fontSize: '0.9rem',
  width: '100%',
  outline: 'none',
}

export default function EditDoubt() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ title: '', description: '', topic: '', tags: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const fetchDoubt = async () => {
      try {
        const res = await doubtAPI.getById(id)
        const d = res.data.data.doubt
        setFormData({ title: d.title, description: d.description, topic: d.topic, tags: d.tags?.join(', ') || '' })
      } catch (err) { setError('Failed to load doubt') }
      finally { setLoading(false) }
    }
    fetchDoubt()
  }, [id])

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSubmitting(true)
    try {
      await doubtAPI.update(id, { title: formData.title, description: formData.description, topic: formData.topic, tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean) })
      navigate('/doubts')
    } catch (err) { setError(err.response?.data?.error?.message || 'Failed to update doubt') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="flex min-h-screen" style={{ position: 'relative' }}>
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(/src/assets/image.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(5,3,20,0.82)' }} />
      <div style={{ position: 'relative', zIndex: 60 }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="relative flex-1 lg:ml-[240px] mt-16 px-3 sm:px-5 py-8 flex items-start justify-center" style={{ zIndex: 5 }}>
        {loading ? (
          <div className="flex flex-col items-center py-24 gap-3">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Loader2 size={36} style={{ color: '#818cf8' }} />
            </motion.div>
            <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.8rem', fontFamily: 'monospace' }}>Loading doubt...</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <motion.div animate={{ boxShadow: ['0 0 0px rgba(99,102,241,0)', '0 0 20px rgba(99,102,241,0.5)', '0 0 0px rgba(99,102,241,0)'] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.25))', border: '1px solid rgba(99,102,241,0.4)' }}>
                <Edit3 size={22} style={{ color: '#818cf8' }} />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg,#a5b4fc,#818cf8,#c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Edit Doubt
                </h1>
                <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.8rem', fontFamily: 'monospace' }}>Update your question</p>
              </div>
            </div>

            {/* Form Card */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(10,8,30,0.8)', border: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(24px)' }}>
              <div className="h-0.5" style={{ background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
              <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">

                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: 'rgba(148,163,184,0.7)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <FileQuestion size={12} /> Title *
                  </label>
                  <input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                    placeholder="What's your doubt?" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.2)'} />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: 'rgba(148,163,184,0.7)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <AlignLeft size={12} /> Description *
                  </label>
                  <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe your doubt in detail..." rows={6}
                    style={{ ...inputStyle, resize: 'vertical' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.2)'} />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: 'rgba(148,163,184,0.7)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <BookOpen size={12} /> Topic
                  </label>
                  <select value={formData.topic} onChange={e => setFormData(p => ({ ...p, topic: e.target.value }))}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="" style={{ background: '#0a0820' }}>Select a topic</option>
                    {TOPICS.map(t => <option key={t} value={t} style={{ background: '#0a0820' }}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: 'rgba(148,163,184,0.7)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <Tag size={12} /> Tags <span style={{ color: 'rgba(148,163,184,0.4)', fontWeight: 400, textTransform: 'none' }}>(comma separated)</span>
                  </label>
                  <input value={formData.tags} onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))}
                    placeholder="python, beginner, help" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.2)'} />
                </div>

                {error && (
                  <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <motion.button type="submit" disabled={submitting} whileHover={{ scale: submitting ? 1 : 1.02 }} whileTap={{ scale: submitting ? 1 : 0.98 }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-white font-semibold rounded-xl transition disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
                    {submitting ? <><Loader2 size={16} className="animate-spin" /> Updating...</> : <><Save size={16} /> Update Doubt</>}
                  </motion.button>
                  <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/doubts')}
                    className="px-6 py-3 font-semibold rounded-xl transition"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(148,163,184,0.8)' }}>
                    <X size={16} />
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
