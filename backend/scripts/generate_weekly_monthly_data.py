#!/usr/bin/env python3
"""
주봉/월봉 데이터 생성 스크립트

일봉 데이터를 기반으로 주봉(1W)과 월봉(1M) 데이터를 생성합니다.
- 주봉: 매주 금요일 종가 기준으로 생성
- 월봉: 매월 마지막 거래일 기준으로 생성
"""

import asyncio
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_db_session
from app.models.asset import OhlcvDayData
from sqlalchemy import func, text
from sqlalchemy.orm import Session

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class WeeklyMonthlyDataGenerator:
    def __init__(self):
        self.db_session = None
    
    async def generate_weekly_data(self, asset_id: int = None) -> int:
        """주봉 데이터 생성 (매주 금요일 기준)"""
        logger.info(f"주봉 데이터 생성 시작 - asset_id: {asset_id or 'ALL'}")
        
        async with get_db_session() as db:
            try:
                # 주봉 데이터 생성 쿼리 (기존 일봉 데이터를 기반으로)
                if asset_id:
                    query = text("""
                        INSERT INTO ohlcv_day_data (asset_id, timestamp_utc, open_price, high_price, low_price, close_price, volume, change_percent)
                        SELECT 
                            asset_id,
                            MAX(timestamp_utc) as week_end_date,
                            MIN(open_price) as open_price,
                            MAX(high_price) as high_price,
                            MIN(low_price) as low_price,
                            MAX(close_price) as close_price,
                            SUM(volume) as volume,
                            NULL as change_percent
                        FROM ohlcv_day_data 
                        WHERE asset_id = :asset_id
                        GROUP BY asset_id, YEARWEEK(timestamp_utc)
                        HAVING DAYOFWEEK(MAX(timestamp_utc)) = 6
                        ON DUPLICATE KEY UPDATE
                            open_price = VALUES(open_price),
                            high_price = VALUES(high_price),
                            low_price = VALUES(low_price),
                            close_price = VALUES(close_price),
                            volume = VALUES(volume),
                            updated_at = CURRENT_TIMESTAMP
                    """)
                    result = await db.execute(query, {"asset_id": asset_id})
                else:
                    query = text("""
                        INSERT INTO ohlcv_day_data (asset_id, timestamp_utc, open_price, high_price, low_price, close_price, volume, change_percent)
                        SELECT 
                            asset_id,
                            MAX(timestamp_utc) as week_end_date,
                            MIN(open_price) as open_price,
                            MAX(high_price) as high_price,
                            MIN(low_price) as low_price,
                            MAX(close_price) as close_price,
                            SUM(volume) as volume,
                            NULL as change_percent
                        FROM ohlcv_day_data 
                        GROUP BY asset_id, YEARWEEK(timestamp_utc)
                        HAVING DAYOFWEEK(MAX(timestamp_utc)) = 6
                        ON DUPLICATE KEY UPDATE
                            open_price = VALUES(open_price),
                            high_price = VALUES(high_price),
                            low_price = VALUES(low_price),
                            close_price = VALUES(close_price),
                            volume = VALUES(volume),
                            updated_at = CURRENT_TIMESTAMP
                    """)
                    result = await db.execute(query)
                
                await db.commit()
                count = result.rowcount
                logger.info(f"주봉 데이터 생성 완료: {count}개 레코드")
                return count
                
            except Exception as e:
                logger.error(f"주봉 데이터 생성 실패: {e}")
                await db.rollback()
                raise
    
    async def generate_monthly_data(self, asset_id: int = None) -> int:
        """월봉 데이터 생성 (매월 마지막 거래일 기준)"""
        logger.info(f"월봉 데이터 생성 시작 - asset_id: {asset_id or 'ALL'}")
        
        async with get_db_session() as db:
            try:
                # 월봉 데이터 생성 쿼리 (기존 일봉 데이터를 기반으로)
                if asset_id:
                    query = text("""
                        INSERT INTO ohlcv_day_data (asset_id, timestamp_utc, open_price, high_price, low_price, close_price, volume, change_percent)
                        SELECT 
                            asset_id,
                            MAX(timestamp_utc) as month_end_date,
                            MIN(open_price) as open_price,
                            MAX(high_price) as high_price,
                            MIN(low_price) as low_price,
                            MAX(close_price) as close_price,
                            SUM(volume) as volume,
                            NULL as change_percent
                        FROM ohlcv_day_data 
                        WHERE asset_id = :asset_id
                        GROUP BY asset_id, YEAR(timestamp_utc), MONTH(timestamp_utc)
                        HAVING DAY(MAX(timestamp_utc)) > 25
                        ON DUPLICATE KEY UPDATE
                            open_price = VALUES(open_price),
                            high_price = VALUES(high_price),
                            low_price = VALUES(low_price),
                            close_price = VALUES(close_price),
                            volume = VALUES(volume),
                            updated_at = CURRENT_TIMESTAMP
                    """)
                    result = await db.execute(query, {"asset_id": asset_id})
                else:
                    query = text("""
                        INSERT INTO ohlcv_day_data (asset_id, timestamp_utc, open_price, high_price, low_price, close_price, volume, change_percent)
                        SELECT 
                            asset_id,
                            MAX(timestamp_utc) as month_end_date,
                            MIN(open_price) as open_price,
                            MAX(high_price) as high_price,
                            MIN(low_price) as low_price,
                            MAX(close_price) as close_price,
                            SUM(volume) as volume,
                            NULL as change_percent
                        FROM ohlcv_day_data 
                        GROUP BY asset_id, YEAR(timestamp_utc), MONTH(timestamp_utc)
                        HAVING DAY(MAX(timestamp_utc)) > 25
                        ON DUPLICATE KEY UPDATE
                            open_price = VALUES(open_price),
                            high_price = VALUES(high_price),
                            low_price = VALUES(low_price),
                            close_price = VALUES(close_price),
                            volume = VALUES(volume),
                            updated_at = CURRENT_TIMESTAMP
                    """)
                    result = await db.execute(query)
                
                await db.commit()
                count = result.rowcount
                logger.info(f"월봉 데이터 생성 완료: {count}개 레코드")
                return count
                
            except Exception as e:
                logger.error(f"월봉 데이터 생성 실패: {e}")
                await db.rollback()
                raise
    
    async def generate_all(self, asset_id: int = None) -> Dict[str, int]:
        """주봉과 월봉 데이터 모두 생성"""
        logger.info(f"주봉/월봉 데이터 생성 시작 - asset_id: {asset_id or 'ALL'}")
        
        weekly_count = await self.generate_weekly_data(asset_id)
        monthly_count = await self.generate_monthly_data(asset_id)
        
        result = {
            "weekly": weekly_count,
            "monthly": monthly_count,
            "total": weekly_count + monthly_count
        }
        
        logger.info(f"주봉/월봉 데이터 생성 완료: 주봉 {weekly_count}개, 월봉 {monthly_count}개, 총 {result['total']}개")
        return result


async def main():
    """메인 함수"""
    import argparse
    
    parser = argparse.ArgumentParser(description='주봉/월봉 데이터 생성 스크립트')
    parser.add_argument('--asset-id', type=int, help='특정 자산 ID (지정하지 않으면 모든 자산)')
    parser.add_argument('--type', choices=['weekly', 'monthly', 'all'], default='all', 
                       help='생성할 데이터 타입 (기본값: all)')
    
    args = parser.parse_args()
    
    generator = WeeklyMonthlyDataGenerator()
    
    try:
        if args.type == 'weekly':
            count = await generator.generate_weekly_data(args.asset_id)
            print(f"주봉 데이터 생성 완료: {count}개 레코드")
        elif args.type == 'monthly':
            count = await generator.generate_monthly_data(args.asset_id)
            print(f"월봉 데이터 생성 완료: {count}개 레코드")
        else:  # all
            result = await generator.generate_all(args.asset_id)
            print(f"주봉/월봉 데이터 생성 완료:")
            print(f"  - 주봉: {result['weekly']}개")
            print(f"  - 월봉: {result['monthly']}개")
            print(f"  - 총계: {result['total']}개")
            
    except Exception as e:
        logger.error(f"스크립트 실행 실패: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
