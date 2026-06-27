import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { doubtAPI, roomAPI } from "../services/api"
import Sidebar from "../components/Sidebar"
import Navbar from "../components/Navbar"
import GlowingQuestionMark from "../components/GlowingQuestionMark"
import { Link, useNavigate } from "react-router-dom"
import { Search, Trash2, Edit, Users, X, MessageCircle, Loader2, Plus } from "lucide-react"
import { useAuthStore } from "../store/authStore"

const STATUS_FILTERS = [
  { id: "all", label: "All", icon: "??" },
  { id: "unsolved", label: "Unsolved", icon: "??" },
  { id: "solved", label: "Solved", icon: "?" },
  { id: "matched", label: "Matched", icon: "??" },
  { id: "trending", label: "Trending", icon: "??" },
]

const TOPICS = ["Robotics", "Programming", "Electronics", "Mechanics", "AI/ML"]

const TOPIC_COLORS = {
  Robotics: "#60a5fa", Programming: "#34d399", Electronics: "#fbbf24",
  Mechanics: "#f87171", "AI/ML": "#a78bfa",
}

function StatusBadge({ status }) {
  const cfg = {
    open:     { bg: "#fef3c7", color: "#d97706", label: "Unsolved" },
    resolved: { bg: "#d1fae5", color: "#059669", label: "Solved" },
    matched:  { bg: "#dbeafe", color: "#3b82f6", label: "Matched" },
  }
  const c = cfg[status] || cfg.open
  return (
    <span className="text-xs px-2.5 py-1 rounded-md font-medium"
      style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  )
}

