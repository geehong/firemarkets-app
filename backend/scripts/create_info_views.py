#!/usr/bin/env python3
"""
Info Views 생성 스크립트
stock_info_view, crypto_info_view, etf_info_view 생성 및 인덱스 추가
"""

import sys
import os
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.core.database import POSTGRES_DATABASE_URL
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_views(force_recreate: bool = False):
    """뷰 및 인덱스를 데이터베이스에 생성"""
    
    # SQL 파일 경로
    sql_file_path = Path(__file__).parent.parent / "sql" / "create_info_views.sql"
    
    if not sql_file_path.exists():
        logger.error(f"SQL 파일을 찾을 수 없습니다: {sql_file_path}")
        return False
    
    # SQL 파일 읽기
    with open(sql_file_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # 데이터베이스 연결
    engine = create_engine(POSTGRES_DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            logger.info("데이터베이스 연결 성공")
            
            # 트랜잭션 시작
            trans = conn.begin()
            
            try:
                # 기존 뷰 삭제 (force_recreate가 True인 경우)
                if force_recreate:
                    logger.info("기존 뷰 삭제 중...")
                    conn.execute(text("DROP VIEW IF EXISTS stock_info_view CASCADE;"))
                    conn.execute(text("DROP VIEW IF EXISTS crypto_info_view CASCADE;"))
                    conn.execute(text("DROP VIEW IF EXISTS etf_info_view CASCADE;"))
                
                logger.info("뷰 및 인덱스 생성 중...")
                
                # SQL 파일 실행
                # PostgreSQL의 $$ 구문과 주석을 포함한 전체 SQL 실행
                conn.execute(text(sql_content))
                
                # 뷰 생성 확인
                logger.info("뷰 생성 확인 중...")
                views_to_check = ['stock_info_view', 'crypto_info_view', 'etf_info_view']
                
                for view_name in views_to_check:
                    result = conn.execute(
                        text("""
                            SELECT EXISTS (
                                SELECT 1 
                                FROM information_schema.views 
                                WHERE table_schema = 'public' 
                                AND table_name = :view_name
                            )
                        """),
                        {"view_name": view_name}
                    )
                    exists = result.scalar()
                    if exists:
                        logger.info(f"✅ {view_name} 생성 완료")
                    else:
                        logger.warning(f"⚠️ {view_name} 생성 확인 실패")
                
                # 인덱스 생성 확인
                logger.info("인덱스 생성 확인 중...")
                indexes_to_check = [
                    'idx_posts_asset_id_post_type',
                    'idx_stock_profiles_asset_id',
                    'idx_crypto_data_asset_id',
                    'idx_etf_info_asset_id',
                    'idx_stock_estimates_asset_id_fiscal_date'
                ]
                
                for index_name in indexes_to_check:
                    result = conn.execute(
                        text("""
                            SELECT EXISTS (
                                SELECT 1 
                                FROM pg_indexes 
                                WHERE schemaname = 'public' 
                                AND indexname = :index_name
                            )
                        """),
                        {"index_name": index_name}
                    )
                    exists = result.scalar()
                    if exists:
                        logger.info(f"✅ {index_name} 생성 완료")
                    else:
                        logger.warning(f"⚠️ {index_name} 생성 확인 실패 (이미 존재할 수 있음)")
                
                # 트랜잭션 커밋
                trans.commit()
                logger.info("✅ 뷰 및 인덱스 생성 완료!")
                
                # 샘플 데이터 조회 테스트
                logger.info("샘플 데이터 조회 테스트 중...")
                test_queries = [
                    ("stock_info_view", "SELECT COUNT(*) FROM stock_info_view LIMIT 1"),
                    ("crypto_info_view", "SELECT COUNT(*) FROM crypto_info_view LIMIT 1"),
                    ("etf_info_view", "SELECT COUNT(*) FROM etf_info_view LIMIT 1")
                ]
                
                for view_name, query in test_queries:
                    try:
                        result = conn.execute(text(query))
                        count = result.scalar()
                        logger.info(f"✅ {view_name} 테스트 성공 (레코드 수: {count})")
                    except Exception as e:
                        logger.warning(f"⚠️ {view_name} 테스트 실패: {e}")
                
                return True
                
            except Exception as e:
                trans.rollback()
                logger.error(f"❌ 오류 발생: {e}")
                import traceback
                logger.error(traceback.format_exc())
                return False
                
    except Exception as e:
        logger.error(f"❌ 데이터베이스 연결 실패: {e}")
        return False
    finally:
        engine.dispose()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Info Views 생성 스크립트")
    parser.add_argument(
        "--force-recreate",
        action="store_true",
        help="기존 뷰를 삭제하고 재생성합니다"
    )
    
    args = parser.parse_args()
    
    logger.info("=" * 60)
    logger.info("Info Views 생성 시작")
    logger.info("=" * 60)
    
    success = create_views(force_recreate=args.force_recreate)
    
    if success:
        logger.info("=" * 60)
        logger.info("✅ 작업 완료!")
        logger.info("=" * 60)
        logger.info("생성된 뷰:")
        logger.info("  - stock_info_view")
        logger.info("  - crypto_info_view")
        logger.info("  - etf_info_view")
        sys.exit(0)
    else:
        logger.error("=" * 60)
        logger.error("❌ 작업 실패!")
        logger.error("=" * 60)
        sys.exit(1)


