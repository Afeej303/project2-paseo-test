import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getApiError = (error, fallback = 'Something went wrong') => {
  const response = error.response?.data;
  if (Array.isArray(response?.errors) && response.errors.length > 0) {
    return response.errors.map((item) => item.msg || item.message).filter(Boolean).join(' ');
  }
  return response?.message || fallback;
};

export default api;
