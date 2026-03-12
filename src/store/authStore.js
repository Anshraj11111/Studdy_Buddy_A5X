import { create } from 'zustand'
import { authAPI } from '../services/api'

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,
  isInitialized: false,

  register: async (email, password, name, role) => {
    set({ loading: true, error: null })
    try {
      const response = await authAPI.register({ email, password, name, role })
      const { token, user } = response.data.data // Backend returns { success, data: { user, token } }
      localStorage.setItem('token', token)
      set({ user, token, loading: false, error: null })
      return response.data.data
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Registration failed'
      set({ error: errorMessage, loading: false })
      throw new Error(errorMessage)
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const response = await authAPI.login({ email, password })
      const { token, user } = response.data.data // Backend returns { success, data: { user, token } }
      localStorage.setItem('token', token)
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
    if (token) {
      set({ token })
      // Try to fetch profile to validate token
      try {
        const { data } = await authAPI.getProfile()
        set({ user: data.data.user, isInitialized: true }) // Backend returns { success, data: { user } }
      } catch (error) {
        // Token is invalid, clear it
        localStorage.removeItem('token')
        set({ token: null, user: null, isInitialized: true })
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
