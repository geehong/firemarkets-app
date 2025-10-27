"""
Posts 권한 관리 서비스
"""
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.asset import User
import logging

logger = logging.getLogger(__name__)


class PostsService:
    """Posts 권한 관리 서비스 클래스"""
    
    def check_post_permission(
        self, 
        post_id: int, 
        user: User, 
        action: str,  # 'read', 'write', 'delete'
        db: Session
    ) -> bool:
        """포스트 권한 확인 (post_type별 권한 적용)"""
        try:
            # 포스트 정보 조회
            result = db.execute(text('''
                SELECT author_id, permissions, visibility, status, post_type
                FROM posts 
                WHERE id = :post_id
            '''), {'post_id': post_id})
            
            post = result.fetchone()
            if not post:
                return False
            
            author_id, permissions, visibility, status, post_type = post
            
            # 1. 관리자 권한 확인 (모든 post_type에서 관리자는 모든 권한)
            if user.role in ['admin', 'super_admin']:
                return True
            
            # 2. post_type별 기본 권한 체크
            if post_type in ['assets', 'onchain', 'page']:
                # assets, onchain, page는 관리자만 접근 가능
                return False
            
            # 3. post 타입의 경우 상세 권한 체크
            if post_type == 'post':
                # 작성자 확인
                if author_id and author_id == user.id:
                    return True
                
                # 공개 포스트 읽기 권한
                if action == 'read' and visibility == 'public' and status == 'published':
                    return True
                
                # 권한 설정 확인
                if permissions and isinstance(permissions, dict):
                    if action in permissions:
                        action_permissions = permissions[action]
                        if isinstance(action_permissions, dict):
                            # 역할 기반 권한
                            if 'roles' in action_permissions:
                                if user.role in action_permissions['roles']:
                                    return True
                            # 사용자 기반 권한
                            if 'users' in action_permissions:
                                if user.id in action_permissions['users']:
                                    return True
            
            # 4. 기존 권한 구조 확인 (하위 호환성)
            if permissions and isinstance(permissions, dict):
                if 'owner' in permissions:
                    owner_permissions = permissions['owner']
                    if action in owner_permissions and author_id == user.id:
                        return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to check post permission: {e}")
            return False
    
    def get_user_posts(
        self, 
        user: User, 
        db: Session, 
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """사용자가 접근 가능한 포스트 목록 조회"""
        try:
            # 기본 쿼리
            query = '''
                SELECT id, title, slug, description, author_id, status, 
                       visibility, created_at, updated_at, published_at, view_count
                FROM posts 
                WHERE 1=1
            '''
            params = {}
            
            # 작성자별 필터링
            if user.role not in ['admin', 'super_admin']:
                query += ' AND (author_id = :user_id OR (visibility = \'public\' AND status = \'published\'))'
                params['user_id'] = user.id
            
            # 상태별 필터링
            if status:
                query += ' AND status = :status'
                params['status'] = status
            
            # 정렬 및 제한
            query += ' ORDER BY created_at DESC LIMIT :limit OFFSET :offset'
            params['limit'] = limit
            params['offset'] = offset
            
            result = db.execute(text(query), params)
            posts = result.fetchall()
            
            return [
                {
                    "id": post[0],
                    "title": post[1],
                    "slug": post[2],
                    "description": post[3],
                    "author_id": post[4],
                    "status": post[5],
                    "visibility": post[6],
                    "created_at": post[7].isoformat() if post[7] else None,
                    "updated_at": post[8].isoformat() if post[8] else None,
                    "published_at": post[9].isoformat() if post[9] else None,
                    "view_count": post[10],
                    "can_edit": self.check_post_permission(post[0], user, 'write', db),
                    "can_delete": self.check_post_permission(post[0], user, 'delete', db)
                }
                for post in posts
            ]
            
        except Exception as e:
            logger.error(f"Failed to get user posts: {e}")
            return []
    
    def update_post_permissions(
        self, 
        post_id: int, 
        permissions: Dict[str, Any], 
        db: Session
    ) -> bool:
        """포스트 권한 업데이트"""
        try:
            db.execute(text('''
                UPDATE posts 
                SET permissions = :permissions, updated_at = NOW()
                WHERE id = :post_id
            '''), {
                'post_id': post_id,
                'permissions': permissions
            })
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Failed to update post permissions: {e}")
            db.rollback()
            return False
    
    def set_default_permissions(
        self, 
        post_id: int, 
        author_id: int, 
        db: Session
    ) -> bool:
        """포스트 기본 권한 설정 (작성자만 수정 가능)"""
        default_permissions = {
            "read": {
                "roles": ["user", "admin", "super_admin"],
                "access_level": "public"
            },
            "write": {
                "roles": ["admin", "super_admin"],
                "users": [author_id],
                "access_level": "author_only"
            },
            "delete": {
                "roles": ["admin", "super_admin"],
                "users": [author_id],
                "access_level": "author_only"
            }
        }
        
        return self.update_post_permissions(post_id, default_permissions, db)
    
    def can_user_edit_post(self, post_id: int, user: User, db: Session) -> bool:
        """사용자가 포스트를 수정할 수 있는지 확인"""
        return self.check_post_permission(post_id, user, 'write', db)
    
    def can_user_delete_post(self, post_id: int, user: User, db: Session) -> bool:
        """사용자가 포스트를 삭제할 수 있는지 확인"""
        return self.check_post_permission(post_id, user, 'delete', db)


# 전역 인스턴스
posts_service = PostsService()
