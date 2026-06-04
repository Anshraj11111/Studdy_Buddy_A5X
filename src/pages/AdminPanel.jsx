import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { adminAPI } from "../services/api"
import { Users, GraduationCap, BookOpen, FileText, Search, RefreshCw, Shield, Loader2, Trash2, ToggleLeft, ToggleRight, LogOut, TrendingUp } from "lucide-react"

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || "H5"

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
        <div style={{ position: "fixed", inset: 0, zIndex: 1, background: "rgba(5,3,20,0.88)" }} />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm relative" style={{ zIndex: 10 }}>
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,8,30,0.9)", border: "1px solid rgba(99,102,241,0.3)", backdropFilter: "blur(24px)" }}>
            <div className="h-0.5" style={{ background: "linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)" }} />
            <div className="p-8">
              <div className="text-center mb-6">
                <motion.div animate={{ boxShadow: ["0 0 0px rgba(99,102,241,0)", "0 0 24px rgba(99,102,241,0.6)", "0 0 0px rgba(99,102,241,0)"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.25))", border: "1px solid rgba(99,102,241,0.4)" }}>
                  <Shield size={28} style={{ color: "#818cf8" }} />
                </motion.div>
                <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                <p style={{ color: "rgba(148,163,184,0.6)", fontSize: "0.8rem", fontFamily: "monospace" }}>Studdy Buddy Control Center</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <input type="password" placeholder="Enter admin password" value={pw}
                  onChange={e => { setPw(e.target.value); setPwErr("") }} autoFocus
                  className="w-full text-white placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(99,102,241,0.2)" }} />
                {pwErr && <p className="text-red-400 text-sm">{pwErr}</p>}
                <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-3 text-white font-semibold rounded-xl"
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
      <div style={{ position: "fixed", inset: 0, zIndex: 1, background: "rgba(5,3,20,0.82)" }} />

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
      <div className="sticky top-0" style={{ zIndex: 50, background: "rgba(5,3,20,0.92)", borderBottom: "1px solid rgba(99,102,241,0.2)", backdropFilter: "blur(24px)" }}>
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
              <h1 className="font-bold text-white text-sm">Admin Panel</h1>
              <p style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.65rem", fontFamily: "monospace" }}>Studdy Buddy Control Center</p>
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
                  style={{ background: "rgba(10,8,30,0.75)", border: "1px solid rgba(99,102,241,0.15)", backdropFilter: "blur(20px)" }}>
                  <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(ellipse at top right,${s.color},transparent 70%)` }} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <p style={{ color: "rgba(148,163,184,0.6)", fontSize: "0.65rem", fontFamily: "monospace" }}>{s.label}</p>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: `${s.color}20`, border: `1px solid ${s.color}30` }}>
                        <Icon size={13} style={{ color: s.color }} />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-white">{s.value ?? "-"}</p>
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
          style={{ background: "rgba(10,8,30,0.7)", border: "1px solid rgba(99,102,241,0.15)", backdropFilter: "blur(20px)" }}>
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
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(148,163,184,0.5)" }} />
            <input type="text" placeholder="Search by name or email..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,102,241,0.2)" }} />
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl transition"
            style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.35)" }}>
            <RefreshCw size={13} /> Refresh
          </motion.button>
        </motion.div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,8,30,0.7)", border: "1px solid rgba(99,102,241,0.15)", backdropFilter: "blur(20px)" }}>
          <div className="h-0.5" style={{ background: "linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)" }} />
          {loading ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <Loader2 size={36} style={{ color: "#818cf8" }} />
              </motion.div>
              <p style={{ color: "rgba(148,163,184,0.6)", fontSize: "0.8rem", fontFamily: "monospace" }}>Loading users...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(99,102,241,0.15)" }}>
                    {["User", "Role", "XP", "Status", "Joined", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "rgba(99,102,241,0.7)", fontFamily: "monospace" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12" style={{ color: "rgba(148,163,184,0.5)" }}>No users found</td></tr>
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
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                              {u.name?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-white text-sm">{u.name}</div>
                            <div className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>{u.email}</div>
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
                      <td className="px-4 py-3 text-xs" style={{ color: "rgba(148,163,184,0.5)", fontFamily: "monospace" }}>
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
            <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)", fontFamily: "monospace" }}>
              Showing <span style={{ color: "#818cf8" }}>{Math.min((page - 1) * 20 + 1, total)}-{Math.min(page * 20, total)}</span> of {total}
            </p>
            <div className="flex gap-2">
              <motion.button whileHover={{ scale: 1.05 }} onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-40"
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}>
                Previous
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= total}
                className="px-4 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-40"
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}>
                Next
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
