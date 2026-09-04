import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { useNotificationStore } from './store/notificationStore'
import { initSocket, disconnectSocket, onNotification, offNotification } from './services/socket'
import { setupPushNotifications, teardownPushNotifications } from './services/pushNotification'
import Navbar from './components/Navbar'
import IncomingCallModal from './components/IncomingCallModal'
import InstallPWA from './components/InstallPWA'

// Eagerly load ALL pages — no lazy loading to avoid duplicate React issues
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import MentorDashboard from './pages/MentorDashboard'
import Doubts from './pages/Doubts'
import PostDoubt from './pages/PostDoubt'
import EditDoubt from './pages/EditDoubt'
import Resources from './pages/ResourcesNew'
import Communities from './pages/Communities'
import Profile from './pages/Profile'
import Chats from './pages/Chats'
import Chat from './pages/Chat'
import VideoCall from './pages/VideoCall'
import Mentors from './pages/Mentors'
import AIBot from './pages/AIBot'
import Settings from './pages/Settings'
import AdminPanel from './pages/AdminPanel'
import Rewards from './pages/Rewards'
import GeneralGroup from './pages/GeneralGroup'
import Broadcast from './pages/Broadcast'
import BroadcastLive from './pages/BroadcastLive'
import SchoolChannel from './pages/SchoolChannel'
import SchoolChannelAdmin from './pages/SchoolChannelAdmin'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsConditions from './pages/TermsConditions'

// No PageLoader needed - all pages eagerly loaded

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])
  return null
}

function AppShell() {
  const { token, user, initAuth, isInitialized, isTokenValidated } = useAuthStore()
  const { initTheme } = useThemeStore()
  const { fetch: fetchNotifications, addNew } = useNotificationStore()
  const { pathname } = useLocation()
  const isAdminRoute = pathname === '/admin'

  useEffect(() => {
    initTheme()
    initAuth()
    // Pre-warm the backend server on app boot
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://studdy-buddy-backend-a5x.onrender.com'
    fetch(`${backendUrl}/ping`).catch(() => {})

    // Keep-alive ping every 10 minutes to prevent Render cold starts
    const keepAlive = setInterval(() => {
      fetch(`${backendUrl}/ping`).catch(() => {})
    }, 10 * 60 * 1000)

    return () => clearInterval(keepAlive)
  }, [initAuth, initTheme])

  useEffect(() => {
    if (token && user && isTokenValidated) {
      initSocket(token, user._id, user.name || '', user.profileImage || '', user.role || '')
      fetchNotifications()
      onNotification((notif) => addNew(notif))
      // Setup background push notifications (WhatsApp-style)
      setupPushNotifications()
    } else {
      offNotification()
      // Unsubscribe push on logout
      if (!token) teardownPushNotifications()
      disconnectSocket()
    }
    return () => offNotification()
  }, [token, user, isTokenValidated])

  if (!isInitialized && !isAdminRoute) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ position: 'relative', background: 'var(--bg-primary)' }}>
      {token && !isAdminRoute && <Navbar />}
      {token && !isAdminRoute && <IncomingCallModal />}
      {token && !isAdminRoute && <InstallPWA />}
        <Routes>
          {/* Public */}
          <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/signup" element={token ? <Navigate to="/dashboard" replace /> : <Signup />} />
          <Route path="/forgot-password" element={token ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />

          {/* Student */}
          <Route path="/dashboard" element={<StudentRoute><Dashboard /></StudentRoute>} />
          <Route path="/doubts" element={<StudentRoute><Doubts /></StudentRoute>} />
          <Route path="/doubts/new" element={<StudentRoute><PostDoubt /></StudentRoute>} />
          <Route path="/doubts/:id/edit" element={<StudentRoute><EditDoubt /></StudentRoute>} />
          <Route path="/mentors" element={<StudentRoute><Mentors /></StudentRoute>} />
          <Route path="/ai-bot" element={<StudentRoute><AIBot /></StudentRoute>} />

          {/* Mentor */}
          <Route path="/mentor-dashboard" element={<MentorRoute><MentorDashboard /></MentorRoute>} />

          {/* Shared */}
          <Route path="/chats" element={<ProtectedRoute><Chats /></ProtectedRoute>} />
          <Route path="/chat/:roomId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/video-call/:roomId" element={<ProtectedRoute><VideoCall /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
          <Route path="/communities" element={<ProtectedRoute><Communities /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
          <Route path="/general-group" element={<ProtectedRoute><GeneralGroup /></ProtectedRoute>} />
          <Route path="/broadcast" element={<ProtectedRoute><Broadcast /></ProtectedRoute>} />
          <Route path="/broadcast-live" element={<ProtectedRoute><BroadcastLive /></ProtectedRoute>} />
          <Route path="/school-channel" element={<ProtectedRoute><SchoolChannel /></ProtectedRoute>} />
          <Route path="/school-channel-admin" element={<ProtectedRoute><SchoolChannelAdmin /></ProtectedRoute>} />

          {/* Legal Pages - Public */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-conditions" element={<TermsConditions />} />

          {/* Admin — standalone, no navbar */}
          <Route path="/admin" element={<AdminPanel />} />

          {/* Default */}
          <Route
            path="/"
            element={
              <Navigate
                to={token ? (user?.role === 'mentor' ? '/mentor-dashboard' : '/dashboard') : '/login'}
                replace
              />
            }
          />
        </Routes>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" />
}

function MentorRoute({ children }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" />
  if (user?.role !== 'mentor') return <Navigate to="/dashboard" />
  return children
}

function StudentRoute({ children }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" />
  if (user?.role === 'mentor') return <Navigate to="/mentor-dashboard" />
  return children
}

export default function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ScrollToTop />
      <AppShell />
    </Router>
  )
}
