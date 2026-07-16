import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { adminAPI } from "../services/api"
import { Users, GraduationCap, BookOpen, FileText, Search, RefreshCw, Shield, Loader2, Trash2, ToggleLeft, ToggleRight, LogOut, TrendingUp, Settings, School, MapPin, MessageSquare, Filter, Calendar, Eye, Radio, Plus } from "lucide-react"
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || "H5"


// â”€â”€ School Channel Management Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SchoolChannelManagement({ showToast }) {
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newChannel, setNewChannel] = useState({ schoolName: '', city: '', description: '' })
  const [expandedChannel, setExpandedChannel] = useState(null)
  const [channelMembers, setChannelMembers] = useState({})
  const [loadingMembers, setLoadingMembers] = useState({})
  
  // Broadcast message state
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [selectedChannels, setSelectedChannels] = useState([])
  const [broadcasting, setBroadcasting] = useState(false)

  const fetchChannels = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      console.log('Fetching channels from:', `${API_URL}/school-channel/admin/all`)
      const res = await axios.get(`${API_URL}/school-channel/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      console.log('Channels response:', res.data)
      setChannels(res.data.channels || [])
    } catch (err) {
      console.error('Error fetching channels:', err)
      console.error('Error response:', err.response?.data)
      showToast(err.response?.data?.error?.message || 'Failed to load channels', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchChannelMembers = async (channelId) => {
    if (channelMembers[channelId]) {
      // Already loaded
      setExpandedChannel(expandedChannel === channelId ? null : channelId)
      return
    }

    setLoadingMembers(prev => ({ ...prev, [channelId]: true }))
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API_URL}/school-channel/admin/${channelId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setChannelMembers(prev => ({ ...prev, [channelId]: res.data.members || [] }))
      setExpandedChannel(channelId)
    } catch (err) {
      console.error('Error fetching members:', err)
      showToast('Failed to load members', 'error')
    } finally {
      setLoadingMembers(prev => ({ ...prev, [channelId]: false }))
    }
  }

  useEffect(() => {
    fetchChannels()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newChannel.schoolName.trim() || !newChannel.city.trim()) {
      showToast('School name and city are required', 'error')
      return
    }

    setCreating(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(`${API_URL}/school-channel/admin/create`, newChannel, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNewChannel({ schoolName: '', city: '', description: '' })
      fetchChannels()
      showToast('School channel created!', 'success')
    } catch (err) {
      console.error('Error creating channel:', err)
      showToast(err?.response?.data?.error?.message || 'Failed to create channel', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id, schoolName) => {
    if (!window.confirm(`Delete channel "${schoolName}"? All students will lose access.`)) return
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/school-channel/admin/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setChannels(prev => prev.filter(c => c._id !== id))
      showToast('Channel deleted', 'success')
    } catch (err) {
      console.error('Error deleting channel:', err)
      showToast('Failed to delete channel', 'error')
    }
  }

  const handleBroadcastMessage = async () => {
    if (!broadcastMessage.trim()) {
      showToast('Please enter a message', 'error')
      return
    }
    if (selectedChannels.length === 0) {
      showToast('Please select at least one school', 'error')
      return
    }

    setBroadcasting(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(`${API_URL}/school-channel/admin/broadcast`, {
        message: broadcastMessage,
        channelIds: selectedChannels
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setBroadcastMessage('')
      setSelectedChannels([])
      setShowBroadcast(false)
      showToast(`Message sent to ${selectedChannels.length} school(s)!`, 'success')
    } catch (err) {
      console.error('Error broadcasting:', err)
      showToast('Failed to send broadcast message', 'error')
    } finally {
      setBroadcasting(false)
    }
  }

  const toggleChannelSelection = (channelId) => {
    setSelectedChannels(prev => 
      prev.includes(channelId) 
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    )
  }

  const selectAllChannels = () => {
    setSelectedChannels(channels.map(c => c._id))
  }

  const deselectAllChannels = () => {
    setSelectedChannels([])
  }

  return (
    <div>
      {/* Broadcast Message Section */}
      <div style={{
        borderRadius: 18,
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border-secondary)",
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        marginBottom: 24
      }}>
        <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#ec4899,#f43f5e,transparent)' }} />
        <div style={{
          padding: '16px 20px',
          borderBottom: showBroadcast ? '1px solid rgba(236,72,153,0.1)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer'
        }} onClick={() => setShowBroadcast(!showBroadcast)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={18} color="#ec4899" />
            <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>Broadcast Message to Schools</span>
          </div>
          <motion.div
            animate={{ rotate: showBroadcast ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 6L8 10L12 6" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
        </div>
        
        <AnimatePresence>
          {showBroadcast && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', color: "var(--text-secondary)", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
                    Broadcast Message *
                  </label>
                  <textarea
                    placeholder="Type your message to send to selected schools..."
                    value={broadcastMessage}
                    onChange={e => setBroadcastMessage(e.target.value)}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-primary)',
                      color: "var(--text-primary)",
                      fontSize: 14,
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ color: "var(--text-secondary)", fontSize: 12, fontWeight: 600 }}>
                      Select Schools ({selectedChannels.length} selected)
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={selectAllChannels} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(236,72,153,0.3)', background: 'rgba(236,72,153,0.1)', color: '#ec4899', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        Select All
                      </button>
                      <button type="button" onClick={deselectAllChannels} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(148,163,184,0.1)', color: '#94a3b8', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        Clear
                      </button>
                    </div>
                  </div>

                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-primary)', borderRadius: 10, padding: 8 }}>
                    {channels.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: 'center', padding: 20 }}>
                        No channels available. Create channels first.
                      </p>
                    ) : (
                      channels.map(channel => (
                        <label key={channel._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: selectedChannels.includes(channel._id) ? 'rgba(236,72,153,0.15)' : 'transparent', marginBottom: 4, transition: 'background 0.2s' }}>
                          <input type="checkbox" checked={selectedChannels.includes(channel._id)} onChange={() => toggleChannelSelection(channel._id)} style={{ cursor: 'pointer', width: 16, height: 16 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ color: "var(--text-primary)", fontSize: 13, fontWeight: 600 }}>{channel.schoolName}</div>
                            <div style={{ color: "var(--text-secondary)", fontSize: 11 }}>{channel.city} â€¢ {channel.memberCount || 0} students</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <motion.button type="button" onClick={handleBroadcastMessage} disabled={broadcasting || !broadcastMessage.trim() || selectedChannels.length === 0} whileHover={{ scale: broadcasting ? 1 : 1.02 }} whileTap={{ scale: broadcasting ? 1 : 0.98 }} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: broadcasting || !broadcastMessage.trim() || selectedChannels.length === 0 ? 'rgba(148,163,184,0.3)' : 'linear-gradient(135deg,#ec4899,#f43f5e)', color: "var(--text-primary)", cursor: broadcasting || !broadcastMessage.trim() || selectedChannels.length === 0 ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, opacity: broadcasting || !broadcastMessage.trim() || selectedChannels.length === 0 ? 0.5 : 1 }}>
                  {broadcasting ? (<><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Sending...</>) : (<><Radio size={16} />Send Broadcast Message</>)}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create New Channel Form */}
      <div style={{
        borderRadius: 18,
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border-secondary)",
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        marginBottom: 24
      }}>
        <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#10b981,#059669,transparent)' }} />
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(16,185,129,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <Plus size={18} color="#10b981" />
          <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>Create New School Channel</span>
        </div>
        <form onSubmit={handleCreate} style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', color: "var(--text-secondary)", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
                School Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Delhi Public School"
                value={newChannel.schoolName}
                onChange={e => setNewChannel(p => ({ ...p, schoolName: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-primary)',
                  color: "var(--text-primary)",
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: "var(--text-secondary)", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
                City *
              </label>
              <input
                type="text"
                placeholder="e.g., Delhi"
                value={newChannel.city}
                onChange={e => setNewChannel(p => ({ ...p, city: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-primary)',
                  color: "var(--text-primary)",
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: "var(--text-secondary)", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
              Description (Optional)
            </label>
            <textarea
              placeholder="Add a description for this school channel..."
              value={newChannel.description}
              onChange={e => setNewChannel(p => ({ ...p, description: e.target.value }))}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-primary)',
                color: "var(--text-primary)",
                fontSize: 14,
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>
          <motion.button
            type="submit"
            disabled={creating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '12px 24px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg,#10b981,#059669)',
              color: "var(--text-primary)",
              cursor: creating ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: creating ? 0.6 : 1
            }}
          >
            {creating ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Creating...
              </>
            ) : (
              <>
                <Plus size={16} />
                Create Channel
              </>
            )}
          </motion.button>
        </form>
      </div>

      {/* Existing Channels List */}
      <div style={{
        borderRadius: 18,
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border-secondary)",
        backdropFilter: 'blur(20px)',
        overflow: 'hidden'
      }}>
        <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(99,102,241,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <School size={18} color="#818cf8" />
            <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>Active School Channels</span>
            {channels.length > 0 && (
              <span style={{
                background: 'rgba(99,102,241,0.2)',
                color: '#818cf8',
                borderRadius: 99,
                padding: '2px 10px',
                fontSize: 11,
                fontWeight: 700
              }}>
                {channels.length}
              </span>
            )}
          </div>
          <button
            onClick={fetchChannels}
            style={{
              background: 'rgba(99,102,241,0.15)',
              border: "1px solid var(--border-primary)",
              borderRadius: 8,
              color: '#a5b4fc',
              cursor: 'pointer',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div style={{ padding: '16px', maxHeight: 500, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Loader2 size={28} style={{ color: '#818cf8', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 12 }}>Loading channels...</p>
            </div>
          ) : channels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <School size={48} style={{ color: 'rgba(148,163,184,0.3)', marginBottom: 12 }} />
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No school channels created yet</p>
              <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 4 }}>
                Create a channel above to get started
              </p>
            </div>
          ) : (
            channels.map((channel, i) => (
              <motion.div
                key={channel._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div
                  onClick={() => fetchChannelMembers(channel._id)}
                  style={{
                    padding: '16px',
                    borderRadius: 14,
                    marginBottom: 12,
                    background: expandedChannel === channel._id ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.04)',
                    border: expandedChannel === channel._id ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(99,102,241,0.15)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.25))',
                      border: '1px solid rgba(99,102,241,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      flexShrink: 0
                    }}>
                      <School size={28} color="#818cf8" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        color: "var(--text-primary)",
                        fontSize: 16,
                        fontWeight: 700,
                        margin: 0,
                        marginBottom: 4
                      }}>
                        {channel.schoolName}
                      </h3>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: 8,
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                          <MapPin size={14} color="#60a5fa" />
                          <span style={{ color: "var(--text-secondary)" }}>{channel.city}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                          <Users size={14} color="#34d399" />
                          <span style={{ color: "var(--text-secondary)" }}>
                            {channel.memberCount || 0} {channel.memberCount === 1 ? 'student' : 'students'}
                          </span>
                        </div>
                      </div>
                      {channel.description && (
                        <p style={{
                          color: "var(--text-tertiary)",
                          fontSize: 12,
                          margin: '8px 0',
                          lineHeight: 1.5
                        }}>
                          {channel.description}
                        </p>
                      )}
                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: 'monospace', marginTop: 8 }}>
                        Created {new Date(channel.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(channel._id, channel.schoolName)
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: '1px solid rgba(239,68,68,0.4)',
                        background: 'rgba(239,68,68,0.12)',
                        color: '#f87171',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexShrink: 0
                      }}
                    >
                      <Trash2 size={13} />
                      Delete
                    </motion.button>
                  </div>
                </div>

                {/* Expanded Members List */}
                <AnimatePresence>
                  {expandedChannel === channel._id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        overflow: 'hidden',
                        marginTop: -8,
                        marginBottom: 12,
                        marginLeft: 60,
                        marginRight: 12
                      }}
                    >
                      <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(99,102,241,0.1)',
                        borderRadius: 12,
                        padding: 16,
                        marginTop: 8
                      }}>
                        <h4 style={{
                          color: "var(--text-primary)",
                          fontSize: 14,
                          fontWeight: 700,
                          marginBottom: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          <Users size={16} color="#818cf8" />
                          Channel Members ({channelMembers[channel._id]?.length || 0})
                        </h4>

                        {loadingMembers[channel._id] ? (
                          <div style={{ textAlign: 'center', padding: 20 }}>
                            <Loader2 size={20} style={{ color: '#818cf8', animation: 'spin 1s linear infinite' }} />
                          </div>
                        ) : channelMembers[channel._id]?.length === 0 ? (
                          <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: 'center', padding: 20 }}>
                            No students have joined yet
                          </p>
                        ) : (
                          <div style={{ display: 'grid', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
                            {channelMembers[channel._id]?.map((member) => (
                              <div key={member._id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: 12,
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(99,102,241,0.1)',
                                borderRadius: 10
                              }}>
                                {member.profileImage ? (
                                  <img
                                    src={member.profileImage}
                                    alt={member.name}
                                    style={{
                                      width: 40,
                                      height: 40,
                                      borderRadius: 10,
                                      objectFit: 'cover',
                                      border: '2px solid rgba(99,102,241,0.3)'
                                    }}
                                  />
                                ) : (
                                  <div style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: '#fff'
                                  }}>
                                    {member.name[0]?.toUpperCase()}
                                  </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                    <span style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 600 }}>
                                      {member.name}
                                    </span>
                                    {member.role === 'mentor' && (
                                      <span style={{
                                        background: 'rgba(139,92,246,0.2)',
                                        color: '#c4b5fd',
                                        padding: '2px 8px',
                                        borderRadius: 6,
                                        fontSize: 10,
                                        fontWeight: 700
                                      }}>
                                        ADMIN
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                                    {member.email}
                                  </div>
                                  <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11, color: "var(--text-tertiary)" }}>
                                    <span>XP: {member.xp || 0}</span>
                                    <span>â€¢</span>
                                    <span>Joined {new Date(member.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// â”€â”€ Message Monitoring Dashboard Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MessageMonitoringDashboard({ showToast }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [channels, setChannels] = useState([])
  const [filters, setFilters] = useState({
    channelId: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  })
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [expandedMessage, setExpandedMessage] = useState(null)

  const fetchChannels = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API_URL}/school-channel/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setChannels(res.data.channels || [])
    } catch (err) {
      console.error('Error fetching channels:', err)
    }
  }

  const fetchMessages = async (reset = false) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        limit: '50',
        skip: reset ? '0' : String(page * 50),
        ...(filters.channelId && { channelId: filters.channelId }),
        ...(filters.search && { search: filters.search }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
      })

      const res = await axios.get(`${API_URL}/school-channel/admin/messages/all?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = res.data.data
      setMessages(reset ? data.messages : [...messages, ...data.messages])
      setHasMore(data.hasMore)
      if (reset) setPage(0)
    } catch (err) {
      console.error('Error fetching messages:', err)
      showToast('Failed to load messages', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChannels()
  }, [])

  useEffect(() => {
    fetchMessages(true)
  }, [filters])

  const handleDeleteMessage = async (messageId, channelName) => {
    if (!window.confirm(`Delete this message from ${channelName}? This cannot be undone.`)) return

    setDeleting(messageId)
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_URL}/school-channel/admin/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessages(prev => prev.filter(m => m._id !== messageId))
      showToast('Message deleted successfully', 'success')
    } catch (err) {
      console.error('Error deleting message:', err)
      showToast('Failed to delete message', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const loadMore = () => {
    setPage(p => p + 1)
    fetchMessages(false)
  }

  const resetFilters = () => {
    setFilters({
      channelId: '',
      search: '',
      dateFrom: '',
      dateTo: '',
    })
  }

  return (
    <div>
      {/* Filters Section */}
      <div style={{
        borderRadius: 18,
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border-secondary)",
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        marginBottom: 24
      }}>
        <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#f59e0b,#d97706,transparent)' }} />
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(245,158,11,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={18} color="#fbbf24" />
            <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>Filter Messages</span>
          </div>
          <button
            onClick={resetFilters}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid rgba(148,163,184,0.3)',
              background: 'rgba(148,163,184,0.1)',
              color: '#94a3b8',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Clear Filters
          </button>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', color: "var(--text-secondary)", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
                Filter by School Channel
              </label>
              <select
                value={filters.channelId}
                onChange={e => setFilters(p => ({ ...p, channelId: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(15,10,40,0.6)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: "var(--text-primary)",
                  fontSize: 14,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="" style={{ background: '#1a1625', color: "var(--text-primary)" }}>All Channels</option>
                {channels.map(ch => (
                  <option key={ch._id} value={ch._id} style={{ background: '#1a1625', color: "var(--text-primary)" }}>
                    {ch.schoolName} - {ch.city}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: "var(--text-secondary)", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
                Search Messages
              </label>
              <input
                type="text"
                placeholder="Search message content..."
                value={filters.search}
                onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(15,10,40,0.6)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: "var(--text-primary)",
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(245,158,11,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(245,158,11,0.3)'}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', color: "var(--text-secondary)", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(15,10,40,0.6)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: "var(--text-primary)",
                  fontSize: 14,
                  outline: 'none',
                  cursor: 'pointer',
                  colorScheme: 'dark'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: "var(--text-secondary)", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(15,10,40,0.6)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: "var(--text-primary)",
                  fontSize: 14,
                  outline: 'none',
                  cursor: 'pointer',
                  colorScheme: 'dark'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div style={{
        borderRadius: 18,
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border-secondary)",
        backdropFilter: 'blur(20px)',
        overflow: 'hidden'
      }}>
        <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#ef4444,#dc2626,transparent)' }} />
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(239,68,68,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={18} color="#f87171" />
            <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 15 }}>All Messages</span>
            {messages.length > 0 && (
              <span style={{
                background: 'rgba(239,68,68,0.2)',
                color: '#f87171',
                borderRadius: 99,
                padding: '2px 10px',
                fontSize: 11,
                fontWeight: 700
              }}>
                {messages.length}
              </span>
            )}
          </div>
          <button
            onClick={() => fetchMessages(true)}
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: "1px solid var(--border-primary)",
              borderRadius: 8,
              color: '#fca5a5',
              cursor: 'pointer',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div style={{ padding: '16px', maxHeight: 600, overflowY: 'auto' }}>
          {loading && messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Loader2 size={28} style={{ color: '#f87171', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 12 }}>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <MessageSquare size={48} style={{ color: 'rgba(148,163,184,0.3)', marginBottom: 12 }} />
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No messages found</p>
              <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 4 }}>
                Try adjusting your filters
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, i) => (
                <motion.div
                  key={message._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    padding: '16px',
                    borderRadius: 14,
                    marginBottom: 12,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(239,68,68,0.15)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                    {/* Sender Avatar */}
                    {message.sender?.profileImage ? (
                      <img
                        src={message.sender.profileImage}
                        alt={message.sender.name}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          objectFit: 'cover',
                          border: '2px solid rgba(239,68,68,0.3)',
                          flexShrink: 0
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#fff',
                        flexShrink: 0
                      }}>
                        {message.sender?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}

                    {/* Message Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Sender + Channel Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700 }}>
                          {message.sender?.name || 'Unknown'}
                        </span>
                        {message.sender?.role === 'mentor' && (
                          <span style={{
                            background: 'rgba(139,92,246,0.2)',
                            color: '#c4b5fd',
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700
                          }}>
                            ADMIN
                          </span>
                        )}
                        <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>â†’</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <School size={12} color="#60a5fa" />
                          <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                            {message.channel?.schoolName} ({message.channel?.city})
                          </span>
                        </div>
                      </div>

                      {/* Message Text */}
                      <p style={{
                        color: "var(--text-primary)",
                        fontSize: 13,
                        lineHeight: 1.6,
                        marginBottom: 8,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {message.content}
                      </p>

                      {/* Metadata */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: "var(--text-tertiary)" }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={11} />
                          {new Date(message.createdAt).toLocaleString()}
                        </div>
                        {message.reactions && message.reactions.length > 0 && (
                          <span>â€¢ {message.reactions.length} reactions</span>
                        )}
                        {message.isPinned && (
                          <span style={{ color: '#fbbf24' }}>â€¢ ðŸ“Œ Pinned</span>
                        )}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDeleteMessage(message._id, `${message.channel?.schoolName} (${message.channel?.city})`)}
                      disabled={deleting === message._id}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: '1px solid rgba(239,68,68,0.4)',
                        background: 'rgba(239,68,68,0.12)',
                        color: '#f87171',
                        cursor: deleting === message._id ? 'not-allowed' : 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexShrink: 0,
                        opacity: deleting === message._id ? 0.5 : 1
                      }}
                    >
                      {deleting === message._id ? (
                        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Trash2 size={13} />
                      )}
                      Delete
                    </motion.button>
                  </div>
                </motion.div>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={loadMore}
                    disabled={loading}
                    style={{
                      padding: '10px 24px',
                      borderRadius: 10,
                      border: '1px solid rgba(239,68,68,0.3)',
                      background: 'rgba(239,68,68,0.12)',
                      color: '#f87171',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      opacity: loading ? 0.5 : 1
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Eye size={14} />
                        Load More Messages
                      </>
                    )}
                  </motion.button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminPanel() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("admin_auth") === "true")
  const [pw, setPw] = useState("")
  const [pwErr, setPwErr] = useState("")
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [actionLoading, setActionLoading] = useState(null)
  const [toast, setToast] = useState(null)
  const [mainTab, setMainTab] = useState("users")

  const showToast = (msg, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (pw === ADMIN_SECRET) {
      sessionStorage.setItem("admin_auth", "true")
      setAuthed(true)
    } else {
      setPwErr("Wrong password")
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const role = tab === "all" ? undefined : tab
      const [statsRes, usersRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers({ role, search, page, limit: 20 }),
      ])
      setStats(statsRes.data.data)
      setUsers(usersRes.data.data.users)
      setTotal(usersRes.data.data.total)
    } catch (err) {
      const status = err?.response?.status
      const msg = err?.response?.data?.error?.message || err.message
      showToast(status === 401 ? "Invalid admin credentials" : `Failed: ${msg}`, "error")
    } finally {
      setLoading(false)
    }
  }, [tab, search, page])

  useEffect(() => {
    if (authed) fetchData()
  }, [authed, fetchData])

  const handleToggle = async (id) => {
    setActionLoading(id + "_toggle")
    try {
      const res = await adminAPI.toggleUser(id)
      const updated = res.data.data.user
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: updated.isActive } : u))
      showToast(`User ${updated.isActive ? "activated" : "deactivated"}`)
    } catch { showToast("Action failed", "error") }
    finally { setActionLoading(null) }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return
    setActionLoading(id + "_delete")
    try {
      await adminAPI.deleteUser(id)
      setUsers(prev => prev.filter(u => u._id !== id))
      setTotal(t => t - 1)
      showToast("User deleted")
    } catch { showToast("Delete failed", "error") }
    finally { setActionLoading(null) }
  }

  // -- LOGIN SCREEN ----------------------------------------------
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ position: "relative" }}>
        <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "url(/image.png)", backgroundSize: "cover", backgroundPosition: "center" }} />
        <div style={{ position: "fixed", inset: 0, zIndex: 1, background: "var(--bg-overlay)" }} />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm relative" style={{ zIndex: 10 }}>
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid rgba(99,102,241,0.3)", backdropFilter: "blur(24px)" }}>
            <div className="h-0.5" style={{ background: "linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)" }} />
            <div className="p-8">
              <div className="text-center mb-6">
                <motion.div animate={{ boxShadow: ["0 0 0px rgba(99,102,241,0)", "0 0 24px rgba(99,102,241,0.6)", "0 0 0px rgba(99,102,241,0)"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.25))", border: "1px solid rgba(99,102,241,0.4)" }}>
                  <Shield size={28} style={{ color: "#818cf8" }} />
                </motion.div>
                <h1 className="text-2xl font-bold text-theme-primary">Admin Panel</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", fontFamily: "monospace" }}>Studdy Buddy Control Center</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <input type="password" placeholder="Enter admin password" value={pw}
                  onChange={e => { setPw(e.target.value); setPwErr("") }} autoFocus
                  className="w-full text-theme-primary placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-primary)" }} />
                {pwErr && <p className="text-red-400 text-sm">{pwErr}</p>}
                <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-3 text-theme-primary font-semibold rounded-xl"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 16px rgba(99,102,241,0.4)" }}>
                  Login
                </motion.button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // -- MAIN PANEL ------------------------------------------------
  const STAT_CARDS = [
    { label: "Total Users", value: stats?.totalUsers, icon: Users, color: "#818cf8" },
    { label: "Students", value: stats?.totalStudents, icon: GraduationCap, color: "#60a5fa" },
    { label: "Mentors", value: stats?.totalMentors, icon: Shield, color: "#c4b5fd" },
    { label: "Doubts", value: stats?.totalDoubts, icon: BookOpen, color: "#34d399" },
    { label: "Resources", value: stats?.totalResources, icon: FileText, color: "#fbbf24" },
  ]

  return (
    <div className="min-h-screen" style={{ position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "url(/image.png)", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 1, background: "var(--bg-overlay)" }} />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl"
            style={{ background: toast.type === "error" ? "rgba(239,68,68,0.9)" : "rgba(52,211,153,0.9)", backdropFilter: "blur(12px)" }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0" style={{ zIndex: 50, background: "var(--bg-overlay)", borderBottom: "1px solid var(--border-primary)", backdropFilter: "blur(24px)" }}>
        <div className="h-0.5" style={{ background: "linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div animate={{ boxShadow: ["0 0 0px rgba(99,102,241,0)", "0 0 16px rgba(99,102,241,0.5)", "0 0 0px rgba(99,102,241,0)"] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.3))", border: "1px solid rgba(99,102,241,0.4)" }}>
              <Shield size={18} style={{ color: "#818cf8" }} />
            </motion.div>
            <div>
              <h1 className="font-bold text-theme-primary text-sm">Admin Panel</h1>
              <p style={{ color: "var(--text-tertiary)", fontSize: "0.65rem", fontFamily: "monospace" }}>Studdy Buddy Control Center</p>
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { sessionStorage.removeItem("admin_auth"); setAuthed(false) }}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
            <LogOut size={13} /> Logout
          </motion.button>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6" style={{ zIndex: 5 }}>

        {/* Main tab switcher */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { id: 'users', label: 'User Management', icon: <Users size={14} /> },
            { id: 'schools', label: 'School Channels', icon: <School size={14} /> },
            { id: 'messages', label: 'Message Monitor', icon: <MessageSquare size={14} /> },
          ].map(t => (
            <button key={t.id} onClick={() => setMainTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: mainTab === t.id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)',
                border: mainTab === t.id ? 'none' : '1px solid rgba(99,102,241,0.2)',
                color: mainTab === t.id ? 'white' : 'rgba(148,163,184,0.7)',
                boxShadow: mainTab === t.id ? '0 2px 12px rgba(99,102,241,0.35)' : 'none',
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* â”€â”€ USERS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {mainTab === 'users' && <>
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            {STAT_CARDS.map((s, i) => {
              const Icon = s.icon
              return (
                <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, type: "spring", stiffness: 200 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="rounded-2xl p-4 relative overflow-hidden"
                  style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-secondary)", backdropFilter: "blur(20px)" }}>
                  <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(ellipse at top right,${s.color},transparent 70%)` }} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.65rem", fontFamily: "monospace" }}>{s.label}</p>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: `${s.color}20`, border: `1px solid ${s.color}30` }}>
                        <Icon size={13} style={{ color: s.color }} />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-theme-primary">{s.value ?? "-"}</p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg,transparent,${s.color},transparent)` }} />
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 mb-4 p-4 rounded-2xl"
          style={{ background: "rgba(10,8,30,0.7)", border: "1px solid var(--border-secondary)", backdropFilter: "blur(20px)" }}>
          {/* Tab buttons */}
          <div className="flex gap-1.5 flex-wrap">
            {["all", "student", "mentor"].map(t => (
              <button key={t} onClick={() => { setTab(t); setPage(1) }}
                className="px-4 py-2 rounded-xl text-xs font-semibold capitalize transition"
                style={{
                  background: tab === t ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${tab === t ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)"}`,
                  color: tab === t ? "white" : "rgba(148,163,184,0.7)",
                  boxShadow: tab === t ? "0 2px 10px rgba(99,102,241,0.35)" : "none",
                }}>
                {t}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
            <input type="text" placeholder="Search by name or email..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-3 py-2 text-sm text-theme-primary placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-primary)" }} />
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-theme-primary rounded-xl transition"
            style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.35)" }}>
            <RefreshCw size={13} /> Refresh
          </motion.button>
        </motion.div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,8,30,0.7)", border: "1px solid var(--border-secondary)", backdropFilter: "blur(20px)" }}>
          <div className="h-0.5" style={{ background: "linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)" }} />
          {loading ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <Loader2 size={36} style={{ color: "#818cf8" }} />
              </motion.div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", fontFamily: "monospace" }}>Loading users...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-secondary)" }}>
                    {["User", "Role", "XP", "Status", "Joined", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "rgba(99,102,241,0.7)", fontFamily: "monospace" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12" style={{ color: "var(--text-tertiary)" }}>No users found</td></tr>
                  ) : users.map((u, i) => (
                    <motion.tr key={u._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      className="group transition-all"
                      style={{ borderBottom: "1px solid rgba(99,102,241,0.08)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.06)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.profileImage ? (
                            <img src={u.profileImage} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              style={{ boxShadow: "0 0 8px rgba(99,102,241,0.4)" }} />
                          ) : (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-theme-primary text-xs font-bold flex-shrink-0"
                              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                              {u.name?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-theme-primary text-sm">{u.name}</div>
                            <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={u.role === "mentor" ? { background: "rgba(196,181,253,0.15)", border: "1px solid rgba(196,181,253,0.3)", color: "#c4b5fd" }
                            : { background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.3)", color: "#93c5fd" }}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-sm font-bold" style={{ color: "#fbbf24" }}>
                          <TrendingUp size={12} /> {u.xp ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={u.isActive !== false ? { background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.35)", color: "#34d399" }
                            : { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", color: "#f87171" }}>
                          {u.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-tertiary)", fontFamily: "monospace" }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => handleToggle(u._id)}
                            disabled={actionLoading === u._id + "_toggle"}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                            style={u.isActive !== false
                              ? { background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }
                              : { background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399" }}>
                            {actionLoading === u._id + "_toggle" ? <Loader2 size={11} className="animate-spin" /> :
                              u.isActive !== false ? <ToggleLeft size={13} /> : <ToggleRight size={13} />}
                            {u.isActive !== false ? "Deactivate" : "Activate"}
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => handleDelete(u._id, u.name)}
                            disabled={actionLoading === u._id + "_delete"}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                            {actionLoading === u._id + "_delete" ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                            Delete
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs" style={{ color: "var(--text-tertiary)", fontFamily: "monospace" }}>
              Showing <span style={{ color: "#818cf8" }}>{Math.min((page - 1) * 20 + 1, total)}-{Math.min(page * 20, total)}</span> of {total}
            </p>
            <div className="flex gap-2">
              <motion.button whileHover={{ scale: 1.05 }} onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-xs font-semibold text-theme-primary rounded-xl disabled:opacity-40"
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid var(--border-primary)" }}>
                Previous
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= total}
                className="px-4 py-2 text-xs font-semibold text-theme-primary rounded-xl disabled:opacity-40"
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid var(--border-primary)" }}>
                Next
              </motion.button>
            </div>
          </div>
        )}
        </> /* end users tab */}

        {/* â”€â”€ SCHOOL CHANNELS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {mainTab === 'schools' && (
          <SchoolChannelManagement showToast={showToast} />
        )}

        {/* â”€â”€ MESSAGE MONITORING TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {mainTab === 'messages' && (
          <MessageMonitoringDashboard showToast={showToast} />
        )}
      </div>
    </div>
  )
}
