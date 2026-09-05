import axios from "axios";
import loadBalancer from "../config/loadBalancer.js";
import { isDevelopment, secureLog } from "../config/env.js";

// Check if we're in development or production
const isLocalDev = isDevelopment();

// Use load balancer in production, localhost in development
const API_BASE_URL = isLocalDev 
  ? (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
  : loadBalancer.getApiUrl();

// Secure logging (only in development)
secureLog('🌐 API Mode:', isLocalDev ? 'Development (localhost)' : 'Production (Load Balanced)');
secureLog('🌐 API base URL:', API_BASE_URL);

// Single keep-alive ping on startup + every 4 min to prevent Render cold starts
// Previously: 9 pings in first 45 seconds across 3 servers — now just 1 smart ping
if (!isLocalDev) {
  const servers = [
    'https://studdy-buddy-backend-a5x.onrender.com',
    'https://studdy-buddy-backend-a5x-ytip.onrender.com',
    'https://studdy-buddy-backend-a5x-2dn7.onrender.com',
  ]

  // Ping all 3 servers but stagger them — 1 per 2 seconds to avoid connection flood
  const pingAllStaggered = () => {
    servers.forEach((server, i) => {
      setTimeout(() => fetch(`${server}/ping`).catch(() => {}), i * 2000)
    })
  }

  // Single startup ping burst (staggered)
  pingAllStaggered()

  // Regular pings every 4 minutes to keep all servers warm
  setInterval(pingAllStaggered, 4 * 60 * 1000)

  console.log('🔥 Keep-alive enabled for all 3 servers (staggered)')
}

// Simple in-memory cache for GET requests (stale-while-revalidate)
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 min fresh
const CACHE_STALE_TTL = 30 * 60 * 1000; // 30 min stale (serve stale while fetching fresh)

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  const age = Date.now() - entry.ts;
  if (age < CACHE_TTL) return { data: entry.data, stale: false }; // fresh
  if (age < CACHE_STALE_TTL) return { data: entry.data, stale: true }; // stale but usable
  cache.delete(key);
  return null;
};
const setCache = (key, data) => cache.set(key, { data, ts: Date.now() });
export const clearCache = () => cache.clear();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  // Use longer timeout for production (Render cold start), shorter for local
  timeout: isLocalDev ? 15000 : 60000,
});

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Check cache for GET requests - serve stale data instantly while fetching fresh
  if (config.method === 'get') {
    const cacheKey = config.url + JSON.stringify(config.params || {});
    const cached = getCached(cacheKey);
    if (cached) {
      // Always return cached data instantly (fresh or stale)
      config.adapter = () => Promise.resolve({ data: cached.data, status: 200, statusText: 'OK (cached)', headers: {}, config });
    }
  }

  // In production, dynamically get fresh API URL for each request
  if (!isLocalDev) {
    config.baseURL = loadBalancer.getApiUrl();
  }

  return config;
});

