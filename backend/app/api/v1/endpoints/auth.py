from datetime import timedelta, datetime
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import uuid

from app.core.database import get_postgres_db
from app.core.security import security_manager
from app.models.asset import User, UserSession
from app.schemas.auth import Token, LoginRequest, UserSchema

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
    
    if not user or not security_manager.verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Incorrect email/username or password"
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # Create new session
    session_id = str(uuid.uuid4())
    refresh_token_data = {"sub": user.username, "session_id": session_id, "type": "refresh"}
    refresh_token = security_manager.create_refresh_token(refresh_token_data)
    
    access_token_data = {"sub": user.username, "session_id": session_id, "type": "access", "role": user.role}
    access_token = security_manager.create_access_token(access_token_data)
    
    # Save session to DB
    user_session = UserSession(
        user_id=user.id,
        session_id=session_id,
        refresh_token_hash=security_manager.hash_token(refresh_token),
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        expires_at=datetime.utcnow() + timedelta(days=security_manager.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(user_session)
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }

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
