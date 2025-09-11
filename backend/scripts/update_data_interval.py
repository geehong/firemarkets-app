#!/usr/bin/env python3
"""
data_interval 값 업데이트 스크립트

ohlcv_day_data 테이블의 data_interval 컬럼을 업데이트합니다:
- 주말(금요일): 1W
- 월말(25일 이후): 1M
- 나머지: 1d (기본값)
"""

import asyncio
import logging
from datetime import datetime
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_db_session
from sqlalchemy import text

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class DataIntervalUpdater:
    def __init__(self):
        pass
    
    async def update_data_intervals(self, asset_id: int = None) -> Dict[str, int]:
        """data_interval 값 업데이트"""
        logger.info(f"data_interval 업데이트 시작 - asset_id: {asset_id or 'ALL'}")
        
        async with get_db_session() as db:
            try:
                # 1. 모든 데이터를 NULL로 설정 (일봉은 기본값이므로 표시하지 않음)
                if asset_id:
                    await db.execute(
                        text("UPDATE ohlcv_day_data SET data_interval = NULL WHERE asset_id = :asset_id"),
                        {"asset_id": asset_id}
                    )
                else:
                    await db.execute(text("UPDATE ohlcv_day_data SET data_interval = NULL"))
                
                # 2. 주말(금요일, 토요일) 데이터를 1W로 설정
                if asset_id:
                    weekly_result = await db.execute(
                        text("""
                            UPDATE ohlcv_day_data 
                            SET data_interval = '1W' 
                            WHERE asset_id = :asset_id 
                            AND DAYOFWEEK(timestamp_utc) IN (6, 7)
                        """),
                        {"asset_id": asset_id}
                    )
                else:
                    weekly_result = await db.execute(
                        text("""
                            UPDATE ohlcv_day_data 
                            SET data_interval = '1W' 
                            WHERE DAYOFWEEK(timestamp_utc) IN (6, 7)
                        """)
                    )
                
                weekly_count = weekly_result.rowcount
                
                # 3. 월말(25일 이후) 데이터에 1M 추가 (기존 값에 추가)
                if asset_id:
                    monthly_result = await db.execute(
                        text("""
                            UPDATE ohlcv_day_data 
                            SET data_interval = CASE 
                                WHEN data_interval IS NULL THEN '1M'
                                ELSE CONCAT(data_interval, ',1M')
                            END
                            WHERE asset_id = :asset_id 
                            AND DAY(timestamp_utc) > 25
                        """),
                        {"asset_id": asset_id}
                    )
                else:
                    monthly_result = await db.execute(
                        text("""
                            UPDATE ohlcv_day_data 
                            SET data_interval = CASE 
                                WHEN data_interval IS NULL THEN '1M'
                                ELSE CONCAT(data_interval, ',1M')
                            END
                            WHERE DAY(timestamp_utc) > 25
                        """)
                    )
                
                monthly_count = monthly_result.rowcount
                
                # 4. 전체 데이터 개수 확인
                if asset_id:
                    total_result = await db.execute(
                        text("SELECT COUNT(*) as total FROM ohlcv_day_data WHERE asset_id = :asset_id"),
                        {"asset_id": asset_id}
                    )
                else:
                    total_result = await db.execute(
                        text("SELECT COUNT(*) as total FROM ohlcv_day_data")
                    )
                
                total_count = total_result.scalar()
                
                # 5. 각 타입별 개수 확인
                if asset_id:
                    daily_count = await db.execute(
                        text("SELECT COUNT(*) FROM ohlcv_day_data WHERE asset_id = :asset_id AND data_interval IS NULL"),
                        {"asset_id": asset_id}
                    )
                    weekly_only_count = await db.execute(
                        text("SELECT COUNT(*) FROM ohlcv_day_data WHERE asset_id = :asset_id AND data_interval = '1W'"),
                        {"asset_id": asset_id}
                    )
                    monthly_only_count = await db.execute(
                        text("SELECT COUNT(*) FROM ohlcv_day_data WHERE asset_id = :asset_id AND data_interval = '1M'"),
                        {"asset_id": asset_id}
                    )
                    both_count = await db.execute(
                        text("SELECT COUNT(*) FROM ohlcv_day_data WHERE asset_id = :asset_id AND data_interval = '1W,1M'"),
                        {"asset_id": asset_id}
                    )
                else:
                    daily_count = await db.execute(text("SELECT COUNT(*) FROM ohlcv_day_data WHERE data_interval IS NULL"))
                    weekly_only_count = await db.execute(text("SELECT COUNT(*) FROM ohlcv_day_data WHERE data_interval = '1W'"))
                    monthly_only_count = await db.execute(text("SELECT COUNT(*) FROM ohlcv_day_data WHERE data_interval = '1M'"))
                    both_count = await db.execute(text("SELECT COUNT(*) FROM ohlcv_day_data WHERE data_interval = '1W,1M'"))
                
                await db.commit()
                
                result = {
                    "total": total_count,
                    "daily": daily_count.scalar(),
                    "weekly_only": weekly_only_count.scalar(),
                    "monthly_only": monthly_only_count.scalar(),
                    "both": both_count.scalar()
                }
                
                logger.info(f"data_interval 업데이트 완료:")
                logger.info(f"  - 전체: {result['total']}개")
                logger.info(f"  - 일봉(NULL): {result['daily']}개")
                logger.info(f"  - 주봉만(1W): {result['weekly_only']}개")
                logger.info(f"  - 월봉만(1M): {result['monthly_only']}개")
                logger.info(f"  - 주봉+월봉(1W,1M): {result['both']}개")
                
                return result
                
            except Exception as e:
                logger.error(f"data_interval 업데이트 실패: {e}")
                await db.rollback()
                raise
    
    async def show_data_interval_summary(self, asset_id: int = None):
        """data_interval 값 분포 확인"""
        logger.info(f"data_interval 분포 확인 - asset_id: {asset_id or 'ALL'}")
        
        async with get_db_session() as db:
            try:
                if asset_id:
                    query = text("""
                        SELECT 
                            COALESCE(data_interval, '1d') as data_interval,
                            COUNT(*) as count,
                            MIN(timestamp_utc) as min_date,
                            MAX(timestamp_utc) as max_date
                        FROM ohlcv_day_data 
                        WHERE asset_id = :asset_id
                        GROUP BY data_interval
                        ORDER BY 
                            CASE 
                                WHEN data_interval IS NULL THEN 1
                                WHEN data_interval = '1W' THEN 2
                                WHEN data_interval = '1M' THEN 3
                                WHEN data_interval = '1W,1M' THEN 4
                                ELSE 5
                            END
                    """)
                    result = await db.execute(query, {"asset_id": asset_id})
                else:
                    query = text("""
                        SELECT 
                            COALESCE(data_interval, '1d') as data_interval,
                            COUNT(*) as count,
                            MIN(timestamp_utc) as min_date,
                            MAX(timestamp_utc) as max_date
                        FROM ohlcv_day_data 
                        GROUP BY data_interval
                        ORDER BY 
                            CASE 
                                WHEN data_interval IS NULL THEN 1
                                WHEN data_interval = '1W' THEN 2
                                WHEN data_interval = '1M' THEN 3
                                WHEN data_interval = '1W,1M' THEN 4
                                ELSE 5
                            END
                    """)
                    result = await db.execute(query)
                
                rows = result.fetchall()
                
                logger.info("data_interval 분포:")
                for row in rows:
                    logger.info(f"  - {row.data_interval}: {row.count}개 ({row.min_date} ~ {row.max_date})")
                
                return rows
                
            except Exception as e:
                logger.error(f"data_interval 분포 확인 실패: {e}")
                raise


async def main():
    """메인 함수"""
    import argparse
    
    parser = argparse.ArgumentParser(description='data_interval 값 업데이트 스크립트')
    parser.add_argument('--asset-id', type=int, help='특정 자산 ID (지정하지 않으면 모든 자산)')
    parser.add_argument('--show-only', action='store_true', help='현재 분포만 확인하고 업데이트하지 않음')
    
    args = parser.parse_args()
    
    updater = DataIntervalUpdater()
    
    try:
        if args.show_only:
            # 현재 분포만 확인
            await updater.show_data_interval_summary(args.asset_id)
        else:
            # 업데이트 실행
            result = await updater.update_data_intervals(args.asset_id)
            print(f"data_interval 업데이트 완료:")
            print(f"  - 전체: {result['total']}개")
            print(f"  - 주봉(1W): {result['weekly']}개")
            print(f"  - 월봉(1M): {result['monthly']}개")
            print(f"  - 일봉(1d): {result['daily']}개")
            
            # 업데이트 후 분포 확인
            print("\n업데이트 후 분포:")
            await updater.show_data_interval_summary(args.asset_id)
            
    except Exception as e:
        logger.error(f"스크립트 실행 실패: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
