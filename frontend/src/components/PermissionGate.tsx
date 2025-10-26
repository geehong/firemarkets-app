"use client";

import React from 'react';
import { useAuth } from '@/contexts/SessionContext';

interface PermissionGateProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  requiredPermission,
  requiredRole,
  fallback,
  showFallback = true
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return showFallback ? (fallback || null) : null;
  }

  // 역할 확인
  if (requiredRole && user.role !== requiredRole) {
    return showFallback ? (fallback || null) : null;
  }

  // 권한 확인
  if (requiredPermission && !user.permissions?.includes(requiredPermission)) {
    return showFallback ? (fallback || null) : null;
  }

  return <>{children}</>;
};

export default PermissionGate;
