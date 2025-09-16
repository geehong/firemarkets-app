from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from app.core.security import security_manager
# from app.models.user import User
# from app.models.session import TokenBlacklist
from app.core.database import get_db
from datetime import datetime

reusable_oauth2 = HTTPBearer(auto_error=False)

async def get_current_user(
    token: str = Depends(reusable_oauth2), 
    db: Session = Depends(get_db)
):
    """현재 인증된 사용자 가져오기"""
    if not token or not token.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Auth token required"
        )

    payload = security_manager.verify_access_token(token.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid token"
        )

    # 1. 블랙리스트(무효화) 체크 - 임시로 비활성화
    # token_hash = security_manager.hash_token(token.credentials)
    # if db.query(TokenBlacklist).filter(TokenBlacklist.token_hash == token_hash).first():
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED, 
    #         detail="Token revoked"
    #     )

    # user = db.query(User).filter(User.id == payload.get("user_id")).first()
    # 임시로 하드코딩된 사용자 객체 반환
    class MockUser:
        def __init__(self):
            self.id = 1
            self.username = "geehong"
            self.role = "super_admin"
            self.is_active = True
            self.deleted_at = None
            self.locked_until = None
            self.permissions = {
                "users.create": True,
                "users.read": True,
                "users.update": True,
                "users.delete": True,
                "reports.view": True,
                "reports.export": True,
                "system.config": True,
                "system.delete": True,
                "admin.dashboard": True,
                "onchain.metrics": True,
                "scheduler.manage": True,
                "ticker.manage": True
            }
    
    user = MockUser()
    if not user or not user.is_active or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="User inactive"
        )

    # 2. 계정 잠금 상태 체크
    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED, 
            detail="Account locked"
        )

    return user

async def get_current_admin_user(
    current_user = Depends(get_current_user)
):
    """관리자 권한을 가진 사용자만 접근 허용"""
    if current_user.role not in ('admin', 'super_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Admin role required"
        )
    return current_user

def require_permission(permission: str):
    """특정 권한이 필요한 엔드포인트용 의존성"""
    async def permission_checker(current_user = Depends(get_current_admin_user)):
        if current_user.role == 'super_admin':  # super_admin은 모든 권한 통과
            return current_user
        
        perms = current_user.permissions or {}
        if not perms.get(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"Permission '{permission}' required"
            )
        return current_user
    return permission_checker

def require_any_permission(permissions: list):
    """주어진 권한 중 하나라도 필요한 엔드포인트용 의존성"""
    async def permission_checker(current_user = Depends(get_current_admin_user)):
        if current_user.role == 'super_admin':
            return current_user
        
        perms = current_user.permissions or {}
        if not any(perms.get(perm, False) for perm in permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"One of permissions {permissions} required"
            )
        return current_user
    return permission_checker 