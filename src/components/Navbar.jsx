import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LogOut, Settings, Bell, Heart, MessageCircle, UserPlus, Zap } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useNotificationStore } from '../store/notificationStore'

function NotifIcon({ type }) {
  if (type === 'like') return <Heart size={11} className="text-red-400" fill="currentColor" />
  if (type === 'comment') return <MessageCircle size={11} className="text-blue-400" />
  if (type === 'connection') return <UserPlus size={11} className="text-green-400" />
  return <Bell size={11} className="text-gray-400" />
}

function timeAgo(date) {
  const m = Math.floor((Date.now() - new Date(date)) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function Navbar({ onMenuClick }) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const { notifications, unreadCount, markAllRead } = useNotificationStore()
  const navigate = useNavigate()
  const location = useLocation()
  const notifRef = useRef()

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const openNotif = () => {
    setNotifOpen(v => !v)
    if (!notifOpen && unreadCount > 0) markAllRead()
  }

  const navLinks = user?.role === 'student'
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/doubts', label: 'My Doubts' },
        { to: '/mentors', label: 'Mentors' },
        { to: '/chats', label: 'Chats' },
        { to: '/resources', label: 'Resources' },
        { to: '/communities', label: 'Communities' },
      ]
    : [
        { to: '/mentor-dashboard', label: 'Dashboard' },
        { to: '/chats', label: 'Chats' },
        { to: '/resources', label: 'Resources' },
        { to: '/communities', label: 'Communities' },
      ]

  const isActive = (path) => location.pathname === path

  return (
    <nav className="fixed top-0 left-0 right-0 z-50"
      style={{ background: 'rgba(5,3,20,0.92)', borderBottom: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(24px)' }}>
      {/* Top gradient line */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg,transparent,#6366f1 30%,#8b5cf6 50%,#6366f1 70%,transparent)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-3">
            {user && onMenuClick && (
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={onMenuClick}
                className="lg:hidden p-2 rounded-xl transition"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <Menu size={20} style={{ color: '#a5b4fc' }} />
              </motion.button>
            )}

            <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
              <motion.div whileHover={{ scale: 1.05 }}
                className="w-9 h-9 rounded-xl flex items-center justify-center relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 16px rgba(99,102,241,0.5)' }}>
                <span className="text-white font-bold text-sm relative z-10">SB</span>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'linear-gradient(135deg,#818cf8,#a78bfa)' }} />
              </motion.div>
              <span className="font-bold text-lg hidden sm:inline"
                style={{ background: 'linear-gradient(135deg,#a5b4fc,#c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Studdy Buddy
              </span>
            </Link>
          </div>

          {/* Center: Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {user && navLinks.map(({ to, label }) => (
              <Link key={to} to={to}>
                <motion.div whileHover={{ y: -1 }} className="relative px-3 py-2 rounded-xl transition-all text-sm font-medium"
                  style={{ color: isActive(to) ? '#a5b4fc' : 'rgba(148,163,184,0.75)' }}>
                  {isActive(to) && (
                    <motion.div layoutId="nav-active"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                  )}
                  <span className="relative z-10">{label}</span>
                  {isActive(to) && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ background: '#818cf8' }} />
                  )}
                </motion.div>
              </Link>
            ))}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5">
            {user ? (
              <>
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    onClick={openNotif}
                    className="relative p-2 rounded-xl transition"
                    style={{ background: notifOpen ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <Bell size={17} style={{ color: '#a5b4fc' }} />
                    {unreadCount > 0 && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5"
                        style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 0 8px rgba(239,68,68,0.5)' }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </motion.span>
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {notifOpen && (
                      <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden z-50"
                        style={{ background: 'rgba(10,8,30,0.97)', border: '1px solid rgba(99,102,241,0.25)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
                        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                          <span className="font-bold text-sm text-white flex items-center gap-2">
                            <Bell size={14} style={{ color: '#818cf8' }} /> Notifications
                          </span>
                          {notifications.length > 0 && (
                            <button onClick={markAllRead} className="text-xs font-medium transition hover:opacity-80"
                              style={{ color: '#818cf8' }}>Mark all read</button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="flex flex-col items-center py-10 gap-2">
                              <Bell size={28} style={{ color: 'rgba(99,102,241,0.3)' }} />
                              <p className="text-sm" style={{ color: 'rgba(148,163,184,0.5)' }}>No notifications yet</p>
                            </div>
                          ) : notifications.map(n => (
                            <div key={n._id}
                              className="flex items-start gap-3 px-4 py-3 transition hover:bg-white/5"
                              style={{ borderBottom: '1px solid rgba(99,102,241,0.08)', background: !n.read ? 'rgba(99,102,241,0.06)' : 'transparent' }}>
                              <div className="relative flex-shrink-0">
                                <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-sm"
                                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                  {n.sender?.profileImage
                                    ? <img src={n.sender.profileImage} alt={n.sender.name} className="w-full h-full object-cover" />
                                    : n.sender?.name?.[0]?.toUpperCase()}
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                                  style={{ background: 'rgba(10,8,30,0.9)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                  <NotifIcon type={n.type} />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs leading-snug" style={{ color: 'rgba(226,232,240,0.9)' }}>{n.message}</p>
                                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>{timeAgo(n.createdAt)}</p>
                              </div>
                              {!n.read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#818cf8' }} />}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Settings icon */}
                <Link to="/settings" className="hidden sm:flex">
                  <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    className="p-2 rounded-xl transition"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <Settings size={17} style={{ color: 'rgba(148,163,184,0.7)' }} />
                  </motion.div>
                </Link>

                {/* User profile chip */}
                <Link to="/settings" className="hidden sm:flex">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition"
                    style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
                    <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 8px rgba(99,102,241,0.4)' }}>
                      {user.profileImage
                        ? <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                        : user.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-[72px] truncate text-sm font-medium" style={{ color: '#a5b4fc' }}>{user.name}</span>
                  </motion.div>
                </Link>

                {/* Logout */}
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-white text-sm font-semibold rounded-xl transition"
                  style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 2px 10px rgba(239,68,68,0.35)' }}>
                  <LogOut size={14} />
                  <span>Logout</span>
                </motion.button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <motion.div whileHover={{ scale: 1.05 }} className="px-4 py-2 text-sm font-medium rounded-xl transition"
                    style={{ color: 'rgba(148,163,184,0.8)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    Login
                  </motion.div>
                </Link>
                <Link to="/signup">
                  <motion.div whileHover={{ scale: 1.05 }} className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 2px 12px rgba(99,102,241,0.4)' }}>
                    Sign Up
                  </motion.div>
                </Link>
              </>
            )}

            {/* Mobile menu toggle */}
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-xl transition"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
              {isOpen
                ? <X size={20} style={{ color: '#a5b4fc' }} />
                : <Menu size={20} style={{ color: '#a5b4fc' }} />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden"
            style={{ background: 'rgba(5,3,20,0.97)', borderTop: '1px solid rgba(99,102,241,0.15)' }}>
            <div className="px-4 py-4 space-y-1">
              {user && (
                <>
                  {/* User info */}
                  <Link to="/settings" onClick={() => setIsOpen(false)}>
                    <div className="flex items-center gap-3 p-3 rounded-xl mb-3"
                      style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
                      <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 12px rgba(99,102,241,0.4)' }}>
                        {user.profileImage
                          ? <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                          : user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-white">{user.name}</div>
                        <div className="text-xs capitalize" style={{ color: 'rgba(148,163,184,0.6)' }}>{user.role}</div>
                      </div>
                      {unreadCount > 0 && (
                        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>{unreadCount}</span>
                      )}
                    </div>
                  </Link>

                  {/* Nav links */}
                  {navLinks.map(({ to, label }) => (
                    <Link key={to} to={to} onClick={() => setIsOpen(false)}>
                      <div className="flex items-center px-3 py-2.5 rounded-xl transition text-sm font-medium"
                        style={{
                          background: isActive(to) ? 'rgba(99,102,241,0.2)' : 'transparent',
                          color: isActive(to) ? '#a5b4fc' : 'rgba(148,163,184,0.8)',
                          borderLeft: isActive(to) ? '2px solid #6366f1' : '2px solid transparent',
                        }}>
                        {label}
                      </div>
                    </Link>
                  ))}

                  <Link to="/settings" onClick={() => setIsOpen(false)}>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition text-sm font-medium"
                      style={{ color: 'rgba(148,163,184,0.8)' }}>
                      <Settings size={15} /> Settings
                    </div>
                  </Link>

                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-white text-sm font-semibold rounded-xl mt-2"
                    style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 2px 10px rgba(239,68,68,0.3)' }}>
                    <LogOut size={15} /> Logout
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
