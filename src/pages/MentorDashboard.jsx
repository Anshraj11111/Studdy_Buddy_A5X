import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { doubtAPI, roomAPI } from "../services/api"
import { useAuthStore } from "../store/authStore"
import { MessageSquare, CheckCircle, Users, Edit2, Trash2, User, Video, MessageCircle, Loader2, Send, X, LayoutDashboard } from "lucide-react"
import Navbar from "../components/Navbar"

export default function MentorDashboard() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState("doubts")
  const [doubts, setDoubts] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState(null)
  const [editingReply, setEditingReply] = useState(null)
  const [replyText, setReplyText] = useState("")
  const [stats, setStats] = useState({ totalDoubts: 0, pendingReplies: 0, activeChats: 0 })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { fetchAllDoubts(); fetchRooms() }, [])

  const fetchAllDoubts = async () => {
    try {
      setLoading(true)
      const res = await doubtAPI.list(1, 100)
      const all = res.data.data.doubts || []
      setDoubts(all)
      setStats(prev => ({ ...prev, totalDoubts: all.length, pendingReplies: all.filter(d => !d.replies || d.replies.length === 0).length }))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const fetchRooms = async () => {
    try {
      const res = await roomAPI.list()
      const r = res.data.data?.rooms || []
      setRooms(r)
      setStats(prev => ({ ...prev, activeChats: r.length }))
    } catch (err) { console.error(err) }
  }

  const handleReply = async (doubtId) => {
    if (!replyText.trim()) return
    try {
      if (editingReply) { await doubtAPI.editReply(doubtId, editingReply, { content: replyText }); setEditingReply(null) }
      else await doubtAPI.addReply(doubtId, { content: replyText })
      setReplyText(""); setReplyingTo(null); fetchAllDoubts()
    } catch (err) { alert(err.response?.data?.error?.message || "Failed to save reply") }
  }

  const handleEditReply = (doubtId, reply) => { setReplyingTo(doubtId); setEditingReply(reply._id); setReplyText(reply.content) }

  const handleDeleteReply = async (doubtId, replyId) => {
    if (!window.confirm("Delete this reply?")) return
    try { await doubtAPI.deleteReply(doubtId, replyId); fetchAllDoubts() }
    catch (err) { alert(err.response?.data?.error?.message || "Failed to delete reply") }
  }

  const cancelReply = () => { setReplyingTo(null); setEditingReply(null); setReplyText("") }

  const getOtherUser = (room) => {
    if (!user || !room) return null
    return String(user._id) === String(room.student1?._id || room.student1) ? room.student2 : room.student1
  }

  const STAT_CARDS = [
    { label: "Total Doubts", value: stats.totalDoubts, icon: MessageSquare, color: "#6366f1", glow: "rgba(99,102,241,0.4)" },
    { label: "Pending", value: stats.pendingReplies, icon: Users, color: "#fbbf24", glow: "rgba(251,191,36,0.4)" },
    { label: "Chats", value: stats.activeChats, icon: CheckCircle, color: "#34d399", glow: "rgba(52,211,153,0.4)" },
  ]

  return (
    <div className="flex min-h-screen" style={{ position: "relative" }}>
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "url(/src/assets/image.png)", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 1, background: "rgba(5,3,20,0.82)" }} />

      <div className="relative flex-1 mt-16 px-3 sm:px-5 py-5 overflow-x-hidden" style={{ zIndex: 5 }}>
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-6">
            <motion.div animate={{ boxShadow: ["0 0 0px rgba(99,102,241,0)", "0 0 24px rgba(99,102,241,0.5)", "0 0 0px rgba(99,102,241,0)"] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.25))", border: "1px solid rgba(99,102,241,0.4)" }}>
              <LayoutDashboard size={26} style={{ color: "#818cf8" }} />
            </motion.div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold"
                style={{ background: "linear-gradient(135deg,#a5b4fc,#818cf8,#c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Mentor Dashboard
              </h1>
              <p style={{ color: "rgba(148,163,184,0.7)", fontSize: "0.8rem", fontFamily: "monospace" }}>
                Welcome back, {user?.name?.split(" ")[0] || "Mentor"}
              </p>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
            {STAT_CARDS.map((s, i) => {
              const Icon = s.icon
              return (
                <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="rounded-2xl p-4 relative overflow-hidden"
                  style={{ background: "rgba(10,8,30,0.75)", border: "1px solid rgba(99,102,241,0.15)", backdropFilter: "blur(20px)" }}>
                  <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(ellipse at top right,${s.color},transparent 70%)` }} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <p style={{ color: "rgba(148,163,184,0.6)", fontSize: "0.7rem", fontFamily: "monospace" }}>{s.label}</p>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: `${s.color}20`, border: `1px solid ${s.color}30` }}>
                        <Icon size={14} style={{ color: s.color }} />
                      </div>
                    </div>
                    <motion.p className="text-2xl sm:text-3xl font-bold text-white"
                      initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.1, type: "spring" }}>
                      {s.value}
                    </motion.p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl"
                    style={{ background: `linear-gradient(90deg,transparent,${s.color},transparent)` }} />
                </motion.div>
              )
            })}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-2xl mb-5"
            style={{ background: "rgba(10,8,30,0.6)", border: "1px solid rgba(99,102,241,0.15)", backdropFilter: "blur(20px)" }}>
            {[
              { key: "doubts", label: "Student Doubts", icon: MessageSquare },
              { key: "chats", label: `Chats (${rooms.length})`, icon: MessageCircle },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all"
                style={{
                  background: activeTab === key ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent",
                  color: activeTab === key ? "white" : "rgba(148,163,184,0.7)",
                  boxShadow: activeTab === key ? "0 2px 12px rgba(99,102,241,0.35)" : "none",
                }}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {/* Doubts Tab */}
          <AnimatePresence mode="wait">
            {activeTab === "doubts" && (
              <motion.div key="doubts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {loading ? (
                  <div className="flex flex-col items-center py-20 gap-3">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <Loader2 size={36} style={{ color: "#818cf8" }} />
                    </motion.div>
                    <p style={{ color: "rgba(148,163,184,0.6)", fontSize: "0.8rem", fontFamily: "monospace" }}>Loading doubts...</p>
                  </div>
                ) : doubts.length > 0 ? (
                  <div className="space-y-3">
                    {doubts.map((doubt, i) => (
                      <motion.div key={doubt._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.04, 0.3) }}
                        className="rounded-2xl overflow-hidden"
                        style={{ background: "rgba(10,8,30,0.7)", border: "1px solid rgba(99,102,241,0.15)", backdropFilter: "blur(20px)" }}>
                        <div className="h-0.5" style={{ background: "linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)" }} />
                        <div className="p-4 sm:p-5">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 0 12px rgba(99,102,241,0.4)" }}>
                              {doubt.userId?.profileImage
                                ? <img src={doubt.userId.profileImage} alt={doubt.userId.name} className="w-full h-full object-cover rounded-full" />
                                : doubt.userId?.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div>
                                  <h3 className="font-bold text-white text-sm sm:text-base">{doubt.title}</h3>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <User size={11} style={{ color: "rgba(148,163,184,0.5)" }} />
                                    <span className="text-xs" style={{ color: "rgba(148,163,184,0.6)" }}>{doubt.userId?.name || "Unknown"}</span>
                                    <span style={{ color: "rgba(148,163,184,0.3)" }}>·</span>
                                    <span className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>{new Date(doubt.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                <div className="flex gap-1.5 flex-wrap flex-shrink-0">
                                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                    style={{ background: doubt.status === "resolved" ? "rgba(52,211,153,0.15)" : doubt.status === "matched" ? "rgba(251,191,36,0.15)" : "rgba(99,102,241,0.15)", border: `1px solid ${doubt.status === "resolved" ? "rgba(52,211,153,0.35)" : doubt.status === "matched" ? "rgba(251,191,36,0.35)" : "rgba(99,102,241,0.35)"}`, color: doubt.status === "resolved" ? "#34d399" : doubt.status === "matched" ? "#fbbf24" : "#a5b4fc" }}>
                                    {doubt.status}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded-full"
                                    style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#c4b5fd" }}>
                                    {doubt.topic}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs sm:text-sm mt-2 line-clamp-2" style={{ color: "rgba(148,163,184,0.7)" }}>{doubt.description}</p>
                            </div>
                          </div>

                          {/* Replies */}
                          {doubt.replies?.length > 0 && (
                            <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(99,102,241,0.15)" }}>
                              <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "rgba(99,102,241,0.7)", fontFamily: "monospace" }}>
                                <MessageSquare size={12} /> Replies ({doubt.replies.length})
                              </p>
                              {doubt.replies.map(reply => (
                                <div key={reply._id} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(99,102,241,0.12)" }}>
                                  <div className="flex justify-between items-start mb-1.5">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                                        style={{ background: "linear-gradient(135deg,#059669,#047857)" }}>
                                        {reply.user?.profileImage
                                          ? <img src={reply.user.profileImage} alt={reply.user.name} className="w-full h-full object-cover rounded-full" />
                                          : reply.user?.name?.charAt(0).toUpperCase() || "M"}
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-white">{reply.user?.name || "Mentor"}</p>
                                        <p className="text-xs" style={{ color: "rgba(148,163,184,0.4)" }}>{new Date(reply.createdAt).toLocaleDateString()}</p>
                                      </div>
                                    </div>
                                    {user && reply.user?._id === user._id && (
                                      <div className="flex gap-1">
                                        <button onClick={() => handleEditReply(doubt._id, reply)}
                                          className="p-1.5 rounded-lg transition hover:bg-white/10" style={{ color: "#60a5fa" }}>
                                          <Edit2 size={12} />
                                        </button>
                                        <button onClick={() => handleDeleteReply(doubt._id, reply._id)}
                                          className="p-1.5 rounded-lg transition hover:bg-red-500/20" style={{ color: "#f87171" }}>
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-xs sm:text-sm" style={{ color: "rgba(226,232,240,0.85)" }}>{reply.content}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Reply Form */}
                          {replyingTo === doubt._id ? (
                            <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(99,102,241,0.15)" }}>
                              <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                                placeholder="Write your reply..."
                                rows={3}
                                className="w-full text-sm text-white placeholder-gray-500 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none mb-2"
                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,102,241,0.2)" }} />
                              <div className="flex gap-2">
                                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                  onClick={() => handleReply(doubt._id)}
                                  className="flex items-center gap-1.5 px-4 py-2 text-white text-xs font-semibold rounded-xl"
                                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 2px 10px rgba(99,102,241,0.35)" }}>
                                  <Send size={12} /> {editingReply ? "Update" : "Send Reply"}
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                  onClick={cancelReply}
                                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl"
                                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(148,163,184,0.8)" }}>
                                  <X size={12} /> Cancel
                                </motion.button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3">
                              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                onClick={() => setReplyingTo(doubt._id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl"
                                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }}>
                                <MessageSquare size={12} /> Reply
                              </motion.button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 rounded-2xl"
                    style={{ background: "rgba(10,8,30,0.6)", border: "1px solid rgba(99,102,241,0.15)", backdropFilter: "blur(20px)" }}>
                    <MessageSquare size={36} className="mx-auto mb-3" style={{ color: "rgba(99,102,241,0.4)" }} />
                    <p style={{ color: "rgba(148,163,184,0.6)" }}>No student doubts yet.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Chats Tab */}
            {activeTab === "chats" && (
              <motion.div key="chats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {rooms.length > 0 ? (
                  <div className="space-y-3">
                    {rooms.map((room, i) => {
                      const other = getOtherUser(room)
                      return (
                        <motion.div key={room._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.06, 0.4), type: "spring", stiffness: 200 }}
                          whileHover={{ x: 4, transition: { duration: 0.15 } }}
                          className="group relative rounded-2xl overflow-hidden"
                          style={{ background: "rgba(10,8,30,0.7)", border: "1px solid rgba(99,102,241,0.15)", backdropFilter: "blur(20px)" }}>
                          <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: "linear-gradient(to bottom,#6366f1,#8b5cf6)" }} />
                          <div className="flex items-center justify-between gap-3 p-4 pl-5">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="relative flex-shrink-0">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 0 14px rgba(99,102,241,0.4)" }}>
                                  {other?.profileImage
                                    ? <img src={other.profileImage} alt={other.name} className="w-full h-full object-cover rounded-full" />
                                    : other?.name?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                                  style={{ background: "#34d399", borderColor: "rgba(10,8,30,0.9)" }} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-white text-sm truncate">{other?.name || "Unknown User"}</h3>
                                <p className="text-xs truncate" style={{ color: "rgba(148,163,184,0.6)" }}>{other?.email}</p>
                                {room.topic && (
                                  <p className="text-xs mt-0.5" style={{ color: "rgba(99,102,241,0.7)", fontFamily: "monospace" }}># {room.topic}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Link to={`/chat/${room._id}`}>
                                <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                                  className="flex items-center gap-1.5 px-3 py-2 text-white text-xs font-semibold rounded-xl"
                                  style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", boxShadow: "0 2px 10px rgba(99,102,241,0.35)" }}>
                                  <MessageCircle size={13} /><span className="hidden sm:inline">Chat</span>
                                </motion.button>
                              </Link>
                              <Link to={`/video-call/${room._id}`}>
                                <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                                  className="flex items-center gap-1.5 px-3 py-2 text-white text-xs font-semibold rounded-xl"
                                  style={{ background: "linear-gradient(135deg,#059669,#047857)", boxShadow: "0 2px 10px rgba(5,150,105,0.35)" }}>
                                  <Video size={13} /><span className="hidden sm:inline">Video</span>
                                </motion.button>
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-20 rounded-2xl"
                    style={{ background: "rgba(10,8,30,0.6)", border: "1px solid rgba(99,102,241,0.15)", backdropFilter: "blur(20px)" }}>
                    <MessageCircle size={36} className="mx-auto mb-3" style={{ color: "rgba(99,102,241,0.4)" }} />
                    <h3 className="font-bold text-white mb-1">No chats yet</h3>
                    <p className="text-sm" style={{ color: "rgba(148,163,184,0.6)" }}>Students will appear here when they message you.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
