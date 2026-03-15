import { create } from 'zustand'
import api from '../services/api'

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetch: async () => {
    try {
      const res = await api.get('/notifications')
      set({
        notifications: res.data.data.notifications,
        unreadCount: res.data.data.unreadCount,
      })
    } catch { /* ignore */ }
  },

  addNew: (notif) => {
    set(s => ({
      notifications: [notif, ...s.notifications].slice(0, 30),
      unreadCount: s.unreadCount + 1,
    }))
  },

  markAllRead: async () => {
    try {
      await api.put('/notifications/read-all')
      set(s => ({
        notifications: s.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      }))
    } catch { /* ignore */ }
  },
}))
