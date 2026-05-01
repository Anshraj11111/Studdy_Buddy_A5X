import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Activity,
  Bookmark,
  FolderOpen,
  Star,
  Award,
  Settings,
  Sparkles,
  X
} from 'lucide-react'

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation()
  
  const navItems = [
    { icon: LayoutDashboard, label: 'Overview',     path: '/dashboard' },
    { icon: Activity,        label: 'My Activity',  path: '/doubts' },
    { icon: Bookmark,        label: 'Bookmarks',    path: '/resources' },
    { icon: FolderOpen,      label: 'My Projects',  path: '/communities' },
    { icon: Star,            label: 'XP & Rewards', path: '/dashboard#xp' },
    { icon: Award,           label: 'Achievements', path: '/dashboard#ach' },
    { icon: Settings,        label: 'Settings',     path: '/settings' },
  ]

  const handleLinkClick = () => {
    if (onClose) onClose()
  }

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -80, opacity: 0 }}
        animate={{ 
          x: isOpen !== undefined ? (isOpen ? 0 : -240) : 0, 
          opacity: 1 
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed left-0 top-16 bottom-0 w-[240px] z-50 flex flex-col lg:translate-x-0"
        style={{
          background: 'rgba(5,3,20,0.95)',
          borderRight: '1px solid rgba(99,102,241,0.15)',
          backdropFilter: 'blur(20px)'
        }}
      >
        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
        >
          <X size={20} className="text-gray-400" />
        </button>

        {/* Navigation Section */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {navItems.map((item, i) => {
            const Icon = item.icon
            const active = location.pathname === item.path || 
                          (item.path === '/dashboard' && location.pathname === '/dashboard')
            
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <Link
                  to={item.path}
                  onClick={handleLinkClick}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{
                    background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
                    color: active ? '#a5b4fc' : 'rgba(148,163,184,0.75)',
                    borderLeft: active ? '3px solid #6366f1' : '3px solid transparent',
                  }}
                >
                  <Icon
                    style={{
                      width: '1.1rem',
                      height: '1.1rem',
                      color: active ? '#818cf8' : 'rgba(148,163,184,0.5)',
                      flexShrink: 0
                    }}
                  />
                  <span className="text-sm">{item.label}</span>
                </Link>
              </motion.div>
            )
          })}
        </nav>

        {/* Upgrade Card */}
        <motion.div
          className="mx-3 mb-4 p-5 rounded-2xl text-center hidden lg:block"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.2))',
            border: '1px solid rgba(99,102,241,0.3)'
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div
            className="w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Sparkles style={{ width: '1.2rem', height: '1.2rem', color: 'white' }} />
          </div>
          <p className="text-white text-sm font-bold mb-1">Upgrade to Pro</p>
          <p
            className="text-xs mb-3 leading-snug"
            style={{ color: 'rgba(148,163,184,0.7)' }}
          >
            Unlock premium features and grow faster.
          </p>
          <button
            className="w-full py-2 rounded-lg text-sm font-semibold text-white"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 12px rgba(99,102,241,0.4)'
            }}
          >
            Upgrade Now
          </button>
        </motion.div>
      </motion.aside>
    </>
  )
}
