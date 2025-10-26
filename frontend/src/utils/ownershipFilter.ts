// 소유권 기반 필터링 유틸리티

export interface OwnershipFilter {
  userId: number;
  userRole: string;
  userPermissions: string[];
}

export interface BlogResource {
  id: number;
  author_id: number;
  visibility: string;
  permissions: {
    owner: string[];
    shared_users: number[];
    roles: string[];
  };
}

export interface MenuResource {
  id: number;
  menu_metadata: {
    owner_id: number;
    owner_type: string;
    visibility: string;
    permissions: string[];
    shared_with: number[];
  };
}

// 블로그 포스트 필터링
export const filterAccessibleBlogs = (
  blogs: BlogResource[], 
  filter: OwnershipFilter
): BlogResource[] => {
  return blogs.filter(blog => {
    // 관리자는 모든 블로그 접근 가능
    if (filter.userRole === 'admin') {
      return true;
    }

    // 소유자 확인
    if (blog.author_id === filter.userId) {
      return true;
    }

    // 공개 블로그
    if (blog.visibility === 'public') {
      return true;
    }

    // 공유된 블로그
    if (blog.permissions?.shared_users?.includes(filter.userId)) {
      return true;
    }

    // 역할 기반 권한
    if (blog.permissions?.roles?.includes(filter.userRole)) {
      return true;
    }

    return false;
  });
};

// 메뉴 필터링
export const filterAccessibleMenus = (
  menus: MenuResource[], 
  filter: OwnershipFilter
): MenuResource[] => {
  return menus.filter(menu => {
    const metadata = menu.menu_metadata;
    
    // 관리자는 모든 메뉴 접근 가능
    if (filter.userRole === 'admin') {
      return true;
    }

    // 소유자 확인
    if (metadata.owner_id === filter.userId) {
      return true;
    }

    // 공개 메뉴
    if (metadata.visibility === 'public') {
      return true;
    }

    // 역할 기반 권한
    if (metadata.permissions?.includes(filter.userRole)) {
      return true;
    }

    // 공유된 메뉴
    if (metadata.shared_with?.includes(filter.userId)) {
      return true;
    }

    return false;
  });
};

// 권한 확인
export const checkResourcePermission = (
  resource: BlogResource | MenuResource,
  filter: OwnershipFilter,
  action: 'read' | 'write' | 'delete' | 'manage'
): boolean => {
  // 관리자는 모든 권한
  if (filter.userRole === 'admin') {
    return true;
  }

  // 소유자 권한 확인
  const isOwner = 'author_id' in resource 
    ? resource.author_id === filter.userId
    : (resource as MenuResource).menu_metadata.owner_id === filter.userId;

  if (isOwner) {
    return true;
  }

  // 공개 리소스 읽기 권한
  if (action === 'read') {
    const visibility = 'visibility' in resource 
      ? resource.visibility 
      : (resource as MenuResource).menu_metadata.visibility;
    
    if (visibility === 'public') {
      return true;
    }
  }

  // 공유 권한 확인
  if ('permissions' in resource && resource.permissions) {
    const sharedUsers = resource.permissions.shared_users || [];
    if (sharedUsers.includes(filter.userId)) {
      // 공유 권한에 따른 액션 제한
      const sharedPermissions = resource.permissions.owner || [];
      return sharedPermissions.includes(action);
    }
  }

  return false;
};

// 사용자별 리소스 그룹화
export const groupResourcesByOwnership = (
  resources: (BlogResource | MenuResource)[],
  filter: OwnershipFilter
) => {
  const owned = resources.filter(resource => {
    const isOwner = 'author_id' in resource 
      ? resource.author_id === filter.userId
      : resource.menu_metadata.owner_id === filter.userId;
    return isOwner;
  });

  const shared = resources.filter(resource => {
    const isOwner = 'author_id' in resource 
      ? resource.author_id === filter.userId
      : resource.menu_metadata.owner_id === filter.userId;
    
    if (isOwner) return false;

    if ('permissions' in resource && resource.permissions) {
      return resource.permissions.shared_users?.includes(filter.userId);
    }
    
    return (resource as MenuResource).menu_metadata.shared_with?.includes(filter.userId);
  });

  const public_resources = resources.filter(resource => {
    const isOwner = 'author_id' in resource 
      ? resource.author_id === filter.userId
      : (resource as MenuResource).menu_metadata.owner_id === filter.userId;
    
    if (isOwner) return false;

    const visibility = 'visibility' in resource 
      ? resource.visibility 
      : (resource as MenuResource).menu_metadata.visibility;
    
    return visibility === 'public';
  });

  return {
    owned,
    shared,
    public: public_resources,
    total: resources.length
  };
};
