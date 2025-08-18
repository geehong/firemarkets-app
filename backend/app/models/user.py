from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import json

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default='user')
    permissions = Column(JSON, nullable=False, default={})  # MySQL JSON 타입
    is_active = Column(Boolean, nullable=False, default=True)
    full_name = Column(String(100), nullable=True)
    phone_number = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    avatar_url = Column(String(255), nullable=True)
    login_attempts = Column(Integer, nullable=False, default=0)
    locked_until = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    
    def get_permission(self, permission: str) -> bool:
        """특정 권한 확인"""
        if self.role == 'super_admin':
            return True
        
        if isinstance(self.permissions, str):
            permissions = json.loads(self.permissions)
        else:
            permissions = self.permissions or {}
        
        return permissions.get(permission, False)
    
    def has_any_permission(self, permissions: list) -> bool:
        """주어진 권한 중 하나라도 확인"""
        if self.role == 'super_admin':
            return True
        
        if isinstance(self.permissions, str):
            user_perms = json.loads(self.permissions)
        else:
            user_perms = self.permissions or {}
        
        return any(user_perms.get(perm, False) for perm in permissions)
    
    def has_all_permissions(self, permissions: list) -> bool:
        """주어진 모든 권한 확인"""
        if self.role == 'super_admin':
            return True
        
        if isinstance(self.permissions, str):
            user_perms = json.loads(self.permissions)
        else:
            user_perms = self.permissions or {}
        
        return all(user_perms.get(perm, False) for perm in permissions) 