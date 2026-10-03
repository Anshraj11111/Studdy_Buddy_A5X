import { create } from 'zustand'
import { authAPI } from '../services/api'

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,
  isInitialized: false,
  isTokenValidated: false, // New flag to track if token is validated

  register: async (email, password, name, role, mentorCode, skills = [], schoolName = '', schoolPassword = '', city = '') => {
    set({ loading: true, error: null })
    try {
      const response = await authAPI.register({ email, password, name, role, mentorCode, skills, schoolName, schoolPassword, city })
      const { token, user } = response.data.data
      // Store in BOTH localStorage AND sessionStorage for better persistence
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      sessionStorage.setItem('token', token) // Backup storage
      sessionStorage.setItem('user', JSON.stringify(user))
      set({ user, token, loading: false, error: null, isTokenValidated: true })
      return response.data.data
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Registration failed'
      set({ error: errorMessage, loading: false })
      throw new Error(errorMessage)
    }
  },

  login: async (email, password, role, mentorCode, schoolPassword) => {
    set({ loading: true, error: null })
    try {
      const response = await authAPI.login({ email, password, role, mentorCode, schoolPassword })
      const data = response.data?.data || response.data
      const token = data?.token
      const user = data?.user
      if (!token || !user) throw new Error('Invalid response from server')
      // Store in BOTH localStorage AND sessionStorage for better persistence  
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      sessionStorage.setItem('token', token) // Backup storage for mobile
      sessionStorage.setItem('user', JSON.stringify(user))
      set({ user, token, loading: false, error: null, isTokenValidated: true })
      return data
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Login failed'
      set({ error: errorMessage, loading: false })
      throw new Error(errorMessage)
    }
  },

  googleLogin: async (credential, role = 'student', mentorCode = '') => {
    set({ loading: true, error: null })
    try {
      const response = await authAPI.googleLogin({ credential, role, mentorCode })
      const data = response.data?.data || response.data
      const token = data?.token
      const user = data?.user
      if (!token || !user) throw new Error('Invalid response from server')
      // Store in BOTH localStorage AND sessionStorage for better persistence  
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      sessionStorage.setItem('token', token) // Backup storage for mobile
      sessionStorage.setItem('user', JSON.stringify(user))
      set({ user, token, loading: false, error: null, isTokenValidated: true })
      return data
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Google login failed'
      set({ error: errorMessage, loading: false })
      throw new Error(errorMessage)
    }
  },

  logout: () => {
    // Clear BOTH storage locations
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    set({ user: null, token: null, isTokenValidated: false })
  },

  // Refresh user profile from backend — call this to sync latest hasFreeAccess status
  refreshProfile: async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await authAPI.getProfile()
      const user = response.data?.data?.user
      if (user) {
        localStorage.setItem('user', JSON.stringify(user))
        set({ user })
        // Force re-render by updating a timestamp
        console.log('✅ Profile refreshed — hasFreeAccess:', user.hasFreeAccess)
      }
    } catch (error) {
      console.warn('Failed to refresh profile:', error)
    }
  },

  // Initialize auth state from localStorage
  initAuth: async () => {
    // Try both storage methods for better persistence on mobile
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const cachedUser = localStorage.getItem('user') || sessionStorage.getItem('user')

    console.log('[AUTH DEBUG] initAuth - token exists:', !!token, 'cachedUser exists:', !!cachedUser)

    if (token) {
      // Immediately unblock the UI using cached user data
      const parsedUser = cachedUser ? JSON.parse(cachedUser) : null
      console.log('[AUTH DEBUG] Parsed user from localStorage:', parsedUser?.name, 'xp:', parsedUser?.xp)
      set({ token, user: parsedUser, isInitialized: true, isTokenValidated: false })

      // Award daily visit XP (first visit of the day)
      try {
        await authAPI.dailyVisit()
        console.log('[AUTH DEBUG] Daily visit XP awarded')
      } catch (err) {
        console.log('[AUTH DEBUG] Daily visit XP failed:', err.message)
      }

      // Validate token + refresh in PARALLEL — not sequential
      // Previously: getProfile() then refreshToken() = 2 round trips sequentially
      // Now: both fire at same time = only 1 round trip worth of wait
      try {
        const [profileRes, refreshRes] = await Promise.allSettled([
          authAPI.getProfile(),
          authAPI.refreshToken(),
        ])

        // Handle profile result
        if (profileRes.status === 'fulfilled') {
          const freshUser = profileRes.value.data.data.user
          console.log('[AUTH DEBUG] Fresh user from API:', freshUser?.name, 'xp:', freshUser?.xp)
          localStorage.setItem('user', JSON.stringify(freshUser))
          set({ user: freshUser, isTokenValidated: true })
        } else {
          const error = profileRes.reason
          const errorCode = error.response?.data?.error?.code
          const status = error.response?.status

          // MUCH MORE LENIENT LOGOUT POLICY - Only logout on explicit token issues
          if (status === 401) {
            // ONLY logout if token is definitively expired or invalid
            const isTokenExpired = errorCode === 'TOKEN_EXPIRED' || 
                                 errorCode === 'JWT_EXPIRED' || 
                                 errorCode === 'INVALID_TOKEN' ||
                                 error.message?.includes('jwt expired');
            
            if (isTokenExpired) {
              // Token is definitely expired - logout required
              console.log('🔒 Token expired - logging out')
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              set({ token: null, user: null, isTokenValidated: false })
              if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
                window.location.href = '/login'
              }
              return
            } else {
              // For USER_NOT_FOUND, network issues, server errors - STAY LOGGED IN
              console.warn('⚠️ Auth failed but keeping user logged in:', errorCode || error.message)
              set({ isTokenValidated: true })
              
              // Show user they're working offline but still logged in
              if (typeof window !== 'undefined' && window.showToast) {
                window.showToast('Working offline - you\'re still logged in', 'info')
              }
            }
          } else {
            // All non-401 errors (network, 500, timeout) - keep logged in
            console.warn('⚠️ Network/server issue - keeping user logged in')
            set({ isTokenValidated: true })
          }
        }

        // Handle refresh token result (best-effort, don't fail on this)
        if (refreshRes.status === 'fulfilled') {
          const newToken = refreshRes.value.data?.data?.token
          if (newToken) {
            localStorage.setItem('token', newToken)
            set({ token: newToken })
          }
        }
      } catch (error) {
        // Unexpected error — keep session alive
        console.warn('⚠️ Auth init error — using cached session', error.message)
        set({ isTokenValidated: true })
      }
    } else {
      set({ isInitialized: true, isTokenValidated: false })
    }
  },

  fetchProfile: async () => {
    try {
      const { data } = await authAPI.getProfile()
      set({ user: data.data.user }) // Backend returns { success, data: { user } }
      return data.data.user
    } catch (error) {
      set({ error: error.response?.data?.error?.message || 'Failed to fetch profile' })
      throw error
    }
  },

  updateProfile: async (updates) => {
    set({ loading: true, error: null })
    try {
      const { data } = await authAPI.updateProfile(updates)
      const updatedUser = data.data.user
      localStorage.setItem('user', JSON.stringify(updatedUser))
      set({ user: updatedUser, loading: false })
      return updatedUser
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message || 'Failed to update profile'
      set({ error: msg, loading: false })
      throw error
    }
  },
}))
