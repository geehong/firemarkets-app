#!/usr/bin/env python3
"""
Posts 테이블에 asset_type_id, post_info 컬럼 추가 스크립트
"""

import os
import sys
import asyncio
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# 데이터베이스 연결 설정
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://geehong:password@localhost:5432/markets")

def get_database_connection():
    """데이터베이스 연결 생성"""
    engine = create_engine(DATABASE_URL)
    return engine

def add_columns_to_posts():
    """Posts 테이블에 asset_type_id, post_info 컬럼 추가"""
    engine = get_database_connection()
    
    try:
        with engine.connect() as conn:
            # 트랜잭션 시작
            trans = conn.begin()
            
            try:
                print("🔧 Posts 테이블에 컬럼 추가 중...")
                
                # 1. asset_type_id 컬럼 추가
                print("  - asset_type_id 컬럼 추가...")
                conn.execute(text("""
                    ALTER TABLE posts 
                    ADD COLUMN IF NOT EXISTS asset_type_id INTEGER;
                """))
                
                # 2. post_info JSONB 컬럼 추가
                print("  - post_info JSONB 컬럼 추가...")
                conn.execute(text("""
                    ALTER TABLE posts 
                    ADD COLUMN IF NOT EXISTS post_info JSONB;
                """))
                
                # 3. 인덱스 생성
                print("  - 인덱스 생성...")
                
                # asset_type_id 인덱스
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_posts_asset_type_id 
                    ON posts(asset_type_id);
                """))
                
                # post_info GIN 인덱스 (JSONB 검색 최적화)
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_posts_post_info 
                    ON posts USING GIN(post_info);
                """))
                
                # 4. 외래 키 제약조건 추가 (선택사항)
                print("  - 외래 키 제약조건 추가...")
                try:
                    conn.execute(text("""
                        ALTER TABLE posts 
                        ADD CONSTRAINT fk_posts_asset_type_id 
                        FOREIGN KEY (asset_type_id) REFERENCES asset_types(id);
                    """))
                    print("    ✅ asset_type_id 외래 키 제약조건 추가됨")
                except Exception as e:
                    print(f"    ⚠️ asset_type_id 외래 키 제약조건 추가 실패: {e}")
                
                # 트랜잭션 커밋
                trans.commit()
                print("✅ Posts 테이블 컬럼 추가 완료!")
                
            except Exception as e:
                # 트랜잭션 롤백
                trans.rollback()
                print(f"❌ 오류 발생: {e}")
                raise
                
    except Exception as e:
        print(f"❌ 데이터베이스 연결 오류: {e}")
        raise

def verify_columns():
    """추가된 컬럼 확인"""
    engine = get_database_connection()
    
    try:
        with engine.connect() as conn:
            print("\n🔍 추가된 컬럼 확인...")
            
            # 컬럼 정보 조회
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'posts' 
                AND column_name IN ('asset_type_id', 'post_info')
                ORDER BY column_name;
            """))
            
            columns = result.fetchall()
            
            if columns:
                print("✅ 추가된 컬럼:")
                for col in columns:
                    print(f"  - {col[0]}: {col[1]} (nullable: {col[2]}, default: {col[3]})")
            else:
                print("❌ 컬럼이 추가되지 않았습니다.")
                
            # 인덱스 정보 조회
            print("\n🔍 생성된 인덱스 확인...")
            result = conn.execute(text("""
                SELECT indexname, indexdef
                FROM pg_indexes 
                WHERE tablename = 'posts' 
                AND indexname IN ('idx_posts_asset_type_id', 'idx_posts_post_info')
                ORDER BY indexname;
            """))
            
            indexes = result.fetchall()
            
            if indexes:
                print("✅ 생성된 인덱스:")
                for idx in indexes:
                    print(f"  - {idx[0]}")
            else:
                print("❌ 인덱스가 생성되지 않았습니다.")
                
    except Exception as e:
        print(f"❌ 컬럼 확인 오류: {e}")

def main():
    """메인 함수"""
    print("🚀 Posts 테이블 컬럼 추가 스크립트 시작")
    print("=" * 50)
    
    try:
        # 1. 컬럼 추가
        add_columns_to_posts()
        
        # 2. 결과 확인
        verify_columns()
        
        print("\n" + "=" * 50)
        print("✅ 스크립트 실행 완료!")
        
    except Exception as e:
        print(f"\n❌ 스크립트 실행 실패: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
