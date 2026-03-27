from datetime import timedelta, datetime
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import uuid
import httpx

from app.core.database import get_postgres_db
from app.core.security import security_manager
from app.core.config import GOOGLE_OAUTH_CLIENT_ID
from app.models.asset import User, UserSession
from app.schemas.auth import Token, LoginRequest, UserSchema, GoogleOAuthRequest, XOAuthRequest

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_postgres_db)) -> User:
    payload = security_manager.verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")
        
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _create_session_and_tokens(user: User, request: Request, db: Session) -> dict:
    """세션 생성 및 JWT 토큰 발급 헬퍼"""
    session_id = str(uuid.uuid4())
    refresh_token_data = {"sub": user.username, "session_id": session_id, "type": "refresh"}
    refresh_token = security_manager.create_refresh_token(refresh_token_data)
    
    access_token_data = {"sub": user.username, "session_id": session_id, "type": "access", "role": user.role}
    access_token = security_manager.create_access_token(access_token_data)
    
    user_session = UserSession(
        user_id=user.id,
        session_id=session_id,
        refresh_token_hash=security_manager.hash_token(refresh_token),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        expires_at=datetime.utcnow() + timedelta(days=security_manager.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(user_session)
    
    user.last_login = datetime.utcnow()
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


def _find_or_create_oauth_user(
    db: Session,
    oauth_provider: str,
    oauth_id: str,
    email: str,
    full_name: str = None,
    avatar_url: str = None,
) -> User:
    """OAuth 사용자 검색 또는 자동 생성"""
    # 1. oauth_id로 기존 사용자 검색
    user = db.query(User).filter(User.oauth_id == oauth_id).first()
    if user:
        # 프로필 정보 업데이트
        if avatar_url and user.avatar_url != avatar_url:
            user.avatar_url = avatar_url
        if full_name and user.full_name != full_name:
            user.full_name = full_name
        return user
    
    # 2. 이메일로 기존 사용자 검색 (계정 연동)
    if email:
        user = db.query(User).filter(User.email == email).first()
        if user:
            # 기존 계정에 OAuth 정보 연동
            user.oauth_provider = oauth_provider
            user.oauth_id = oauth_id
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
            return user
    
    # 3. 신규 사용자 생성
    # username 생성 (이메일 앞부분 또는 provider_id)
    base_username = email.split("@")[0] if email else f"{oauth_provider}_{oauth_id[:8]}"
    username = base_username
    counter = 1
    while db.query(User).filter(User.username == username).first():
        username = f"{base_username}_{counter}"
        counter += 1
    
    new_user = User(
        username=username,
        email=email or f"{oauth_provider}_{oauth_id}@oauth.local",
        password_hash=None,  # OAuth 유저는 비밀번호 없음
        oauth_provider=oauth_provider,
        oauth_id=oauth_id,
        role="user",
        permissions={"read": True, "write": False},
        is_active=True,
        full_name=full_name,
        avatar_url=avatar_url,
    )
    db.add(new_user)
    db.flush()  # ID 할당을 위해 flush
    return new_user


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_postgres_db)
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user:
        # Fallback to email login
        user = db.query(User).filter(User.email == login_data.username).first()
    
    if not user or not user.password_hash or not security_manager.verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Incorrect email/username or password"
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    return _create_session_and_tokens(user, request, db)


@router.post("/oauth/google", response_model=Token)
async def google_oauth_login(
    request: Request,
    oauth_data: GoogleOAuthRequest,
    db: Session = Depends(get_postgres_db)
) -> Any:
    """Google OAuth 로그인/회원가입"""
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        
        # Google ID 토큰 검증
        idinfo = id_token.verify_oauth2_token(
            oauth_data.credential,
            google_requests.Request(),
            GOOGLE_OAUTH_CLIENT_ID
        )
        
        google_id = idinfo["sub"]
        email = idinfo.get("email", "")
        full_name = idinfo.get("name", "")
        avatar_url = idinfo.get("picture", "")
        
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google verification failed: {str(e)}")
    
    # 사용자 검색 또는 생성
    user = _find_or_create_oauth_user(
        db=db,
        oauth_provider="google",
        oauth_id=f"google_{google_id}",
        email=email,
        full_name=full_name,
        avatar_url=avatar_url,
    )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    return _create_session_and_tokens(user, request, db)


@router.post("/oauth/x", response_model=Token)
async def x_oauth_login(
    request: Request,
    oauth_data: XOAuthRequest,
    db: Session = Depends(get_postgres_db)
) -> Any:
    """X(Twitter) OAuth 2.0 로그인/회원가입"""
    import os
    
    x_client_id = os.getenv("X_OAUTH_CLIENT_ID", "")
    x_client_secret = os.getenv("X_OAUTH_CLIENT_SECRET", "")
    
    if not x_client_id:
        raise HTTPException(status_code=500, detail="X OAuth not configured")
    
    try:
        # 1. Authorization code → Access token 교환
        async with httpx.AsyncClient() as client:
            token_data = {
                "code": oauth_data.code,
                "grant_type": "authorization_code",
                "redirect_uri": oauth_data.redirect_uri,
                "client_id": x_client_id,
            }
            
            if oauth_data.code_verifier:
                token_data["code_verifier"] = oauth_data.code_verifier
            
            headers = {"Content-Type": "application/x-www-form-urlencoded"}
            
            # Basic auth if secret is available
            auth = None
            if x_client_secret:
                auth = httpx.BasicAuth(x_client_id, x_client_secret)
            
            token_response = await client.post(
                "https://api.x.com/2/oauth2/token",
                data=token_data,
                headers=headers,
                auth=auth,
            )
            
            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=401,
                    detail=f"X token exchange failed: {token_response.text}"
                )
            
            x_tokens = token_response.json()
            x_access_token = x_tokens.get("access_token")
            
            # 2. 사용자 정보 조회
            user_response = await client.get(
                "https://api.x.com/2/users/me",
                params={"user.fields": "id,name,username,profile_image_url"},
                headers={"Authorization": f"Bearer {x_access_token}"},
            )
            
            if user_response.status_code != 200:
                raise HTTPException(
                    status_code=401,
                    detail=f"X user info failed: {user_response.text}"
                )
            
            x_user_data = user_response.json().get("data", {})
            x_id = x_user_data.get("id", "")
            x_name = x_user_data.get("name", "")
            x_username = x_user_data.get("username", "")
            x_avatar = x_user_data.get("profile_image_url", "")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"X OAuth failed: {str(e)}")
    
    # 사용자 검색 또는 생성
    user = _find_or_create_oauth_user(
        db=db,
        oauth_provider="x",
        oauth_id=f"x_{x_id}",
        email="",  # X는 이메일 미제공
        full_name=x_name or x_username,
        avatar_url=x_avatar,
    )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    return _create_session_and_tokens(user, request, db)


