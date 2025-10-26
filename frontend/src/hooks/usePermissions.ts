"use client";

import { useSession } from '@/contexts/SessionContext';

interface ResourcePermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canManage: boolean;
  isOwner: boolean;
}

export const usePermissions = (resourceType: string, resourceId?: number, resource?: any) => {
  const { state, checkPermission, checkRole } = useSession();
  
  if (!state.user) {
    return {
      canRead: false,
      canWrite: false,
      canDelete: false,
      canManage: false,
      isOwner: false
    };
  }

  // 관리자는 모든 권한
  if (checkRole('admin')) {
    return {
      canRead: true,
      canWrite: true,
      canDelete: true,
      canManage: true,
      isOwner: true
    };
  }

  // 리소스별 권한 확인
  const checkResourcePermissions = (): ResourcePermissions => {
    if (!resource) {
      return {
        canRead: false,
        canWrite: false,
        canDelete: false,
        canManage: false,
        isOwner: false
      };
    }

    const isOwner = resource.author_id === state.user?.id || 
                   resource.owner_id === state.user?.id;
    
    const canRead = isOwner || 
                   resource.visibility === 'public' ||
                   (resource.permissions?.shared_users?.includes(state.user?.id));
    
    const canWrite = isOwner || 
                    checkPermission('write') ||
                    (resource.permissions?.shared_users?.includes(state.user?.id) && 
                     resource.permissions?.permissions?.includes('write'));
    
    const canDelete = isOwner || checkPermission('delete');
    
    const canManage = isOwner || checkPermission('manage');

    return {
      canRead,
      canWrite,
      canDelete,
      canManage,
      isOwner
    };
  };

  return checkResourcePermissions();
};

export const useMenuPermissions = (menu: any) => {
  const { state, checkRole } = useSession();
  
  if (!state.user || !menu) {
    return false;
  }

  // 관리자는 모든 메뉴 접근 가능
  if (checkRole('admin')) {
    return true;
  }

  const metadata = menu.menu_metadata || {};
  const permissions = metadata.permissions || [];
  const ownerId = metadata.owner_id;
  const visibility = metadata.visibility || 'private';

  // 소유자 확인
  if (ownerId === state.user.id) {
    return true;
  }

  // 공개 메뉴
  if (visibility === 'public') {
    return true;
  }

  // 역할 기반 권한
  if (permissions.includes(state.user.role)) {
    return true;
  }

  // 공유 권한
  const sharedUsers = metadata.shared_with || [];
  if (sharedUsers.includes(state.user.id)) {
    return true;
  }

  return false;
};
