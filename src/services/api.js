import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://studdy-buddy-backend-a5x.onrender.com/api";

const api = axios.create({
baseURL: API_BASE_URL,
headers: {
"Content-Type": "application/json",
},
});

// Attach JWT token
api.interceptors.request.use((config) => {
const token = localStorage.getItem("token");

if (token) {
config.headers.Authorization = `Bearer ${token}`;
}

return config;
});

// Global error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      
      if (currentPath !== "/login" && currentPath !== "/signup") {
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
    api.get(`/resources/search?q=${query}`),

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

/* ---------------- MENTOR ---------------- */

export const mentorAPI = {
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
};

export default api;
