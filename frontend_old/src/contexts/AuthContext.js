import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        // 토큰이 있으면 백엔드에서 검증
        try {
          const userData = await authService.verifyToken(token);
          setUser(userData);
          setAccessToken(token);
          // 사용자 정보 업데이트
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
          // 토큰이 유효하지 않으면 refresh 시도
          const refreshSuccess = await refreshAccessToken();
          if (!refreshSuccess) {
            // refresh도 실패하면 로그아웃
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            setUser(null);
            setAccessToken(null);
          }
        }
      } else if (token) {
        // 토큰만 있고 사용자 정보가 없으면 검증 시도
        try {
          const userData = await authService.verifyToken(token);
          setUser(userData);
          setAccessToken(token);
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
          localStorage.removeItem('accessToken');
          setUser(null);
          setAccessToken(null);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await authService.adminLogin(username, password);
      if (response.success) {
        setUser(response.user);
        setAccessToken(response.access_token);
        localStorage.setItem('accessToken', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    }
  };

  const refreshAccessToken = async () => {
    try {
      const response = await authService.refreshToken();
      if (response.success) {
        setAccessToken(response.access_token);
        localStorage.setItem('accessToken', response.access_token);
        return true;
      }
      return false;
    } catch (error) {
      logout();
      return false;
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const hasPermission = (permission) => user?.permissions?.[permission] || false;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      accessToken,
      isAdmin,
      hasPermission,
      login,
      logout,
      refreshAccessToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 