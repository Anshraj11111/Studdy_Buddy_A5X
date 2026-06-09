import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { rewardsAPI } from '../services/api'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import {
  Zap, Flame, Trophy, Star, TrendingUp, Gift, Crown,
  Target, Activity, Coins, ChevronRight, Award, BarChart2,
  Sparkles, Medal
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────
const ACTION_LABELS = {
  post:             { label: 'Post Created',       icon: '✍️',  color: '#6366f1' },
  like_received:    { label: 'Like Received',       icon: '❤️',  color: '#ef4444' },
  comment:          { label: 'Comment Given',       icon: '💬',  color: '#06b6d4' },
  comment_received: { label: 'Comment Received',    icon: '🗨️',  color: '#8b5cf6' },
  doubt_posted:     { label: 'Doubt Posted',        icon: '🤔',  color: '#f59e0b' },
  doubt_resolved:   { label: 'Doubt Resolved',      icon: '✅',  color: '#22c55e' },
  resource_upload:  { label: 'Resource Uploaded',   icon: '📤',  color: '#3b82f6' },
  daily_login:      { label: 'Daily Login',         icon: '🌅',  color: '#a78bfa' },
  streak_bonus:     { label: 'Streak Bonus',        icon: '🔥',  color: '#f97316' },
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100]

function XPBar({ pct, color = '#6366f1' }) {
  return (
    <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)`, boxShadow: `0 0 10px ${color}80` }}
      />
    </div>
  )
}

function StatCard({ icon, label, value, sub, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{ background: 'rgba(10,8,30,0.8)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(16px)' }}
    >
      <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(ellipse at top left, ${color}, transparent 70%)` }} />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
          </div>
          <span style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.7rem', fontFamily: 'monospace' }}>{label}</span>
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && <p style={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.65rem', fontFamily: 'monospace', marginTop: 2 }}>{sub}</p>}
      </div>
    </motion.div>
  )
}

