import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ 
  children, 
  requireAdmin = false, 
  requirePermission = null 
}) => {
  const { user, loading, isAdmin, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    // 로그인 페이지로 리다이렉트
    window.location.href = '/admin/login';
    return null;
  }

  if (requireAdmin && !isAdmin) {
    // 권한 없음 시 로그인 페이지로 리다이렉트
    window.location.href = '/admin/login';
    return null;
  }

  if (requirePermission && !hasPermission(requirePermission)) {
    // 권한 없음 시 로그인 페이지로 리다이렉트
    window.location.href = '/admin/login';
    return null;
  }

  return children;
};

export default ProtectedRoute; 