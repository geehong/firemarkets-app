#!/usr/bin/env python3
"""
OHLCV 컬렉터의 ohlcv_intraday_clients 테스트 스크립트
스케줄 잡 중 인트라데이 데이터 수집 테스트
"""
import asyncio
import sys
import os
from datetime import datetime

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.collectors.ohlcv_collector import OHLCVCollector
from app.services.data_processor import DataProcessor
from app.core.database import SessionLocal, get_db
from app.utils.logger import logger
from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager

async def get_dynamic_test_assets(db):
    """데이터베이스에서 동적으로 테스트할 자산들을 조회합니다."""
    try:
        from sqlalchemy import text
        
        # 주식, ETF 등 전통적 자산 중에서 활성화된 모든 자산들을 조회
        query = text("""
            SELECT DISTINCT a.asset_id, a.ticker, at.type_name, a.name
            FROM assets a
            JOIN asset_types at ON a.asset_type_id = at.asset_type_id
            WHERE a.is_active = 1 
            AND at.type_name IN ('Stocks', 'ETFs', 'Funds')
            ORDER BY a.asset_id
        """)
        
        result = db.execute(query).fetchall()
        
        test_assets = []
        for row in result:
            test_assets.append({
                "id": row[0],
                "ticker": row[1], 
                "type": row[2],
                "description": row[3]
            })
        
        logger.info(f"동적으로 조회된 테스트 자산 {len(test_assets)}개:")
        for asset in test_assets:
            logger.info(f"  - {asset['ticker']} (ID: {asset['id']}) - {asset['description']} ({asset['type']})")
        
        return test_assets
        
    except Exception as e:
        logger.error(f"동적 자산 조회 중 오류: {e}")
        # 폴백: 기본 자산들 사용
        return [
            {"id": 8, "ticker": "AAPL", "type": "Stock", "description": "Apple Inc."},
            {"id": 4, "ticker": "SPY", "type": "ETF", "description": "SPDR S&P 500 ETF Trust"},
        ]

