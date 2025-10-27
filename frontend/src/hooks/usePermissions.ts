import { useAuth } from './useAuthNew';

export const usePermissions = () => {
  const { user, isAdmin } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (isAdmin) return true; // 관리자는 모든 권한을 가짐
    return user.permissions?.[permission] || false;
  };

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false;
    if (isAdmin) return true; // 관리자는 모든 역할을 가짐
    
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    
    return permissions.some(permission => user.permissions?.[permission] || false);
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    
    return permissions.every(permission => user.permissions?.[permission] || false);
  };

  return {
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    user
  };
};