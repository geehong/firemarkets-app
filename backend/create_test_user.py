#!/usr/bin/env python3
"""
테스트용 사용자 생성 스크립트
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import get_postgres_db
from app.models.asset import User
from app.core.security import security_manager
from datetime import datetime

def create_test_user():
    """테스트용 관리자 사용자 생성"""
    db = next(get_postgres_db())
    
    try:
        # 기존 사용자 확인
        existing_user = db.query(User).filter(User.username == "admin").first()
        if existing_user:
            print(f"User 'admin' already exists with ID: {existing_user.id}")
            return existing_user
        
        # 새 사용자 생성
        password_hash = security_manager.get_password_hash("admin123")
        
        user = User(
            username="admin",
            email="admin@firemarkets.net",
            password_hash=password_hash,
            role="super_admin",
            permissions={
                "users.create": True,
                "users.read": True,
                "users.update": True,
                "users.delete": True,
                "reports.view": True,
                "reports.export": True,
                "system.config": True,
                "system.delete": True,
                "admin.dashboard": True,
                "onchain.metrics": True,
                "scheduler.manage": True,
                "ticker.manage": True
            },
            is_active=True,
            full_name="Administrator",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"Test user created successfully:")
        print(f"  Username: {user.username}")
        print(f"  Password: admin123")
        print(f"  Role: {user.role}")
        print(f"  ID: {user.id}")
        
        return user
        
    except Exception as e:
        print(f"Error creating test user: {e}")
        db.rollback()
        return None
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()