async def test_intraday_clients():
    """인트라데이 클라이언트들을 테스트합니다."""
    logger.info("=== OHLCV 인트라데이 클라이언트 테스트 시작 ===")
    
    # 의존성 설정
    db = next(get_db())
    config_manager = ConfigManager()
    api_manager = ApiStrategyManager()
    redis_queue_manager = RedisQueueManager(config_manager=config_manager)
    
    try:
        # 동적으로 테스트할 자산들을 조회 (모든 자산)
        test_assets = await get_dynamic_test_assets(db)
        
        # 테스트할 인트라데이 간격들
        test_intervals = ["4h", "1h"]
        
        # OHLCV 컬렉터 초기화
        collector = OHLCVCollector(db, config_manager, api_manager, redis_queue_manager)
        
        logger.info(f"현재 ohlcv_intraday_clients 설정:")
        for i, client in enumerate(api_manager.ohlcv_intraday_clients, 1):
            logger.info(f"  {i}. {client.__class__.__name__}")
        
        # 각 자산과 간격별로 테스트
        for asset_info in test_assets:
            asset_id = asset_info["id"]
            ticker = asset_info["ticker"]
            asset_type = asset_info["type"]
            description = asset_info["description"]
            
            logger.info(f"\n{'='*60}")
            logger.info(f"📊 자산 테스트: {ticker} (ID: {asset_id})")
            logger.info(f"자산 정보: {description} ({asset_type})")
            logger.info(f"{'='*60}")
            
            for interval in test_intervals:
                logger.info(f"\n--- {interval} 간격 테스트 시작 ---")
                logger.info(f"테스트 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                
                try:
                    # 1. 데이터 수집 및 큐 저장
                    logger.info(f"1단계: {ticker} {interval} 데이터 수집 및 큐 저장")
                    result = await collector._fetch_and_enqueue_for_asset(asset_id, interval)
                    
                    if not result.get("success"):
                        logger.error(f"❌ 데이터 수집 실패: {result.get('error')}")
                        continue
                    
                    enqueued_count = result.get("enqueued_count", 0)
                    if enqueued_count == 0:
                        logger.warning(f"⚠️ 큐에 추가된 데이터가 없습니다. (이미 최신 데이터일 수 있음)")
                    else:
                        logger.info(f"✅ {enqueued_count}개의 레코드가 Redis 큐에 성공적으로 추가되었습니다.")
                    
                    # 2. 큐 상태 확인
                    queue_size = await redis_queue_manager.get_queue_size()
                    logger.info(f"현재 Redis 'batch_data_queue'의 작업 개수: {queue_size}")
                    
                    if queue_size == 0:
                        logger.warning("큐가 비어있어 데이터 처리 단계를 건너뜁니다.")
                        continue
                    
                    # 3. 데이터 처리 및 DB 저장
                    logger.info(f"2단계: 데이터 처리 및 DB 저장 (3초 후 시작)")
                    await asyncio.sleep(3)
                    
                    processor = DataProcessor()
                    await processor._connect_redis()
                    
                    processed_count = await processor._process_batch_queue()
                    logger.info(f"✅ {processed_count}개의 배치 작업을 처리했습니다.")
                    
                    # 4. DB 저장 결과 확인
                    logger.info(f"3단계: DB 저장 결과 확인")
                    await check_intraday_db_results(db, asset_id, ticker, interval, enqueued_count)
                    
                except Exception as e:
                    logger.error(f"❌ {ticker} {interval} 테스트 중 오류: {e}", exc_info=True)
                
                logger.info(f"--- {interval} 간격 테스트 완료 ---")
            
            logger.info(f"--- {ticker} 자산 테스트 완료 ---")
        
        # 전체 요약
        await generate_intraday_summary(db, test_assets, test_intervals)
        
    except Exception as e:
        logger.error(f"테스트 중 오류 발생: {e}", exc_info=True)
    finally:
        # 리소스 정리
        db.close()
        if redis_queue_manager.redis_client:
            await redis_queue_manager.redis_client.close()

async def check_intraday_db_results(db, asset_id: int, ticker: str, interval: str, expected_count: int):
    """인트라데이 DB 저장 결과를 확인합니다."""
    try:
        from sqlalchemy import text
        
        # 인트라데이 테이블에서 데이터 확인
        table_name = "ohlcv_intraday_data"
        
        # 전체 레코드 수 확인
        result = db.execute(text(f"""
            SELECT COUNT(*) as total_records, 
                   MAX(timestamp_utc) as latest_record,
                   MIN(timestamp_utc) as earliest_record
            FROM {table_name} 
            WHERE asset_id = {asset_id} AND data_interval = '{interval}'
        """)).fetchone()
        
        if result:
            total_records = result[0]
            latest_record = result[1]
            earliest_record = result[2]
            
            logger.info(f"✅ {interval} DB 저장 결과 확인:")
            logger.info(f"   - 총 레코드 수: {total_records:,}개")
            logger.info(f"   - 최신 데이터: {latest_record}")
            logger.info(f"   - 최초 데이터: {earliest_record}")
            
            if expected_count > 0:
                logger.info(f"   - 예상 추가 레코드: {expected_count}개")
                
            # 최근 3개 레코드 확인
            recent_records = db.execute(text(f"""
                SELECT timestamp_utc, open_price, high_price, low_price, close_price, volume, data_interval
                FROM {table_name} 
                WHERE asset_id = {asset_id} AND data_interval = '{interval}'
                ORDER BY timestamp_utc DESC 
                LIMIT 3
            """)).fetchall()
            
            if recent_records:
                logger.info(f"   - 최근 3개 레코드:")
                for i, record in enumerate(recent_records, 1):
                    logger.info(f"     {i}. {record[0]} | O:{record[1]:.2f} H:{record[2]:.2f} L:{record[3]:.2f} C:{record[4]:.2f} V:{record[5]:,.0f} | {record[6]}")
        else:
            logger.warning(f"⚠️ 자산 ID {asset_id}에 대한 {interval} 데이터가 없습니다.")
            
    except Exception as e:
        logger.error(f"DB 결과 확인 중 오류: {e}")

async def generate_intraday_summary(db, test_assets, test_intervals):
    """인트라데이 테스트 요약 보고서를 생성합니다."""
    try:
        from sqlalchemy import text
        
        logger.info(f"\n{'='*60}")
        logger.info(f"📊 OHLCV 인트라데이 테스트 요약 보고서")
        logger.info(f"{'='*60}")
        logger.info(f"테스트 완료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"테스트 대상 자산 수: {len(test_assets)}개")
        logger.info(f"테스트 간격: {test_intervals}")
        
        # 인트라데이 테이블 전체 통계
        total_stats = db.execute(text("""
            SELECT 
                COUNT(DISTINCT asset_id) as total_assets,
                COUNT(*) as total_records,
                MIN(timestamp_utc) as earliest_data,
                MAX(timestamp_utc) as latest_data
            FROM ohlcv_intraday_data
        """)).fetchone()
        
        if total_stats:
            logger.info(f"\n📈 인트라데이 데이터베이스 전체 통계:")
            logger.info(f"   - 총 자산 수: {total_stats[0]}개")
            logger.info(f"   - 총 레코드 수: {total_stats[1]:,}개")
            logger.info(f"   - 데이터 범위: {total_stats[2]} ~ {total_stats[3]}")
        
        # 간격별 통계
        interval_stats = db.execute(text("""
            SELECT 
                data_interval,
                COUNT(*) as records,
                COUNT(DISTINCT asset_id) as assets
            FROM ohlcv_intraday_data
            GROUP BY data_interval
            ORDER BY data_interval
        """)).fetchall()
        
        if interval_stats:
            logger.info(f"\n📋 간격별 통계:")
            for stat in interval_stats:
                logger.info(f"   {stat[0]}: {stat[1]:,}개 레코드 ({stat[2]}개 자산)")
        
        # 테스트 자산별 상세 통계
        logger.info(f"\n📋 테스트 자산별 상세 통계:")
        for asset_info in test_assets:
            asset_id = asset_info["id"]
            ticker = asset_info["ticker"]
            
            asset_stats = db.execute(text(f"""
                SELECT 
                    data_interval,
                    COUNT(*) as records,
                    MAX(timestamp_utc) as latest,
                    MIN(timestamp_utc) as earliest
                FROM ohlcv_intraday_data 
                WHERE asset_id = {asset_id}
                GROUP BY data_interval
                ORDER BY data_interval
            """)).fetchall()
            
            if asset_stats:
                logger.info(f"   {ticker} (ID: {asset_id}):")
                for stat in asset_stats:
                    logger.info(f"     {stat[0]}: {stat[1]:,}개 레코드 (최신: {stat[2]})")
            else:
                logger.info(f"   {ticker} (ID: {asset_id}): 데이터 없음")
        
        logger.info(f"\n✅ OHLCV 인트라데이 컬렉터 테스트가 성공적으로 완료되었습니다!")
        logger.info(f"{'='*60}")
        
    except Exception as e:
        logger.error(f"요약 보고서 생성 중 오류: {e}")

async def main():
    """메인 테스트 함수"""
    logger.info("--- OHLCV 인트라데이 컬렉터 테스트 시작 ---")
    await test_intraday_clients()
    logger.info("--- OHLCV 인트라데이 컬렉터 테스트 완료 ---")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] in ['-h', '--help', 'help']:
        print("""
OHLCV 인트라데이 컬렉터 테스트 스크립트

사용법:
    python scripts/test_ohlcv_intraday_collector.py

기능:
    - OHLCV 컬렉터의 ohlcv_intraday_clients 테스트
    - 4h, 1h 인트라데이 데이터 수집 테스트
    - 스케줄 잡 중 데이터 수집 파이프라인 테스트
    - Redis Queue -> DataProcessor -> DB 저장 과정 테스트

테스트 대상:
    - AAPL (Apple Inc.)
    - SPY (SPDR S&P 500 ETF Trust)  
    - MSFT (Microsoft Corporation)

테스트 간격:
    - 4h (4시간)
    - 1h (1시간)
""")
        sys.exit(0)
    
    asyncio.run(main())
