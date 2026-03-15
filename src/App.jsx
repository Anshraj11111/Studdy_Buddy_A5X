import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { initSocket, disconnectSocket } from './services/socket'
import Navbar from './components/Navbar'
import IncomingCallModal from './components/IncomingCallModal'

// Eagerly load auth pages (always needed on first visit)
import Login from './pages/Login'
import Signup from './pages/Signup'

// Lazy load all other pages — each becomes its own chunk
const Dashboard = lazy(() => import('./pages/Dashboard'))
const MentorDashboard = lazy(() => import('./pages/MentorDashboard'))
const Doubts = lazy(() => import('./pages/Doubts'))
const PostDoubt = lazy(() => import('./pages/PostDoubt'))
const EditDoubt = lazy(() => import('./pages/EditDoubt'))
const Resources = lazy(() => import('./pages/Resources'))
const Communities = lazy(() => import('./pages/Communities'))
const Profile = lazy(() => import('./pages/Profile'))
const Chats = lazy(() => import('./pages/Chats'))
const Chat = lazy(() => import('./pages/Chat'))
const VideoCall = lazy(() => import('./pages/VideoCall'))
const Mentors = lazy(() => import('./pages/Mentors'))
const AIBot = lazy(() => import('./pages/AIBot'))
const Settings = lazy(() => import('./pages/Settings'))

// Minimal page-level skeleton shown while a lazy chunk loads
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])
  return null
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
  const { token, user, initAuth, isInitialized } = useAuthStore()
  const { initTheme } = useThemeStore()

  useEffect(() => {
    initTheme()
    initAuth()
  }, [initAuth, initTheme])

  useEffect(() => {
    if (token && user) {
      initSocket(token, user._id)
    } else {
      disconnectSocket()
    }
  }, [token, user])

  if (!isInitialized) {
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
    <Router>
      <ScrollToTop />
      <div className="min-h-screen bg-white dark:bg-gray-900">
        {token && <Navbar />}
        {token && <IncomingCallModal />}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
            <Route path="/signup" element={token ? <Navigate to="/dashboard" replace /> : <Signup />} />

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
        </Suspense>
      </div>
    </Router>
  )
}
