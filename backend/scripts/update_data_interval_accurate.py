#!/usr/bin/env python3
"""
정확한 data_interval 값 업데이트 스크립트

현재 API 코드의 로직을 그대로 사용하여 data_interval 컬럼을 업데이트합니다:
- 주봉: 매주의 마지막 거래일
- 월봉: 매월의 마지막 거래일
- 둘 다: 주봉이면서 월봉인 경우
"""

import logging
from datetime import datetime, date
from typing import List, Dict, Any
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import get_db
from app.models.asset import OHLCVData
from sqlalchemy import text, extract, func
from sqlalchemy.orm import Session

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class AccurateDataIntervalUpdater:
    def __init__(self):
        pass
    
    def update_data_intervals(self, asset_id: int = None) -> Dict[str, int]:
        """정확한 data_interval 값 업데이트 (API 로직 사용)"""
        logger.info(f"정확한 data_interval 업데이트 시작 - asset_id: {asset_id or 'ALL'}")
        
        db = next(get_db())
        try:
            # 1. 모든 데이터를 NULL로 초기화
            if asset_id:
                db.execute(
                    text("UPDATE ohlcv_day_data SET data_interval = NULL WHERE asset_id = :asset_id"),
                    {"asset_id": asset_id}
                )
            else:
                db.execute(text("UPDATE ohlcv_day_data SET data_interval = NULL"))
            
            # 2. 월봉 데이터 찾기 (API 로직과 동일)
            monthly_dates = self._get_monthly_last_dates(db, asset_id)
            logger.info(f"월봉 날짜 {len(monthly_dates)}개 발견")
            
            # 3. 주봉 데이터 찾기 (API 로직과 동일)
            weekly_dates = self._get_weekly_last_dates(db, asset_id)
            logger.info(f"주봉 날짜 {len(weekly_dates)}개 발견")
            
            # 4. 월봉 데이터에 1M 설정
            monthly_count = 0
            for date_info in monthly_dates:
                if asset_id:
                    result = db.execute(
                        text("""
                            UPDATE ohlcv_day_data 
                            SET data_interval = CASE 
                                WHEN data_interval IS NULL THEN '1M'
                                ELSE CONCAT(data_interval, ',1M')
                            END
                            WHERE asset_id = :asset_id 
                            AND timestamp_utc = :timestamp_utc
                        """),
                        {"asset_id": asset_id, "timestamp_utc": date_info.max_timestamp}
                    )
                else:
                    result = db.execute(
                        text("""
                            UPDATE ohlcv_day_data 
                            SET data_interval = CASE 
                                WHEN data_interval IS NULL THEN '1M'
                                ELSE CONCAT(data_interval, ',1M')
                            END
                            WHERE asset_id = :asset_id 
                            AND timestamp_utc = :timestamp_utc
                        """),
                        {"asset_id": date_info.asset_id, "timestamp_utc": date_info.max_timestamp}
                    )
                monthly_count += result.rowcount
            
            # 5. 주봉 데이터에 1W 설정
            weekly_count = 0
            for date_info in weekly_dates:
                if asset_id:
                    result = db.execute(
                        text("""
                            UPDATE ohlcv_day_data 
                            SET data_interval = CASE 
                                WHEN data_interval IS NULL THEN '1W'
                                ELSE CONCAT(data_interval, ',1W')
                            END
                            WHERE asset_id = :asset_id 
                            AND timestamp_utc = :timestamp_utc
                        """),
                        {"asset_id": asset_id, "timestamp_utc": date_info.max_timestamp}
                    )
                else:
                    result = db.execute(
                        text("""
                            UPDATE ohlcv_day_data 
                            SET data_interval = CASE 
                                WHEN data_interval IS NULL THEN '1W'
                                ELSE CONCAT(data_interval, ',1W')
                            END
                            WHERE asset_id = :asset_id 
                            AND timestamp_utc = :timestamp_utc
                        """),
                        {"asset_id": date_info.asset_id, "timestamp_utc": date_info.max_timestamp}
                    )
                weekly_count += result.rowcount
            
            # 6. 결과 통계
            if asset_id:
                total_count = db.execute(
                    text("SELECT COUNT(*) FROM ohlcv_day_data WHERE asset_id = :asset_id"),
                    {"asset_id": asset_id}
                ).scalar()
                daily_count = db.execute(
                    text("SELECT COUNT(*) FROM ohlcv_day_data WHERE asset_id = :asset_id AND data_interval IS NULL"),
                    {"asset_id": asset_id}
                ).scalar()
                weekly_only_count = db.execute(
                    text("SELECT COUNT(*) FROM ohlcv_day_data WHERE asset_id = :asset_id AND data_interval = '1W'"),
                    {"asset_id": asset_id}
                ).scalar()
                monthly_only_count = db.execute(
                    text("SELECT COUNT(*) FROM ohlcv_day_data WHERE asset_id = :asset_id AND data_interval = '1M'"),
                    {"asset_id": asset_id}
                ).scalar()
                both_count = db.execute(
                    text("SELECT COUNT(*) FROM ohlcv_day_data WHERE asset_id = :asset_id AND data_interval = '1W,1M'"),
                    {"asset_id": asset_id}
                ).scalar()
            else:
                total_count = db.execute(text("SELECT COUNT(*) FROM ohlcv_day_data")).scalar()
                daily_count = db.execute(text("SELECT COUNT(*) FROM ohlcv_day_data WHERE data_interval IS NULL")).scalar()
                weekly_only_count = db.execute(text("SELECT COUNT(*) FROM ohlcv_day_data WHERE data_interval = '1W'")).scalar()
                monthly_only_count = db.execute(text("SELECT COUNT(*) FROM ohlcv_day_data WHERE data_interval = '1M'")).scalar()
                both_count = db.execute(text("SELECT COUNT(*) FROM ohlcv_day_data WHERE data_interval = '1W,1M'")).scalar()
            
            db.commit()
            
            result = {
                "total": total_count,
                "daily": daily_count,
                "weekly_only": weekly_only_count,
                "monthly_only": monthly_only_count,
                "both": both_count
            }
            
            logger.info(f"정확한 data_interval 업데이트 완료:")
            logger.info(f"  - 전체: {result['total']}개")
            logger.info(f"  - 일봉(NULL): {result['daily']}개")
            logger.info(f"  - 주봉만(1W): {result['weekly_only']}개")
            logger.info(f"  - 월봉만(1M): {result['monthly_only']}개")
            logger.info(f"  - 주봉+월봉(1W,1M): {result['both']}개")
            
            return result
            
        except Exception as e:
            logger.error(f"data_interval 업데이트 실패: {e}")
            db.rollback()
            raise
        finally:
            db.close()
    
    def _get_monthly_last_dates(self, db, asset_id: int = None) -> List[Dict]:
        """매월 마지막 거래일 찾기 (API 로직과 동일)"""
        if asset_id:
            query = text("""
                SELECT 
                    asset_id,
                    YEAR(timestamp_utc) as yr,
                    MONTH(timestamp_utc) as mth,
                    MAX(timestamp_utc) as max_timestamp
                FROM ohlcv_day_data 
                WHERE asset_id = :asset_id
                GROUP BY asset_id, YEAR(timestamp_utc), MONTH(timestamp_utc)
                ORDER BY yr, mth
            """)
            result = db.execute(query, {"asset_id": asset_id})
        else:
            query = text("""
                SELECT 
                    asset_id,
                    YEAR(timestamp_utc) as yr,
                    MONTH(timestamp_utc) as mth,
                    MAX(timestamp_utc) as max_timestamp
                FROM ohlcv_day_data 
                GROUP BY asset_id, YEAR(timestamp_utc), MONTH(timestamp_utc)
                ORDER BY asset_id, yr, mth
            """)
            result = db.execute(query)
        
        return result.fetchall()
    
    def _get_weekly_last_dates(self, db, asset_id: int = None) -> List[Dict]:
        """매주 마지막 거래일 찾기 (API 로직과 동일)"""
        if asset_id:
            query = text("""
                SELECT 
                    asset_id,
                    YEAR(timestamp_utc) as yr,
                    WEEK(timestamp_utc) as wk,
                    MAX(timestamp_utc) as max_timestamp
                FROM ohlcv_day_data 
                WHERE asset_id = :asset_id
                GROUP BY asset_id, YEAR(timestamp_utc), WEEK(timestamp_utc)
                ORDER BY yr, wk
            """)
            result = db.execute(query, {"asset_id": asset_id})
        else:
            query = text("""
                SELECT 
                    asset_id,
                    YEAR(timestamp_utc) as yr,
                    WEEK(timestamp_utc) as wk,
                    MAX(timestamp_utc) as max_timestamp
                FROM ohlcv_day_data 
                GROUP BY asset_id, YEAR(timestamp_utc), WEEK(timestamp_utc)
                ORDER BY asset_id, yr, wk
            """)
            result = db.execute(query)
        
        return result.fetchall()
    
    def show_data_interval_summary(self, asset_id: int = None):
        """data_interval 값 분포 확인"""
        logger.info(f"data_interval 분포 확인 - asset_id: {asset_id or 'ALL'}")
        
        db = next(get_db())
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
                result = db.execute(query, {"asset_id": asset_id})
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
                result = db.execute(query)
            
            rows = result.fetchall()
            
            logger.info("data_interval 분포:")
            for row in rows:
                logger.info(f"  - {row.data_interval}: {row.count}개 ({row.min_date} ~ {row.max_date})")
            
            return rows
            
        except Exception as e:
            logger.error(f"data_interval 분포 확인 실패: {e}")
            raise
        finally:
            db.close()


