import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { adminAPI, broadcastAPI } from "../services/api"
import { Users, GraduationCap, BookOpen, FileText, Search, RefreshCw, Shield, Loader2, Trash2, ToggleLeft, ToggleRight, LogOut, TrendingUp, Radio, Check, X, Plus, Key, Settings } from "lucide-react"

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || "H5"

const CHANNELS = [
  { id: 'robotics', name: 'Robotics', icon: '🤖', color: '#6366f1' },
  { id: 'aiml', name: 'AI & ML', icon: '🧠', color: '#8b5cf6' },
  { id: 'electronics', name: 'Electronics', icon: '⚡', color: '#3b82f6' },
  { id: 'renewable_energy', name: 'Renewable Energy', icon: '🌱', color: '#10b981' },
]

// ── Per-channel code row with inline edit ────────────────────────────────────
function ChannelCodeRow({ ch, existing, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(existing?.code || '')
  const [saving, setSaving] = useState(false)

  // Sync when existing changes (after fetch)
  useState(() => { setVal(existing?.code || '') }, [existing])

  const handleSave = async () => {
    setSaving(true)
    await onSave(val)
    setSaving(false)
    setEditing(false)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 12, marginBottom: 10,
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${existing ? ch.color + '30' : 'rgba(99,102,241,0.1)'}`,
    }}>
      {/* Channel icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 140, flexShrink: 0 }}>
        <span style={{ fontSize: 20 }}>{ch.icon}</span>
        <span style={{ color: ch.color, fontWeight: 700, fontSize: 13 }}>{ch.name}</span>
      </div>

      {/* Code display / input */}
      {editing ? (
        <input
          autoFocus value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditing(false); setVal(existing?.code || '') } }}
          placeholder="Enter access code..."
          style={{ flex: 1, padding: '7px 12px', background: 'rgba(255,255,255,0.08)', border: `1px solid ${ch.color}50`, borderRadius: 8, color: "var(--text-primary)", fontSize: 13, outline: 'none', fontFamily: 'monospace' }}
        />
      ) : (
        <div style={{ flex: 1 }}>
          {existing?.code
            ? <span style={{ color: "var(--text-primary)", fontFamily: 'monospace', fontSize: 14, fontWeight: 600, letterSpacing: '0.5px' }}>{existing.code}</span>
            : <span style={{ color: 'rgba(148,163,184,0.35)', fontSize: 12, fontStyle: 'italic' }}>No code set — students can't join</span>}
        </div>
      )}

      {/* Action buttons */}
      {editing ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg,${ch.color},${ch.color}cc)`, color: "var(--text-primary)", cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            {saving ? '...' : '✓ Save'}
          </button>
          <button onClick={() => { setEditing(false); setVal(existing?.code || '') }}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'transparent', color: "var(--text-secondary)", cursor: 'pointer', fontSize: 12 }}>
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={() => { setEditing(true); setVal(existing?.code || '') }}
          style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${ch.color}40`, background: `${ch.color}12`, color: ch.color, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {existing ? '✏️ Change' : '+ Set Code'}
        </button>
      )}
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
  const [mainTab, setMainTab] = useState("users") // "users" | "broadcast"

  // Broadcast state
  const [bRequests, setBRequests] = useState([])
  const [bCodes, setBCodes] = useState([])
  const [bLoading, setBLoading] = useState(false)
  const [enrollmentStats, setEnrollmentStats] = useState(null)

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

  const fetchBroadcastData = useCallback(async () => {
    setBLoading(true)
    try {
      const [reqRes, codeRes, statsRes] = await Promise.all([
        broadcastAPI.getRequests(),
        broadcastAPI.getCodes(),
        broadcastAPI.getAllEnrollments(),
      ])
      setBRequests(reqRes.data.requests || [])
      setBCodes(codeRes.data.codes || [])
      setEnrollmentStats(statsRes.data)
    } catch (err) {
      showToast('Failed to load broadcast data', 'error')
    } finally { setBLoading(false) }
  }, [])

  useEffect(() => {
    if (authed) fetchData()
  }, [authed, fetchData])

  useEffect(() => {
    if (authed && mainTab === 'broadcast') fetchBroadcastData()
  }, [authed, mainTab, fetchBroadcastData])

  const handleAcceptRequest = async (id) => {
    setActionLoading(id + '_accept')
    try {
      await broadcastAPI.acceptRequest(id)
      setBRequests(prev => prev.filter(r => r._id !== id))
      showToast('Request accepted!')
    } catch { showToast('Failed', 'error') }
    finally { setActionLoading(null) }
  }

  const handleRejectRequest = async (id) => {
    setActionLoading(id + '_reject')
    try {
      await broadcastAPI.rejectRequest(id)
      setBRequests(prev => prev.filter(r => r._id !== id))
      showToast('Request rejected')
    } catch { showToast('Failed', 'error') }
    finally { setActionLoading(null) }
  }

  const handleAddCode = async (e) => {
    e.preventDefault()
    if (!newCode.code.trim()) { showToast('Enter a code', 'error'); return }
    try {
      await broadcastAPI.addCode({ channel: newCode.channel, code: newCode.code.trim() })
      setNewCode(p => ({ ...p, code: '' }))
      fetchBroadcastData()
      showToast('Code added!')
    } catch (err) { showToast(err?.response?.data?.message || 'Failed', 'error') }
  }

  const handleDeleteCode = async (id) => {
    try {
      await broadcastAPI.deleteCode(id)
      setBCodes(prev => prev.filter(c => c._id !== id))
      showToast('Code deleted')
    } catch { showToast('Failed', 'error') }
  }

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
            { id: 'broadcast', label: '📡 Broadcast Channels', icon: <Radio size={14} /> },
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

        {/* ── USERS TAB ─────────────────────────────────────────────────── */}
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

        {/* ── BROADCAST TAB ──────────────────────────────────────────────── */}
        {mainTab === 'broadcast' && (
          <div>
            {bLoading ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <Loader2 size={32} style={{ color: '#818cf8', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <>
                {/* Enrollment Statistics Dashboard */}
                {enrollmentStats && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      marginBottom: 16
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.2))',
                          border: '1px solid rgba(16,185,129,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20
                        }}>
                          📊
                        </div>
                        <div>
                          <h2 style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 700, margin: 0 }}>
                            Channel Enrollment Statistics
                          </h2>
                          <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: 0 }}>
                            Total enrollments across all channels
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Total Students</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
                          {enrollmentStats.totalEnrollments}
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                      gap: 16,
                      marginBottom: 24 
                    }}>
                      {CHANNELS.map((channel) => {
                        const stats = enrollmentStats.channelStats[channel.id] || { count: 0, members: [] }
                        return (
                          <div
                            key={channel.id}
                            style={{
                              background: "var(--bg-tertiary)",
                              border: `1px solid ${channel.color}30`,
                              borderRadius: 16,
                              padding: 18,
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
                                background: `linear-gradient(90deg,${channel.color},${channel.color}cc)`
                              }} 
                            />

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div 
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 10,
                                    background: `${channel.color}18`,
                                    border: `1px solid ${channel.color}40`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 18
                                  }}
                                >
                                  {channel.icon}
                                </div>
                                <div>
                                  <h4 style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 14, margin: 0 }}>
                                    {channel.name}
                                  </h4>
                                  <p style={{ color: "var(--text-tertiary)", fontSize: 11, margin: 0 }}>
                                    {stats.count} {stats.count === 1 ? 'student' : 'students'}
                                  </p>
                                </div>
                              </div>
                              <div 
                                style={{ 
                                  fontSize: 24, 
                                  fontWeight: 700,
                                  color: channel.color 
                                }}
                              >
                                {stats.count}
                              </div>
                            </div>

                            {stats.count > 0 && (
                              <div style={{ 
                                maxHeight: 200, 
                                overflowY: 'auto',
                                marginTop: 12,
                                paddingRight: 4
                              }}>
                                {stats.members.map((member) => (
                                  <div 
                                    key={member.id} 
                                    style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: 8, 
                                      fontSize: 11, 
                                      background: 'rgba(255,255,255,0.03)', 
                                      borderRadius: 8, 
                                      padding: '8px 10px', 
                                      marginBottom: 6,
                                      border: '1px solid rgba(255,255,255,0.05)'
                                    }}
                                  >
                                    <div 
                                      style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 9,
                                        fontWeight: 700,
                                        color: "var(--text-primary)",
                                        flexShrink: 0
                                      }}
                                    >
                                      {member.user?.profileImage ? (
                                        <img 
                                          src={member.user.profileImage} 
                                          alt="" 
                                          style={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            objectFit: 'cover', 
                                            borderRadius: '50%' 
                                          }} 
                                        />
                                      ) : (
                                        member.user?.name?.charAt(0)?.toUpperCase() || '?'
                                      )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ 
                                        color: "var(--text-primary)", 
                                        fontWeight: 600, 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        whiteSpace: 'nowrap',
                                        fontSize: 12
                                      }}>
                                        {member.user?.name || 'Unknown'}
                                      </div>
                                      <div style={{ color: "var(--text-tertiary)", fontSize: 10 }}>
                                        {member.school} • {member.class}
                                      </div>
                                    </div>
                                    <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.35)', flexShrink: 0 }}>
                                      {new Date(member.joinedAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {stats.count === 0 && (
                              <div style={{ 
                                textAlign: 'center', 
                                padding: '24px 0', 
                                color: "var(--text-muted)", 
                                fontSize: 11 
                              }}>
                                No students enrolled yet
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                {/* ── Pending Join Requests ── */}
                <div style={{ borderRadius: 18, background: "var(--bg-tertiary)", border: "1px solid var(--border-secondary)", backdropFilter: 'blur(20px)', overflow: 'hidden' }}>
                  <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Users size={16} color="#818cf8" />
                      <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14 }}>Join Requests</span>
                      {bRequests.length > 0 && (
                        <span style={{ background: '#ef4444', color: "var(--text-primary)", borderRadius: 99, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{bRequests.length}</span>
                      )}
                    </div>
                    <button onClick={fetchBroadcastData} style={{ background: 'rgba(99,102,241,0.15)', border: "1px solid var(--border-primary)", borderRadius: 8, color: '#a5b4fc', cursor: 'pointer', padding: '5px 8px', display: 'flex', alignItems: 'center' }}>
                      <RefreshCw size={13} />
                    </button>
                  </div>
                  <div style={{ padding: '12px 16px', maxHeight: 420, overflowY: 'auto' }}>
                    {bRequests.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", textAlign: 'center', padding: '30px 0', fontSize: 13 }}>No pending requests</p>
                    ) : bRequests.map((req, i) => {
                      const chCurrent  = CHANNELS.find(c => c.id === req.currentChannel)
                      const chRequested = CHANNELS.find(c => c.id === req.requestedChannel)
                      return (
                        <motion.div key={req._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          style={{ padding: '14px', borderRadius: 14, marginBottom: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.1)' }}>
                          
                          {/* User Info Header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            {req.user?.profileImage
                              ? <img src={req.user.profileImage} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(99,102,241,0.3)' }} />
                              : <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: "var(--text-primary)", fontWeight: 700, fontSize: 14, border: '2px solid rgba(99,102,241,0.3)' }}>{req.user?.name?.[0]?.toUpperCase()}</div>}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14, margin: 0 }}>{req.user?.name}</p>
                              <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: 0 }}>{req.user?.email}</p>
                            </div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: 'monospace' }}>
                              {new Date(req.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Student Details */}
                          <div style={{ 
                            background: 'rgba(255,255,255,0.02)', 
                            border: '1px solid rgba(99,102,241,0.08)',
                            borderRadius: 8, padding: '10px', marginBottom: 10 
                          }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                              <div>
                                <span style={{ color: "var(--text-tertiary)" }}>School: </span>
                                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{req.school}</span>
                              </div>
                              <div>
                                <span style={{ color: "var(--text-tertiary)" }}>Class: </span>
                                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{req.class}</span>
                              </div>
                            </div>
                          </div>

                          {/* Channel Switch Info */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: `${chCurrent?.color}15`, border: `1px solid ${chCurrent?.color}30` }}>
                              <span style={{ fontSize: 16 }}>{chCurrent?.icon}</span>
                              <span style={{ color: chCurrent?.color, fontWeight: 600 }}>{chCurrent?.name}</span>
                            </div>
                            <span style={{ color: "var(--text-muted)", fontSize: 16 }}>→</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: `${chRequested?.color}15`, border: `1px solid ${chRequested?.color}30` }}>
                              <span style={{ fontSize: 16 }}>{chRequested?.icon}</span>
                              <span style={{ color: chRequested?.color, fontWeight: 600 }}>{chRequested?.name}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                              onClick={() => handleAcceptRequest(req._id)}
                              disabled={actionLoading === req._id + '_accept'}
                              style={{ 
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, 
                                padding: '9px', borderRadius: 10, border: '1px solid rgba(52,211,153,0.4)', 
                                background: 'rgba(52,211,153,0.12)', color: '#34d399', cursor: 'pointer', 
                                fontSize: 12, fontWeight: 700 
                              }}>
                              {actionLoading === req._id + '_accept' ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />} 
                              Accept Request
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                              onClick={() => handleRejectRequest(req._id)}
                              disabled={actionLoading === req._id + '_reject'}
                              style={{ 
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, 
                                padding: '9px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', 
                                background: 'rgba(239,68,68,0.12)', color: '#f87171', cursor: 'pointer', 
                                fontSize: 12, fontWeight: 700 
                              }}>
                              {actionLoading === req._id + '_reject' ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={14} />} 
                              Reject Request
                            </motion.button>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>

                {/* ── Access Codes Management — one code per channel ── */}
                <div style={{ borderRadius: 18, background: "var(--bg-tertiary)", border: "1px solid var(--border-secondary)", backdropFilter: 'blur(20px)', overflow: 'hidden' }}>
                  <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Key size={16} color="#818cf8" />
                      <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14 }}>Channel Access Codes</span>
                    </div>
                    <span style={{ color: 'rgba(148,163,184,0.45)', fontSize: 11, fontFamily: 'monospace' }}>one code per channel</span>
                  </div>
                  <div style={{ padding: '16px' }}>
                    {CHANNELS.map((ch) => {
                      const existing = bCodes.find(c => c.channel === ch.id)
                      return (
                        <ChannelCodeRow key={ch.id} ch={ch} existing={existing}
                          onSave={async (code) => {
                            try {
                              // Delete old codes for this channel first
                              const oldCodes = bCodes.filter(c => c.channel === ch.id)
                              await Promise.all(oldCodes.map(c => broadcastAPI.deleteCode(c._id)))
                              if (code.trim()) await broadcastAPI.addCode({ channel: ch.id, code: code.trim() })
                              fetchBroadcastData()
                              showToast(`${ch.name} code updated!`)
                            } catch (err) { showToast(err?.response?.data?.message || 'Failed', 'error') }
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
