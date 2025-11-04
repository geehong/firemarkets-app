#!/usr/bin/env python3
"""
realtime_quotes_time_delay 테이블의 change_amount와 change_percent 자동 계산 트리거 적용
- PostgreSQL 트리거를 생성하여 INSERT/UPDATE 시 자동으로 계산
- 기존 NULL 값들도 업데이트 가능
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


def apply_triggers(update_existing: bool = True):
    """트리거 및 함수를 데이터베이스에 적용"""
    
    # SQL 파일 경로
    sql_file_path = Path(__file__).parent.parent / "sql" / "update_realtime_quotes_change_fields.sql"
    
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
                # SQL 파일 실행 (기존 NULL 업데이트 부분 처리)
                if not update_existing:
                    # 기존 NULL 업데이트 부분 제거
                    sql_to_execute = sql_content.split("-- 5. 기존 NULL 값 업데이트 실행")[0]
                else:
                    # SELECT 문이 포함된 전체 SQL 사용
                    sql_to_execute = sql_content
                
                logger.info("트리거 및 함수 생성 중...")
                
                # SQL 문을 세미콜론으로 분리하여 순차 실행
                # 주석 처리된 라인은 제외하고, 실제 SQL 문만 실행
                statements = []
                for line in sql_to_execute.split('\n'):
                    line = line.strip()
                    # 주석이 아닌 라인만 추가
                    if line and not line.startswith('--'):
                        statements.append(line)
                
                # 세미콜론으로 분리된 완전한 SQL 문들 생성
                full_sql = ' '.join(statements)
                # 함수 정의와 트리거는 $$ 로 구분되어 있으므로 별도 처리 필요
                # 더 안전하게 전체 SQL을 한 번에 실행
                
                # 전체 SQL을 실행 (PostgreSQL의 $$ 구문 처리)
                logger.info("SQL 스크립트 실행 중...")
                conn.execute(text(sql_content))
                
                # 기존 NULL 값 업데이트 결과 확인
                if update_existing:
                    logger.info("기존 NULL 값 업데이트 결과 확인 중...")
                    result = conn.execute(text("SELECT update_existing_null_change_fields();"))
                    updated_count = result.scalar()
                    logger.info(f"✅ {updated_count}개의 레코드가 업데이트되었습니다.")
                
                # 트랜잭션 커밋
                trans.commit()
                logger.info("✅ 트리거 및 함수 생성 완료!")
                
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
    
    parser = argparse.ArgumentParser(description="realtime_quotes_time_delay 트리거 적용")
    parser.add_argument(
        "--update-existing",
        action="store_true",
        help="기존 NULL 값들도 업데이트합니다"
    )
    
    args = parser.parse_args()
    
    logger.info("=" * 60)
    logger.info("realtime_quotes_time_delay 트리거 적용 시작")
    logger.info("=" * 60)
    
    success = apply_triggers(update_existing=args.update_existing)
    
    if success:
        logger.info("=" * 60)
        logger.info("✅ 작업 완료!")
        logger.info("=" * 60)
        logger.info("이제 INSERT/UPDATE 시 change_amount와 change_percent가 자동으로 계산됩니다.")
        if not args.update_existing:
            logger.info("기존 NULL 값들을 업데이트하려면 --update-existing 플래그를 사용하세요.")
        sys.exit(0)
    else:
        logger.error("=" * 60)
        logger.error("❌ 작업 실패!")
        logger.error("=" * 60)
        sys.exit(1)