// Global error handler with retry logic
api.interceptors.response.use(
  (response) => {
    // Mark server as successful
    if (!isLocalDev && response.config.baseURL) {
      const serverUrl = response.config.baseURL.replace('/api', '');
      loadBalancer.markServerSuccess(serverUrl);
    }

    // Cache successful GET responses
    if (response.config.method === 'get' && response.status === 200) {
      const cacheKey = response.config.url + JSON.stringify(response.config.params || {});
      setCache(cacheKey, response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Mark server as failed in production
    if (!isLocalDev && originalRequest.baseURL) {
      const serverUrl = originalRequest.baseURL.replace('/api', '');
      loadBalancer.markServerFailed(serverUrl);
    }

    // Retry logic for network errors in production
    if (!isLocalDev && !originalRequest._retry && (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || !error.response)) {
      originalRequest._retry = true;
      
      // Get a different server and retry
      originalRequest.baseURL = loadBalancer.getApiUrl();
      console.log('🔄 Retrying request with different server:', originalRequest.baseURL);
      
      return api(originalRequest);
    }

    // Handle 401 Unauthorized - but don't auto-redirect
    // Let the calling code (authStore) decide what to do
    if (error.response?.status === 401) {
      const requestUrl = originalRequest.url || '';
      
      // Only clear storage if it's clearly an invalid token (not a temporary network issue)
      const isAuthEndpoint = requestUrl.includes('/auth/');
      
      if (isAuthEndpoint) {
        // Don't force redirect here - let authStore handle it
        // This prevents race conditions during page load
        console.warn('🔒 Authentication failed for:', requestUrl);
      }
    }
    
    return Promise.reject(error);
  }
);

/* ---------------- AUTH ---------------- */

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  googleLogin: (data) => api.post("/auth/google", data),
  getProfile: () => api.get("/auth/profile"),
  updateProfile: (data) => api.put("/auth/profile", data),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (data) => api.post("/auth/reset-password", data),
  refreshToken: () => api.post("/auth/refresh-token"),
};

/* ---------------- DOUBTS ---------------- */

export const doubtAPI = {
  create: (data) => api.post("/doubts", data),

  list: (page = 1, limit = 10, topic, status, userId) => {
    const params = new URLSearchParams({ page, limit })
    if (topic) params.append('topic', topic)
    if (status) params.append('status', status)
    if (userId) params.append('userId', userId)
    return api.get(`/doubts?${params.toString()}`)
  },

  getById: (id) => api.get(`/doubts/${id}`),

  search: (query) =>
    api.get(`/doubts/search?keyword=${query}`),

  getByTopic: (topic, page = 1) =>
    api.get(`/doubts/topic/${topic}?page=${page}`),

  delete: (id) => api.delete(`/doubts/${id}`),

  update: (id, data) => api.put(`/doubts/${id}`, data),

  findMatch: (id) =>
    api.post(`/doubts/${id}/find-match`),

  addReply: (id, data) =>
    api.post(`/doubts/${id}/replies`, data),

  editReply: (id, replyId, data) =>
    api.put(`/doubts/${id}/replies/${replyId}`, data),

  deleteReply: (id, replyId) =>
    api.delete(`/doubts/${id}/replies/${replyId}`),
};

/* ---------------- RESOURCES ---------------- */

export const resourceAPI = {
  create: (data) => api.post("/resources", data),
  list: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/resources${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => api.get(`/resources/${id}`),
  search: (query) => api.get(`/resources/search?keyword=${encodeURIComponent(query)}`),
  getByTopic: (topic, page = 1) => api.get(`/resources/topic/${topic}?page=${page}`),
  download: (id) => api.post(`/resources/${id}/download`),
  getVideoToken: (id) => api.post(`/resources/${id}/token`),
  update: (id, data) => api.put(`/resources/${id}`, data),
  delete: (id) => api.delete(`/resources/${id}`),
  uploadNotes: (formData) => api.post(`/resources/upload-notes`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  clearAll: () => api.delete('/resources/clear-all'),
};

/* ---------------- PLAYLISTS ---------------- */
export const playlistAPI = {
  create: (data) => api.post('/playlists', data),
  list: (params = {}) => api.get('/playlists', { params }),
  getById: (id) => api.get(`/playlists/${id}`),
  getVideoToken: (playlistId, videoId) => api.post(`/playlists/${playlistId}/videos/${videoId}/token`),
  update: (id, data) => api.put(`/playlists/${id}`, data),
  delete: (id) => api.delete(`/playlists/${id}`),
};

/* ---------------- COMMUNITIES ---------------- */

export const communityAPI = {
  create: (data) =>
    api.post("/communities", data),

  list: (page = 1, limit = 10) =>
    api.get(`/communities?page=${page}&limit=${limit}`),

  getById: (id) =>
    api.get(`/communities/${id}`),

  join: (id) =>
    api.post(`/communities/${id}/join`),

  leave: (id) =>
    api.post(`/communities/${id}/leave`),

  createPost: (id, data) =>
    api.post(`/communities/${id}/posts`, data),

  getPosts: (id, page = 1) =>
    api.get(`/communities/${id}/posts?page=${page}`),
};

/* ---------------- FEED (Community Posts) ---------------- */

export const feedAPI = {
  getPosts: (category = 'All', page = 1, search = '') =>
    api.get(`/feed?category=${category}&page=${page}&limit=20&search=${encodeURIComponent(search)}`),
  createPost: (data) => api.post('/feed', data),
  deletePost: (id) => api.delete(`/feed/${id}`),
  likePost: (id) => api.post(`/feed/${id}/like`),
  addComment: (id, data) => api.post(`/feed/${id}/comment`, data),
  editComment: (postId, commentId, data) => api.put(`/feed/${postId}/comment/${commentId}`, data),
  deleteComment: (postId, commentId) => api.delete(`/feed/${postId}/comment/${commentId}`),
};

/* ---------------- FOLLOW / FOLLOWERS ---------------- */
export const followAPI = {
  follow: (userId) => api.post(`/follow/${userId}`),
  unfollow: (userId) => api.delete(`/follow/${userId}`),
  checkStatus: (userId) => api.get(`/follow/status/${userId}`),
  getFollowers: (userId) => api.get(`/follow/followers/${userId}`),
  getFollowing: (userId) => api.get(`/follow/following/${userId}`),
  getCounts: (userId) => api.get(`/follow/counts/${userId}`),
  getProfile: (userId) => api.get(`/follow/profile/${userId}`),
};

export const connectionAPI = {
  getUsers: (search = '', page = 1) =>
    api.get(`/connections/users?search=${encodeURIComponent(search)}&page=${page}&limit=20`),
  sendRequest: (userId) => api.post(`/connections/request/${userId}`),
  accept: (id) => api.put(`/connections/${id}/accept`),
  reject: (id) => api.put(`/connections/${id}/reject`),
  remove: (id) => api.delete(`/connections/${id}`),
  getPending: () => api.get('/connections/pending'),
  getMyConnections: () => api.get('/connections/my'),
};



export const mentorAPI = {
  getAll: () => api.get("/mentor/all"),

  request: (data) =>
    api.post("/mentor/request", data),

  getPending: () =>
    api.get("/mentor/requests/pending"),

  getMyRequests: () =>
    api.get("/mentor/requests"),

  accept: (id) =>
    api.put(`/mentor/requests/${id}/accept`),

  reject: (id) =>
    api.put(`/mentor/requests/${id}/reject`),

  complete: (id) =>
    api.put(`/mentor/requests/${id}/complete`),
};

/* ---------------- ROOMS ---------------- */

export const roomAPI = {
  list: () => api.get("/rooms"),

  getById: (id) =>
    api.get(`/rooms/${id}`),

  createDirect: (otherUserId) =>
    api.post("/rooms/direct", { otherUserId }),
};

export default api;

/* ---------------- ADMIN ---------------- */
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'H5';
const adminHeaders = () => ({ 'x-admin-secret': ADMIN_SECRET });

export const adminAPI = {
  getStats: () => api.get('/admin/stats', { headers: adminHeaders() }),
  getUsers: (params = {}) => api.get('/admin/users', { params, headers: adminHeaders() }),
  toggleUser: (id) => api.put(`/admin/users/${id}/toggle`, {}, { headers: adminHeaders() }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`, { headers: adminHeaders() }),
  
  // Course Management
  getAllCourses: (params = {}) => api.get('/admin/courses', { params, headers: adminHeaders() }),
  createCourse: (data) => api.post('/admin/courses', data, { headers: adminHeaders() }),
  updateCourse: (id, data) => api.put(`/admin/courses/${id}`, data, { headers: adminHeaders() }),
  deleteCourse: (id) => api.delete(`/admin/courses/${id}`, { headers: adminHeaders() }),
  getCourseModules: (courseId) => api.get(`/admin/courses/${courseId}/modules`, { headers: adminHeaders() }),
  
  // Module Management
  createModule: (data) => api.post(`/admin/modules`, data, { headers: adminHeaders() }),
  updateModule: (id, data) => api.put(`/admin/modules/${id}`, data, { headers: adminHeaders() }),
  deleteModule: (id) => api.delete(`/admin/modules/${id}`, { headers: adminHeaders() }),
  
  // Lecture Management
  createLecture: (data) => api.post(`/admin/lectures`, data, { headers: adminHeaders() }),
  getLecture: (id) => api.get(`/admin/lectures/${id}`, { headers: adminHeaders() }),
  updateLecture: (id, data) => api.put(`/admin/lectures/${id}`, data, { headers: adminHeaders() }),
  deleteLecture: (id) => api.delete(`/admin/lectures/${id}`, { headers: adminHeaders() }),

  // Post Moderation
  getAllPosts: (params = {}) => api.get('/admin/posts', { params, headers: adminHeaders() }),
  deletePost: (id) => api.delete(`/admin/posts/${id}`, { headers: adminHeaders() }),
};

/* ---------------- BROADCAST CHANNELS ---------------- */
export const broadcastAPI = {
  getStatus:       () => api.get('/broadcast/status'),
  joinChannel:     (data) => api.post('/broadcast/join', data),
  requestJoin:     (data) => api.post('/broadcast/request-join', data),
  leaveChannel:    (data = {}) => api.post('/broadcast/leave', data),
  getMessages:     () => api.get('/broadcast/messages'),
  deleteMessage:   (id) => api.delete(`/broadcast/messages/${id}`),
  getMembers:      (channel) => api.get(`/broadcast/members/${channel}`),
  // Admin
  getCodes:        () => api.get('/broadcast/admin/codes', { headers: { 'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || 'H5' } }),
  addCode:         (data) => api.post('/broadcast/admin/codes', data, { headers: { 'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || 'H5' } }),
  updateCode:      (data) => api.put('/broadcast/admin/codes', data, { headers: { 'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || 'H5' } }),
  deleteCode:      (id) => api.delete(`/broadcast/admin/codes/${id}`, { headers: { 'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || 'H5' } }),
  getRequests:     () => api.get('/broadcast/admin/requests', { headers: { 'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || 'H5' } }),
  acceptRequest:   (id) => api.put(`/broadcast/admin/requests/${id}/accept`, {}, { headers: { 'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || 'H5' } }),
  rejectRequest:   (id) => api.put(`/broadcast/admin/requests/${id}/reject`, {}, { headers: { 'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || 'H5' } }),
  getAllEnrollments: () => api.get('/broadcast/admin/enrollments', { headers: { 'x-admin-secret': import.meta.env.VITE_ADMIN_SECRET || 'H5' } }),
};

/* ---------------- GENERAL GROUP ---------------- */
export const generalGroupAPI = {
  join:           () => api.post('/general-group/join'),
  leave:          () => api.post('/general-group/leave'),
  getStatus:      () => api.get('/general-group/status'),
  getMessages:    (page = 1) => api.get(`/general-group/messages?page=${page}&limit=60`),
  getMembers:     () => api.get('/general-group/members'),
  deleteMessage:  (id) => api.delete(`/general-group/messages/${id}`),
};

/* ---------------- AI CHAT ---------------- */
export const aiAPI = {
  chat: (message, history = []) => api.post('/ai/chat', { message, history }),
};

/* ---------------- REWARDS / XP ---------------- */
export const rewardsAPI = {
  getMe:          () => api.get('/rewards/me'),
  getLeaderboard: () => api.get('/rewards/leaderboard'),
};


/* ---------------- PAYMENTS ---------------- */
export const paymentAPI = {
  getUpiSettings: () => api.get('/payments/upi-settings'),
  submitPayment: (data) => api.post('/payments/submit', data),
  getMyPayments: () => api.get('/payments/my-payments'),
};

/* ---------------- REFERRAL ---------------- */
export const referralAPI = {
  validate: (code) => api.get(`/referral/validate/${encodeURIComponent(code)}`),
  getMyCode: () => api.get('/referral/my-code'),
};

/* ---------------- ADMIN PAYMENTS ---------------- */
export const adminPaymentAPI = {
  getAllPayments: (params = {}) => api.get('/admin/payments', { params, headers: adminHeaders() }),
  approvePayment: (id, data = {}) => api.put(`/admin/payments/${id}/approve`, data, { headers: adminHeaders() }),
  rejectPayment: (id, data = {}) => api.put(`/admin/payments/${id}/reject`, data, { headers: adminHeaders() }),
  getUpiSettings: () => api.get('/admin/upi-settings', { headers: adminHeaders() }),
  updateUpiSettings: (data) => api.put('/admin/upi-settings', data, { headers: adminHeaders() }),
};

/* ---------------- COURSES ---------------- */
export const courseAPI = {
  // Public
  list: (params = {}) => api.get('/courses', { params }),
  getById: (id) => api.get(`/courses/${id}`),
  getModuleLectures: (moduleId) => api.get(`/courses/modules/${moduleId}/lectures`),
  
  // Protected
  getSecureVideoUrl: (lectureId) => api.get(`/courses/lectures/${lectureId}/video-url`),
  enroll: (courseId) => api.post(`/courses/${courseId}/enroll`),
  markComplete: (courseId, videoId) => api.post(`/courses/${courseId}/videos/${videoId}/complete`),
  getMyCourses: () => api.get('/courses/my/enrolled'),
};