export default function Doubts() {
  const [doubts, setDoubts] = useState([])
  const [allDoubts, setAllDoubts] = useState([])
  const [search, setSearch] = useState("")
  const [topic, setTopic] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchedRoom, setMatchedRoom] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const limit = 10

  useEffect(() => {
    const fetchDoubts = async () => {
      try {
        setLoading(true)
        let res
        if (search) {
          res = await doubtAPI.search(search)
          const all = res.data.data?.doubts || []
          // Filter to only current user's doubts (My Doubts page)
          const ud = all.filter(d => user && (d.userId === user._id || d.userId?._id === user._id || String(d.userId) === String(user._id)))
          setAllDoubts(ud); setTotal(ud.length)
        } else if (topic) {
          res = await doubtAPI.getByTopic(topic, page)
          const all = res.data.data?.doubts || []
          const ud = all.filter(d => user && (d.userId === user._id || d.userId?._id === user._id || String(d.userId) === String(user._id)))
          setAllDoubts(ud); setTotal(res.data.data?.pagination?.total || 0)
        } else {
          // Fetch all doubts — limit 200 to get all user's doubts
          res = await doubtAPI.list(page, 200)
          const all = res.data.data?.doubts || []
          const ud = all.filter(d => user && (d.userId === user._id || d.userId?._id === user._id || String(d.userId) === String(user._id)))
          setAllDoubts(ud); setTotal(ud.length)
        }
      } catch (err) { console.error("Failed to fetch doubts:", err) }
      finally { setLoading(false) }
    }
    if (user) { const t = setTimeout(fetchDoubts, 200); return () => clearTimeout(t) }
  }, [page, search, topic, user])

  useEffect(() => {
    if (statusFilter === "all") setDoubts(allDoubts)
    else if (statusFilter === "unsolved") setDoubts(allDoubts.filter(d => d.status === "open"))
    else if (statusFilter === "solved") setDoubts(allDoubts.filter(d => d.status === "resolved"))
    else if (statusFilter === "matched") setDoubts(allDoubts.filter(d => d.status === "matched"))
    else if (statusFilter === "trending") setDoubts([...allDoubts].sort((a, b) => (b.replies?.length || 0) - (a.replies?.length || 0)))
  }, [statusFilter, allDoubts])

  const handleDelete = async (id, e) => {
    e.preventDefault(); e.stopPropagation()
    if (!window.confirm("Delete this doubt?")) return
    try { await doubtAPI.delete(id); window.location.reload() }
    catch (err) { alert(err.response?.data?.error?.message || "Failed to delete") }
  }

  const handleFindMatch = async (id, e) => {
    e.preventDefault(); e.stopPropagation()
    try {
      const res = await doubtAPI.findMatch(id)
      const { matched, room } = res.data.data
      if (matched && room) {
        if (window.confirm("Match found! Click OK to start chatting.")) window.location.href = `/chat/${room._id}`
        else window.location.reload()
      } else alert("No matching doubts found at the moment.")
    } catch (err) { alert(err.response?.data?.error?.message || "Failed to find match") }
  }

  const handleViewMatch = async (doubt, e) => {
    e.preventDefault(); e.stopPropagation()
    if (doubt.status !== "matched") return
    try {
      const res = await roomAPI.list()
      const rooms = res.data.data?.rooms || res.data.data || []
      const room = rooms.find(r => {
        const d1 = r.doubt1?._id || r.doubt1; const d2 = r.doubt2?._id || r.doubt2
        return String(d1) === String(doubt._id) || String(d2) === String(doubt._id)
      })
      if (room) {
        // Navigate directly to chat
        navigate(`/chat/${room._id}`)
      } else {
        alert("Match room not found. Please try again.")
      }
    } catch (err) { alert("Failed to load match details: " + (err.response?.data?.error?.message || err.message)) }
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div style={{ position: "relative", zIndex: 60 }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="relative flex-1 lg:ml-[240px] mt-16 px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden"
        style={{ background: 'var(--bg-primary)' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} 
          className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-theme-primary mb-1.5">My Doubts</h1>
            <p className="text-theme-secondary text-sm">Track, manage and resolve your questions</p>
          </div>
          <Link to="/doubts/new">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-lg transition-all"
              style={{ background: "#6366f1", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
              <Plus size={16} />Post Doubt
            </motion.button>
          </Link>
        </motion.div>

        {/* Status Filter Tabs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex gap-2 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {STATUS_FILTERS.map(f => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)}
              className="px-4 py-2 text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 rounded-lg"
              style={{
                background: statusFilter === f.id ? "#e0e7ff" : "transparent",
                color: statusFilter === f.id ? "#6366f1" : "var(--text-tertiary)",
                border: "none"
              }}>
              {f.label}
            </button>
          ))}
        </motion.div>

        {/* Search + Topic Filters */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="mb-6 space-y-4">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-tertiary" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search doubts..."
              className="w-full pl-11 pr-4 py-3 text-sm text-theme-primary placeholder-theme-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)" }} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setTopic(""); setPage(1) }}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{ 
                background: !topic ? "#e0e7ff" : "var(--bg-secondary)", 
                color: !topic ? "#6366f1" : "var(--text-tertiary)",
                border: `1px solid ${!topic ? "#c7d2fe" : "var(--border-primary)"}`
              }}>
              All
            </button>
            {TOPICS.map(t => (
              <button key={t} onClick={() => { setTopic(t); setPage(1) }}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{ 
                  background: topic === t ? "#e0e7ff" : "var(--bg-secondary)", 
                  color: topic === t ? "#6366f1" : "var(--text-tertiary)",
                  border: `1px solid ${topic === t ? "#c7d2fe" : "var(--border-primary)"}`
                }}>
                {t}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Doubts List */}
        {loading ? (
          <div className="flex flex-col items-center py-24 gap-3">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Loader2 size={36} className="text-indigo-500" />
            </motion.div>
            <p className="text-theme-secondary text-sm">Loading doubts...</p>
          </div>
        ) : doubts.length > 0 ? (
          <div className="space-y-3">
            {doubts.map((doubt, i) => (
              <motion.div key={doubt._id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3), type: "spring", stiffness: 200 }}
                className="group rounded-xl p-4 transition-all hover:shadow-md"
                style={{ 
                  background: "var(--bg-secondary)", 
                  border: "1px solid var(--border-primary)"
                }}>
                <div className="flex items-start justify-between gap-4">
                  <Link to={`/doubts/${doubt._id}`} className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1.5 line-clamp-2 transition-colors"
                      style={{ color: "#6366f1" }}>
                      {doubt.title}
                    </h3>
                    <p className="text-sm line-clamp-2 mb-3 text-theme-secondary">
                      {doubt.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {doubt.topic && (
                        <span className="px-2.5 py-1 text-xs font-medium rounded-md"
                          style={{ background: "#fef3c7", color: "#d97706" }}>
                          {doubt.topic}
                        </span>
                      )}
                      {doubt.status === "matched" ? (
                        <button onClick={e => handleViewMatch(doubt, e)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all hover:opacity-80"
                          style={{ background: "#dbeafe", color: "#3b82f6" }}>
                          <Users size={12} />matched � tap to view
                        </button>
                      ) : <StatusBadge status={doubt.status} />}
                      {doubt.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="px-2.5 py-1 text-xs rounded-md"
                          style={{ background: "var(--bg-primary)", color: "var(--text-tertiary)", border: "1px solid var(--border-primary)" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </Link>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Link to={`/doubts/${doubt._id}/edit`}>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="p-2 rounded-lg transition-colors"
                        style={{ background: "transparent", color: "#6366f1" }}>
                        <Edit size={16} />
                      </motion.button>
                    </Link>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={e => handleDelete(doubt._id, e)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ background: "transparent", color: "#ef4444" }}>
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 rounded-xl"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "#e0e7ff" }}>
              <Search size={28} style={{ color: "#6366f1" }} />
            </div>
            <p className="text-theme-primary font-semibold mb-1">No doubts found</p>
            <p className="text-sm mb-5 text-theme-secondary">Post your first doubt to get started</p>
            <Link to="/doubts/new">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="px-5 py-2.5 text-white font-semibold rounded-lg text-sm"
                style={{ background: "#6366f1", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
                Post a Doubt
              </motion.button>
            </Link>
          </motion.div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex justify-center items-center gap-3 mt-6">
            <motion.button whileHover={{ scale: 1.02 }} disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-40 transition-all"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}>
              <span style={{ color: "var(--text-primary)" }}>←</span>
            </motion.button>
            <div className="flex gap-1">
              {[1, 2, 3].map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className="w-8 h-8 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: page === p ? "#6366f1" : "var(--bg-secondary)",
                    color: page === p ? "white" : "var(--text-primary)",
                    border: `1px solid ${page === p ? "#6366f1" : "var(--border-primary)"}`
                  }}>
                  {p}
                </button>
              ))}
              {Math.ceil(total / limit) > 5 && <span className="text-theme-tertiary px-2">...</span>}
              {Math.ceil(total / limit) > 3 && (
                <button onClick={() => setPage(Math.ceil(total / limit))}
                  className="w-8 h-8 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: page === Math.ceil(total / limit) ? "#6366f1" : "var(--bg-secondary)",
                    color: page === Math.ceil(total / limit) ? "white" : "var(--text-primary)",
                    border: `1px solid ${page === Math.ceil(total / limit) ? "#6366f1" : "var(--border-primary)"}`
                  }}>
                  {Math.ceil(total / limit)}
                </button>
              )}
            </div>
            <motion.button whileHover={{ scale: 1.02 }} disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-40 transition-all"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}>
              <span style={{ color: "var(--text-primary)" }}>→</span>
            </motion.button>
          </div>
        )}

        {/* Match Modal */}
        <AnimatePresence>
          {showMatchModal && selectedMatch && matchedRoom && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
              onClick={() => setShowMatchModal(false)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="rounded-2xl max-w-lg w-full max-h-[88vh] overflow-y-auto"
                style={{ background: "var(--bg-card)", border: "1px solid rgba(99,102,241,0.3)", backdropFilter: "blur(24px)" }}
                onClick={e => e.stopPropagation()}>
                <div className="h-0.5" style={{ background: "linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)" }} />
                <div className="p-5 flex justify-between items-start" style={{ borderBottom: "1px solid var(--border-primary)" }}>
                  <div>
                    <h2 className="text-lg font-bold text-theme-primary mb-0.5">?? Match Found!</h2>
                    <p style={{ color: "rgba(99,102,241,0.7)", fontSize: "0.75rem", fontFamily: "monospace" }}>You have been matched with another student</p>
                  </div>
                  <button onClick={() => setShowMatchModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition">
                    <X size={18} style={{ color: "var(--text-secondary)" }} />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <p style={{ color: "rgba(99,102,241,0.6)", fontSize: "0.65rem", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>// Your Doubt</p>
                    <div className="rounded-xl p-4" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid var(--border-primary)" }}>
                      <h4 className="font-semibold text-sm text-theme-primary mb-1">{selectedMatch.title}</h4>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "8px" }}>{selectedMatch.description}</p>
                      <StatusBadge status={selectedMatch.status} />
                    </div>
                  </div>
                  {(() => {
                    const matchedDoubt = matchedRoom.doubt1?._id === selectedMatch._id ? matchedRoom.doubt2 : matchedRoom.doubt1
                    const matchedUser = matchedRoom.student1?._id === user._id ? matchedRoom.student2 : matchedRoom.student1
                    return (
                      <div>
                        <p style={{ color: "rgba(99,102,241,0.6)", fontSize: "0.65rem", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>// Matched Student</p>
                        <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-theme-primary font-bold text-sm"
                              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                              {matchedUser?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-theme-primary">{matchedUser?.name}</p>
                              <p style={{ color: "var(--text-tertiary)", fontSize: "0.7rem" }}>{matchedUser?.email}</p>
                            </div>
                          </div>
                          <h4 className="font-semibold text-sm text-theme-primary mb-1">{matchedDoubt?.title}</h4>
                          <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "8px" }}>{matchedDoubt?.description}</p>
                        </div>
                        <div className="flex gap-2.5">
                          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-theme-primary text-sm font-semibold rounded-xl"
                            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 12px rgba(99,102,241,0.4)" }}
                            onClick={() => navigate(`/chat/${matchedRoom._id}`)}>
                            <MessageCircle size={16} /> Start Chat
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            className="px-4 py-2.5 text-sm font-semibold rounded-xl"
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(148,163,184,0.8)" }}
                            onClick={() => setShowMatchModal(false)}>
                            Close
                          </motion.button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
