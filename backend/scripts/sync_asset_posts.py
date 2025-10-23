#!/usr/bin/env python3
"""
Assets와 Posts 테이블 간 동기화 스크립트
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

def sync_asset_to_post(asset_id):
    """특정 자산을 Posts로 동기화"""
    engine = get_database_connection()
    
    try:
        with engine.connect() as conn:
            trans = conn.begin()
            
            try:
                # 자산 정보 조회
                result = conn.execute(text("""
                    SELECT 
                        asset_id, name, ticker, description, asset_type_id,
                        exchange, currency, data_source, is_active,
                        created_at, updated_at
                    FROM assets 
                    WHERE asset_id = :asset_id;
                """), {'asset_id': asset_id})
                
                asset = result.fetchone()
                if not asset:
                    print(f"❌ 자산 ID {asset_id}를 찾을 수 없습니다.")
                    return False
                
                asset_id, name, ticker, description, asset_type_id, exchange, currency, data_source, is_active, created_at, updated_at = asset
                
                # 기존 Posts 확인
                result = conn.execute(text("""
                    SELECT id FROM posts WHERE asset_id = :asset_id;
                """), {'asset_id': asset_id})
                
                existing_post = result.fetchone()
                
                # 카테고리 매핑
                category_mapping = {
                    1: 4,   # Stocks
                    2: 8,   # Commodities  
                    3: 3,   # Crypto
                    4: 9,   # ETFs
                    5: 7,   # Indices
                    6: 10,  # Currencies
                    7: 11,  # Funds
                }
                category_id = category_mapping.get(asset_type_id, 4)
                
                # post_info JSONB 데이터
                post_info = {
                    'exchange': exchange,
                    'currency': currency,
                    'data_source': data_source,
                    'is_active': is_active
                }
                
                if existing_post:
                    # 기존 포스트 업데이트
                    print(f"🔄 자산 {name} ({ticker}) 포스트 업데이트...")
                    
                    conn.execute(text("""
                        UPDATE posts SET
                            title = :title,
                            description = :description,
                            content = :content,
                            meta_title = :meta_title,
                            meta_description = :meta_description,
                            keywords = :keywords,
                            post_info = :post_info,
                            updated_at = :updated_at,
                            last_sync_at = :last_sync_at,
                            sync_status = :sync_status
                        WHERE asset_id = :asset_id;
                    """), {
                        'title': name,
                        'description': description or name,
                        'content': 'This page is currently under construction.',
                        'meta_title': name,
                        'meta_description': (description or name)[:300],
                        'keywords': [ticker, name, exchange] if exchange else [ticker, name],
                        'post_info': post_info,
                        'updated_at': updated_at,
                        'last_sync_at': datetime.now(),
                        'sync_status': 'synced',
                        'asset_id': asset_id
                    })
                    
                else:
                    # 새 포스트 생성
                    print(f"➕ 자산 {name} ({ticker}) 새 포스트 생성...")
                    
                    # Assets 페이지 ID 조회
                    result = conn.execute(text("""
                        SELECT id FROM posts 
                        WHERE slug = 'assets' AND post_type = 'page' 
                        LIMIT 1;
                    """))
                    
                    assets_page_id = result.fetchone()
                    if not assets_page_id:
                        print("❌ Assets 페이지를 찾을 수 없습니다.")
                        return False
                    
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
                        'post_parent': assets_page_id[0],
                        'view_count': 0,
                        'featured': False,
                        'menu_order': 0,
                        'comment_count': 0,
                        'created_at': created_at,
                        'updated_at': updated_at,
                        'published_at': datetime.now()
                    })
                
                trans.commit()
                print(f"✅ 자산 {name} ({ticker}) 동기화 완료!")
                return True
                
            except Exception as e:
                trans.rollback()
                print(f"❌ 동기화 오류: {e}")
                return False
                
    except Exception as e:
        print(f"❌ 데이터베이스 연결 오류: {e}")
        return False

def sync_all_assets():
    """모든 자산을 Posts로 동기화"""
    engine = get_database_connection()
    
    try:
        with engine.connect() as conn:
            print("🔄 모든 자산 동기화 시작...")
            
            # 활성 자산 목록 조회
            result = conn.execute(text("""
                SELECT asset_id, name, ticker
                FROM assets 
                WHERE is_active = true
                ORDER BY asset_id;
            """))
            
            assets = result.fetchall()
            print(f"📈 총 {len(assets)}개의 활성 자산 발견")
            
            success_count = 0
            error_count = 0
            
            for i, asset in enumerate(assets, 1):
                asset_id, name, ticker = asset
                
                print(f"\n[{i}/{len(assets)}] 자산 {name} ({ticker}) 동기화...")
                
                if sync_asset_to_post(asset_id):
                    success_count += 1
                else:
                    error_count += 1
                
                if i % 10 == 0:
                    print(f"📊 진행률: {i}/{len(assets)} ({i/len(assets)*100:.1f}%)")
            
            print(f"\n✅ 동기화 완료!")
            print(f"  - 성공: {success_count}개")
            print(f"  - 실패: {error_count}개")
            
    except Exception as e:
        print(f"❌ 전체 동기화 오류: {e}")

def sync_updated_assets():
    """최근 업데이트된 자산만 동기화"""
    engine = get_database_connection()
    
    try:
        with engine.connect() as conn:
            print("🔄 최근 업데이트된 자산 동기화...")
            
            # 최근 1시간 내 업데이트된 자산 조회
            result = conn.execute(text("""
                SELECT a.asset_id, a.name, a.ticker, a.updated_at
                FROM assets a
                LEFT JOIN posts p ON a.asset_id = p.asset_id
                WHERE a.is_active = true
                AND (
                    p.asset_id IS NULL 
                    OR a.updated_at > p.last_sync_at 
                    OR p.last_sync_at IS NULL
                )
                ORDER BY a.updated_at DESC;
            """))
            
            assets = result.fetchall()
            print(f"📈 동기화 필요한 자산: {len(assets)}개")
            
            if not assets:
                print("✅ 동기화할 자산이 없습니다.")
                return
            
            success_count = 0
            error_count = 0
            
            for i, asset in enumerate(assets, 1):
                asset_id, name, ticker, updated_at = asset
                
                print(f"\n[{i}/{len(assets)}] 자산 {name} ({ticker}) 동기화...")
                print(f"  - 업데이트 시간: {updated_at}")
                
                if sync_asset_to_post(asset_id):
                    success_count += 1
                else:
                    error_count += 1
            
            print(f"\n✅ 동기화 완료!")
            print(f"  - 성공: {success_count}개")
            print(f"  - 실패: {error_count}개")
            
    except Exception as e:
        print(f"❌ 업데이트된 자산 동기화 오류: {e}")

def main():
    """메인 함수"""
    print("🚀 Assets ↔ Posts 동기화 스크립트")
    print("=" * 50)
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "all":
            sync_all_assets()
        elif command == "updated":
            sync_updated_assets()
        elif command.isdigit():
            asset_id = int(command)
            sync_asset_to_post(asset_id)
        else:
            print("❌ 잘못된 명령어입니다.")
            print("사용법:")
            print("  python sync_asset_posts.py all      # 모든 자산 동기화")
            print("  python sync_asset_posts.py updated   # 업데이트된 자산만 동기화")
            print("  python sync_asset_posts.py <asset_id> # 특정 자산 동기화")
    else:
        print("사용법:")
        print("  python sync_asset_posts.py all      # 모든 자산 동기화")
        print("  python sync_asset_posts.py updated   # 업데이트된 자산만 동기화")
        print("  python sync_asset_posts.py <asset_id> # 특정 자산 동기화")

if __name__ == "__main__":
    main()

