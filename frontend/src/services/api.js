import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ── Emergencies ───────────────────────────────────────
export const emergencyAPI = {
  create: (data) => api.post('/emergencies', data),
  getAll: (params) => api.get('/emergencies', { params }),
  getActive: () => api.get('/emergencies/active'),
  getById: (id) => api.get(`/emergencies/${id}`),
  updateStatus: (id, data) => api.put(`/emergencies/${id}/status`, data),
};

// ── Ambulances ────────────────────────────────────────
export const ambulanceAPI = {
  getAll: (params) => api.get('/ambulances', { params }),
  getById: (id) => api.get(`/ambulances/${id}`),
  getMine: () => api.get('/ambulances/driver/me'),
  getNearby: (params) => api.get('/ambulances/nearby', { params }),
  create: (data) => api.post('/ambulances', data),
  updateLocation: (id, data) => api.put(`/ambulances/${id}/location`, data),
  updateStatus: (id, data) => api.put(`/ambulances/${id}/status`, data),
};

// ── Hospitals ─────────────────────────────────────────
export const hospitalAPI = {
  getAll: () => api.get('/hospitals'),
  getById: (id) => api.get(`/hospitals/${id}`),
  getMine: () => api.get('/hospitals/me'),
  getNearest: (params) => api.get('/hospitals/nearest', { params }),
  create: (data) => api.post('/hospitals', data),
  update: (id, data) => api.put(`/hospitals/${id}`, data),
  getIncoming: (id) => api.get(`/hospitals/${id}/incoming`),
};

// ── Admin ─────────────────────────────────────────────
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  toggleUser: (id) => api.put(`/admin/users/${id}/toggle`),
  getReport: (params) => api.get('/admin/reports/emergencies', { params }),
};

// ── Notifications ─────────────────────────────────────
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export default api;
