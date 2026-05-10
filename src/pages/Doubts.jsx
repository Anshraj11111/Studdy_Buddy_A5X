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
  { id: "all", label: "All", icon: "📋" },
  { id: "unsolved", label: "Unsolved", icon: "🔴" },
  { id: "solved", label: "Solved", icon: "✅" },
  { id: "matched", label: "Matched", icon: "🤝" },
  { id: "trending", label: "Trending", icon: "🔥" },
]

const TOPICS = ["Robotics", "Programming", "Electronics", "Mechanics", "AI/ML"]

const TOPIC_COLORS = {
  Robotics: "#60a5fa", Programming: "#34d399", Electronics: "#fbbf24",
  Mechanics: "#f87171", "AI/ML": "#a78bfa",
}

function StatusBadge({ status }) {
  const cfg = {
    open:     { bg: "rgba(251,191,36,0.15)",  border: "rgba(251,191,36,0.35)",  color: "#fbbf24", label: "Open" },
    resolved: { bg: "rgba(52,211,153,0.15)",  border: "rgba(52,211,153,0.35)",  color: "#34d399", label: "Resolved" },
    matched:  { bg: "rgba(99,102,241,0.15)",  border: "rgba(99,102,241,0.35)",  color: "#a5b4fc", label: "Matched" },
  }
  const c = cfg[status] || cfg.open
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
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

  useEffect(() => {
    const fetchDoubts = async () => {
      try {
        setLoading(true)
        let res
        if (search) {
          res = await doubtAPI.search(search)
          const all = res.data.data?.doubts || []
          const ud = all.filter(d => user && (d.userId === user._id || d.userId?._id === user._id || String(d.userId) === String(user._id)))
          setAllDoubts(ud); setTotal(ud.length)
        } else if (topic) {
          res = await doubtAPI.getByTopic(topic, page)
          const all = res.data.data?.doubts || []
          const ud = all.filter(d => user && (d.userId === user._id || d.userId?._id === user._id || String(d.userId) === String(user._id)))
          setAllDoubts(ud); setTotal(res.data.data?.pagination?.total || 0)
        } else {
          res = await doubtAPI.list(page, 100)
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
    <div className="flex min-h-screen" style={{ position: "relative" }}>
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "url(/src/assets/image.png)", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 1, background: "rgba(5,3,20,0.80)" }} />
      <div style={{ position: "relative", zIndex: 60 }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="relative flex-1 lg:ml-[240px] mt-16 px-3 sm:px-5 py-5 overflow-x-hidden" style={{ zIndex: 5 }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <GlowingQuestionMark size={50} />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ background: "linear-gradient(135deg,#a5b4fc,#818cf8,#c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                My Doubts
              </h1>
              <p className="text-xs hidden sm:block" style={{ color: "rgba(148,163,184,0.7)", fontFamily: "monospace" }}>Track, manage and resolve your questions</p>
            </div>
          </div>
          <Link to="/doubts/new">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-white text-sm font-semibold rounded-xl"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 12px rgba(99,102,241,0.4)" }}>
              <Plus size={15} /><span className="hidden sm:inline">Post Doubt</span><span className="sm:hidden">Post</span>
            </motion.button>
          </Link>
        </motion.div>

        {/* Status Filter Tabs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {STATUS_FILTERS.map(f => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0"
              style={{
                background: statusFilter === f.id ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(10,8,30,0.7)",
                border: `1px solid ${statusFilter === f.id ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.15)"}`,
                color: statusFilter === f.id ? "white" : "rgba(148,163,184,0.7)",
                boxShadow: statusFilter === f.id ? "0 2px 10px rgba(99,102,241,0.35)" : "none",
                backdropFilter: "blur(12px)",
              }}>
              <span>{f.icon}</span><span>{f.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Search + Topic Filters */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl p-3 mb-4 space-y-3"
          style={{ background: "rgba(10,8,30,0.7)", border: "1px solid rgba(99,102,241,0.15)", backdropFilter: "blur(20px)" }}>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(148,163,184,0.5)" }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search doubts..."
              className="w-full pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,102,241,0.2)" }} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setTopic(""); setPage(1) }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition"
              style={{ background: !topic ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.05)", border: `1px solid ${!topic ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.1)"}`, color: !topic ? "#a5b4fc" : "rgba(148,163,184,0.7)" }}>
              All
            </button>
            {TOPICS.map(t => {
              const c = TOPIC_COLORS[t] || "#818cf8"
              return (
                <button key={t} onClick={() => { setTopic(t); setPage(1) }}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition"
                  style={{ background: topic === t ? `${c}25` : "rgba(255,255,255,0.05)", border: `1px solid ${topic === t ? c + "60" : "rgba(255,255,255,0.1)"}`, color: topic === t ? c : "rgba(148,163,184,0.7)" }}>
                  {t}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Doubts List */}
        {loading ? (
          <div className="flex flex-col items-center py-24 gap-3">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Loader2 size={36} style={{ color: "#818cf8" }} />
            </motion.div>
            <p style={{ color: "rgba(148,163,184,0.6)", fontSize: "0.8rem", fontFamily: "monospace" }}>Loading doubts...</p>
          </div>
        ) : doubts.length > 0 ? (
          <div className="space-y-3">
            {doubts.map((doubt, i) => (
              <motion.div key={doubt._id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3), type: "spring", stiffness: 200 }}
                whileHover={{ x: 3, transition: { duration: 0.15 } }}
                className="group relative rounded-2xl overflow-hidden"
                style={{ background: "rgba(10,8,30,0.7)", border: "1px solid rgba(99,102,241,0.15)", backdropFilter: "blur(20px)" }}>
                <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: "linear-gradient(to bottom,#6366f1,#8b5cf6)" }} />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at left,rgba(99,102,241,0.08),transparent 70%)" }} />
                <div className="p-4 pl-5 relative z-10">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/doubts/${doubt._id}`} className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-sm sm:text-base mb-1 line-clamp-2 hover:text-indigo-300 transition">
                        {doubt.title}
                      </h3>
                      <p className="text-xs sm:text-sm line-clamp-2 mb-2" style={{ color: "rgba(148,163,184,0.7)" }}>
                        {doubt.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {doubt.topic && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: `${TOPIC_COLORS[doubt.topic] || "#818cf8"}20`, border: `1px solid ${TOPIC_COLORS[doubt.topic] || "#818cf8"}40`, color: TOPIC_COLORS[doubt.topic] || "#a5b4fc" }}>
                            {doubt.topic}
                          </span>
                        )}
                        {doubt.status === "matched" ? (
                          <button onClick={e => handleViewMatch(doubt, e)}
                            className="text-xs px-2 py-0.5 rounded-full font-semibold transition hover:opacity-80"
                            style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)", color: "#a5b4fc" }}>
                            matched · tap to view
                          </button>
                        ) : <StatusBadge status={doubt.status} />}
                        {doubt.tags?.slice(0, 2).map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(148,163,184,0.6)" }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </Link>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {doubt.status === "open" && (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={e => handleFindMatch(doubt._id, e)}
                          className="flex items-center gap-1.5 px-2.5 py-2 text-white text-xs font-semibold rounded-xl"
                          style={{ background: "linear-gradient(135deg,#059669,#047857)", boxShadow: "0 2px 8px rgba(5,150,105,0.35)" }}>
                          <Users size={13} /><span className="hidden sm:inline">Find Match</span>
                        </motion.button>
                      )}
                      <div className="flex gap-1.5">
                        <Link to={`/doubts/${doubt._id}/edit`}>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            className="p-2 rounded-xl transition"
                            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc" }}>
                            <Edit size={13} />
                          </motion.button>
                        </Link>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          onClick={e => handleDelete(doubt._id, e)}
                          className="p-2 rounded-xl transition"
                          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
                          <Trash2 size={13} />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 rounded-2xl"
            style={{ background: "rgba(10,8,30,0.6)", border: "1px solid rgba(99,102,241,0.15)", backdropFilter: "blur(20px)" }}>
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <Search size={28} style={{ color: "rgba(99,102,241,0.6)" }} />
            </motion.div>
            <p className="text-white font-semibold mb-1">No doubts found</p>
            <p className="text-sm mb-5" style={{ color: "rgba(148,163,184,0.6)" }}>Post your first doubt to get started</p>
            <Link to="/doubts/new">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-5 py-2.5 text-white font-semibold rounded-xl text-sm"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 12px rgba(99,102,241,0.4)" }}>
                Post a Doubt
              </motion.button>
            </Link>
          </motion.div>
        )}

        {/* Pagination */}
        {total > 10 && (
          <div className="flex justify-center items-center gap-3 mt-6">
            <motion.button whileHover={{ scale: 1.05 }} disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-40"
              style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}>
              Previous
            </motion.button>
            <span className="text-sm" style={{ color: "rgba(148,163,184,0.6)", fontFamily: "monospace" }}>
              {page} / {Math.ceil(total / 10)}
            </span>
            <motion.button whileHover={{ scale: 1.05 }} disabled={page >= Math.ceil(total / 10)} onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-40"
              style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}>
              Next
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
                style={{ background: "rgba(10,8,30,0.97)", border: "1px solid rgba(99,102,241,0.3)", backdropFilter: "blur(24px)" }}
                onClick={e => e.stopPropagation()}>
                <div className="h-0.5" style={{ background: "linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)" }} />
                <div className="p-5 flex justify-between items-start" style={{ borderBottom: "1px solid rgba(99,102,241,0.2)" }}>
                  <div>
                    <h2 className="text-lg font-bold text-white mb-0.5">🎉 Match Found!</h2>
                    <p style={{ color: "rgba(99,102,241,0.7)", fontSize: "0.75rem", fontFamily: "monospace" }}>You have been matched with another student</p>
                  </div>
                  <button onClick={() => setShowMatchModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition">
                    <X size={18} style={{ color: "rgba(148,163,184,0.6)" }} />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <p style={{ color: "rgba(99,102,241,0.6)", fontSize: "0.65rem", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>// Your Doubt</p>
                    <div className="rounded-xl p-4" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                      <h4 className="font-semibold text-sm text-white mb-1">{selectedMatch.title}</h4>
                      <p style={{ color: "rgba(148,163,184,0.6)", fontSize: "0.75rem", marginBottom: "8px" }}>{selectedMatch.description}</p>
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
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                              {matchedUser?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-white">{matchedUser?.name}</p>
                              <p style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.7rem" }}>{matchedUser?.email}</p>
                            </div>
                          </div>
                          <h4 className="font-semibold text-sm text-white mb-1">{matchedDoubt?.title}</h4>
                          <p style={{ color: "rgba(148,163,184,0.6)", fontSize: "0.75rem", marginBottom: "8px" }}>{matchedDoubt?.description}</p>
                        </div>
                        <div className="flex gap-2.5">
                          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white text-sm font-semibold rounded-xl"
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
