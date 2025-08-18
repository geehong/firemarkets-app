from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, BigInteger
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    session_id = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    refresh_token_hash = Column(String(255), nullable=False)
    ip_address = Column(String(45), nullable=True)  # IPv6 지원
    user_agent = Column(Text, nullable=True)
    issued_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    is_revoked = Column(Boolean, nullable=False, default=False)

class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"
    
    id = Column(BigInteger, primary_key=True, index=True)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    actor_id = Column(Integer, nullable=True, index=True)  # 관리자가 다른 유저를 조작했을 때
    event_type = Column(String(100), nullable=False, index=True)  # 'login.success', 'login.failed', 'token.revoke' 등
    event_data = Column(JSON, nullable=True)  # JSON 형태로 저장
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True) 