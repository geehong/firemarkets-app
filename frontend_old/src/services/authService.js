import axios from 'axios';

// 프로덕션에서는 동일 도메인 프록시(/api) 사용 -> CORS 회피
// 개발에서는 VITE_API_URL 설정 시 해당 값 사용
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

axios.defaults.withCredentials = true;

// Axios 인터셉터 설정
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async adminLogin(username, password) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/admin/login`, {
        username,
        password
      }, { withCredentials: true });
      
      return {
        success: true,
        access_token: response.data.access_token,
        user: response.data.user
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.detail || 'Login failed'
      };
    }
  },

  async verifyToken(token) {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw new Error('Invalid token');
    }
  },

  async logout() {
    try {
      await axios.post(`${API_BASE_URL}/auth/admin/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  async refreshToken() {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/admin/refresh`, {}, { withCredentials: true });
      return {
        success: true,
        access_token: response.data.access_token
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.detail || 'Token refresh failed'
      };
    }
  }
}; 