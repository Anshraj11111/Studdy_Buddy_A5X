import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, Moon, Sun, LogOut, Settings, Bell, Heart, MessageCircle, UserPlus } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { useNotificationStore } from '../store/notificationStore'

function NotifIcon({ type }) {
  if (type === 'like') return <Heart size={12} className="text-red-500" fill="currentColor" />
  if (type === 'comment') return <MessageCircle size={12} className="text-blue-500" />
  if (type === 'connection') return <UserPlus size={12} className="text-green-500" />
  return <Bell size={12} className="text-gray-400" />
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
  const { isDark, toggleTheme } = useThemeStore()
  const { notifications, unreadCount, markAllRead } = useNotificationStore()
  const navigate = useNavigate()
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

  const nl = "px-3 py-2 rounded-xl hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-all font-medium text-sm backdrop-blur-sm"

  return (
    <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg border-b border-white/20 dark:border-slate-700/50 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Left side - Logo and Menu Button */}
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Button for Sidebar (only on pages with sidebar) */}
            {user && onMenuClick && (
              <button 
                onClick={onMenuClick}
                className="lg:hidden p-2 hover:bg-white/50 dark:hover:bg-slate-800/50 backdrop-blur-sm rounded-xl transition-all"
                aria-label="Toggle sidebar"
              >
                <Menu size={22} className="text-gray-600 dark:text-gray-300" />
              </button>
            )}

            <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center shadow-lg glow-effect">
                <span className="text-white font-bold text-base">SB</span>
              </div>
              <span className="font-bold text-lg gradient-text hidden sm:inline">
                Studdy Buddy
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-0.5">
            {user && (
              <>
                {user.role === 'student' ? (
                  <>
                    <Link to="/dashboard" className={nl}>Dashboard</Link>
                    <Link to="/doubts" className={nl}>My Doubts</Link>
                    <Link to="/mentors" className={nl}>Mentors</Link>
                    <Link to="/chats" className={nl}>Chats</Link>
                  </>
                ) : (
                  <>
                    <Link to="/mentor-dashboard" className={nl}>Dashboard</Link>
                    <Link to="/chats" className={nl}>Chats</Link>
                  </>
                )}
                <Link to="/resources" className="px-3 py-2 rounded-xl hover:bg-secondary-50 dark:hover:bg-secondary-900/20 text-gray-700 dark:text-gray-200 hover:text-secondary-600 transition-all font-medium text-sm backdrop-blur-sm">Resources</Link>
                <Link to="/communities" className="px-3 py-2 rounded-xl hover:bg-accent-50 dark:hover:bg-accent-900/20 text-gray-700 dark:text-gray-200 hover:text-accent-600 transition-all font-medium text-sm backdrop-blur-sm">Communities</Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="p-2 hover:bg-white/50 dark:hover:bg-slate-800/50 backdrop-blur-sm rounded-xl transition-all" aria-label="Toggle theme">
              {isDark ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} className="text-primary-600" />}
            </button>

            {user ? (
              <>
                <div className="relative" ref={notifRef}>
                  <button onClick={openNotif} className="relative p-2 hover:bg-white/50 dark:hover:bg-slate-800/50 backdrop-blur-sm rounded-xl transition-all" aria-label="Notifications">
                    <Bell size={18} className="text-gray-600 dark:text-gray-300" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 shadow-lg">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 glass-card overflow-hidden z-50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100/50 dark:border-slate-700/50">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">Notifications</span>
                        {notifications.length > 0 && (
                          <button onClick={markAllRead} className="text-xs text-primary-500 hover:text-primary-700 font-medium">Mark all read</button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-gray-50/50 dark:divide-slate-700/50">
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center py-10 gap-2 text-gray-400">
                            <Bell size={28} className="opacity-30" />
                            <p className="text-sm">No notifications yet</p>
                          </div>
                        ) : notifications.map(n => (
                          <div key={n._id} className={`flex items-start gap-3 px-4 py-3 hover:bg-white/50 dark:hover:bg-slate-700/40 transition-colors ${!n.read ? 'bg-primary-50/60 dark:bg-primary-900/10' : ''}`}>
                            <div className="relative flex-shrink-0">
                              <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                {n.sender?.profileImage
                                  ? <img src={n.sender.profileImage} alt={n.sender.name} className="w-full h-full object-cover" />
                                  : n.sender?.name?.[0]?.toUpperCase()
                                }
                              </div>
                              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
                                <NotifIcon type={n.type} />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-700 dark:text-gray-200 leading-snug">{n.message}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                            </div>
                            {!n.read && <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Link to="/settings" className="hidden sm:flex p-2 hover:bg-white/50 dark:hover:bg-slate-800/50 backdrop-blur-sm rounded-xl transition-all" title="Settings">
                  <Settings size={18} className="text-gray-600 dark:text-gray-400" />
                </Link>

                <Link to="/settings" className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 bg-gradient-to-r from-primary-50/80 to-secondary-50/80 dark:from-primary-900/20 dark:to-secondary-900/20 backdrop-blur-md text-primary-600 dark:text-primary-400 rounded-xl hover:shadow-lg transition-all font-medium text-sm border border-primary-200/30 dark:border-primary-800/30">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-md">
                    {user.profileImage
                      ? <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                      : user.name?.charAt(0).toUpperCase()
                    }
                  </div>
                  <span className="max-w-[72px] truncate">{user.name}</span>
                </Link>

                <button onClick={handleLogout} className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 hover:shadow-xl transition-all font-medium text-sm shadow-lg hover:scale-105">
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 backdrop-blur-sm rounded-xl transition-all font-medium text-sm">Login</Link>
                <Link to="/signup" className="px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl hover:shadow-xl transition-all font-medium text-sm shadow-lg hover:scale-105">Sign Up</Link>
              </>
            )}

            <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 hover:bg-white/50 dark:hover:bg-slate-800/50 backdrop-blur-sm rounded-xl transition-all">
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4 space-y-1 border-t border-gray-100/50 dark:border-slate-700/50 pt-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl"
            style={{ 
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 40,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
            }}
          >
            {user && (
              <>
                <Link to="/settings" className="flex items-center gap-3 px-3 py-3 bg-gradient-to-r from-primary-50/80 to-secondary-50/80 dark:from-primary-900/20 dark:to-secondary-900/20 backdrop-blur-md rounded-xl mb-2 border border-primary-200/30 dark:border-primary-800/30" onClick={() => setIsOpen(false)}>
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-md">
                    {user.profileImage
                      ? <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                      : user.name?.charAt(0).toUpperCase()
                    }
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-900 dark:text-white">{user.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</div>
                  </div>
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md">{unreadCount}</span>
                  )}
                </Link>

                {user.role === 'student' ? (
                  <>
                    <Link to="/dashboard" className="block px-3 py-2.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 backdrop-blur-sm rounded-xl text-gray-700 dark:text-gray-200 font-medium text-sm" onClick={() => setIsOpen(false)}>Dashboard</Link>
                    <Link to="/doubts" className="block px-3 py-2.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 backdrop-blur-sm rounded-xl text-gray-700 dark:text-gray-200 font-medium text-sm" onClick={() => setIsOpen(false)}>My Doubts</Link>
                    <Link to="/mentors" className="block px-3 py-2.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 backdrop-blur-sm rounded-xl text-gray-700 dark:text-gray-200 font-medium text-sm" onClick={() => setIsOpen(false)}>Mentors</Link>
                    <Link to="/chats" className="block px-3 py-2.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 backdrop-blur-sm rounded-xl text-gray-700 dark:text-gray-200 font-medium text-sm" onClick={() => setIsOpen(false)}>Chats</Link>
                  </>
                ) : (
                  <>
                    <Link to="/mentor-dashboard" className="block px-3 py-2.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 backdrop-blur-sm rounded-xl text-gray-700 dark:text-gray-200 font-medium text-sm" onClick={() => setIsOpen(false)}>Dashboard</Link>
                    <Link to="/chats" className="block px-3 py-2.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 backdrop-blur-sm rounded-xl text-gray-700 dark:text-gray-200 font-medium text-sm" onClick={() => setIsOpen(false)}>Chats</Link>
                  </>
                )}
                <Link to="/resources" className="block px-3 py-2.5 hover:bg-secondary-50 dark:hover:bg-secondary-900/20 backdrop-blur-sm rounded-xl text-gray-700 dark:text-gray-200 font-medium text-sm" onClick={() => setIsOpen(false)}>Resources</Link>
                <Link to="/communities" className="block px-3 py-2.5 hover:bg-accent-50 dark:hover:bg-accent-900/20 backdrop-blur-sm rounded-xl text-gray-700 dark:text-gray-200 font-medium text-sm" onClick={() => setIsOpen(false)}>Communities</Link>
                <Link to="/settings" className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/50 dark:hover:bg-slate-800/50 backdrop-blur-sm rounded-xl text-gray-700 dark:text-gray-200 font-medium text-sm" onClick={() => setIsOpen(false)}>
                  <Settings size={15} /> Settings
                </Link>
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium text-sm mt-1 shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                  <LogOut size={15} /> Logout
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
