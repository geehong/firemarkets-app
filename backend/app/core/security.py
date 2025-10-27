from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import hashlib
import os

class SecurityManager:
    def __init__(self):
        self.SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
        self.ALGORITHM = "HS256"
        self.ACCESS_TOKEN_EXPIRE_MINUTES = 15
        self.REFRESH_TOKEN_EXPIRE_DAYS = 7
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """비밀번호 검증"""
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """비밀번호 해싱"""
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.hash(password)
    
    def create_access_token(self, data: dict) -> str:
        """Access Token 생성"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, self.SECRET_KEY, algorithm=self.ALGORITHM)
    
    def create_refresh_token(self, data: dict) -> str:
        """Refresh Token 생성"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=self.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        return jwt.encode(to_encode, self.SECRET_KEY, algorithm=self.ALGORITHM)
    
    def verify_token(self, token: str) -> Optional[dict]:
        """토큰 검증"""
        try:
            payload = jwt.decode(token, self.SECRET_KEY, algorithms=[self.ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.exceptions.DecodeError:
            return None
    
    def hash_token(self, token: str) -> str:
        """토큰을 해시하여 블랙리스트에 저장"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    def verify_access_token(self, token: str) -> Optional[dict]:
        """Access Token 전용 검증"""
        payload = self.verify_token(token)
        if payload and payload.get("type") == "access":
            return payload
        return None
    
    def verify_refresh_token(self, token: str) -> Optional[dict]:
        """Refresh Token 전용 검증"""
        payload = self.verify_token(token)
        if payload and payload.get("type") == "refresh":
            return payload
        return None

# 전역 인스턴스
security_manager = SecurityManager()

