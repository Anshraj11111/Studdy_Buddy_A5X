import { create } from 'zustand'
import { authAPI } from '../services/api'

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,
  isInitialized: false,

  register: async (email, password, name, role, mentorCode, skills = []) => {
    set({ loading: true, error: null })
    try {
      const response = await authAPI.register({ email, password, name, role, mentorCode, skills })
      const { token, user } = response.data.data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      set({ user, token, loading: false, error: null })
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
      const { token, user } = response.data.data // Backend returns { success, data: { user, token } }
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      set({ user, token, loading: false, error: null })
      return response.data.data
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Login failed'
      set({ error: errorMessage, loading: false })
      throw new Error(errorMessage)
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },

  // Initialize auth state from localStorage
  initAuth: async () => {
    const token = localStorage.getItem('token')
    const cachedUser = localStorage.getItem('user')

    if (token) {
      // Immediately unblock the UI using cached user data
      const parsedUser = cachedUser ? JSON.parse(cachedUser) : null
      set({ token, user: parsedUser, isInitialized: true })

      // Silently validate token + refresh user data in background
      try {
        const { data } = await authAPI.getProfile()
        const freshUser = data.data.user
        localStorage.setItem('user', JSON.stringify(freshUser))
        set({ user: freshUser })
      } catch {
        // Token expired or invalid — log out silently
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        set({ token: null, user: null })
      }
    } else {
      set({ isInitialized: true })
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
    try {
      const { data } = await authAPI.updateProfile(updates)
      set({ user: data.data.user }) // Backend returns { success, data: { user } }
      return data.data.user
    } catch (error) {
      set({ error: error.response?.data?.error?.message || 'Failed to update profile' })
      throw error
    }
  },
}))
