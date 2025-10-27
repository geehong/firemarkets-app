"use client";

import React from 'react';
import { useAuth } from '@/hooks/useAuthNew';

interface PermissionGateProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string | string[];
  fallback?: React.ReactNode;
}

const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  requiredPermission,
  requiredRole,
  fallback = null
}) => {
  const { user, isAdmin } = useAuth();

  // 사용자가 로그인하지 않은 경우
  if (!user) {
    return <>{fallback}</>;
  }

  // 역할 기반 권한 확인
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRequiredRole = roles.includes(user.role) || isAdmin;
    
    if (!hasRequiredRole) {
      return <>{fallback}</>;
    }
  }

  // 권한 기반 확인
  if (requiredPermission) {
    const hasPermission = user.permissions?.[requiredPermission] || false;
    const isAdminUser = isAdmin;
    
    if (!hasPermission && !isAdminUser) {
      return <>{fallback}</>;
    }
  }

  // 모든 조건을 만족하는 경우 children 렌더링
  return <>{children}</>;
};

export default PermissionGate;