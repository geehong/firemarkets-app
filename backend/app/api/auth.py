from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Cookie
import logging
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from app.dependencies.auth_deps import get_current_user
from app.models.asset import User, TokenBlacklist, AuditLog
from app.core.security import security_manager
from app.core.database import get_db
from datetime import datetime, timedelta
from pydantic import BaseModel
import json

router = APIRouter()
logger = logging.getLogger(__name__)

class LoginSchema(BaseModel):
    username: str
    password: str

def get_current_token(request: Request) -> str:
    """현재 요청의 Authorization 헤더에서 토큰 추출"""
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        return auth_header[7:]  # 'Bearer ' 제거
    return None

def authenticate_admin_user(username: str, password: str, db: Session, request: Request = None) -> User:
    """관리자 사용자 인증 - 현재 User 스키마에 맞춘 최소 구현"""
    user = db.query(User).filter(
        User.username == username,
        User.is_active == True
    ).first()
    if not user:
        return None
    # 계정 잠금 여부
    if getattr(user, 'locked_until', None) and user.locked_until > datetime.utcnow():
        return None
    # 비밀번호 확인 (models.User.password_hash 사용)
    if not security_manager.verify_password(password, user.password_hash):
        # 실패 카운트 증가
        try:
            user.login_attempts = int(getattr(user, 'login_attempts', 0) or 0) + 1
            # 5회 이상 실패 시 잠금 15분
            if user.login_attempts >= 5:
                user.locked_until = datetime.utcnow() + timedelta(minutes=15)
            db.commit()
        except Exception:
            db.rollback()
        return None
    # 성공 시 리셋
    try:
        user.login_attempts = 0
        user.last_login = datetime.utcnow()
        db.commit()
    except Exception:
        db.rollback()
    return user

@router.post("/admin/login")
async def admin_login(
    credentials: LoginSchema,
    request: Request,
    db: Session = Depends(get_db)
):
    """관리자 로그인"""
    try:
        user = authenticate_admin_user(credentials.username, credentials.password, db, request)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # 관리자 권한 확인 (role 사용: admin, super_admin 허용)
        if getattr(user, 'role', None) not in ('admin', 'super_admin'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )

        # 토큰 생성
        access_token = security_manager.create_access_token(
            data={"sub": user.username, "user_id": user.id, "role": user.role}
        )
        refresh_token = security_manager.create_refresh_token(
            data={"sub": user.username, "user_id": user.id}
        )

        # 응답 바디
        body = {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "permissions": getattr(user, 'permissions', [])
            }
        }

        # 쿠키 설정
        response_obj = Response(content=json.dumps(body), media_type="application/json")
        response_obj.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True,  # HTTPS에서만
            samesite="strict",
            max_age=7 * 24 * 60 * 60  # 7일
        )
        return response_obj
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"/auth/admin/login failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/verify")
async def verify_token(
    current_user: User = Depends(get_current_user)
):
    """토큰 검증 및 사용자 정보 반환"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": getattr(current_user, 'role', None),
        "permissions": getattr(current_user, 'permissions', [])
    }

@router.post("/admin/logout")
async def admin_logout(
    response: Response,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """관리자 로그아웃"""
    # 현재 토큰을 블랙리스트에 추가
    token = get_current_token(request)  # 현재 토큰 가져오기
    
    if token:
        token_hash = security_manager.hash_token(token)
        blacklisted_token = TokenBlacklist(
            token_hash=token_hash,
            user_id=current_user.id,
            expires_at=datetime.utcnow() + timedelta(days=1)
        )
        try:
            db.add(blacklisted_token)
            db.commit()
        except Exception as e:
            logger.warning(f"Failed to store token in blacklist: {e}")
    
    # 쿠키에서 refresh token 제거
    response.delete_cookie("refresh_token")
    
    # 감사 로그 기록
    try:
        audit_log = AuditLog(
            user_id=current_user.id,
            action="logout.success",
            resource_type="auth",
            resource_id=str(current_user.id),
            ip_address=request.client.host if request else None
        )
        db.add(audit_log)
        db.commit()
    except Exception:
        pass
    
    return {"message": "Successfully logged out"}

@router.post("/admin/refresh")
async def refresh_token(
    refresh_token: str = Cookie(None),
    db: Session = Depends(get_db)
):
    """Refresh token을 사용하여 새로운 access token 발급"""
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required"
        )
    
    payload = security_manager.verify_refresh_token(refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user = db.query(User).filter(User.id == payload.get("user_id")).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    new_access_token = security_manager.create_access_token(
        data={"sub": user.username, "user_id": user.id, "role": user.role}
    )
    
    return {"access_token": new_access_token, "token_type": "bearer"} 