#!/usr/bin/env python3
"""
Assets 테이블 데이터를 Posts 테이블로 마이그레이션하는 스크립트
"""

import os
import sys
import asyncio
from datetime import datetime
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

def get_assets_page_id():
    """Assets 페이지 포스트 ID 조회"""
    engine = get_database_connection()
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT id FROM posts 
                WHERE slug = 'assets' AND post_type = 'page' 
                LIMIT 1;
            """))
            
            row = result.fetchone()
            return row[0] if row else None
            
    except Exception as e:
        print(f"❌ Assets 페이지 ID 조회 오류: {e}")
        return None

def create_assets_page():
    """Assets 페이지 포스트 생성"""
    engine = get_database_connection()
    
    try:
        with engine.connect() as conn:
            trans = conn.begin()
            
            try:
                print("📄 Assets 페이지 포스트 생성...")
                
                conn.execute(text("""
                    INSERT INTO posts (
                        title, slug, description, content, status, post_type,
                        author_id, featured, view_count, menu_order, comment_count,
                        created_at, updated_at, published_at
                    ) VALUES (
                        'Assets', 'assets', 'Financial Assets Overview', 
                        'This page provides an overview of all financial assets.',
                        'published', 'page', 13, true, 0, 0, 0,
                        NOW(), NOW(), NOW()
                    );
                """))
                
                trans.commit()
                print("✅ Assets 페이지 포스트 생성 완료!")
                
                # 생성된 ID 반환
                result = conn.execute(text("""
                    SELECT id FROM posts 
                    WHERE slug = 'assets' AND post_type = 'page' 
                    LIMIT 1;
                """))
                
                row = result.fetchone()
                return row[0] if row else None
                
            except Exception as e:
                trans.rollback()
                print(f"❌ Assets 페이지 생성 오류: {e}")
                raise
                
    except Exception as e:
        print(f"❌ 데이터베이스 연결 오류: {e}")
        return None

def get_category_mapping():
    """asset_type_id -> category_id 매핑"""
    return {
        1: 4,   # Stocks
        2: 8,   # Commodities  
        3: 3,   # Crypto
        4: 9,   # ETFs
        5: 7,   # Indices
        6: 10,  # Currencies
        7: 11,  # Funds
    }

def migrate_assets_to_posts():
    """Assets 데이터를 Posts로 마이그레이션"""
    engine = get_database_connection()
    
    try:
        with engine.connect() as conn:
            trans = conn.begin()
            
            try:
                print("🔄 Assets → Posts 마이그레이션 시작...")
                
                # Assets 페이지 ID 확인/생성
                assets_page_id = get_assets_page_id()
                if not assets_page_id:
                    assets_page_id = create_assets_page()
                    if not assets_page_id:
                        raise Exception("Assets 페이지 생성 실패")
                
                print(f"📄 Assets 페이지 ID: {assets_page_id}")
                
                # 카테고리 매핑
                category_mapping = get_category_mapping()
                
                # Assets 데이터 조회
                print("📊 Assets 데이터 조회...")
                result = conn.execute(text("""
                    SELECT 
                        asset_id, name, ticker, description, asset_type_id,
                        exchange, currency, data_source, is_active,
                        created_at, updated_at
                    FROM assets 
                    WHERE is_active = true
                    ORDER BY asset_id;
                """))
                
                assets = result.fetchall()
                print(f"📈 총 {len(assets)}개의 활성 자산 발견")
                
                # Posts로 마이그레이션
                print("🔄 Posts 테이블로 마이그레이션...")
                
                for i, asset in enumerate(assets, 1):
                    asset_id, name, ticker, description, asset_type_id, exchange, currency, data_source, is_active, created_at, updated_at = asset
                    
                    # 카테고리 ID 매핑
                    category_id = category_mapping.get(asset_type_id, 4)  # 기본값: Stocks
                    
                    # post_info JSONB 데이터 생성
                    post_info = {
                        'exchange': exchange,
                        'currency': currency,
                        'data_source': data_source,
                        'is_active': is_active
                    }
                    
                    # Posts 테이블에 삽입
                    conn.execute(text("""
                        INSERT INTO posts (
                            title, slug, description, content, excerpt, status, post_type,
                            asset_id, asset_type_id, sync_with_asset, auto_sync_content, sync_status,
                            author_id, category_id, meta_title, meta_description, keywords, canonical_url,
                            post_info, post_parent, view_count, featured, menu_order, comment_count,
                            created_at, updated_at, published_at
                        ) VALUES (
                            :title, :slug, :description, :content, :excerpt, :status, :post_type,
                            :asset_id, :asset_type_id, :sync_with_asset, :auto_sync_content, :sync_status,
                            :author_id, :category_id, :meta_title, :meta_description, :keywords, :canonical_url,
                            :post_info, :post_parent, :view_count, :featured, :menu_order, :comment_count,
                            :created_at, :updated_at, :published_at
                        );
                    """), {
                        'title': name,
                        'slug': ticker,
                        'description': description or name,
                        'content': 'This page is currently under construction.',
                        'excerpt': description or name,
                        'status': 'published',
                        'post_type': 'assets',
                        'asset_id': asset_id,
                        'asset_type_id': asset_type_id,
                        'sync_with_asset': True,
                        'auto_sync_content': True,
                        'sync_status': 'synced',
                        'author_id': 13,  # super_admin
                        'category_id': category_id,
                        'meta_title': name,
                        'meta_description': (description or name)[:300],
                        'keywords': [ticker, name, exchange] if exchange else [ticker, name],
                        'canonical_url': f'/assets/{ticker}',
                        'post_info': post_info,
                        'post_parent': assets_page_id,
                        'view_count': 0,
                        'featured': False,
                        'menu_order': 0,
                        'comment_count': 0,
                        'created_at': created_at,
                        'updated_at': updated_at,
                        'published_at': datetime.now()
                    })
                    
                    if i % 100 == 0:
                        print(f"  📝 {i}/{len(assets)} 처리 완료...")
                
                trans.commit()
                print(f"✅ 마이그레이션 완료! 총 {len(assets)}개 자산이 Posts로 복사되었습니다.")
                
            except Exception as e:
                trans.rollback()
                print(f"❌ 마이그레이션 오류: {e}")
                raise
                
    except Exception as e:
        print(f"❌ 데이터베이스 연결 오류: {e}")
        raise

def verify_migration():
    """마이그레이션 결과 확인"""
    engine = get_database_connection()
    
    try:
        with engine.connect() as conn:
            print("\n🔍 마이그레이션 결과 확인...")
            
            # Posts 테이블 통계
            result = conn.execute(text("""
                SELECT 
                    COUNT(*) as total_posts,
                    COUNT(CASE WHEN post_type = 'assets' THEN 1 END) as asset_posts,
                    COUNT(CASE WHEN post_type = 'page' THEN 1 END) as page_posts
                FROM posts;
            """))
            
            stats = result.fetchone()
            print(f"📊 Posts 테이블 통계:")
            print(f"  - 총 포스트 수: {stats[0]}")
            print(f"  - 자산 포스트 수: {stats[1]}")
            print(f"  - 페이지 포스트 수: {stats[2]}")
            
            # 자산 타입별 통계
            result = conn.execute(text("""
                SELECT 
                    asset_type_id,
                    COUNT(*) as count
                FROM posts 
                WHERE post_type = 'assets'
                GROUP BY asset_type_id
                ORDER BY asset_type_id;
            """))
            
            asset_types = result.fetchall()
            print(f"\n📈 자산 타입별 통계:")
            for asset_type in asset_types:
                print(f"  - 타입 {asset_type[0]}: {asset_type[1]}개")
            
            # 최근 생성된 포스트 확인
            result = conn.execute(text("""
                SELECT title, slug, post_type, created_at
                FROM posts 
                ORDER BY created_at DESC 
                LIMIT 5;
            """))
            
            recent_posts = result.fetchall()
            print(f"\n📝 최근 생성된 포스트:")
            for post in recent_posts:
                print(f"  - {post[0]} ({post[1]}) - {post[2]} - {post[3]}")
                
    except Exception as e:
        print(f"❌ 결과 확인 오류: {e}")

def main():
    """메인 함수"""
    print("🚀 Assets → Posts 마이그레이션 스크립트 시작")
    print("=" * 60)
    
    try:
        # 1. 마이그레이션 실행
        migrate_assets_to_posts()
        
        # 2. 결과 확인
        verify_migration()
        
        print("\n" + "=" * 60)
        print("✅ 마이그레이션 완료!")
        
    except Exception as e:
        print(f"\n❌ 마이그레이션 실패: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
