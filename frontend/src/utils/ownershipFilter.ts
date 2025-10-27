// 소유권 기반 필터링 유틸리티

export interface OwnershipFilter {
  userId: number;
  userRole: string;
  userPermissions: string[];
}

export interface BlogPost {
  id: number;
  author_id?: number;
  post_type?: string;
  permissions?: {
    read?: string[];
    write?: string[];
    delete?: string[];
  };
}

/**
 * 사용자가 접근 가능한 블로그 포스트를 필터링합니다.
 * 
 * @param posts - 필터링할 포스트 배열
 * @param filter - 사용자 정보와 권한
 * @returns 접근 가능한 포스트 배열
 */
export function filterAccessibleBlogs(posts: BlogPost[], filter: OwnershipFilter): BlogPost[] {
  return posts.filter(post => {
    // 관리자나 슈퍼 관리자는 모든 포스트에 접근 가능
    if (filter.userRole === 'admin' || filter.userRole === 'super_admin') {
      return true;
    }

    // 일반 사용자는 자신이 작성한 포스트만 접근 가능
    if (post.author_id === filter.userId) {
      return true;
    }

    // post_type이 'post'인 경우 공개 읽기 가능
    if (post.post_type === 'post') {
      return true;
    }

    // post_type이 'assets', 'onchain', 'page'인 경우 관리자만 접근 가능
    if (['assets', 'onchain', 'page'].includes(post.post_type || '')) {
      return false;
    }

    // 권한 기반 접근 제어 (permissions 필드가 있는 경우)
    if (post.permissions) {
      // 읽기 권한 확인
      if (post.permissions.read) {
        const hasReadPermission = post.permissions.read.some(permission => 
          filter.userPermissions.includes(permission) || 
          filter.userRole === 'admin' || 
          filter.userRole === 'super_admin'
        );
        if (!hasReadPermission) {
          return false;
        }
      }
    }

    return false;
  });
}

/**
 * 사용자가 포스트를 수정할 수 있는지 확인합니다.
 * 
 * @param post - 확인할 포스트
 * @param filter - 사용자 정보와 권한
 * @returns 수정 가능 여부
 */
export function canEditPost(post: BlogPost, filter: OwnershipFilter): boolean {
  // 관리자나 슈퍼 관리자는 모든 포스트 수정 가능
  if (filter.userRole === 'admin' || filter.userRole === 'super_admin') {
    return true;
  }

  // 일반 사용자는 자신이 작성한 포스트만 수정 가능
  if (post.author_id === filter.userId) {
    return true;
  }

  // 권한 기반 수정 권한 확인
  if (post.permissions?.write) {
    return post.permissions.write.some(permission => 
      filter.userPermissions.includes(permission) || 
      filter.userRole === 'admin' || 
      filter.userRole === 'super_admin'
    );
  }

  return false;
}

/**
 * 사용자가 포스트를 삭제할 수 있는지 확인합니다.
 * 
 * @param post - 확인할 포스트
 * @param filter - 사용자 정보와 권한
 * @returns 삭제 가능 여부
 */
export function canDeletePost(post: BlogPost, filter: OwnershipFilter): boolean {
  // 관리자나 슈퍼 관리자는 모든 포스트 삭제 가능
  if (filter.userRole === 'admin' || filter.userRole === 'super_admin') {
    return true;
  }

  // 일반 사용자는 자신이 작성한 포스트만 삭제 가능
  if (post.author_id === filter.userId) {
    return true;
  }

  // 권한 기반 삭제 권한 확인
  if (post.permissions?.delete) {
    return post.permissions.delete.some(permission => 
      filter.userPermissions.includes(permission) || 
      filter.userRole === 'admin' || 
      filter.userRole === 'super_admin'
    );
  }

  return false;
}