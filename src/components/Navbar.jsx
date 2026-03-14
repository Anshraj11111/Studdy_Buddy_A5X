import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, Moon, Sun, LogOut } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <span className="text-white font-bold text-lg">SB</span>
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hidden sm:inline">
              Studdy Buddy
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-2">
            {user && (
              <>
                {user.role === 'student' ? (
                  <>
                    <Link 
                      to="/dashboard" 
                      className="px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-medium"
                    >
                      Dashboard
                    </Link>
                    <Link 
                      to="/doubts" 
                      className="px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-medium"
                    >
                      My Doubts
                    </Link>
                    <Link 
                      to="/mentors" 
                      className="px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-medium"
                    >
                      Mentors
                    </Link>
                    <Link 
                      to="/chats" 
                      className="px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-medium"
                    >
                      Chats
                    </Link>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/mentor-dashboard" 
                      className="px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-medium"
                    >
                      Dashboard
                    </Link>
                    <Link 
                      to="/chats" 
                      className="px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-medium"
                    >
                      Chats
                    </Link>
                  </>
                )}
                <Link 
                  to="/resources" 
                  className="px-4 py-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-400 transition-all font-medium"
                >
                  Resources
                </Link>
                <Link 
                  to="/communities" 
                  className="px-4 py-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 transition-all font-medium"
                >
                  Communities
                </Link>
              </>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-blue-600" />}
            </button>

            {user ? (
              <>
                <Link
                  to="/profile"
                  className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:shadow-md transition-all font-medium"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span>{user.name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="hidden sm:flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 hover:shadow-lg transition-all font-medium"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 hover:shadow-lg transition-all font-medium"
                >
                  Sign Up
                </Link>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2 animate-in slide-in-from-top">
            {user && (
              <>
                <Link
                  to="/profile"
                  className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl mb-2"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">View Profile</div>
                  </div>
                </Link>
                {user.role === 'student' ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-gray-700 dark:text-gray-200 font-medium"
                      onClick={() => setIsOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/doubts"
                      className="block px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-gray-700 dark:text-gray-200 font-medium"
                      onClick={() => setIsOpen(false)}
                    >
                      My Doubts
                    </Link>
                    <Link
                      to="/mentors"
                      className="block px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-gray-700 dark:text-gray-200 font-medium"
                      onClick={() => setIsOpen(false)}
                    >
                      Mentors
                    </Link>
                    <Link
                      to="/chats"
                      className="block px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-gray-700 dark:text-gray-200 font-medium"
                      onClick={() => setIsOpen(false)}
                    >
                      Chats
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/mentor-dashboard"
                      className="block px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-gray-700 dark:text-gray-200 font-medium"
                      onClick={() => setIsOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/chats"
                      className="block px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-gray-700 dark:text-gray-200 font-medium"
                      onClick={() => setIsOpen(false)}
                    >
                      Chats
                    </Link>
                  </>
                )}
                <Link
                  to="/resources"
                  className="block px-4 py-2.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl text-gray-700 dark:text-gray-200 font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Resources
                </Link>
                <Link
                  to="/communities"
                  className="block px-4 py-2.5 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl text-gray-700 dark:text-gray-200 font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Communities
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium mt-2"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
