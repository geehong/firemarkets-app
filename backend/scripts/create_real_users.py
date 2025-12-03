#!/usr/bin/env python3
"""
실제 사용자 생성 스크립트
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import get_postgres_db
from app.models.asset import User
from app.core.security import security_manager
from datetime import datetime

def create_real_users():
    """실제 사용자들 생성"""
    db = next(get_postgres_db())
    
    
    try:
        # 기존 admin 사용자 삭제
        admin_user = db.query(User).filter(User.username == "admin").first()
        if admin_user:
            db.delete(admin_user)
            print("기존 admin 사용자 삭제됨")
        
        # geehong 사용자는 이미 존재하므로 건너뜀
        geehong_user = db.query(User).filter(User.username == "geehong").first()
        if geehong_user:
            print("geehong 사용자는 이미 존재함 (건너뜀)")
        else:
            print("geehong 사용자가 없습니다!")
        
        # 2. 일반 사용자 생성 (testuser)
        testuser_password_hash = security_manager.get_password_hash("test123")
        
        testuser = User(
            username="testuser",
            email="testuser@firemarkets.net",
            password_hash=testuser_password_hash,
            role="user",
            permissions={
                "reports.view": True,
                "reports.export": False,
                "system.config": False,
                "system.delete": False,
                "admin.dashboard": False,
                "onchain.metrics": False,
                "scheduler.manage": False,
                "ticker.manage": False
            },
            is_active=True,
            full_name="Test User",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(testuser)
        print("testuser 사용자 생성됨")
        
        # 3. 일반 관리자 생성 (manager)
        manager_password_hash = security_manager.get_password_hash("manager123")
        
        manager = User(
            username="manager",
            email="manager@firemarkets.net",
            password_hash=manager_password_hash,
            role="admin",
            permissions={
                "users.create": False,
                "users.read": True,
                "users.update": False,
                "users.delete": False,
                "reports.view": True,
                "reports.export": True,
                "system.config": False,
                "system.delete": False,
                "admin.dashboard": True,
                "onchain.metrics": True,
                "scheduler.manage": False,
                "ticker.manage": False
            },
            is_active=True,
            full_name="Manager",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(manager)
        print("manager 사용자 생성됨")
        
        db.commit()
        
        print("\n=== 사용자 목록 ===")
        print("1. geehong (super_admin) - 기존 사용자")
        print("   - Username: geehong")
        print("   - Password: Power@6100 (기존 설정)")
        print("   - Role: super_admin")
        print("   - Permissions: 모든 권한")
        
        print("\n2. manager (admin) - 새로 생성")
        print("   - Username: manager")
        print("   - Password: manager123")
        print("   - Role: admin")
        print("   - Permissions: 제한된 관리자 권한")
        
        print("\n3. testuser (user) - 새로 생성")
        print("   - Username: testuser")
        print("   - Password: test123")
        print("   - Role: user")
        print("   - Permissions: 기본 사용자 권한")
        
        return True
        
    except Exception as e:
        print(f"Error creating users: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    create_real_users()
