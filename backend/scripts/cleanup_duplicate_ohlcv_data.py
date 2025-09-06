#!/usr/bin/env python3
"""
OHLCV 데이터 중복 정리 스크립트
같은 asset_id와 같은 날짜에 여러 레코드가 있는 경우 하나만 남기고 나머지 삭제
"""

import sys
import os
sys.path.append('/app')

import logging
from sqlalchemy import text
from app.core.database import get_db

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def cleanup_duplicate_ohlcv_data():
    """중복 OHLCV 데이터 정리"""
    db = next(get_db())
    
    try:
        logger.info("중복 OHLCV 데이터 정리 시작")
        
        # 1. 중복 데이터 확인
        logger.info("중복 데이터 확인 중...")
        duplicate_check = db.execute(text("""
            SELECT asset_id, DATE(timestamp_utc) as date, COUNT(*) as count 
            FROM ohlcv_day_data 
            GROUP BY asset_id, DATE(timestamp_utc) 
            HAVING COUNT(*) > 1
            ORDER BY count DESC
        """)).fetchall()
        
        if not duplicate_check:
            logger.info("중복 데이터가 없습니다.")
            return
        
        logger.info(f"중복 데이터 발견: {len(duplicate_check)}개 그룹")
        
        # 중복 데이터 상세 정보 출력
        total_duplicates = 0
        for row in duplicate_check[:10]:  # 상위 10개만 출력
            logger.info(f"Asset ID: {row.asset_id}, Date: {row.date}, Count: {row.count}")
            total_duplicates += row.count - 1  # 중복된 개수 (하나 제외)
        
        if len(duplicate_check) > 10:
            logger.info(f"... 및 {len(duplicate_check) - 10}개 그룹 더")
        
        logger.info(f"총 삭제될 중복 레코드 수: {total_duplicates}개")
        
        # 2. 중복 데이터 삭제 (가장 오래된 레코드만 남기고 나머지 삭제)
        logger.info("중복 데이터 삭제 시작...")
        
        delete_result = db.execute(text("""
            DELETE o1 FROM ohlcv_day_data o1
            INNER JOIN ohlcv_day_data o2 
            WHERE o1.asset_id = o2.asset_id 
            AND DATE(o1.timestamp_utc) = DATE(o2.timestamp_utc)
            AND o1.ohlcv_id > o2.ohlcv_id
        """))
        
        deleted_count = delete_result.rowcount
        logger.info(f"삭제된 중복 레코드 수: {deleted_count}개")
        
        # 3. 삭제 후 재확인
        remaining_duplicates = db.execute(text("""
            SELECT COUNT(*) as count
            FROM (
                SELECT asset_id, DATE(timestamp_utc) as date, COUNT(*) as count 
                FROM ohlcv_day_data 
                GROUP BY asset_id, DATE(timestamp_utc) 
                HAVING COUNT(*) > 1
            ) as duplicates
        """)).fetchone()
        
        if remaining_duplicates.count == 0:
            logger.info("✅ 모든 중복 데이터가 성공적으로 정리되었습니다.")
        else:
            logger.warning(f"⚠️ 여전히 {remaining_duplicates.count}개의 중복 그룹이 남아있습니다.")
        
        # 4. UNIQUE 제약조건 추가
        logger.info("UNIQUE 제약조건 추가 중...")
        
        try:
            db.execute(text("""
                ALTER TABLE ohlcv_day_data 
                ADD CONSTRAINT unique_asset_date 
                UNIQUE (asset_id, DATE(timestamp_utc))
            """))
            logger.info("✅ UNIQUE 제약조건이 성공적으로 추가되었습니다.")
        except Exception as e:
            if "Duplicate key name" in str(e):
                logger.info("UNIQUE 제약조건이 이미 존재합니다.")
            else:
                logger.error(f"UNIQUE 제약조건 추가 실패: {e}")
                raise
        
        db.commit()
        logger.info("데이터베이스 정리 완료")
        
    except Exception as e:
        logger.error(f"데이터 정리 중 오류 발생: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_duplicate_ohlcv_data()
