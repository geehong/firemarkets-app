"""
DB Migration: Add OAuth fields to users table
Run: python -m migrations.add_oauth_fields
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import text
from app.core.database import engine

def migrate():
    """users 테이블에 OAuth 관련 컬럼 추가"""
    with engine.connect() as conn:
        # 1. oauth_provider 컬럼 추가
        try:
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20) DEFAULT NULL
            """))
            print("✅ Added oauth_provider column")
        except Exception as e:
            print(f"⚠️ oauth_provider: {e}")
        
        # 2. oauth_id 컬럼 추가
        try:
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255) DEFAULT NULL
            """))
            print("✅ Added oauth_id column")
        except Exception as e:
            print(f"⚠️ oauth_id: {e}")
        
        # 3. password_hash를 nullable로 변경
        try:
            conn.execute(text("""
                ALTER TABLE users 
                ALTER COLUMN password_hash DROP NOT NULL
            """))
            print("✅ Made password_hash nullable")
        except Exception as e:
            print(f"⚠️ password_hash: {e}")
        
        # 4. oauth_id에 unique 인덱스 추가
        try:
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS ix_users_oauth_id 
                ON users (oauth_id) WHERE oauth_id IS NOT NULL
            """))
            print("✅ Added unique index on oauth_id")
        except Exception as e:
            print(f"⚠️ oauth_id index: {e}")
        
        # 5. oauth_provider에 인덱스 추가
        try:
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_users_oauth_provider 
                ON users (oauth_provider) WHERE oauth_provider IS NOT NULL
            """))
            print("✅ Added index on oauth_provider")
        except Exception as e:
            print(f"⚠️ oauth_provider index: {e}")
        
        conn.commit()
        print("\n🎉 Migration completed successfully!")

if __name__ == "__main__":
    migrate()
