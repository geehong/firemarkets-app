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
