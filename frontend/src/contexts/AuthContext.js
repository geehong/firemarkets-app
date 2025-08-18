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
      if (token) {
        const userData = await authService.verifyToken(token);
        setUser(userData);
        setAccessToken(token);
      }
    } catch (error) {
      localStorage.removeItem('accessToken');
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