#!/usr/bin/env python3
"""
Posts 테이블에 다국어 지원을 위한 컬럼 추가 스크립트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
import os
from sqlalchemy import create_engine, text

# 데이터베이스 URL 설정
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://geehong:Power6100@db_postgres:5432/markets')

def add_multilang_columns():
    """Posts 테이블에 다국어 컬럼 추가"""
    
    # 데이터베이스 연결
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            # 1. content_ko 컬럼 추가
            print("1. content_ko 컬럼 추가 중...")
            conn.execute(text("""
                ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_ko TEXT;
            """))
            conn.commit()
            print("✅ content_ko 컬럼 추가 완료")
            
            # 2. title을 JSONB로 변환
            print("2. title을 JSONB로 변환 중...")
            conn.execute(text("""
                ALTER TABLE posts ALTER COLUMN title TYPE JSONB USING
                CASE
                    WHEN title IS NOT NULL THEN json_build_object('ko', title)::JSONB
                    ELSE NULL
                END;
            """))
            conn.commit()
            print("✅ title JSONB 변환 완료")
            
            # 3. excerpt를 JSONB로 변환
            print("3. excerpt를 JSONB로 변환 중...")
            conn.execute(text("""
                ALTER TABLE posts ALTER COLUMN excerpt TYPE JSONB USING
                CASE
                    WHEN excerpt IS NOT NULL THEN json_build_object('ko', excerpt)::JSONB
                    ELSE NULL
                END;
            """))
            conn.commit()
            print("✅ excerpt JSONB 변환 완료")
            
            # 4. meta_title을 JSONB로 변환
            print("4. meta_title을 JSONB로 변환 중...")
            conn.execute(text("""
                ALTER TABLE posts ALTER COLUMN meta_title TYPE JSONB USING
                CASE
                    WHEN meta_title IS NOT NULL THEN json_build_object('ko', meta_title)::JSONB
                    ELSE NULL
                END;
            """))
            conn.commit()
            print("✅ meta_title JSONB 변환 완료")
            
            # 5. meta_description을 JSONB로 변환
            print("5. meta_description을 JSONB로 변환 중...")
            conn.execute(text("""
                ALTER TABLE posts ALTER COLUMN meta_description TYPE JSONB USING
                CASE
                    WHEN meta_description IS NOT NULL THEN json_build_object('ko', meta_description)::JSONB
                    ELSE NULL
                END;
            """))
            conn.commit()
            print("✅ meta_description JSONB 변환 완료")
            
            # 6. 변환 결과 확인
            print("6. 변환 결과 확인 중...")
            result = conn.execute(text("""
                SELECT 
                    COUNT(*) as total_posts,
                    COUNT(CASE WHEN content_ko IS NOT NULL THEN 1 END) as posts_with_ko_content,
                    COUNT(CASE WHEN title IS NOT NULL THEN 1 END) as posts_with_title,
                    COUNT(CASE WHEN excerpt IS NOT NULL THEN 1 END) as posts_with_excerpt
                FROM posts;
            """))
            
            stats = result.fetchone()
            print(f"📊 통계:")
            print(f"   - 총 포스트 수: {stats[0]}")
            print(f"   - 한국어 컨텐츠: {stats[1]}")
            print(f"   - 제목(JSONB): {stats[2]}")
            print(f"   - 요약(JSONB): {stats[3]}")
            
            print("\n🎉 Posts 테이블 다국어 컬럼 추가 완료!")
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        raise

if __name__ == "__main__":
    add_multilang_columns()
