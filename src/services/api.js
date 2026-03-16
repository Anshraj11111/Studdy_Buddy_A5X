import axios from "axios";

// Always use the correct backend URL with /api
const BASE = "https://studdy-buddy-backend-a5x.onrender.com";
const envUrl = import.meta.env.VITE_API_URL;

// Keep-alive ping every 14 minutes to prevent Render cold starts
const pingBackend = () => fetch(`${BASE}/health`).catch(() => {});
pingBackend(); // ping immediately on app load
setInterval(pingBackend, 14 * 60 * 1000);

// Simple in-memory cache for GET requests (30s TTL)
const cache = new Map();
const CACHE_TTL = 30 * 1000;
const getCached = (key) => {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
};
const setCache = (key, data) => cache.set(key, { data, ts: Date.now() });
export const clearCache = () => cache.clear();

// Ensure URL always ends with /api
const API_BASE_URL = (() => {
  const url = envUrl || `${BASE}/api`;
  // If env var was set without /api, add it
  if (url.endsWith('/api')) return url;
  if (url.endsWith('/')) return url + 'api';
  return url + '/api';
})();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000, // 60s — handles Render cold start (~30-50s)
});

// Attach JWT token
api.interceptors.request.use((config) => {
const token = localStorage.getItem("token");

if (token) {
config.headers.Authorization = `Bearer ${token}`;
}

// Check cache for GET requests
if (config.method === 'get') {
  const cacheKey = config.url + JSON.stringify(config.params || {});
  const cached = getCached(cacheKey);
  if (cached) {
    config.adapter = () => Promise.resolve({ data: cached, status: 200, statusText: 'OK', headers: {}, config });
  }
}

return config;
});

// Global error handler
api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (response.config.method === 'get' && response.status === 200) {
      const cacheKey = response.config.url + JSON.stringify(response.config.params || {});
      setCache(cacheKey, response.data);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      
      if (currentPath !== "/login" && currentPath !== "/signup" && currentPath !== "/admin") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    
    return Promise.reject(error);
  }
);

/* ---------------- AUTH ---------------- */

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getProfile: () => api.get("/auth/profile"),
  updateProfile: (data) => api.put("/auth/profile", data),
};

/* ---------------- DOUBTS ---------------- */

export const doubtAPI = {
  create: (data) => api.post("/doubts", data),

  list: (page = 1, limit = 10) =>
    api.get(`/doubts?page=${page}&limit=${limit}`),

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

  list: (page = 1, limit = 10) =>
    api.get(`/resources?page=${page}&limit=${limit}`),

  getById: (id) => api.get(`/resources/${id}`),

  search: (query) =>
    api.get(`/resources/search?keyword=${encodeURIComponent(query)}`),

  getByTopic: (topic, page = 1) =>
    api.get(`/resources/topic/${topic}?page=${page}`),

  download: (id) =>
    api.post(`/resources/${id}/download`),

  delete: (id) =>
    api.delete(`/resources/${id}`),
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
};

/* ---------------- CONNECTIONS ---------------- */

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
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'StuddyAdmin@2025';
const adminHeaders = () => ({ 'x-admin-secret': ADMIN_SECRET });

export const adminAPI = {
  getStats: () => api.get('/admin/stats', { headers: adminHeaders() }),
  getUsers: (params = {}) => api.get('/admin/users', { params, headers: adminHeaders() }),
  toggleUser: (id) => api.put(`/admin/users/${id}/toggle`, {}, { headers: adminHeaders() }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`, { headers: adminHeaders() }),
};
