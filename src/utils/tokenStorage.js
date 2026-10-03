/**
 * Robust token storage for mobile and web apps
 * Uses multiple storage methods to prevent logout issues
 */

// Storage keys
const TOKEN_KEY = 'studdy_buddy_token'
const USER_KEY = 'studdy_buddy_user'
const BACKUP_TOKEN_KEY = 'sb_token_backup'
const BACKUP_USER_KEY = 'sb_user_backup'

export const tokenStorage = {
  /**
   * Store token with multiple fallbacks
   */
  setToken: (token) => {
    if (!token) return
    
    try {
      // Primary storage
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem('token', token) // Legacy key for compatibility
      
      // Backup storage
      sessionStorage.setItem(TOKEN_KEY, token)
      sessionStorage.setItem(BACKUP_TOKEN_KEY, token)
      
      // Additional mobile-friendly storage
      if (typeof window !== 'undefined' && window.indexedDB) {
        // Store in IndexedDB for maximum persistence (doesn't get cleared easily)
        tokenStorage.setIndexedDBItem('token', token)
      }
      
      console.log('[TOKEN STORAGE] Token saved to multiple locations')
    } catch (error) {
      console.error('[TOKEN STORAGE] Failed to save token:', error)
    }
  },

  /**
   * Get token from any available storage
   */
  getToken: () => {
    try {
      // Try primary storage first
      let token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token')
      
      if (!token) {
        // Try backup storage
        token = sessionStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(BACKUP_TOKEN_KEY)
      }
      
      if (!token) {
        // Try legacy storage
        token = localStorage.getItem('token')
      }
      
      if (token) {
        console.log('[TOKEN STORAGE] Token found in storage')
        // If found in backup, restore to primary
        if (!localStorage.getItem(TOKEN_KEY)) {
          localStorage.setItem(TOKEN_KEY, token)
          localStorage.setItem('token', token)
        }
      } else {
        console.log('[TOKEN STORAGE] No token found in any storage')
      }
      
      return token
    } catch (error) {
      console.error('[TOKEN STORAGE] Failed to get token:', error)
      return null
    }
  },

  /**
   * Store user data with multiple fallbacks
   */
  setUser: (user) => {
    if (!user) return
    
    try {
      const userJSON = JSON.stringify(user)
      
      // Primary storage
      localStorage.setItem(USER_KEY, userJSON)
      localStorage.setItem('user', userJSON) // Legacy key
      
      // Backup storage
      sessionStorage.setItem(USER_KEY, userJSON)
      sessionStorage.setItem(BACKUP_USER_KEY, userJSON)
      
      console.log('[TOKEN STORAGE] User data saved to multiple locations')
    } catch (error) {
      console.error('[TOKEN STORAGE] Failed to save user:', error)
    }
  },

  /**
   * Get user data from any available storage
   */
  getUser: () => {
    try {
      // Try primary storage first
      let userJSON = localStorage.getItem(USER_KEY) || localStorage.getItem('user')
      
      if (!userJSON) {
        // Try backup storage
        userJSON = sessionStorage.getItem(USER_KEY) || sessionStorage.getItem(BACKUP_USER_KEY)
      }
      
      if (userJSON) {
        // If found in backup, restore to primary
        if (!localStorage.getItem(USER_KEY)) {
          localStorage.setItem(USER_KEY, userJSON)
          localStorage.setItem('user', userJSON)
        }
        return JSON.parse(userJSON)
      }
      
      return null
    } catch (error) {
      console.error('[TOKEN STORAGE] Failed to get user:', error)
      return null
    }
  },

  /**
   * Clear all token data
   */
  clear: () => {
    try {
      // Clear primary storage
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // Clear backup storage
      sessionStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(USER_KEY)
      sessionStorage.removeItem(BACKUP_TOKEN_KEY)
      sessionStorage.removeItem(BACKUP_USER_KEY)
      
      console.log('[TOKEN STORAGE] All token data cleared')
    } catch (error) {
      console.error('[TOKEN STORAGE] Failed to clear storage:', error)
    }
  },

  /**
   * IndexedDB storage for maximum persistence (experimental)
   */
  setIndexedDBItem: async (key, value) => {
    if (typeof window === 'undefined' || !window.indexedDB) return
    
    try {
      const dbName = 'StuddyBuddyDB'
      const storeName = 'tokens'
      
      const request = indexedDB.open(dbName, 1)
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName)
        }
      }
      
      request.onsuccess = (event) => {
        const db = event.target.result
        const transaction = db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)
        store.put(value, key)
      }
    } catch (error) {
      // Silently fail - IndexedDB is experimental
      console.debug('[TOKEN STORAGE] IndexedDB not available:', error.message)
    }
  },

  /**
   * Check if user should stay logged in (for debugging)
   */
  shouldStayLoggedIn: () => {
    const token = tokenStorage.getToken()
    const user = tokenStorage.getUser()
    
    return {
      hasToken: !!token,
      hasUser: !!user,
      shouldStayLoggedIn: !!(token && user),
      debug: {
        tokenLength: token?.length || 0,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || 'Unknown'
      }
    }
  }
}

export default tokenStorage