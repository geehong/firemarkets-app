from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.user import User
import json

class PermissionChecker:
    @staticmethod
    def has_permission(user: User, permission: str) -> bool:
        """사용자가 특정 권한을 가지고 있는지 확인"""
        # super_admin은 모든 권한 허용
        if user.role == 'super_admin':
            return True
        
        # 일반 사용자는 permissions JSON에서 확인
        permissions = user.permissions or {}
        
        # MySQL JSON에서 값 추출
        if isinstance(permissions, str):
            permissions = json.loads(permissions)
        
        return permissions.get(permission, False)
    
    @staticmethod
    def has_any_permission(user: User, permissions: list) -> bool:
        """사용자가 주어진 권한 중 하나라도 가지고 있는지 확인"""
        if user.role == 'super_admin':
            return True
        
        user_perms = user.permissions or {}
        if isinstance(user_perms, str):
            user_perms = json.loads(user_perms)
        
        return any(user_perms.get(perm, False) for perm in permissions)
    
    @staticmethod
    def has_all_permissions(user: User, permissions: list) -> bool:
        """사용자가 주어진 모든 권한을 가지고 있는지 확인"""
        if user.role == 'super_admin':
            return True
        
        user_perms = user.permissions or {}
        if isinstance(user_perms, str):
            user_perms = json.loads(user_perms)
        
        return all(user_perms.get(perm, False) for perm in permissions)

# 사용 예시
def check_user_permission(user: User, permission: str) -> bool:
    return PermissionChecker.has_permission(user, permission) 