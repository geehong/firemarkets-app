"""
Commodity OHLCV Aggregator Collector
realtime_quotes_time_delay의 15분 데이터를 1h/4h/1d OHLCV로 집계
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.collectors.base_collector import BaseCollector
from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager

logger = logging.getLogger(__name__)


class CommodityOHLCVAggregatorCollector(BaseCollector):
    """
    realtime_quotes_time_delay에서 커머디티 15m 데이터를 집계하여
    ohlcv_intraday_data (1h, 4h) 및 ohlcv_day_data (1d)에 저장
    """

    def __init__(
        self,
        db: Session,
        config_manager: ConfigManager,
        api_manager: ApiStrategyManager,
        redis_queue_manager: RedisQueueManager,
    ):
        super().__init__(db, config_manager, api_manager, redis_queue_manager)
        # 집계할 interval 설정 (스케줄 그룹별로 설정 가능)
        self.intervals_to_aggregate: List[str] = ["1h", "4h"]  # 기본값
        
    def set_schedule_config(self, intervals: List[str] = None):
        """스케줄 그룹별로 집계할 interval 설정"""
        if intervals:
            self.intervals_to_aggregate = intervals
            logger.info(f"[{self.collector_name}] Aggregation intervals set to: {intervals}")

    async def _collect_data(self) -> Dict[str, Any]:
        """메인 집계 로직"""
        logger.info(f"[{self.collector_name}] Starting commodity OHLCV aggregation for intervals: {self.intervals_to_aggregate}")
        
        total_aggregated = 0
        
        for interval in self.intervals_to_aggregate:
            try:
                count = await self._aggregate_for_interval(interval)
                total_aggregated += count
                logger.info(f"[{self.collector_name}] Aggregated {count} records for {interval}")
            except Exception as e:
                logger.error(f"[{self.collector_name}] Failed to aggregate {interval}: {e}")
        
        return {"total_aggregated": total_aggregated, "intervals": self.intervals_to_aggregate}

    async def _aggregate_for_interval(self, interval: str) -> int:
        """특정 interval에 대한 집계 수행"""
        
        # 시간 범위 계산
        now = datetime.utcnow()
        
        if interval == "1h":
            # 지난 48시간의 데이터를 집계 (누락분 포함)
            start_time = now - timedelta(hours=48)
            truncate_sql = "date_trunc('hour', timestamp_utc)"
            table_name = "ohlcv_intraday_data"
        elif interval == "4h":
            # 지난 7일의 데이터를 집계
            start_time = now - timedelta(days=7)
            # 4시간 단위로 truncate (0, 4, 8, 12, 16, 20)
            truncate_sql = "date_trunc('hour', timestamp_utc) - ((EXTRACT(HOUR FROM timestamp_utc)::int % 4) * INTERVAL '1 hour')"
            table_name = "ohlcv_intraday_data"
        elif interval == "1d":
            # 지난 30일의 데이터를 집계
            start_time = now - timedelta(days=30)
            truncate_sql = "date_trunc('day', timestamp_utc)"
            table_name = "ohlcv_day_data"
        else:
            logger.warning(f"Unsupported interval: {interval}")
            return 0
        
        # 집계 SQL
        if table_name == "ohlcv_intraday_data":
            aggregate_sql = text(f"""
                INSERT INTO {table_name} (asset_id, timestamp_utc, data_interval, open_price, high_price, low_price, close_price, volume)
                SELECT 
                    r.asset_id,
                    {truncate_sql} as agg_timestamp,
                    :interval as data_interval,
                    (array_agg(r.price ORDER BY r.timestamp_utc ASC))[1] as open_price,
                    MAX(r.price) as high_price,
                    MIN(r.price) as low_price,
                    (array_agg(r.price ORDER BY r.timestamp_utc DESC))[1] as close_price,
                    COALESCE(SUM(r.volume), 0) as volume
                FROM realtime_quotes_time_delay r
                JOIN assets a ON r.asset_id = a.asset_id
                JOIN asset_types at ON a.asset_type_id = at.asset_type_id
                WHERE at.type_name = 'Commodities'
                  AND r.timestamp_utc >= :start_time
                  AND r.timestamp_utc < :end_time
                GROUP BY r.asset_id, {truncate_sql}
                ON CONFLICT (asset_id, timestamp_utc, data_interval) DO UPDATE SET
                    high_price = GREATEST({table_name}.high_price, EXCLUDED.high_price),
                    low_price = LEAST({table_name}.low_price, EXCLUDED.low_price),
                    close_price = EXCLUDED.close_price,
                    volume = EXCLUDED.volume,
                    updated_at = NOW()
            """)
        else:  # ohlcv_day_data
            aggregate_sql = text(f"""
                INSERT INTO {table_name} (asset_id, timestamp_utc, data_interval, open_price, high_price, low_price, close_price, volume)
                SELECT 
                    r.asset_id,
                    {truncate_sql} as agg_timestamp,
                    :interval as data_interval,
                    (array_agg(r.price ORDER BY r.timestamp_utc ASC))[1] as open_price,
                    MAX(r.price) as high_price,
                    MIN(r.price) as low_price,
                    (array_agg(r.price ORDER BY r.timestamp_utc DESC))[1] as close_price,
                    COALESCE(SUM(r.volume), 0) as volume
                FROM realtime_quotes_time_delay r
                JOIN assets a ON r.asset_id = a.asset_id
                JOIN asset_types at ON a.asset_type_id = at.asset_type_id
                WHERE at.type_name = 'Commodities'
                  AND r.timestamp_utc >= :start_time
                  AND r.timestamp_utc < :end_time
                GROUP BY r.asset_id, {truncate_sql}
                ON CONFLICT (asset_id, timestamp_utc) DO UPDATE SET
                    data_interval = EXCLUDED.data_interval,
                    high_price = GREATEST({table_name}.high_price, EXCLUDED.high_price),
                    low_price = LEAST({table_name}.low_price, EXCLUDED.low_price),
                    close_price = EXCLUDED.close_price,
                    volume = EXCLUDED.volume,
                    updated_at = NOW()
            """)
        
        try:
            result = self.db.execute(aggregate_sql, {
                "interval": interval,
                "start_time": start_time,
                "end_time": now
            })
            self.db.commit()
            count = result.rowcount
            logger.info(f"[{self.collector_name}] {interval} aggregation: {count} rows affected")
            return count if count else 0
        except Exception as e:
            self.db.rollback()
            logger.error(f"[{self.collector_name}] SQL error for {interval}: {e}")
            raise
