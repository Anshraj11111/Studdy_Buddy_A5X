import axios from "axios";

const API_BASE_URL =
import.meta.env.VITE_API_URL ||
"https://studdy-buddy-backend-a5x.onrender.com";

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
register: (data) => api.post("/api/auth/register", data),
login: (data) => api.post("/api/auth/login", data),
getProfile: () => api.get("/api/auth/profile"),
updateProfile: (data) => api.put("/api/auth/profile", data),
};

/* ---------------- DOUBTS ---------------- */

export const doubtAPI = {
create: (data) => api.post("/api/doubts", data),

list: (page = 1, limit = 10) =>
api.get(`/api/doubts?page=${page}&limit=${limit}`),

getById: (id) => api.get(`/api/doubts/${id}`),

search: (query) =>
api.get(`/api/doubts/search?keyword=${query}`),

getByTopic: (topic, page = 1) =>
api.get(`/api/doubts/topic/${topic}?page=${page}`),

delete: (id) => api.delete(`/api/doubts/${id}`),

update: (id, data) => api.put(`/api/doubts/${id}`, data),

findMatch: (id) =>
api.post(`/api/doubts/${id}/find-match`),

addReply: (id, data) =>
api.post(`/api/doubts/${id}/replies`, data),

editReply: (id, replyId, data) =>
api.put(`/api/doubts/${id}/replies/${replyId}`, data),

deleteReply: (id, replyId) =>
api.delete(`/api/doubts/${id}/replies/${replyId}`),
};

/* ---------------- RESOURCES ---------------- */

export const resourceAPI = {
create: (data) => api.post("/api/resources", data),

list: (page = 1, limit = 10) =>
api.get(`/api/resources?page=${page}&limit=${limit}`),

getById: (id) => api.get(`/api/resources/${id}`),

search: (query) =>
api.get(`/api/resources/search?q=${query}`),

getByTopic: (topic, page = 1) =>
api.get(`/api/resources/topic/${topic}?page=${page}`),

download: (id) =>
api.post(`/api/resources/${id}/download`),

delete: (id) =>
api.delete(`/api/resources/${id}`),
};

/* ---------------- COMMUNITIES ---------------- */

export const communityAPI = {
create: (data) =>
api.post("/api/communities", data),

list: (page = 1, limit = 10) =>
api.get(`/api/communities?page=${page}&limit=${limit}`),

getById: (id) =>
api.get(`/api/communities/${id}`),

join: (id) =>
api.post(`/api/communities/${id}/join`),

leave: (id) =>
api.post(`/api/communities/${id}/leave`),

createPost: (id, data) =>
api.post(`/api/communities/${id}/posts`, data),

getPosts: (id, page = 1) =>
api.get(`/api/communities/${id}/posts?page=${page}`),
};

/* ---------------- MENTOR ---------------- */

export const mentorAPI = {
request: (data) =>
api.post("/api/mentor/request", data),

getPending: () =>
api.get("/api/mentor/requests/pending"),

getMyRequests: () =>
api.get("/api/mentor/requests"),

accept: (id) =>
api.put(`/api/mentor/requests/${id}/accept`),

reject: (id) =>
api.put(`/api/mentor/requests/${id}/reject`),

complete: (id) =>
api.put(`/api/mentor/requests/${id}/complete`),
};

/* ---------------- ROOMS ---------------- */

export const roomAPI = {
list: () => api.get("/api/rooms"),

getById: (id) =>
api.get(`/api/rooms/${id}`),
};

export default api;
