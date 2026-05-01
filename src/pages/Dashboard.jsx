import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { doubtAPI, communityAPI, roomAPI } from '../services/api'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Sidebar from '../components/Sidebar'
import { Link, useNavigate } from 'react-router-dom'
import {
  MessageSquare, Users, BookOpen, Zap, TrendingUp, X, MessageCircle,
  Target, ArrowUpRight, Flame, Activity, Trophy, Cpu
} from 'lucide-react'
import dashboardBg from '../assets/dashboard.png'

function Sparkline({ color = '#8b5cf6', data = [3,5,2,8,4,9,6,11,8,13] }) {
  const max = Math.max(...data), min = Math.min(...data)
  const range = max - min || 1
  const w = 100, h = 36
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 6) - 3
    return `${x},${y}`
  }).join(' ')
  const fillPts = `0,${h} ${pts} ${w},${h}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ width: '100%' }}>
      <defs>
        <linearGradient id={`fill-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#fill-${color.replace('#','')})`} />
      <polyline points={pts} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [doubts, setDoubts] = useState([])
  const [communities, setCommunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchedRoom, setMatchedRoom] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [doubtsRes, communitiesRes] = await Promise.all([
          doubtAPI.list(1, 100),
          communityAPI.list(1, 5),
        ])
        const allDoubts = doubtsRes.data.data?.doubts || []
        const userDoubts = allDoubts.filter(d =>
          user && (d.userId === user._id || d.userId?._id === user._id || String(d.userId) === String(user._id))
        ).slice(0, 5)
        setDoubts(userDoubts)
        setCommunities(communitiesRes.data.data?.communities || [])
      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setLoading(false)
      }
    }
    if (user) fetchData()
  }, [user])

  const stats = [
    { icon: MessageSquare, label: 'Active Doubts', value: doubts.length, change: '+12%', color: '#6366f1', spark: [2,4,3,7,5,8,6,9,7,10] },
    { icon: Users, label: 'Communities', value: communities.length, change: '+8%', color: '#8b5cf6', spark: [1,3,2,5,4,6,5,8,6,9] },
    { icon: Target, label: 'Resolved', value: doubts.filter(d => d.status === 'resolved').length, change: '+23%', color: '#06b6d4', spark: [3,2,5,4,8,6,9,7,11,9] },
    { icon: Flame, label: 'XP Points', value: user?.xp || 0, change: '+45%', color: '#f59e0b', spark: [1,2,1,4,3,6,5,8,7,10] },
  ]

  const getXPLevel = (xp) => {
    if (xp < 100)  return { level: 'Beginner',     progress: xp,       max: 100,  icon: '??', bar: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }
    if (xp < 300)  return { level: 'Intermediate', progress: xp - 100, max: 200,  icon: '?', bar: 'linear-gradient(90deg,#8b5cf6,#a78bfa)' }
    if (xp < 700)  return { level: 'Expert',       progress: xp - 300, max: 400,  icon: '??', bar: 'linear-gradient(90deg,#06b6d4,#3b82f6)' }
    return               { level: 'Master',        progress: xp - 700, max: 1000, icon: '??', bar: 'linear-gradient(90deg,#f59e0b,#f97316)' }
  }
  const xpLevel = getXPLevel(user?.xp || 0)

  const handleViewMatch = async (doubt, e) => {
    e.preventDefault(); e.stopPropagation()
    if (doubt.status !== 'matched') return
    try {
      const roomsRes = await roomAPI.list()
      const rooms = roomsRes.data.data?.rooms || roomsRes.data.data || []
      const room = rooms.find(r => {
        const d1 = r.doubt1?._id || r.doubt1
        const d2 = r.doubt2?._id || r.doubt2
        return String(d1) === String(doubt._id) || String(d2) === String(doubt._id)
      })
      if (room) { setSelectedMatch(doubt); setMatchedRoom(room); setShowMatchModal(true) }
      else alert('Match details not found')
    } catch { alert('Failed to load match details') }
  }

  return (
    <div className="flex min-h-screen" style={{ position: "relative" }}>
      {/* Full page background image */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: "url(/src/assets/image.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }} />
      {/* Dark overlay for readability */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1, background: "rgba(5,3,20,0.75)" }} />

      {/* Sidebar */}
      <div style={{ position: "relative", zIndex: 10 }}>
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="relative flex-1 ml-[240px] mt-16 px-5 py-5 space-y-4 overflow-x-hidden" style={{ zIndex: 10 }}>

        {/* HERO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="lg:col-span-2">
            <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: "260px", border: "1px solid rgba(99,102,241,0.25)" }}>
              <div className="absolute inset-0" style={{ backgroundImage: "url(" + dashboardBg + ")", backgroundSize: "cover", backgroundPosition: "center top" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,rgba(5,3,20,0.85) 0%,rgba(8,5,30,0.7) 40%,rgba(5,10,25,0.45) 100%)" }} />
              <div className="scan-line" />
              <div className="relative z-10 p-7">
                <motion.div className="flex items-center gap-2 mb-3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                  <motion.span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" animate={{ scale: [1,1.5,1], opacity: [1,0.5,1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                  <span style={{ color: "rgba(52,211,153,0.8)", fontSize: "0.7rem", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>System Online</span>
                  <span style={{ color: "rgba(148,163,184,0.4)", margin: "0 4px" }}>|</span>
                  <span style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.7rem", fontFamily: "monospace" }}>Studdy Buddy</span>
                </motion.div>
                <motion.div className="text-3xl font-bold text-white mb-1" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>Welcome back,</motion.div>
                <div className="flex items-center flex-wrap mb-3">
                  {(user?.name?.split(" ")[0] || "Student").split("").map((letter, i) => (
                    <motion.span key={i} className="text-3xl font-bold"
                      style={{ background: "linear-gradient(135deg,#a5b4fc 0%,#818cf8 50%,#c4b5fd 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
                      initial={{ opacity: 0, y: 20, scale: 0.5 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.07, type: "spring", stiffness: 250, damping: 15 }}
                    >{letter}</motion.span>
                  ))}
                  <motion.span className="text-3xl font-bold text-white ml-1"
                    initial={{ opacity: 0, scale: 0, rotate: -30 }} animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5 + (user?.name?.split(" ")[0] || "Student").length * 0.07 + 0.1, type: "spring", stiffness: 300 }}
                  >! ??</motion.span>
                </div>
                <motion.p style={{ color: "rgba(148,163,184,0.7)", fontSize: "0.8rem", fontFamily: "monospace", marginBottom: "1rem" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}>
                  <span style={{ color: "rgba(99,102,241,0.6)" }}>&gt;</span> Learn. Connect. Innovate.
                  <motion.span className="inline-block ml-1 align-middle" style={{ width: "2px", height: "14px", background: "#818cf8" }} animate={{ opacity: [1,0,1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                </motion.p>
                <motion.div className="flex flex-wrap gap-2 mb-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
                  {[
                    { label: "Robotics", icon: "??", bg: "rgba(59,130,246,0.15)", border: "rgba(96,165,250,0.3)", text: "#93c5fd" },
                    { label: "AI / ML",  icon: "??", bg: "rgba(139,92,246,0.15)", border: "rgba(167,139,250,0.3)", text: "#c4b5fd" },
                    { label: "IoT",      icon: "??", bg: "rgba(6,182,212,0.15)",  border: "rgba(34,211,238,0.3)",  text: "#67e8f9" },
                    { label: "Embedded", icon: "??", bg: "rgba(245,158,11,0.12)", border: "rgba(251,191,36,0.3)",  text: "#fcd34d" },
                  ].map((tag, i) => (
                    <motion.span key={tag.label} style={{ background: tag.bg, border: "1px solid " + tag.border, color: tag.text, fontSize: "0.7rem", fontFamily: "monospace", padding: "3px 10px", borderRadius: "9999px", display: "inline-flex", alignItems: "center", gap: "5px", cursor: "default" }}
                      initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2 + i * 0.08, type: "spring" }}
                      whileHover={{ scale: 1.1, y: -2 }}
                    >{tag.icon} {tag.label}</motion.span>
                  ))}
                </motion.div>
                <motion.div className="grid grid-cols-3 gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }}>
                  {[
                    { label: "Doubts", sub: "Active", value: doubts.length, icon: MessageSquare, color: "#6366f1" },
                    { label: "Communities", sub: "Joined", value: communities.length, icon: Users, color: "#8b5cf6" },
                    { label: "XP Points", sub: "Total", value: user?.xp || 0, icon: Zap, color: "#06b6d4" },
                  ].map((s, i) => {
                    const Icon = s.icon
                    return (
                      <motion.div key={s.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} whileHover={{ scale: 1.04 }}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon style={{ width: "0.85rem", height: "0.85rem", color: s.color }} />
                          <span style={{ color: "rgba(148,163,184,0.7)", fontSize: "0.7rem", fontFamily: "monospace" }}>{s.label}</span>
                        </div>
                        <div className="text-xl font-bold text-white">{s.value}</div>
                        <div style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.65rem", fontFamily: "monospace" }}>{s.sub}</div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* XP Card */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <div className="rounded-2xl p-5 h-full relative overflow-hidden" style={{ background: "rgba(10,8,30,0.8)", border: "1px solid rgba(99,102,241,0.2)", backdropFilter: "blur(20px)", minHeight: "260px" }}>
              <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at top right,rgba(139,92,246,0.5),transparent 70%)" }} />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p style={{ color: "rgba(99,102,241,0.7)", fontSize: "0.65rem", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>// Level</p>
                    <motion.p className="text-2xl font-bold text-white" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>{xpLevel.level}</motion.p>
                    <motion.p className="text-2xl mt-1" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7, type: "spring" }}>{xpLevel.icon}</motion.p>
                  </div>
                  <motion.div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }} animate={{ boxShadow: ["0 0 0px rgba(245,158,11,0)","0 0 20px rgba(245,158,11,0.4)","0 0 0px rgba(245,158,11,0)"] }} transition={{ duration: 3, repeat: Infinity }}>
                    <Trophy style={{ width: "1.3rem", height: "1.3rem", color: "#fbbf24" }} />
                  </motion.div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between" style={{ fontSize: "0.7rem", fontFamily: "monospace" }}>
                    <span style={{ color: "rgba(148,163,184,0.5)" }}>Progress</span>
                    <span style={{ color: "#818cf8" }}>{xpLevel.progress}/{xpLevel.max} XP</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: Math.min((xpLevel.progress / xpLevel.max) * 100, 100) + "%" }} transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }} className="h-full rounded-full" style={{ background: xpLevel.bar, boxShadow: "0 0 8px rgba(99,102,241,0.6)" }} />
                  </div>
                  <p style={{ color: "rgba(148,163,184,0.4)", fontSize: "0.65rem", fontFamily: "monospace" }}>{xpLevel.max - xpLevel.progress} XP remaining</p>
                </div>
                <div style={{ height: "1px", background: "linear-gradient(90deg,transparent,rgba(99,102,241,0.4),transparent)", marginBottom: "12px" }} />
                <div className="flex items-center gap-2" style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.7rem", fontFamily: "monospace" }}>
                  <Cpu style={{ width: "0.85rem", height: "0.85rem", color: "rgba(99,102,241,0.6)" }} />
                  <span>Keep learning to level up!</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
                <div className="rounded-2xl p-4 relative overflow-hidden group" style={{ background: "rgba(10,8,30,0.75)", border: "1px solid rgba(99,102,241,0.15)", backdropFilter: "blur(16px)" }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon style={{ width: "0.85rem", height: "0.85rem", color: stat.color }} />
                        <span style={{ color: "rgba(148,163,184,0.6)", fontSize: "0.7rem", fontFamily: "monospace" }}>{stat.label}</span>
                      </div>
                      <motion.div className="text-2xl font-bold text-white" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.1, type: "spring" }}>{stat.value}</motion.div>
                    </div>
                    <span className="flex items-center gap-0.5 text-xs font-bold" style={{ color: stat.color, fontFamily: "monospace" }}>
                      <TrendingUp style={{ width: "0.7rem", height: "0.7rem" }} />{stat.change}
                    </span>
                  </div>
                  <Sparkline color={stat.color} data={stat.spark} />
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl" style={{ background: "linear-gradient(90deg,transparent," + stat.color + ",transparent)" }} />
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* QUICK ACTIONS */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center gap-2 mb-3">
            <div style={{ width: "2px", height: "18px", borderRadius: "99px", background: "linear-gradient(to bottom,#818cf8,#a78bfa)" }} />
            <h2 style={{ color: "#818cf8", fontSize: "0.7rem", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.12em" }}>// Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { to: "/doubts/new",  icon: MessageSquare, title: "Ask Doubt",        desc: "Get help from community",  color: "#6366f1" },
              { to: "/mentors",     icon: Users,         title: "Find Mentors",     desc: "Connect with experts",     color: "#8b5cf6" },
              { to: "/communities", icon: Activity,      title: "Join Communities", desc: "Explore amazing people",   color: "#06b6d4" },
              { to: "/resources",   icon: BookOpen,      title: "Browse Resources", desc: "Learn and grow daily",     color: "#f59e0b" },
            ].map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.to} to={action.to} className="group">
                  <motion.div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: "rgba(10,8,30,0.75)", border: "1px solid rgba(99,102,241,0.15)", backdropFilter: "blur(16px)" }} whileHover={{ y: -3, borderColor: action.color + "50" }} transition={{ duration: 0.2 }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: action.color + "18", border: "1px solid " + action.color + "30" }}>
                        <Icon style={{ width: "1.1rem", height: "1.1rem", color: action.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{action.title}</p>
                        <p style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.65rem", fontFamily: "monospace" }}>{action.desc}</p>
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: action.color + "20", border: "1px solid " + action.color + "30" }}>
                      <ArrowUpRight style={{ width: "0.85rem", height: "0.85rem", color: action.color }} />
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </motion.div>

      </div>

      {/* MATCH MODAL */}
      <AnimatePresence>
        {showMatchModal && selectedMatch && matchedRoom && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} onClick={() => setShowMatchModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="rounded-2xl max-w-xl w-full max-h-[88vh] overflow-y-auto" style={{ background: "rgba(10,8,30,0.95)", border: "1px solid rgba(99,102,241,0.3)", backdropFilter: "blur(20px)" }} onClick={(e) => e.stopPropagation()}>
              <div className="p-5 flex justify-between items-start rounded-t-2xl" style={{ background: "linear-gradient(135deg,rgba(5,3,20,0.9),rgba(10,8,30,0.9))", borderBottom: "1px solid rgba(99,102,241,0.2)" }}>
                <div>
                  <h2 className="text-lg font-bold text-white mb-0.5">?? Match Found!</h2>
                  <p style={{ color: "rgba(99,102,241,0.7)", fontSize: "0.7rem", fontFamily: "monospace" }}>You have been matched with another student</p>
                </div>
                <button onClick={() => setShowMatchModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"><X size={18} style={{ color: "rgba(148,163,184,0.6)" }} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p style={{ color: "rgba(99,102,241,0.6)", fontSize: "0.65rem", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>// Your Doubt</p>
                  <div className="rounded-xl p-4" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                    <h4 className="font-semibold text-sm text-white mb-1">{selectedMatch.title}</h4>
                    <p style={{ color: "rgba(148,163,184,0.6)", fontSize: "0.75rem", fontFamily: "monospace", marginBottom: "8px" }}>{selectedMatch.description}</p>
                    <Badge>{selectedMatch.topic}</Badge>
                  </div>
                </div>
                <div>
                  <p style={{ color: "rgba(99,102,241,0.6)", fontSize: "0.65rem", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>// Matched Student</p>
                  {(() => {
                    const matchedDoubt = matchedRoom.doubt1?._id === selectedMatch._id ? matchedRoom.doubt2 : matchedRoom.doubt1
                    const matchedUser  = matchedRoom.student1?._id === user._id ? matchedRoom.student2 : matchedRoom.student1
                    return (
                      <>
                        <div className="rounded-xl p-4 mb-3" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>{matchedUser?.name?.charAt(0).toUpperCase()}</div>
                            <div>
                              <p className="font-semibold text-sm text-white">{matchedUser?.name}</p>
                              <p style={{ color: "rgba(148,163,184,0.5)", fontSize: "0.7rem", fontFamily: "monospace" }}>{matchedUser?.email}</p>
                            </div>
                          </div>
                          <h4 className="font-semibold text-sm text-white mb-1">{matchedDoubt?.title}</h4>
                          <p style={{ color: "rgba(148,163,184,0.6)", fontSize: "0.75rem", fontFamily: "monospace", marginBottom: "8px" }}>{matchedDoubt?.description}</p>
                          <Badge>{matchedDoubt?.topic}</Badge>
                        </div>
                        <div className="flex gap-2.5">
                          <Button variant="primary" className="flex-1 flex items-center justify-center gap-2" onClick={() => navigate("/chat/" + matchedRoom._id)}><MessageCircle size={16} /> Start Chat</Button>
                          <Button variant="secondary" onClick={() => setShowMatchModal(false)}>Close</Button>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

