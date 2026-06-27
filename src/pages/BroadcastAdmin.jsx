import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Save, Cpu, Zap, Radio, Leaf, Copy, Check, RefreshCw } from 'lucide-react'
import axios from 'axios'

const API_URL = (() => {
  const base = import.meta.env.VITE_API_URL || "https://studdy-buddy-backend-a5x.onrender.com";
  if (base.endsWith('/api')) return base;
  if (base.endsWith('/')) return base + 'api';
  return base + '/api';
})();

// Channel configuration
const CHANNELS = [
  {
    id: 'robotics',
    name: 'Robotics',
    desc: 'Automation, sensors, servo motors & robot building',
    icon: '🤖',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)',
    LucideIcon: Cpu,
  },
  {
    id: 'aiml',
    name: 'AI & ML',
    desc: 'Machine learning, neural networks & data science',
    icon: '🧠',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
    LucideIcon: Zap,
  },
  {
    id: 'electronics',
    name: 'Electronics',
    desc: 'Circuit design, IoT, microcontrollers & PCB',
    icon: '⚡',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg,#3b82f6,#2563eb)',
    LucideIcon: Radio,
  },
  {
    id: 'renewable_energy',
    name: 'Renewable Energy',
    desc: 'Solar, wind, hydro & sustainable engineering',
    icon: '🌱',
    color: '#10b981',
    gradient: 'linear-gradient(135deg,#10b981,#059669)',
    LucideIcon: Leaf,
  },
]

