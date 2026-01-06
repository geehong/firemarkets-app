from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.security import security_manager
from app.models.asset import User, TokenBlacklist
from app.core.database import get_postgres_db
from app.services.session_service import session_service
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

reusable_oauth2 = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(reusable_oauth2), 
    db: Session = Depends(get_postgres_db)
):
    """현재 인증된 사용자 가져오기"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Auth token required"
        )

    token = credentials.credentials
    payload = security_manager.verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid token"
        )

    # 1. 블랙리스트(무효화) 체크
    token_hash = security_manager.hash_token(token)
    if db.query(TokenBlacklist).filter(TokenBlacklist.token_hash == token_hash).first():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Token revoked"
        )

    # 2. 실제 사용자 조회
    user_id = payload.get("user_id")
    username = payload.get("sub")
    
    user = None
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
    elif username:
        user = db.query(User).filter(User.username == username).first()
        
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Ensure user_id is set for session validation
    user_id = user.id
    
    # 3. 사용자 활성 상태 확인
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive"
        )
    
    # 4. 계정 잠금 확인
    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is locked"
        )
    
    # 5. 세션 유효성 확인 (세션 ID가 있는 경우)
    session_id = payload.get("session_id")
    if session_id:
        session = session_service.validate_session(db, session_id)
        if not session or session.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid session"
            )
    
    return user


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(reusable_oauth2), 
    db: Session = Depends(get_postgres_db)
):
    """선택적 사용자 인증 (토큰이 없어도 None 반환)"""
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        payload = security_manager.verify_access_token(token)
        if not payload:
            return None

        # 1. 블랙리스트(무효화) 체크
        token_hash = security_manager.hash_token(token)
        if db.query(TokenBlacklist).filter(TokenBlacklist.token_hash == token_hash).first():
            return None

        # 2. 실제 사용자 조회
        user_id = payload.get("user_id")
        username = payload.get("sub")
        
        user = None
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
        elif username:
            user = db.query(User).filter(User.username == username).first()
        if not user or not user.is_active:
            return None
        
        # Ensure user_id is set for session validation
        user_id = user.id
        
        # 3. 계정 잠금 확인
        if user.locked_until and user.locked_until > datetime.utcnow():
            return None
        
        # 4. 세션 유효성 확인 (세션 ID가 있는 경우)
        session_id = payload.get("session_id")
        if session_id:
            session = session_service.validate_session(db, session_id)
            if not session or session.user_id != user_id:
                return None
        
        return user
        
    except Exception as e:
        logger.warning(f"Optional user authentication failed: {e}")
        return None


# export 함수들
__all__ = ["get_current_user", "get_current_user_optional"]