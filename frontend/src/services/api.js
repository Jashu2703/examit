import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const register = d => api.post('/auth/register', d);
export const login    = d => api.post('/auth/login', d);
export const getMe    = () => api.get('/auth/me');

// Syllabus
export const listExams      = ()       => api.get('/syllabus/exams');
export const getSubjects    = exam     => api.get(`/syllabus/${exam}/subjects`);
export const getChapters    = (e, s)   => api.get(`/syllabus/${e}/${s}/chapters`);

// Tests
export const startTest   = d          => api.post('/tests/start', d);
export const submitTest  = d          => api.post('/tests/submit', d);
export const getSession  = id         => api.get(`/tests/${id}`);
export const getResult   = sessionId  => api.get(`/tests/${sessionId}/result`);

// Dashboard
export const getDashboard = ()        => api.get('/dashboard/stats');
export const getHistory   = ()        => api.get('/dashboard/history');

// Leaderboard
export const getLeaderboard = (exam, period = 'all') =>
  api.get(`/leaderboard/${exam}?period=${period}`);

export default api;
