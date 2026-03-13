import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { initSocket, disconnectSocket } from './services/socket'
import Navbar from './components/Navbar'
import IncomingCallModal from './components/IncomingCallModal'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import MentorDashboard from './pages/MentorDashboard'
import Doubts from './pages/Doubts'
import PostDoubt from './pages/PostDoubt'
import EditDoubt from './pages/EditDoubt'
import Resources from './pages/Resources'
import Communities from './pages/Communities'
import Profile from './pages/Profile'
import Chats from './pages/Chats'
import Chat from './pages/Chat'
import VideoCall from './pages/VideoCall'
import Mentors from './pages/Mentors'
import AIBot from './pages/AIBot'

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])

  return null
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" />
}

// Mentor Only Route Component
function MentorRoute({ children }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" />
  if (user?.role !== 'mentor') return <Navigate to="/dashboard" />
  return children
}

// Student Only Route Component
function StudentRoute({ children }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" />
  if (user?.role === 'mentor') return <Navigate to="/mentor-dashboard" />
  return children
}

export default function App() {
  const { token, user, initAuth, isInitialized } = useAuthStore()
  const { initTheme } = useThemeStore()

  useEffect(() => {
    initTheme()
    initAuth() // Initialize auth state from localStorage
  }, [initAuth, initTheme])

  useEffect(() => {
    if (token && user) {
      console.log('Initializing socket with userId:', user._id)
      initSocket(token, user._id)
    } else {
      disconnectSocket()
    }
  }, [token, user])

  // Show loading until auth is initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        {token && <Navbar />}
        {token && <IncomingCallModal />}
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/signup" element={token ? <Navigate to="/dashboard" replace /> : <Signup />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <StudentRoute>
                <Dashboard />
              </StudentRoute>
            }
          />
          <Route
            path="/mentor-dashboard"
            element={
              <MentorRoute>
                <MentorDashboard />
              </MentorRoute>
            }
          />
          <Route
            path="/doubts"
            element={
              <StudentRoute>
                <Doubts />
              </StudentRoute>
            }
          />
          <Route
            path="/doubts/new"
            element={
              <StudentRoute>
                <PostDoubt />
              </StudentRoute>
            }
          />
          <Route
            path="/doubts/:id/edit"
            element={
              <StudentRoute>
                <EditDoubt />
              </StudentRoute>
            }
          />
          <Route
            path="/chats"
            element={
              <StudentRoute>
                <Chats />
              </StudentRoute>
            }
          />
          <Route
            path="/chat/:roomId"
            element={
              <StudentRoute>
                <Chat />
              </StudentRoute>
            }
          />
          <Route
            path="/video-call/:roomId"
            element={
              <StudentRoute>
                <VideoCall />
              </StudentRoute>
            }
          />
          <Route
            path="/mentors"
            element={
              <StudentRoute>
                <Mentors />
              </StudentRoute>
            }
          />
          <Route
            path="/ai-bot"
            element={
              <StudentRoute>
                <AIBot />
              </StudentRoute>
            }
          />
          <Route
            path="/resources"
            element={
              <ProtectedRoute>
                <Resources />
              </ProtectedRoute>
            }
          />
          <Route
            path="/communities"
            element={
              <ProtectedRoute>
                <Communities />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to={token ? (user?.role === 'mentor' ? '/mentor-dashboard' : '/dashboard') : '/login'} replace />} />
        </Routes>
      </div>
    </Router>
  )
}
