#!/usr/bin/env python3
"""
간단한 중복 데이터 정리 스크립트
"""

import sys
import os
sys.path.append('/app')

import logging
from sqlalchemy import text
from app.core.database import get_db

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def simple_cleanup():
    db = next(get_db())
    
    try:
        # 1. 중복 데이터 개수 확인
        logger.info("중복 데이터 개수 확인...")
        result = db.execute(text("""
            SELECT COUNT(*) as total_duplicates
            FROM (
                SELECT asset_id, DATE(timestamp_utc) as date, COUNT(*) as count 
                FROM ohlcv_day_data 
                GROUP BY asset_id, DATE(timestamp_utc) 
                HAVING COUNT(*) > 1
            ) as duplicates
        """)).fetchone()
        
        logger.info(f"중복 그룹 수: {result.total_duplicates}")
        
        if result.total_duplicates == 0:
            logger.info("중복 데이터가 없습니다.")
            return
        
        # 2. 삭제할 레코드 수 계산
        delete_count = db.execute(text("""
            SELECT COUNT(*) as count
            FROM ohlcv_day_data o1
            INNER JOIN ohlcv_day_data o2 
            WHERE o1.asset_id = o2.asset_id 
            AND DATE(o1.timestamp_utc) = DATE(o2.timestamp_utc)
            AND o1.ohlcv_id > o2.ohlcv_id
        """)).fetchone()
        
        logger.info(f"삭제될 레코드 수: {delete_count.count}")
        
        # 3. 실제 삭제 실행
        logger.info("중복 데이터 삭제 시작...")
        result = db.execute(text("""
            DELETE o1 FROM ohlcv_day_data o1
            INNER JOIN ohlcv_day_data o2 
            WHERE o1.asset_id = o2.asset_id 
            AND DATE(o1.timestamp_utc) = DATE(o2.timestamp_utc)
            AND o1.ohlcv_id > o2.ohlcv_id
        """))
        
        logger.info(f"삭제 완료: {result.rowcount}개 레코드")
        
        # 4. 커밋
        db.commit()
        logger.info("변경사항 커밋 완료")
        
        # 5. 재확인
        remaining = db.execute(text("""
            SELECT COUNT(*) as count
            FROM (
                SELECT asset_id, DATE(timestamp_utc) as date, COUNT(*) as count 
                FROM ohlcv_day_data 
                GROUP BY asset_id, DATE(timestamp_utc) 
                HAVING COUNT(*) > 1
            ) as duplicates
        """)).fetchone()
        
        logger.info(f"남은 중복 그룹: {remaining.count}개")
        
    except Exception as e:
        logger.error(f"오류 발생: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    simple_cleanup()


