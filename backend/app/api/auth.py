from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Cookie
import logging
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from app.dependencies.auth_deps import get_current_user
from app.models.asset import User, TokenBlacklist, AuditLog
from app.core.security import security_manager
from app.core.database import get_postgres_db
from app.services.session_service import session_service
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

@router.post("/login")
async def user_login(
    credentials: LoginSchema,
    request: Request,
    db: Session = Depends(get_postgres_db)
):
    """일반 사용자 로그인 - 세션 관리 통합"""
    try:
        user = authenticate_admin_user(credentials.username, credentials.password, db, request)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # 사용자 활성 상태 확인
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive"
            )

        # IP 주소와 User-Agent 추출
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        # 세션 생성 (세션 서비스 사용)
        session_data = session_service.create_session(
            db=db,
            user=user,
            ip_address=ip_address,
            user_agent=user_agent
        )

        # 응답 바디
        body = {
            "access_token": session_data["access_token"],
            "refresh_token": session_data["refresh_token"],
            "token_type": "bearer",
            "session_id": session_data["session_id"],
            "expires_at": session_data["expires_at"],
            "user": session_data["user"]
        }

        # 쿠키 설정
        response_obj = Response(content=json.dumps(body), media_type="application/json")
        response_obj.set_cookie(
            key="refresh_token",
            value=session_data["refresh_token"],
            httponly=True,
            secure=True,  # HTTPS에서만
            samesite="strict",
            max_age=7 * 24 * 60 * 60  # 7일
        )
        return response_obj
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"/auth/login failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/admin/login")
async def admin_login(
    credentials: LoginSchema,
    request: Request,
    db: Session = Depends(get_postgres_db)
):
    """관리자 로그인 - 세션 관리 통합"""
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

        # IP 주소와 User-Agent 추출
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        # 세션 생성 (세션 서비스 사용)
        session_data = session_service.create_session(
            db=db,
            user=user,
            ip_address=ip_address,
            user_agent=user_agent
        )

        # 응답 바디
        body = {
            "access_token": session_data["access_token"],
            "refresh_token": session_data["refresh_token"],
            "token_type": "bearer",
            "session_id": session_data["session_id"],
            "expires_at": session_data["expires_at"],
            "user": session_data["user"]
        }

        # 쿠키 설정
        response_obj = Response(content=json.dumps(body), media_type="application/json")
        response_obj.set_cookie(
            key="refresh_token",
            value=session_data["refresh_token"],
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
    db: Session = Depends(get_postgres_db)
):
    """관리자 로그아웃 - 세션 관리 통합"""
    try:
        # 현재 토큰을 블랙리스트에 추가
        token = get_current_token(request)
        
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
        
        # 현재 세션 무효화 (토큰에서 세션 ID 추출)
        try:
            payload = security_manager.verify_access_token(token) if token else None
            if payload and payload.get("session_id"):
                session_service.revoke_session(db, payload["session_id"], current_user.id)
        except Exception as e:
            logger.warning(f"Failed to revoke session: {e}")
        
        # 쿠키에서 refresh token 제거
        response.delete_cookie("refresh_token")
        
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        logger.error(f"Logout failed: {e}")
        raise HTTPException(status_code=500, detail="Logout failed")

@router.post("/admin/refresh")
async def refresh_token(
    refresh_token: str = Cookie(None),
    db: Session = Depends(get_postgres_db)
):
    """Refresh token을 사용하여 새로운 access token 발급 - 세션 관리 통합"""
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required"
        )
    
    # 세션 서비스를 통한 토큰 갱신
    result = session_service.refresh_access_token(db, refresh_token)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    return result


# 세션 관리 API 추가
@router.get("/sessions")
async def get_user_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_postgres_db)
):
    """사용자의 활성 세션 목록 조회"""
    try:
        sessions = session_service.get_user_sessions(db, current_user.id)
        return {"sessions": sessions}
    except Exception as e:
        logger.error(f"Failed to get user sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to get sessions")


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_postgres_db)
):
    """특정 세션 무효화"""
    try:
        success = session_service.revoke_session(db, session_id, current_user.id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or already revoked"
            )
        return {"message": "Session revoked successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to revoke session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to revoke session")


@router.delete("/sessions")
async def revoke_all_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_postgres_db)
):
    """사용자의 모든 세션 무효화"""
    try:
        revoked_count = session_service.revoke_all_user_sessions(db, current_user.id)
        return {"message": f"Revoked {revoked_count} sessions"}
    except Exception as e:
        logger.error(f"Failed to revoke all sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to revoke sessions")


@router.post("/sessions/cleanup")
async def cleanup_expired_sessions(
    db: Session = Depends(get_postgres_db)
):
    """만료된 세션 정리 (관리자용)"""
    try:
        cleaned_count = session_service.cleanup_expired_sessions(db)
        return {"message": f"Cleaned up {cleaned_count} expired sessions"}
    except Exception as e:
        logger.error(f"Failed to cleanup expired sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to cleanup sessions") 