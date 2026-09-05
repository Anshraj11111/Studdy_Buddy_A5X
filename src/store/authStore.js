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
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      set({ user, token, loading: false, error: null, isTokenValidated: true })
      return response.data.data
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Registration failed'
      set({ error: errorMessage, loading: false })
      throw new Error(errorMessage)
    }
  },

  login: async (email, password, role, mentorCode) => {
    set({ loading: true, error: null })
    try {
      const response = await authAPI.login({ email, password, role, mentorCode })
      const data = response.data?.data || response.data
      const token = data?.token
      const user = data?.user
      if (!token || !user) throw new Error('Invalid response from server')
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
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
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      set({ user, token, loading: false, error: null, isTokenValidated: true })
      return data
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Google login failed'
      set({ error: errorMessage, loading: false })
      throw new Error(errorMessage)
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null, isTokenValidated: false })
  },

  // Initialize auth state from localStorage
  initAuth: async () => {
    const token = localStorage.getItem('token')
    const cachedUser = localStorage.getItem('user')

    if (token) {
      // Immediately unblock the UI using cached user data
      const parsedUser = cachedUser ? JSON.parse(cachedUser) : null
      set({ token, user: parsedUser, isInitialized: true, isTokenValidated: false })

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
          localStorage.setItem('user', JSON.stringify(freshUser))
          set({ user: freshUser, isTokenValidated: true })
        } else {
          const error = profileRes.reason
          const errorCode = error.response?.data?.error?.code
          const status = error.response?.status

          // ONLY logout on confirmed invalid/expired token
          if (status === 401 && (errorCode === 'TOKEN_EXPIRED' || errorCode === 'INVALID_TOKEN' || errorCode === 'USER_NOT_FOUND')) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            set({ token: null, user: null, isTokenValidated: false })
            if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
              window.location.href = '/login'
            }
            return
          } else {
            // Network error / cold start — keep user logged in with cached data
            console.warn('⚠️ Could not validate token (network issue) — using cached session')
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
