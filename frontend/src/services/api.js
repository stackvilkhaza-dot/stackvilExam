import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.MODE === 'production' ? '/_/backend/api' : 'https://zestfully-amusement-corrosive.ngrok-free.dev/api',
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
