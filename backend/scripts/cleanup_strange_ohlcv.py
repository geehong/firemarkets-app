
import logging
import sys
import os
import argparse
from sqlalchemy import text

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import SessionLocal

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def cleanup_strange_values(asset_id=None, threshold=0.03, dry_run=False):
    """
    realtime_quotes_time_bar 테이블에서 이상값(Outlier)을 정리하는 스크립트.
    """
    db = SessionLocal()
    try:
        logger.info(f"실시간 OHLCV 데이터 정리 시작 (Asset: {asset_id or 'All'}, Threshold: {threshold*100}%, Dry-Run: {dry_run})...")
        
        # 1. 논리적 오류 수정 (H < L, H < O 등)
        fix_logic_sql = """
            UPDATE realtime_quotes_time_bar
            SET 
                high_price = GREATEST(open_price, high_price, low_price, close_price),
                low_price = LEAST(open_price, high_price, low_price, close_price)
            WHERE 
                (high_price < open_price OR high_price < close_price OR 
                 low_price > open_price OR low_price > close_price)
        """
        if asset_id:
            fix_logic_sql += " AND asset_id = :asset_id"
            params = {"asset_id": asset_id}
        else:
            params = {}
            
        if dry_run:
            find_logic_sql = fix_logic_sql.replace("UPDATE realtime_quotes_time_bar SET high_price = GREATEST(open_price, high_price, low_price, close_price), low_price = LEAST(open_price, high_price, low_price, close_price)", "SELECT count(*) FROM realtime_quotes_time_bar")
            result = db.execute(text(find_logic_sql), params)
            count = result.scalar()
            logger.info(f"[Dry-Run] 논리적 오류 데이터 예상: {count}건")
        else:
            result = db.execute(text(fix_logic_sql), params)
            logger.info(f"논리적 오류 데이터 {result.rowcount}건 수정 완료.")

        # 2. 비정상적인 스파이크 처리 (Tail Spike suppression)
        spike_sql = """
            UPDATE realtime_quotes_time_bar
            SET 
                high_price = CASE 
                    WHEN high_price > open_price * (1 + :threshold) 
                    THEN GREATEST(open_price, close_price) 
                    ELSE high_price 
                END,
                low_price = CASE 
                    WHEN low_price < open_price * (1 - :threshold) 
                    THEN LEAST(open_price, close_price) 
                    ELSE low_price 
                END
            WHERE 
                (high_price > open_price * (1 + :threshold) OR low_price < open_price * (1 - :threshold))
        """
        params_spike = {"threshold": threshold}
        if asset_id:
            spike_sql += " AND asset_id = :asset_id"
            params_spike["asset_id"] = asset_id
            
        if dry_run:
            find_spike_sql = "SELECT count(*) FROM realtime_quotes_time_bar WHERE (high_price > open_price * (1 + :threshold) OR low_price < open_price * (1 - :threshold))"
            if asset_id: find_spike_sql += " AND asset_id = :asset_id"
            result = db.execute(text(find_spike_sql), params_spike)
            count = result.scalar()
            logger.info(f"[Dry-Run] 비정상 스파이크 예상: {count}건")
        else:
            result = db.execute(text(spike_sql), params_spike)
            logger.info(f"비정상 스파이크(Outlier) {result.rowcount}건 조정 완료.")

        # 3. Isolated Spikes 처리
        # Using a safer approach with a temporary table if CTE update is failing in some envs
        isolated_spike_sql = """
            WITH price_neighbors AS (
                SELECT 
                    id,
                    close_price,
                    LAG(close_price) OVER (PARTITION BY asset_id, data_interval ORDER BY timestamp_utc) as prev_close,
                    LEAD(close_price) OVER (PARTITION BY asset_id, data_interval ORDER BY timestamp_utc) as next_close
                FROM realtime_quotes_time_bar
                WHERE (:asset_id IS NULL OR asset_id = :asset_id)
            )
            UPDATE realtime_quotes_time_bar t
            SET 
                open_price = n.prev_close,
                high_price = n.prev_close,
                low_price = n.prev_close,
                close_price = n.prev_close
            FROM price_neighbors n
            WHERE t.id = n.id
              AND n.prev_close IS NOT NULL 
              AND n.next_close IS NOT NULL
              AND ABS(n.close_price - n.prev_close) / n.prev_close > :threshold
              AND ABS(n.close_price - n.next_close) / n.next_close > :threshold
              AND ABS(n.prev_close - n.next_close) / n.next_close < :threshold / 3
        """
        
        params_iso = {"threshold": threshold, "asset_id": asset_id}
        if not dry_run:
            result = db.execute(text(isolated_spike_sql), params_iso)
            logger.info(f"고립된 스파이크(Isolated Outliers) {result.rowcount}건 제거 완료.")
        else:
            logger.info("[Dry-Run] 고립된 스파이크 단계 건너뜀 (복잡한 쿼리)")

        # 4. 빗 형태(Teeth/Square Wave) 제거
        teeth_removal_sql = """
            WITH next_info AS (
                SELECT 
                    id,
                    open_price,
                    close_price,
                    LEAD(open_price) OVER (PARTITION BY asset_id, data_interval ORDER BY timestamp_utc) as next_open
                FROM realtime_quotes_time_bar
                WHERE (:asset_id IS NULL OR asset_id = :asset_id)
            )
            UPDATE realtime_quotes_time_bar t
            SET 
                close_price = n.open_price,
                high_price = GREATEST(n.open_price, t.low_price),
                low_price = LEAST(n.open_price, t.high_price)
            FROM next_info n
            WHERE t.id = n.id
              AND n.next_open IS NOT NULL
              AND ABS(n.close_price - n.open_price) / n.open_price > :threshold / 2
              AND ABS(n.next_open - n.open_price) / n.open_price < :threshold / 5
              AND ABS(n.next_open - n.close_price) / n.close_price > :threshold / 2
        """
        
        if not dry_run:
            result = db.execute(text(teeth_removal_sql), params_iso)
            logger.info(f"빗 형태(Teeth Pattern) {result.rowcount}건 조정 완료.")
        else:
            logger.info("[Dry-Run] 빗 형태 단계 건너뜀")

        if not dry_run:
            db.commit()
            logger.info("변경 사항이 데이터베이스에 반영되었습니다.")
        
    except Exception as e:
        logger.error(f"데이터 정리 중 오류 발생: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Cleanup anomalous OHLCV data")
    parser.add_argument("--asset_id", type=int, help="Target asset ID (None for all)")
    parser.add_argument("--threshold", type=float, default=0.03, help="Spike threshold (e.g., 0.03 for 3%)")
    parser.add_argument("--dry_run", action="store_true", help="Dry run mode")
    
    args = parser.parse_args()
    cleanup_strange_values(args.asset_id, args.threshold, args.dry_run)