function StreakCalendar({ streak }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { label: ['S','M','T','W','T','F','S'][d.getDay()], date: d }
  })
  const lastActive = streak?.lastActivityDate ? new Date(streak.lastActivityDate) : null
  const current    = streak?.current || 0

  return (
    <div className="flex gap-2 justify-center">
      {days.map((day, i) => {
        const isActive = lastActive && (() => {
          // mark the last `current` consecutive days as active
          const diff = Math.round((new Date() - day.date) / 86400000)
          return diff < current
        })()
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.05 + 0.3 }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
              style={{
                background: isActive ? 'linear-gradient(135deg,#f97316,#ef4444)' : 'rgba(255,255,255,0.05)',
                border: isActive ? 'none' : '1px solid rgba(255,255,255,0.08)',
                color: isActive ? 'white' : 'rgba(148,163,184,0.3)',
                boxShadow: isActive ? '0 0 12px rgba(249,115,22,0.5)' : 'none',
              }}
            >
              {isActive ? '🔥' : day.label}
            </motion.div>
            <span style={{ color: 'rgba(148,163,184,0.35)', fontSize: '0.55rem', fontFamily: 'monospace' }}>{day.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function MiniBarChart({ data }) {
  const entries = Object.entries(data)
  const max = Math.max(...entries.map(([, v]) => v), 1)
  return (
    <div className="flex items-end gap-1 h-16">
      {entries.map(([date, val], i) => (
        <div key={date} className="flex-1 flex flex-col items-center gap-1">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(val / max) * 52}px` }}
            transition={{ delay: i * 0.07 + 0.3, duration: 0.5 }}
            className="w-full rounded-t-sm"
            style={{ background: val > 0 ? 'linear-gradient(to top,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.04)', minHeight: 4, boxShadow: val > 0 ? '0 0 6px rgba(99,102,241,0.4)' : 'none' }}
          />
          <span style={{ color: 'rgba(148,163,184,0.3)', fontSize: '0.5rem', fontFamily: 'monospace' }}>
            {new Date(date).getDate()}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Rewards() {
  const { user } = useAuthStore()
  const [data, setData]         = useState(null)
  const [lb, setLb]             = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('overview') // overview | leaderboard | history
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, lbRes] = await Promise.all([
          rewardsAPI.getMe(),
          rewardsAPI.getLeaderboard(),
        ])
        setData(meRes.data.data)
        setLb(lbRes.data.data?.leaderboard || [])
      } catch (err) {
        console.error('Rewards load error:', err)
      } finally {
        setLoading(false)
      }
    }
    if (user) load()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#05030f' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p style={{ color: 'rgba(148,163,184,0.5)', fontFamily: 'monospace', fontSize: '0.75rem' }}>Loading rewards...</p>
        </div>
      </div>
    )
  }

  const lvl          = data?.level
  const streak       = data?.streak
  const breakdown    = data?.breakdown || {}
  const dailyXP      = data?.dailyXP || {}
  const history      = data?.xpHistory || []
  const nextMilestone = STREAK_MILESTONES.find(m => m > (streak?.current || 0))

  return (
    <div className="min-h-screen" style={{ background: '#05030f', backgroundImage: 'radial-gradient(ellipse at 20% 10%, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.06) 0%, transparent 50%)' }}>
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:ml-[240px] mt-16 px-4 py-6 max-w-6xl mx-auto space-y-6">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Trophy style={{ width: '1.2rem', color: '#fbbf24' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">XP & Rewards</h1>
              <p style={{ color: 'rgba(148,163,184,0.5)', fontSize: '0.72rem', fontFamily: 'monospace' }}>// earn xp → unlock tokens → level up</p>
            </div>
          </div>
        </motion.div>

        {/* ── LEVEL CARD ─────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: 'rgba(10,8,30,0.85)', border: `1px solid ${lvl?.color || '#6366f1'}40`, backdropFilter: 'blur(20px)' }}>
            <div className="absolute inset-0 opacity-15" style={{ background: `radial-gradient(ellipse at top right, ${lvl?.color || '#6366f1'}, transparent 65%)` }} />
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                {/* Level info */}
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                    style={{ background: `${lvl?.color || '#6366f1'}20`, border: `2px solid ${lvl?.color || '#6366f1'}50`, boxShadow: `0 0 24px ${lvl?.color || '#6366f1'}40` }}
                  >
                    {lvl?.icon || '🌱'}
                  </motion.div>
                  <div>
                    <p style={{ color: 'rgba(148,163,184,0.5)', fontSize: '0.65rem', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Level {lvl?.level}</p>
                    <p className="text-2xl font-bold text-white">{lvl?.name}</p>
                    <p style={{ color: lvl?.color, fontSize: '0.72rem', fontFamily: 'monospace', marginTop: 2 }}>
                      {data?.xp?.toLocaleString() || 0} total XP
                    </p>
                  </div>
                </div>

                {/* Tokens */}
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <motion.span className="text-2xl" animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>🪙</motion.span>
                  <div>
                    <p style={{ color: 'rgba(245,158,11,0.6)', fontSize: '0.6rem', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tokens</p>
                    <p className="text-2xl font-bold" style={{ color: '#fbbf24' }}>{data?.tokens || 0}</p>
                    <p style={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.6rem', fontFamily: 'monospace' }}>1 token = 100 XP</p>
                  </div>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between" style={{ fontSize: '0.68rem', fontFamily: 'monospace' }}>
                  <span style={{ color: 'rgba(148,163,184,0.5)' }}>
                    {lvl?.nextLevel ? `Progress to ${lvl.nextLevel.name} ${lvl.nextLevel.icon}` : '🏆 Max Level Reached!'}
                  </span>
                  <span style={{ color: lvl?.color }}>
                    {(lvl?.xpInLevel ?? 0).toLocaleString()} / {(lvl?.xpForLevel ?? 0).toLocaleString()} XP
                  </span>
                </div>
                <XPBar pct={lvl?.progressPct || 0} color={lvl?.color || '#6366f1'} />
                {lvl?.nextLevel && (
                  <p style={{ color: 'rgba(148,163,184,0.35)', fontSize: '0.62rem', fontFamily: 'monospace' }}>
                    {(lvl.xpToNext ?? 0).toLocaleString()} XP until next level
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── STATS ROW ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon="⚡" label="Total XP"     value={data?.xp?.toLocaleString() || 0}     sub="all time"            color="#6366f1" delay={0.15} />
          <StatCard icon="🪙" label="Tokens"       value={data?.tokens || 0}                    sub="redeemable"          color="#f59e0b" delay={0.2} />
          <StatCard icon="🔥" label="Current Streak" value={`${streak?.current || 0}d`}         sub={`Best: ${streak?.longest || 0}d`} color="#f97316" delay={0.25} />
          <StatCard icon="✍️" label="Posts Made"   value={data?.totalPosts || 0}                sub="total posts"         color="#22c55e" delay={0.3} />
        </div>

        {/* ── TABS ───────────────────────────────────────────────────────── */}
        <div className="flex gap-2">
          {[
            { id: 'overview',     label: 'Overview',     icon: BarChart2 },
            { id: 'leaderboard',  label: 'Leaderboard',  icon: Crown },
            { id: 'history',      label: 'History',      icon: Activity },
          ].map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                  border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)',
                  color: active ? '#818cf8' : 'rgba(148,163,184,0.5)',
                }}
              >
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">

          {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Streak Card */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(10,8,30,0.8)', border: '1px solid rgba(249,115,22,0.2)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Flame size={16} style={{ color: '#f97316' }} />
                  <h3 className="font-semibold text-white text-sm">Daily Streak</h3>
                  {streak?.current >= 3 && (
                    <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>
                      🔥 On Fire!
                    </span>
                  )}
                </div>
                <div className="text-center mb-4">
                  <motion.p
                    className="text-5xl font-bold"
                    style={{ color: '#f97316' }}
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {streak?.current || 0}
                  </motion.p>
                  <p style={{ color: 'rgba(148,163,184,0.5)', fontSize: '0.72rem', fontFamily: 'monospace' }}>day streak</p>
                </div>
                <StreakCalendar streak={streak} />
                {nextMilestone && (
                  <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.68rem', fontFamily: 'monospace' }}>
                      🎯 Next milestone: <span style={{ color: '#fb923c', fontWeight: 700 }}>{nextMilestone} days</span> — {nextMilestone - (streak?.current || 0)} more to go!
                    </p>
                  </div>
                )}
              </div>

              {/* Daily XP Chart */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(10,8,30,0.8)', border: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={16} style={{ color: '#818cf8' }} />
                  <h3 className="font-semibold text-white text-sm">Last 7 Days XP</h3>
                </div>
                <MiniBarChart data={dailyXP} />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {Object.entries(dailyXP).slice(-2).map(([date, val]) => (
                    <div key={date} className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p style={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.6rem', fontFamily: 'monospace' }}>{new Date(date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                      <p className="font-bold text-white">{val} <span style={{ color: '#818cf8', fontSize: '0.65rem' }}>XP</span></p>
                    </div>
                  ))}
                </div>
              </div>

              {/* XP Breakdown */}
              <div className="rounded-2xl p-5 lg:col-span-2" style={{ background: 'rgba(10,8,30,0.8)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Target size={16} style={{ color: '#818cf8' }} />
                  <h3 className="font-semibold text-white text-sm">XP Breakdown</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(ACTION_LABELS).map(([key, meta]) => {
                    const earned = breakdown[key] || 0
                    return (
                      <motion.div
                        key={key}
                        whileHover={{ scale: 1.03 }}
                        className="rounded-xl p-3"
                        style={{ background: `${meta.color}0d`, border: `1px solid ${meta.color}25` }}
                      >
                        <div className="text-xl mb-1">{meta.icon}</div>
                        <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.65rem', fontFamily: 'monospace', marginBottom: 4 }}>{meta.label}</p>
                        <p className="font-bold text-white">{earned.toLocaleString()} <span style={{ color: meta.color, fontSize: '0.65rem' }}>XP</span></p>
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              {/* How to Earn */}
              <div className="rounded-2xl p-5 lg:col-span-2" style={{ background: 'rgba(10,8,30,0.8)', border: '1px solid rgba(34,197,94,0.2)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Gift size={16} style={{ color: '#22c55e' }} />
                  <h3 className="font-semibold text-white text-sm">How to Earn XP</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(data?.xpRewards || {}).map(([key, amt]) => {
                    const meta = ACTION_LABELS[key]
                    if (!meta) return null
                    return (
                      <div key={key} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span className="text-base">{meta.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.62rem', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.label}</p>
                        </div>
                        <span className="font-bold text-sm" style={{ color: meta.color, whiteSpace: 'nowrap' }}>+{amt} XP</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* All Levels */}
              <div className="rounded-2xl p-5 lg:col-span-2" style={{ background: 'rgba(10,8,30,0.8)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Medal size={16} style={{ color: '#818cf8' }} />
                  <h3 className="font-semibold text-white text-sm">All Levels</h3>
                </div>
                <div className="space-y-2">
                  {(data?.allLevels || []).map(lvlItem => {
                    const isCurrent = lvlItem.level === lvl?.level
                    const isUnlocked = (data?.xp || 0) >= lvlItem.min
                    return (
                      <div key={lvlItem.level} className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
                        style={{
                          background: isCurrent ? `${lvlItem.color}15` : 'rgba(255,255,255,0.02)',
                          border: isCurrent ? `1px solid ${lvlItem.color}40` : '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <span className="text-xl w-8 text-center">{isUnlocked ? lvlItem.icon : '🔒'}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-sm" style={{ color: isUnlocked ? 'white' : 'rgba(148,163,184,0.3)' }}>
                            Lv.{lvlItem.level} {lvlItem.name}
                            {isCurrent && <span className="ml-2 px-2 py-0.5 rounded-full text-xs" style={{ background: `${lvlItem.color}30`, color: lvlItem.color }}>Current</span>}
                          </p>
                          <p style={{ color: 'rgba(148,163,184,0.35)', fontSize: '0.62rem', fontFamily: 'monospace' }}>
                            {(lvlItem.min ?? 0).toLocaleString()} {(lvlItem.max != null && lvlItem.max !== Infinity && isFinite(lvlItem.max)) ? `– ${lvlItem.max.toLocaleString()}` : '+'} XP
                          </p>
                        </div>
                        {isCurrent && (
                          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: lvlItem.color, boxShadow: `0 0 8px ${lvlItem.color}` }} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── LEADERBOARD TAB ──────────────────────────────────────────── */}
          {tab === 'leaderboard' && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(10,8,30,0.8)', border: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(16px)' }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
                  <div className="flex items-center gap-2">
                    <Crown size={16} style={{ color: '#fbbf24' }} />
                    <h3 className="font-semibold text-white text-sm">Top Learners</h3>
                  </div>
                </div>
                <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
                  {lb.map((entry, i) => {
                    const isMe = String(entry._id) === String(user?._id)
                    const rankColors = ['#fbbf24', '#94a3b8', '#cd7c39']
                    const rankIcons  = ['🥇', '🥈', '🥉']
                    return (
                      <motion.div
                        key={entry._id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-4 px-5 py-3"
                        style={{ background: isMe ? 'rgba(99,102,241,0.08)' : 'transparent', borderLeft: isMe ? '3px solid #818cf8' : '3px solid transparent' }}
                      >
                        <div className="w-8 text-center font-bold text-lg">
                          {i < 3 ? rankIcons[i] : <span style={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.8rem' }}>#{entry.rank}</span>}
                        </div>
                        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: `2px solid ${entry.level.color}40` }}>
                          {entry.profileImage
                            ? <img src={entry.profileImage} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">{entry.name?.charAt(0)?.toUpperCase()}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-white truncate">
                            {entry.name} {isMe && <span style={{ color: '#818cf8', fontSize: '0.65rem' }}>(you)</span>}
                          </p>
                          <p style={{ color: entry.level.color, fontSize: '0.65rem', fontFamily: 'monospace' }}>
                            {entry.level.icon} {entry.level.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-white text-sm">{entry.xp.toLocaleString()} <span style={{ color: '#818cf8', fontSize: '0.65rem' }}>XP</span></p>
                          <p style={{ color: 'rgba(245,158,11,0.7)', fontSize: '0.62rem', fontFamily: 'monospace' }}>🪙 {entry.tokens}</p>
                        </div>
                        {entry.streak > 0 && (
                          <div className="px-2 py-1 rounded-lg" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
                            <span style={{ color: '#fb923c', fontSize: '0.65rem', fontFamily: 'monospace' }}>🔥{entry.streak}</span>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── HISTORY TAB ──────────────────────────────────────────────── */}
          {tab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(10,8,30,0.8)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(16px)' }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
                  <div className="flex items-center gap-2">
                    <Activity size={16} style={{ color: '#818cf8' }} />
                    <h3 className="font-semibold text-white text-sm">Recent XP Activity</h3>
                  </div>
                </div>
                {history.length === 0 ? (
                  <div className="py-12 text-center">
                    <Sparkles size={32} className="mx-auto mb-3" style={{ color: 'rgba(99,102,241,0.3)' }} />
                    <p style={{ color: 'rgba(148,163,184,0.4)', fontFamily: 'monospace', fontSize: '0.75rem' }}>No XP activity yet. Start posting!</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
                    {history.map((h, i) => {
                      const meta = ACTION_LABELS[h.action] || { label: h.action, icon: '⚡', color: '#6366f1' }
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-center gap-3 px-5 py-3"
                        >
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                            style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}>
                            {meta.icon}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{meta.label}</p>
                            <p style={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.62rem', fontFamily: 'monospace' }}>
                              {new Date(h.createdAt).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <span className="font-bold text-sm" style={{ color: meta.color }}>+{h.amount} XP</span>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
