from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class GoogleOAuthRequest(BaseModel):
    credential: str  # Google GSI에서 받은 ID 토큰

class XOAuthRequest(BaseModel):
    code: str  # OAuth 2.0 authorization code
    redirect_uri: str  # 프론트엔드 콜백 URI
    code_verifier: Optional[str] = None  # PKCE code verifier

class UserSchema(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    permissions: Optional[Dict[str, Any]] = None
    avatar_url: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

class UserSessionResponse(BaseModel):
    session_id: str
    user: UserSchema
    expires_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