@router.post("/refresh", response_model=Token)
def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_postgres_db)
) -> Any:
    """
    Refresh access token
    """
    payload = security_manager.verify_refresh_token(refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    username = payload.get("sub")
    session_id = payload.get("session_id")
    
    # Validate session in DB
    session = db.query(UserSession).filter(UserSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=401, detail="Session not found")
        
    if session.is_revoked:
        raise HTTPException(status_code=401, detail="Session revoked")
        
    if session.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Session expired")

    # Verify token hash matches (optional security measure if we store the token hash)
    if session.refresh_token_hash != security_manager.hash_token(refresh_token):
         raise HTTPException(status_code=401, detail="Token mismatch")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Generate new access token
    access_token_data = {"sub": user.username, "session_id": session_id, "type": "access", "role": user.role}
    access_token = security_manager.create_access_token(access_token_data)
    
    # Update last used
    session.last_used_at = datetime.utcnow()
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserSchema)
def read_users_me(
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get current user
    """
    return current_user

@router.post("/logout")
def logout(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_postgres_db)
) -> Any:
    """
    Logout - revoke session
    """
    payload = security_manager.verify_token(token)
    if payload:
        session_id = payload.get("session_id")
        if session_id:
            session = db.query(UserSession).filter(UserSession.session_id == session_id).first()
            if session:
                session.is_revoked = True
                db.commit()
    
    return {"message": "Successfully logged out"}

