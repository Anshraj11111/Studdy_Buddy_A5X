import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../services/api'
import {
  MessageSquare,
  Search,
  RefreshCw,
  Loader2,
  Edit2,
  Trash2,
  Save,
  X,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Filter,
} from 'lucide-react'

export default function DoubtsManagement({ showToast }) {
  const [doubts, setDoubts] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [topicFilter, setTopicFilter] = useState('all')
  const [expandedDoubt, setExpandedDoubt] = useState(null)
  const [editingDoubt, setEditingDoubt] = useState(null)
  const [editingReply, setEditingReply] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [replyEditForm, setReplyEditForm] = useState({})
  const [updating, setUpdating] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 })

  const topics = ['All', 'Programming', 'Robotics', 'AI/ML', 'IoT', 'Electronics', 'Embedded Systems', 'Other']

  const fetchDoubts = async (page = 1) => {
    setLoading(true)
    try {
      const params = { page, limit: pagination.limit }
      if (statusFilter !== 'all') params.status = statusFilter
      if (topicFilter !== 'all') params.topic = topicFilter
      if (searchQuery.trim()) params.search = searchQuery.trim()

      const res = await api.get('/admin/doubts', { params })
      setDoubts(res.data.data.doubts || [])
      setPagination(res.data.data.pagination || { page: 1, limit: 20, total: 0, pages: 0 })
    } catch (err) {
      console.error('Error fetching doubts:', err)
      showToast(err.response?.data?.error?.message || 'Failed to load doubts', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDoubts()
  }, [statusFilter, topicFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchDoubts(1)
  }

  const handleEditDoubt = (doubt) => {
    setEditingDoubt(doubt._id)
    setEditForm({
      title: doubt.title,
      description: doubt.description,
      topic: doubt.topic,
      status: doubt.status,
    })
  }

  const handleCancelEditDoubt = () => {
    setEditingDoubt(null)
    setEditForm({})
  }

  const handleUpdateDoubt = async (doubtId) => {
    if (!editForm.title?.trim() || !editForm.description?.trim()) {
      showToast('Title and description are required', 'error')
      return
    }

    setUpdating(true)
    try {
      const res = await api.put(`/admin/doubts/${doubtId}`, editForm)
      setDoubts(prev =>
        prev.map(d => (d._id === doubtId ? res.data.data.doubt : d))
      )
      setEditingDoubt(null)
      setEditForm({})
      showToast('Doubt updated successfully!', 'success')
    } catch (err) {
      console.error('Error updating doubt:', err)
      showToast(err?.response?.data?.error?.message || 'Failed to update doubt', 'error')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteDoubt = async (doubtId, title) => {
    if (!window.confirm(`Delete doubt "${title}"?\n\nThis will also delete all replies.`)) return

    try {
      await api.delete(`/admin/doubts/${doubtId}`)
      setDoubts(prev => prev.filter(d => d._id !== doubtId))
      if (expandedDoubt === doubtId) setExpandedDoubt(null)
      showToast('Doubt deleted successfully', 'success')
    } catch (err) {
      console.error('Error deleting doubt:', err)
      showToast(err?.response?.data?.error?.message || 'Failed to delete doubt', 'error')
    }
  }

  const handleEditReply = (doubtId, reply) => {
    setEditingReply(`${doubtId}-${reply._id}`)
    setReplyEditForm({ content: reply.content })
  }

  const handleCancelEditReply = () => {
    setEditingReply(null)
    setReplyEditForm({})
  }

  const handleUpdateReply = async (doubtId, replyId) => {
    if (!replyEditForm.content?.trim()) {
      showToast('Reply content is required', 'error')
      return
    }

    setUpdating(true)
    try {
      const res = await api.put(`/admin/doubts/${doubtId}/replies/${replyId}`, replyEditForm)
      setDoubts(prev =>
        prev.map(d => (d._id === doubtId ? res.data.data.doubt : d))
      )
      setEditingReply(null)
      setReplyEditForm({})
      showToast('Reply updated successfully!', 'success')
    } catch (err) {
      console.error('Error updating reply:', err)
      showToast(err?.response?.data?.error?.message || 'Failed to update reply', 'error')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteReply = async (doubtId, replyId, userName) => {
    if (!window.confirm(`Delete reply by ${userName}?`)) return

    try {
      const res = await api.delete(`/admin/doubts/${doubtId}/replies/${replyId}`)
      setDoubts(prev =>
        prev.map(d => (d._id === doubtId ? res.data.data.doubt : d))
      )
      showToast('Reply deleted successfully', 'success')
    } catch (err) {
      console.error('Error deleting reply:', err)
      showToast(err?.response?.data?.error?.message || 'Failed to delete reply', 'error')
    }
  }

  const toggleExpand = (doubtId) => {
    setExpandedDoubt(expandedDoubt === doubtId ? null : doubtId)
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return { bg: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' }
      case 'matched':
        return { bg: 'rgba(99,102,241,0.2)', color: '#818cf8', border: 'rgba(99,102,241,0.3)' }
      case 'resolved':
        return { bg: 'rgba(34,197,94,0.2)', color: '#22c55e', border: 'rgba(34,197,94,0.3)' }
      default:
        return { bg: 'rgba(148,163,184,0.2)', color: '#94a3b8', border: 'rgba(148,163,184,0.3)' }
    }
  }

  return (
    <div>
      <div style={{
        borderRadius: 18,
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-secondary)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
      }}>
        <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#8b5cf6,#6366f1,transparent)' }} />

        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(139,92,246,0.1)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={18} color="#8b5cf6" />
              <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 15 }}>
                Doubts Management
              </span>
              {pagination.total > 0 && (
                <span style={{
                  background: 'rgba(139,92,246,0.2)',
                  color: '#a78bfa',
                  borderRadius: 99,
                  padding: '2px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {pagination.total}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={topicFilter}
                onChange={e => setTopicFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: 'rgba(139,92,246,0.15)',
                  border: '1px solid var(--border-primary)',
                  color: '#c4b5fd',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {topics.map(topic => (
                  <option
                    key={topic}
                    value={topic.toLowerCase()}
                    style={{ background: '#1e293b', color: '#c4b5fd', fontWeight: 600 }}
                  >
                    {topic}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: 'rgba(139,92,246,0.15)',
                  border: '1px solid var(--border-primary)',
                  color: '#c4b5fd',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="all" style={{ background: '#1e293b', color: '#c4b5fd' }}>All Status</option>
                <option value="open" style={{ background: '#1e293b', color: '#c4b5fd' }}>Open</option>
                <option value="matched" style={{ background: '#1e293b', color: '#c4b5fd' }}>Matched</option>
                <option value="resolved" style={{ background: '#1e293b', color: '#c4b5fd' }}>Resolved</option>
              </select>

              <button
                onClick={() => fetchDoubts(pagination.page)}
                style={{
                  background: 'rgba(139,92,246,0.15)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 8,
                  color: '#c4b5fd',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                type="text"
                placeholder="Search doubts by title or description..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 14px 8px 38px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid rgba(139,92,246,0.3)',
                background: 'rgba(139,92,246,0.15)',
                color: '#a78bfa',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  fetchDoubts(1)
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid rgba(148,163,184,0.3)',
                  background: 'rgba(148,163,184,0.1)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Doubts List */}
        <div style={{ padding: '16px', maxHeight: 700, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Loader2 size={28} style={{ color: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 12 }}>
                Loading doubts...
              </p>
            </div>
          ) : doubts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <MessageSquare size={48} style={{ color: 'rgba(148,163,184,0.3)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No doubts found</p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 4 }}>
                Try adjusting your filters
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {doubts.map((doubt, index) => {
                const isExpanded = expandedDoubt === doubt._id
                const isEditing = editingDoubt === doubt._id
                const statusColors = getStatusColor(doubt.status)

                return (
                  <motion.div
                    key={doubt._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 12,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Doubt Header */}
                    <div style={{ padding: '16px' }}>
                      {isEditing ? (
                        // Edit Mode
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div>
                            <label style={{
                              display: 'block',
                              color: 'var(--text-secondary)',
                              fontSize: 12,
                              marginBottom: 6,
                              fontWeight: 600,
                            }}>
                              Title
                            </label>
                            <input
                              type="text"
                              value={editForm.title}
                              onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 8,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border-primary)',
                                color: 'var(--text-primary)',
                                fontSize: 14,
                                outline: 'none',
                              }}
                            />
                          </div>
                          <div>
                            <label style={{
                              display: 'block',
                              color: 'var(--text-secondary)',
                              fontSize: 12,
                              marginBottom: 6,
                              fontWeight: 600,
                            }}>
                              Description
                            </label>
                            <textarea
                              value={editForm.description}
                              onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                              rows={4}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 8,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border-primary)',
                                color: 'var(--text-primary)',
                                fontSize: 13,
                                outline: 'none',
                                resize: 'vertical',
                              }}
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                              <label style={{
                                display: 'block',
                                color: 'var(--text-secondary)',
                                fontSize: 12,
                                marginBottom: 6,
                                fontWeight: 600,
                              }}>
                                Topic
                              </label>
                              <select
                                value={editForm.topic}
                                onChange={e => setEditForm(p => ({ ...p, topic: e.target.value }))}
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  borderRadius: 8,
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid var(--border-primary)',
                                  color: 'var(--text-primary)',
                                  fontSize: 13,
                                  outline: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                {topics.slice(1).map(topic => (
                                  <option key={topic} value={topic} style={{ background: '#1e293b' }}>
                                    {topic}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{
                                display: 'block',
                                color: 'var(--text-secondary)',
                                fontSize: 12,
                                marginBottom: 6,
                                fontWeight: 600,
                              }}>
                                Status
                              </label>
                              <select
                                value={editForm.status}
                                onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  borderRadius: 8,
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid var(--border-primary)',
                                  color: 'var(--text-primary)',
                                  fontSize: 13,
                                  outline: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                <option value="open" style={{ background: '#1e293b' }}>Open</option>
                                <option value="matched" style={{ background: '#1e293b' }}>Matched</option>
                                <option value="resolved" style={{ background: '#1e293b' }}>Resolved</option>
                              </select>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleUpdateDoubt(doubt._id)}
                              disabled={updating}
                              style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                border: '1px solid rgba(34,197,94,0.4)',
                                background: 'rgba(34,197,94,0.12)',
                                color: '#22c55e',
                                cursor: updating ? 'not-allowed' : 'pointer',
                                fontSize: 13,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                opacity: updating ? 0.6 : 1,
                              }}
                            >
                              {updating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                              Save
                            </button>
                            <button
                              onClick={handleCancelEditDoubt}
                              disabled={updating}
                              style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                border: '1px solid rgba(148,163,184,0.4)',
                                background: 'rgba(148,163,184,0.12)',
                                color: '#94a3b8',
                                cursor: updating ? 'not-allowed' : 'pointer',
                                fontSize: 13,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                opacity: updating ? 0.6 : 1,
                              }}
                            >
                              <X size={14} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: 12,
                            gap: 12,
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h3 style={{
                                color: 'var(--text-primary)',
                                fontSize: 15,
                                fontWeight: 700,
                                marginBottom: 8,
                              }}>
                                {doubt.title}
                              </h3>
                              <p style={{
                                color: 'var(--text-secondary)',
                                fontSize: 13,
                                lineHeight: 1.6,
                                marginBottom: 12,
                              }}>
                                {doubt.description}
                              </p>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{
                                  background: 'rgba(139,92,246,0.15)',
                                  color: '#a78bfa',
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}>
                                  {doubt.topic}
                                </span>
                                <span style={{
                                  background: statusColors.bg,
                                  color: statusColors.color,
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  border: `1px solid ${statusColors.border}`,
                                }}>
                                  {doubt.status.toUpperCase()}
                                </span>
                                <span style={{
                                  color: 'var(--text-tertiary)',
                                  fontSize: 11,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}>
                                  <User size={12} />
                                  {doubt.userId?.name || 'Unknown'}
                                </span>
                                <span style={{
                                  color: 'var(--text-tertiary)',
                                  fontSize: 11,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}>
                                  <Calendar size={12} />
                                  {formatDate(doubt.createdAt)}
                                </span>
                                {doubt.replies?.length > 0 && (
                                  <span style={{
                                    color: 'var(--text-tertiary)',
                                    fontSize: 11,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}>
                                    <MessageCircle size={12} />
                                    {doubt.replies.length} {doubt.replies.length === 1 ? 'Reply' : 'Replies'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button
                                onClick={() => handleEditDoubt(doubt)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 8,
                                  border: '1px solid rgba(99,102,241,0.4)',
                                  background: 'rgba(99,102,241,0.12)',
                                  color: '#818cf8',
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <Edit2 size={12} />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteDoubt(doubt._id, doubt.title)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 8,
                                  border: '1px solid rgba(239,68,68,0.4)',
                                  background: 'rgba(239,68,68,0.12)',
                                  color: '#f87171',
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                              {doubt.replies?.length > 0 && (
                                <button
                                  onClick={() => toggleExpand(doubt._id)}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(139,92,246,0.4)',
                                    background: 'rgba(139,92,246,0.12)',
                                    color: '#a78bfa',
                                    cursor: 'pointer',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  {isExpanded ? 'Hide' : 'Show'} Replies
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Replies Section */}
                    <AnimatePresence>
                      {isExpanded && doubt.replies?.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{
                            borderTop: '1px solid var(--border-primary)',
                            background: 'rgba(0,0,0,0.2)',
                          }}
                        >
                          <div style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              {doubt.replies.map(reply => {
                                const isEditingReply = editingReply === `${doubt._id}-${reply._id}`

                                return (
                                  <div
                                    key={reply._id}
                                    style={{
                                      background: 'rgba(255,255,255,0.03)',
                                      border: '1px solid var(--border-primary)',
                                      borderRadius: 10,
                                      padding: '12px',
                                    }}
                                  >
                                    {isEditingReply ? (
                                      // Edit Reply Mode
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <textarea
                                          value={replyEditForm.content}
                                          onChange={e => setReplyEditForm({ content: e.target.value })}
                                          rows={3}
                                          style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: 8,
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid var(--border-primary)',
                                            color: 'var(--text-primary)',
                                            fontSize: 13,
                                            outline: 'none',
                                            resize: 'vertical',
                                          }}
                                        />
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                          <button
                                            onClick={() => handleUpdateReply(doubt._id, reply._id)}
                                            disabled={updating}
                                            style={{
                                              padding: '6px 12px',
                                              borderRadius: 6,
                                              border: '1px solid rgba(34,197,94,0.4)',
                                              background: 'rgba(34,197,94,0.12)',
                                              color: '#22c55e',
                                              cursor: updating ? 'not-allowed' : 'pointer',
                                              fontSize: 12,
                                              fontWeight: 600,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 4,
                                              opacity: updating ? 0.6 : 1,
                                            }}
                                          >
                                            {updating ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={12} />}
                                            Save
                                          </button>
                                          <button
                                            onClick={handleCancelEditReply}
                                            disabled={updating}
                                            style={{
                                              padding: '6px 12px',
                                              borderRadius: 6,
                                              border: '1px solid rgba(148,163,184,0.4)',
                                              background: 'rgba(148,163,184,0.12)',
                                              color: '#94a3b8',
                                              cursor: updating ? 'not-allowed' : 'pointer',
                                              fontSize: 12,
                                              fontWeight: 600,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 4,
                                              opacity: updating ? 0.6 : 1,
                                            }}
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      // View Reply Mode
                                      <div>
                                        <div style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'flex-start',
                                          marginBottom: 8,
                                        }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{
                                              width: 28,
                                              height: 28,
                                              borderRadius: 6,
                                              background: reply.user?.role === 'mentor' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              fontSize: 11,
                                              fontWeight: 700,
                                              color: '#fff',
                                              flexShrink: 0,
                                            }}>
                                              {reply.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{
                                                  color: 'var(--text-primary)',
                                                  fontSize: 13,
                                                  fontWeight: 600,
                                                }}>
                                                  {reply.user?.name || 'Unknown'}
                                                </span>
                                                {reply.user?.role === 'mentor' && (
                                                  <span style={{
                                                    background: 'rgba(16,185,129,0.2)',
                                                    color: '#10b981',
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    fontSize: 9,
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                  }}>
                                                    MENTOR
                                                  </span>
                                                )}
                                              </div>
                                              <span style={{
                                                color: 'var(--text-tertiary)',
                                                fontSize: 10,
                                              }}>
                                                {formatDate(reply.createdAt)}
                                                {reply.isEdited && ' (edited)'}
                                              </span>
                                            </div>
                                          </div>
                                          <div style={{ display: 'flex', gap: 4 }}>
                                            <button
                                              onClick={() => handleEditReply(doubt._id, reply)}
                                              style={{
                                                padding: '4px 8px',
                                                borderRadius: 6,
                                                border: '1px solid rgba(99,102,241,0.4)',
                                                background: 'rgba(99,102,241,0.12)',
                                                color: '#818cf8',
                                                cursor: 'pointer',
                                                fontSize: 10,
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 3,
                                              }}
                                            >
                                              <Edit2 size={10} />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteReply(doubt._id, reply._id, reply.user?.name)}
                                              style={{
                                                padding: '4px 8px',
                                                borderRadius: 6,
                                                border: '1px solid rgba(239,68,68,0.4)',
                                                background: 'rgba(239,68,68,0.12)',
                                                color: '#f87171',
                                                cursor: 'pointer',
                                                fontSize: 10,
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 3,
                                              }}
                                            >
                                              <Trash2 size={10} />
                                            </button>
                                          </div>
                                        </div>
                                        <p style={{
                                          color: 'var(--text-secondary)',
                                          fontSize: 13,
                                          lineHeight: 1.6,
                                          margin: 0,
                                        }}>
                                          {reply.content}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
              marginTop: 20,
              paddingTop: 20,
              borderTop: '1px solid var(--border-primary)',
            }}>
              <button
                onClick={() => fetchDoubts(pagination.page - 1)}
                disabled={pagination.page === 1}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border-primary)',
                  background: pagination.page === 1 ? 'rgba(148,163,184,0.1)' : 'rgba(139,92,246,0.15)',
                  color: pagination.page === 1 ? '#64748b' : '#a78bfa',
                  cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Previous
              </button>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => fetchDoubts(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border-primary)',
                  background: pagination.page === pagination.pages ? 'rgba(148,163,184,0.1)' : 'rgba(139,92,246,0.15)',
                  color: pagination.page === pagination.pages ? '#64748b' : '#a78bfa',
                  cursor: pagination.page === pagination.pages ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
