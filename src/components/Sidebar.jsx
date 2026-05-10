import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Activity,
  Bookmark,
  FolderOpen,
  Star,
  Settings,
  Sparkles,
  X
} from 'lucide-react'

export default function Sidebar({ isOpen = false, onClose }) {
  const location = useLocation()
  
  const navItems = [
    { icon: LayoutDashboard, label: 'Overview',     path: '/dashboard' },
    { icon: Activity,        label: 'My Activity',  path: '/doubts' },
    { icon: Bookmark,        label: 'Bookmarks',    path: '/resources' },
    { icon: FolderOpen,      label: 'My Projects',  path: '/communities' },
    { icon: Star,            label: 'XP & Rewards', path: '/dashboard#xp' },
    { icon: Settings,        label: 'Settings',     path: '/settings' },
  ]

  const handleLinkClick = () => {
    if (onClose) onClose()
  }

  // Desktop: always visible, Mobile: controlled by isOpen
  const isVisible = typeof window !== 'undefined' && window.innerWidth >= 1024 ? true : isOpen

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
            className="fixed inset-0 bg-black/60 z-[55] lg:hidden"
            style={{ top: '64px' }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        style={{
          background: 'rgba(5,3,20,0.95)',
          borderRight: '1px solid rgba(99,102,241,0.15)',
          backdropFilter: 'blur(20px)',
          zIndex: 60,
        }}
        className={`fixed left-0 top-16 bottom-0 w-[240px] flex flex-col transition-transform duration-300 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition z-10"
          >
            <X size={20} className="text-gray-400" />
          </button>
        )}

        {/* Navigation Section */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {navItems.map((item, i) => {
            const Icon = item.icon
            const active = location.pathname === item.path || 
                          (item.path === '/dashboard' && location.pathname === '/dashboard')
            
            return (
              <div key={item.label}>
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
              </div>
            )
          })}
        </nav>

        {/* Upgrade Card */}
        <div
          className="mx-3 mb-4 p-5 rounded-2xl text-center hidden lg:block"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.2))',
            border: '1px solid rgba(99,102,241,0.3)'
          }}
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
        </div>
      </aside>
    </>
  )
}