// Admin API functions
const adminAPI = {
  getCodes: () => axios.get(`${API_URL}/broadcast/admin/codes`, {
    headers: { 'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || 'H5' }
  }),
  updateCode: (channel, code) => axios.put(`${API_URL}/broadcast/admin/codes`, 
    { channel, code }, 
    { headers: { 'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || 'H5' } }
  ),
  getAllEnrollments: () => axios.get(`${API_URL}/broadcast/admin/enrollments`, {
    headers: { 'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || 'H5' }
  })
}

export default function BroadcastAdmin() {
  const [codes, setCodes] = useState({})
  const [newCodes, setNewCodes] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState('')
  const [enrollmentStats, setEnrollmentStats] = useState(null)
  const [showEnrollments, setShowEnrollments] = useState(null) // Changed from false to null

  // Load existing codes and enrollment stats
  useEffect(() => {
    Promise.all([loadCodes(), loadEnrollmentStats()])
  }, [])

  const loadCodes = async () => {
    try {
      const response = await adminAPI.getCodes()
      const codesMap = {}
      response.data.codes.forEach(codeDoc => {
        codesMap[codeDoc.channel] = codeDoc.code
      })
      setCodes(codesMap)
      setNewCodes({ ...codesMap })
    } catch (err) {
      setError('Failed to load codes')
      console.error('Load codes error:', err)
    }
  }

  const loadEnrollmentStats = async () => {
    try {
      const response = await adminAPI.getAllEnrollments()
      setEnrollmentStats(response.data)
    } catch (err) {
      console.error('Load enrollment stats error:', err)
      // Don't show error for stats, it's not critical
    } finally {
      setLoading(false)
    }
  }

  const updateCode = async (channel) => {
    const code = newCodes[channel]
    if (!code?.trim()) {
      setError('Code cannot be empty')
      return
    }

    setSaving(channel)
    try {
      await adminAPI.updateCode(channel, code.trim())
      setCodes(prev => ({ ...prev, [channel]: code.trim() }))
      setSuccess(`${CHANNELS.find(c => c.id === channel)?.name} code updated!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update code')
      setTimeout(() => setError(''), 3000)
    } finally {
      setSaving('')
    }
  }

  const copyCode = (channel) => {
    const code = codes[channel] || newCodes[channel]
    if (code) {
      navigator.clipboard.writeText(code)
      setCopied(channel)
      setTimeout(() => setCopied(''), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-sidebar flex items-center justify-center">
        <div style={{
          width: 40,
          height: 40,
          border: '4px solid #6366f1',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #05030f 0%, #0a0614 100%)' }}>
      {/* Background */}
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundImage: 'url(/image.png)', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        opacity: 0.1
      }} />
      
      <div className="relative z-10 p-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
              border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Settings size={24} color="#818cf8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-theme-primary mb-2">Broadcast Channel Codes</h1>
          <p className="text-theme-tertiary text-sm">Manage access codes for all broadcast channels</p>
        </motion.div>

        {/* Notifications */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-theme-primary px-6 py-3 rounded-lg shadow-lg"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-theme-primary px-6 py-3 rounded-lg shadow-lg"
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Channel Code Cards */}
        <div className="max-w-4xl mx-auto">
          {/* Enrollment Statistics Dashboard */}
          {enrollmentStats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-theme-primary flex items-center gap-3">
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.2))',
                    border: '1px solid rgba(16,185,129,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    📊
                  </div>
                  Channel Enrollment Statistics
                </h2>
                <div className="text-right">
                  <div className="text-sm text-theme-tertiary">Total Enrollments</div>
                  <div className="text-2xl font-bold text-theme-primary">{enrollmentStats.totalEnrollments}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {CHANNELS.map((channel) => {
                  const stats = enrollmentStats.channelStats[channel.id] || { count: 0, members: [] }
                  return (
                    <motion.div
                      key={channel.id}
                      whileHover={{ y: -2 }}
                      style={{
                        background: "var(--bg-tertiary)",
                        border: `1px solid ${channel.color}30`,
                        borderRadius: 16,
                        padding: 20,
                        backdropFilter: 'blur(20px)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Top gradient bar */}
                      <div 
                        style={{ 
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                          background: channel.gradient
                        }} 
                      />

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div 
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 12,
                              background: `${channel.color}18`,
                              border: `1px solid ${channel.color}40`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 20
                            }}
                          >
                            {channel.icon}
                          </div>
                          <div>
                            <h4 className="text-theme-primary font-semibold">{channel.name}</h4>
                            <p className="text-theme-tertiary text-sm">{stats.count} students enrolled</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div 
                            className="text-2xl font-bold"
                            style={{ color: channel.color }}
                          >
                            {stats.count}
                          </div>
                        </div>
                      </div>

                      {stats.count > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-theme-tertiary">Recent enrollments</span>
                            {stats.count > 3 && (
                              <button 
                                onClick={() => setShowEnrollments(showEnrollments === channel.id ? null : channel.id)}
                                className="text-indigo-400 hover:text-indigo-300"
                              >
                                {showEnrollments === channel.id ? 'Show less' : `View all ${stats.count}`}
                              </button>
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            {(showEnrollments === channel.id ? stats.members : stats.members.slice(0, 3)).map((member) => (
                              <div key={member.id} className="flex items-center gap-2 text-sm bg-white bg-opacity-5 rounded-lg p-2">
                                <div 
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "var(--text-primary)"
                                  }}
                                >
                                  {member.user?.profileImage ? (
                                    <img src={member.user.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                  ) : (
                                    member.user?.name?.charAt(0)?.toUpperCase() || '?'
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-theme-primary font-medium truncate">{member.user?.name || 'Unknown'}</div>
                                  <div className="text-theme-tertiary text-xs">{member.school} • {member.class}</div>
                                </div>
                                <div className="text-xs text-theme-muted">
                                  {new Date(member.joinedAt).toLocaleDateString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {stats.count === 0 && (
                        <div className="text-center py-4">
                          <div className="text-theme-muted text-sm">No students enrolled yet</div>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-theme-primary">Channel Access Codes</h2>
            <button
              onClick={() => Promise.all([loadCodes(), loadEnrollmentStats()])}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-theme-primary font-medium transition-colors"
            >
              🔄 Refresh Data
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CHANNELS.map((channel, index) => {
              const currentCode = codes[channel.id] || ''
              const newCode = newCodes[channel.id] || ''
              const hasChanges = newCode !== currentCode
              const isSaving = saving === channel.id
              const isCopied = copied === channel.id

              return (
                <motion.div
                  key={channel.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  style={{
                    background: "var(--bg-tertiary)",
                    border: `1px solid ${channel.color}30`,
                    borderRadius: 20,
                    padding: 24,
                    backdropFilter: 'blur(20px)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Top gradient bar */}
                  <div 
                    style={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background: channel.gradient
                    }} 
                  />

                  {/* Channel Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div 
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        background: `${channel.color}18`,
                        border: `1px solid ${channel.color}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 28
                      }}
                    >
                      {channel.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-theme-primary">{channel.name}</h3>
                      <p className="text-theme-tertiary text-sm">{channel.desc}</p>
                    </div>
                  </div>

                  {/* Current Code Display */}
                  {currentCode && (
                    <div className="mb-4">
                      <label className="block text-theme-secondary text-sm font-medium mb-2">
                        Current Code
                      </label>
                      <div className="flex items-center gap-2">
                        <div 
                          className="flex-1 px-4 py-2 rounded-lg bg-theme-card border border-theme text-theme-primary font-mono text-sm"
                        >
                          {currentCode}
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => copyCode(channel.id)}
                          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                        >
                          {isCopied ? (
                            <Check size={16} color="#10b981" />
                          ) : (
                            <Copy size={16} color="#9ca3af" />
                          )}
                        </motion.button>
                      </div>
                    </div>
                  )}

                  {/* Code Input */}
                  <div className="mb-4">
                    <label className="block text-theme-secondary text-sm font-medium mb-2">
                      {currentCode ? 'New Code' : 'Set Code'}
                    </label>
                    <input
                      type="text"
                      value={newCode}
                      onChange={(e) => setNewCodes(prev => ({ 
                        ...prev, 
                        [channel.id]: e.target.value 
                      }))}
                      placeholder={`Enter access code for ${channel.name}`}
                      className="w-full px-4 py-3 rounded-lg bg-theme-card border border-theme text-theme-primary placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  {/* Update Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateCode(channel.id)}
                    disabled={!hasChanges || !newCode.trim() || isSaving}
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: 12,
                      border: 'none',
                      background: hasChanges && newCode.trim() && !isSaving 
                        ? channel.gradient 
                        : 'rgba(75,85,99,0.5)',
                      color: "var(--text-primary)",
                      fontWeight: 700,
                      cursor: hasChanges && newCode.trim() && !isSaving ? 'pointer' : 'not-allowed',
                      opacity: hasChanges && newCode.trim() && !isSaving ? 1 : 0.6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <div style={{ animation: isSaving ? 'spin 1s linear infinite' : 'none' }}>
                          {isSaving ? <RefreshCw size={16} /> : <Save size={16} />}
                        </div>
                        {currentCode ? 'Update Code' : 'Set Code'}
                        <style>
                          {`
                            @keyframes spin {
                              to { transform: rotate(360deg); }
                            }
                          `}
                        </style>
                      </>
                    )}
                  </motion.button>

                  {/* Status indicator */}
                  <div className="mt-3 text-center">
                    <span 
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: currentCode ? `${channel.color}20` : 'rgba(107,114,128,0.2)',
                        color: currentCode ? channel.color : '#9ca3af',
                        border: `1px solid ${currentCode ? channel.color + '40' : '#374151'}`
                      }}
                    >
                      {currentCode ? '✅ Code Set' : '⚠️ No Code Set'}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="max-w-2xl mx-auto mt-12 p-6 rounded-2xl"
          style={{
            background: 'rgba(10,8,30,0.6)',
            border: "1px solid var(--border-primary)",
            backdropFilter: 'blur(16px)'
          }}
        >
          <h3 className="text-lg font-bold text-theme-primary mb-3 flex items-center gap-2">
            <Settings size={20} color="#818cf8" />
            How it works
          </h3>
          <ul className="text-theme-secondary text-sm space-y-2">
            <li>• Set unique access codes for each broadcast channel</li>
            <li>• Students must enter the correct code to join a channel</li>
            <li>• Codes can be updated anytime - existing members stay enrolled</li>
            <li>• Share codes with students through your institution</li>
            <li>• Only mentors can send messages in broadcast channels</li>
          </ul>
        </motion.div>
      </div>
    </div>
  )
}