import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 
           (import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api` : 'http://localhost:5000/api'),
});

// Add a request interceptor to add JWT to admin routes
api.interceptors.request.use(
  (config) => {
    // Bypass ngrok browser warning
    config.headers['ngrok-skip-browser-warning'] = 'true';
    
    const adminInfo = localStorage.getItem('adminInfo');
    if (adminInfo) {
      const { token } = JSON.parse(adminInfo);
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