def main():
    """메인 함수"""
    import argparse
    
    parser = argparse.ArgumentParser(description='정확한 data_interval 값 업데이트 스크립트')
    parser.add_argument('--asset-id', type=int, help='특정 자산 ID (지정하지 않으면 모든 자산)')
    parser.add_argument('--show-only', action='store_true', help='현재 분포만 확인하고 업데이트하지 않음')
    
    args = parser.parse_args()
    
    updater = AccurateDataIntervalUpdater()
    
    try:
        if args.show_only:
            # 현재 분포만 확인
            updater.show_data_interval_summary(args.asset_id)
        else:
            # 업데이트 실행
            result = updater.update_data_intervals(args.asset_id)
            print(f"정확한 data_interval 업데이트 완료:")
            print(f"  - 전체: {result['total']}개")
            print(f"  - 일봉(NULL): {result['daily']}개")
            print(f"  - 주봉만(1W): {result['weekly_only']}개")
            print(f"  - 월봉만(1M): {result['monthly_only']}개")
            print(f"  - 주봉+월봉(1W,1M): {result['both']}개")
            
            # 업데이트 후 분포 확인
            print("\n업데이트 후 분포:")
            updater.show_data_interval_summary(args.asset_id)
            
    except Exception as e:
        logger.error(f"스크립트 실행 실패: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()