#!/usr/bin/env python3
"""
Posts 테이블 content 스키마 업데이트
- content: JSONB -> TEXT (영문)
- content_ko: TEXT (한글)
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# 데이터베이스 URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/firemarkets")

def update_content_schema():
    """Posts 테이블 content 스키마 업데이트"""
    
    # 데이터베이스 연결
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            # 1. content_ko 컬럼이 이미 있는지 확인
            print("1. content_ko 컬럼 확인 중...")
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'posts' AND column_name = 'content_ko';
            """))
            
            has_content_ko = result.fetchone() is not None
            
            if not has_content_ko:
                print("2. content_ko 컬럼 추가 중...")
                conn.execute(text("ALTER TABLE posts ADD COLUMN content_ko TEXT;"))
                print("✅ content_ko 컬럼 추가 완료")
            else:
                print("✅ content_ko 컬럼이 이미 존재합니다")
            
            # 3. content 컬럼 타입 확인
            print("3. content 컬럼 타입 확인 중...")
            result = conn.execute(text("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'posts' AND column_name = 'content';
            """))
            
            content_type = result.fetchone()[0]
            print(f"현재 content 컬럼 타입: {content_type}")
            
            if content_type == 'jsonb':
                print("4. content 컬럼을 JSONB에서 TEXT로 변환 중...")
                
                # 1단계: content_ko에 한국어 데이터 저장
                conn.execute(text("""
                    UPDATE posts 
                    SET content_ko = content->>'ko'
                    WHERE content IS NOT NULL AND jsonb_typeof(content) = 'object';
                """))
                
                # 2단계: content에 영문 데이터 저장 (새로운 컬럼 생성)
                conn.execute(text("""
                    ALTER TABLE posts ADD COLUMN content_en TEXT;
                """))
                
                conn.execute(text("""
                    UPDATE posts 
                    SET content_en = content->>'en'
                    WHERE content IS NOT NULL AND jsonb_typeof(content) = 'object';
                """))
                
                # 3단계: 기존 content 컬럼 삭제하고 content_en을 content로 이름 변경
                conn.execute(text("""
                    ALTER TABLE posts DROP COLUMN content;
                """))
                
                conn.execute(text("""
                    ALTER TABLE posts RENAME COLUMN content_en TO content;
                """))
                
                print("✅ content 컬럼을 TEXT로 변환 완료")
            else:
                print("✅ content 컬럼이 이미 TEXT 타입입니다")
            
            conn.commit()
            
            # 5. 변환 결과 확인
            print("\n5. 변환 결과 확인 중...")
            total_posts = conn.execute(text("SELECT COUNT(*) FROM posts;")).scalar()
            content_count = conn.execute(text("SELECT COUNT(*) FROM posts WHERE content IS NOT NULL;")).scalar()
            content_ko_count = conn.execute(text("SELECT COUNT(*) FROM posts WHERE content_ko IS NOT NULL;")).scalar()
            
            print(f"📊 통계:")
            print(f"   - 총 포스트 수: {total_posts}")
            print(f"   - content (영문): {content_count}")
            print(f"   - content_ko (한글): {content_ko_count}")
            
            # 6. 샘플 데이터 확인
            print("\n6. 샘플 데이터 확인:")
            result = conn.execute(text("""
                SELECT id, title, 
                       CASE WHEN LENGTH(content) > 50 THEN LEFT(content, 50) || '...' ELSE content END as content_preview,
                       CASE WHEN LENGTH(content_ko) > 50 THEN LEFT(content_ko, 50) || '...' ELSE content_ko END as content_ko_preview
                FROM posts 
                WHERE content IS NOT NULL OR content_ko IS NOT NULL
                LIMIT 3;
            """))
            
            samples = result.fetchall()
            for sample in samples:
                print(f"   - ID {sample[0]}: {sample[1]}")
                print(f"     Content (EN): {sample[2]}")
                print(f"     Content (KO): {sample[3]}")
            
            print("\n🎉 Posts 테이블 content 스키마 업데이트 완료!")
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        conn.rollback()
    finally:
        engine.dispose()

if __name__ == "__main__":
    update_content_schema()
