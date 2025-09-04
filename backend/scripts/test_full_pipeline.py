#!/usr/bin/env python3
"""
전체 데이터 파이프라인 테스트 스크립트
OHLCVCollector -> Redis Queue -> DataProcessor -> DB
각 자산별 상세 정보 테스트 포함
"""
import asyncio
import sys
import os
import json
from datetime import datetime

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Collector imports (선택적으로 활성화/비활성화 가능)
from app.collectors.ohlcv_collector import OHLCVCollector
from app.collectors.stock_collector import StockCollector  # disabled during v2 transition
from app.collectors.etf_collector import ETFCollector  # disabled during v2 transition
from app.collectors.crypto_data_collector import CryptoDataCollector  # disabled during v2 transition
from app.collectors.onchain_collector import OnchainCollector  # disabled during v2 transition
from app.collectors.index_collector import IndexCollector  # disabled during v2 transition
from app.collectors.technical_collector import TechnicalCollector  # disabled during v2 transition
from app.collectors.world_assets_collector import WorldAssetsCollector  # disabled during v2 transition

from app.services.data_processor import DataProcessor
from app.core.database import SessionLocal, get_db
from app.utils.logger import logger
from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager

async def check_asset_info(db, asset_id: int, ticker: str, asset_type: str):
    """자산 정보를 확인합니다."""
    try:
        from app.models.asset import Asset, AssetType
        
        # 자산 정보 조회
        asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
        if asset:
            logger.info(f"✅ 자산 정보 확인:")
            logger.info(f"   - ID: {asset.asset_id}")
            logger.info(f"   - 티커: {asset.ticker}")
            logger.info(f"   - 이름: {asset.name}")
            logger.info(f"   - 타입: {asset.asset_type.type_name if asset.asset_type else 'Unknown'}")
            logger.info(f"   - 활성화 상태: {asset.is_active}")
            logger.info(f"   - 수집 설정: {asset.collection_settings}")
        else:
            logger.error(f"❌ 자산 ID {asset_id}를 찾을 수 없습니다.")
            
    except Exception as e:
        logger.error(f"자산 정보 확인 중 오류: {e}")

async def check_db_results(db, asset_id: int, ticker: str, expected_count: int):
    """DB 저장 결과를 확인합니다."""
    try:
        from sqlalchemy import text
        
        # 전체 레코드 수 확인
        result = db.execute(text(f"""
            SELECT COUNT(*) as total_records, 
                   MAX(timestamp_utc) as latest_record,
                   MIN(timestamp_utc) as earliest_record
            FROM ohlcv_data 
            WHERE asset_id = {asset_id}
        """)).fetchone()
        
        if result:
            total_records = result[0]
            latest_record = result[1]
            earliest_record = result[2]
            
            logger.info(f"✅ DB 저장 결과 확인:")
            logger.info(f"   - 총 레코드 수: {total_records:,}개")
            logger.info(f"   - 최신 데이터: {latest_record}")
            logger.info(f"   - 최초 데이터: {earliest_record}")
            
            if expected_count > 0:
                logger.info(f"   - 예상 추가 레코드: {expected_count}개")
                
            # 최근 3개 레코드 확인
            recent_records = db.execute(text(f"""
                SELECT timestamp_utc, open_price, high_price, low_price, close_price, volume
                FROM ohlcv_data 
                WHERE asset_id = {asset_id}
                ORDER BY timestamp_utc DESC 
                LIMIT 3
            """)).fetchall()
            
            if recent_records:
                logger.info(f"   - 최근 3개 레코드:")
                for i, record in enumerate(recent_records, 1):
                    logger.info(f"     {i}. {record[0]} | O:{record[1]:.2f} H:{record[2]:.2f} L:{record[3]:.2f} C:{record[4]:.2f} V:{record[5]:,.0f}")
        else:
            logger.warning(f"⚠️ 자산 ID {asset_id}에 대한 데이터가 없습니다.")
            
    except Exception as e:
        logger.error(f"DB 결과 확인 중 오류: {e}")

async def generate_summary_report(db, test_assets):
    """전체 테스트 요약 보고서를 생성합니다."""
    try:
        from sqlalchemy import text
        
        logger.info(f"\n{'='*50}")
        logger.info(f"📊 전체 테스트 요약 보고서")
        logger.info(f"{'='*50}")
        logger.info(f"테스트 완료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"테스트 대상 자산 수: {len(test_assets)}개")
        
        # 전체 통계
        total_stats = db.execute(text("""
            SELECT 
                COUNT(DISTINCT asset_id) as total_assets,
                COUNT(*) as total_records,
                MIN(timestamp_utc) as earliest_data,
                MAX(timestamp_utc) as latest_data
            FROM ohlcv_data
        """)).fetchone()
        
        if total_stats:
            logger.info(f"\n📈 전체 데이터베이스 통계:")
            logger.info(f"   - 총 자산 수: {total_stats[0]}개")
            logger.info(f"   - 총 레코드 수: {total_stats[1]:,}개")
            logger.info(f"   - 데이터 범위: {total_stats[2]} ~ {total_stats[3]}")
        
        # 자산별 통계
        logger.info(f"\n📋 테스트 자산별 상세 통계:")
        for asset_info in test_assets:
            asset_id = asset_info["id"]
            ticker = asset_info["ticker"]
            
            asset_stats = db.execute(text(f"""
                SELECT 
                    COUNT(*) as records,
                    MAX(timestamp_utc) as latest,
                    MIN(timestamp_utc) as earliest
                FROM ohlcv_data 
                WHERE asset_id = {asset_id}
            """)).fetchone()
            
            if asset_stats:
                logger.info(f"   {ticker} (ID: {asset_id}):")
                logger.info(f"     - 레코드 수: {asset_stats[0]:,}개")
                logger.info(f"     - 최신 데이터: {asset_stats[1]}")
                logger.info(f"     - 최초 데이터: {asset_stats[2]}")
        
        logger.info(f"\n✅ 전체 데이터 파이프라인 테스트가 성공적으로 완료되었습니다!")
        logger.info(f"{'='*50}")
        
    except Exception as e:
        logger.error(f"요약 보고서 생성 중 오류: {e}")

async def main():
    """
    OHLCVCollector -> Redis Queue -> DataProcessor -> DB
    전체 데이터 파이프라인을 테스트합니다.
    """
    logger.info("--- 전체 데이터 파이프라인 테스트 시작 ---")
    
    # --- 의존성 설정 ---
    db = next(get_db())
    config_manager = ConfigManager()
    api_manager = ApiStrategyManager()
    redis_queue_manager = RedisQueueManager(config_manager=config_manager)
    
    # 사용 가능한 Collector 목록 (선택적으로 활성화/비활성화 가능)
    available_collectors = {
        'OHLCVCollector': {
            'class': OHLCVCollector,
            'assets': [
                {"id": 4, "ticker": "SPY", "type": "ETF", "description": "SPDR S&P 500 ETF Trust"},
                {"id": 8, "ticker": "AAPL", "type": "Stock", "description": "Apple Inc."},
                {"id": 1, "ticker": "BTCUSDT", "type": "Crypto", "description": "Bitcoin"},
            ],
            'intervals': ["1d", "4h"]
        },
        'StockCollector': {
            'class': StockCollector,
            'assets': [
                {"id": 8, "ticker": "AAPL", "type": "Stock", "description": "Apple Inc."},
            ],
            'intervals': ["1d"]
        },
        'ETFCollector': {
            'class': ETFCollector,
            'assets': [
                {"id": 4, "ticker": "SPY", "type": "ETF", "description": "SPDR S&P 500 ETF Trust"},
            ],
            'intervals': ["1d"]
        },
        'CryptoDataCollector': {
            'class': CryptoDataCollector,
            'assets': [
                {"id": 1, "ticker": "BTCUSDT", "type": "Crypto", "description": "Bitcoin"},
            ],
            'intervals': ["1d"]
        },
        'OnchainCollector': {
            'class': OnchainCollector,
            'assets': [
                {"id": 1, "ticker": "BTCUSDT", "type": "Crypto", "description": "Bitcoin MVRV-Z-Score"},
            ],
            'intervals': ["1d"],
            'metrics': ["mvrv_z_score"]
        },
        'WorldAssetsCollector': {
            'class': WorldAssetsCollector,
            'assets': [
                {"id": 1, "ticker": "BTCUSDT", "type": "Crypto", "description": "Bitcoin"},
            ],
            'intervals': ["1d"]
        },
    } 
    
    # 테스트할 Collector 선택 (명령행 인자로 받거나 모든 수집기 테스트)
    import sys
    if len(sys.argv) > 1:
        if sys.argv[1] == 'ALL':
            # 모든 수집기 테스트
            collectors_to_test = list(available_collectors.keys())
        else:
            collectors_to_test = [sys.argv[1]]
    else:
        collectors_to_test = ['OHLCVCollector']  # 기본값
    
    # 존재하지 않는 수집기 필터링
    valid_collectors = [name for name in collectors_to_test if name in available_collectors]
    if not valid_collectors:
        logger.error(f"Unknown collector(s): {collectors_to_test}. Available: {list(available_collectors.keys())}")
        return
    
    logger.info(f"테스트할 Collector들: {valid_collectors}")
    logger.info(f"총 {len(valid_collectors)}개 수집기 테스트 예정")

    try:
        # 각 수집기별로 테스트 실행
        for collector_name in valid_collectors:
            collector_config = available_collectors[collector_name]
            test_assets = collector_config['assets']
            test_intervals = collector_config['intervals']
            
            logger.info(f"\n{'='*60}")
            logger.info(f"🔧 수집기 테스트 시작: {collector_name}")
            logger.info(f"{'='*60}")
            logger.info(f"테스트할 자산 수: {len(test_assets)}개")
            logger.info(f"테스트할 간격: {test_intervals}")
            
            # 각 간격별로 테스트 실행
            for test_interval in test_intervals:
                logger.info(f"\n{'='*40}")
                logger.info(f"📊 간격 테스트 시작: {test_interval}")
                logger.info(f"{'='*40}")
                
                for asset_info in test_assets:
                    test_asset_id = asset_info["id"]
                    ticker = asset_info["ticker"]
                    asset_type = asset_info["type"]
                    description = asset_info["description"]
                    
                    logger.info(f"\n{'='*20} 자산 테스트 시작: {ticker} (ID: {test_asset_id}) {'='*20}")
                    logger.info(f"자산 정보: {description} ({asset_type})")
                    logger.info(f"테스트 간격: {test_interval}")
                    logger.info(f"테스트 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

                    # --- 1. 자산 정보 확인 ---
                    logger.info(f"--- 1단계: 자산 정보 확인 ---")
                    await check_asset_info(db, test_asset_id, ticker, asset_type)

                    # --- 2. 데이터 수집 및 큐 저장 테스트 ---
                    logger.info(f"--- 2단계: 자산 ID {test_asset_id}에 대한 데이터 수집 및 큐 저장 ---")
                    collector = collector_config['class'](db, config_manager, api_manager, redis_queue_manager)
                    
                    # 특정 자산에 대한 데이터 수집 실행
                    if collector_name == 'OHLCVCollector':
                        result = await collector._fetch_and_enqueue_for_asset(test_asset_id, test_interval)
                    else:
                        # 다른 Collector들은 collect_with_settings() 사용
                        result = await collector.collect_with_settings()
                    
                    if not result.get("success"):
                        logger.error(f"데이터 수집 실패: {result.get('error')}")
                        continue # 다음 자산으로 넘어감

                    enqueued_count = result.get("enqueued_count", 0)
                    if enqueued_count == 0:
                        logger.warning("큐에 추가된 데이터가 없습니다. (이미 최신 데이터일 수 있음)")
                    else:
                        logger.info(f"✅ {enqueued_count}개의 레코드가 Redis 큐에 성공적으로 추가되었습니다.")

                    # 큐에 데이터가 들어갔는지 확인
                    queue_size = await redis_queue_manager.get_queue_size()
                    logger.info(f"현재 Redis 'batch_data_queue'의 작업 개수: {queue_size}")
                    if queue_size == 0:
                        logger.warning("큐가 비어있어 데이터 처리 단계를 건너뜁니다.")
                        continue # 다음 자산으로 넘어감

                    # --- 3. 데이터 처리 및 DB 저장 테스트 ---
                    logger.info("--- 3단계: 데이터 처리 및 DB 저장 (5초 후 시작) ---")
                    await asyncio.sleep(5)
                    
                    processor = DataProcessor()
                    await processor._connect_redis()
                    
                    # 큐에 있는 모든 작업을 처리
                    processed_count = await processor._process_batch_queue()
                    
                    logger.info(f"✅ {processed_count}개의 배치 작업을 처리했습니다.")

                    # --- 4. DB 저장 결과 확인 ---
                    logger.info(f"--- 4단계: DB 저장 결과 확인 ---")
                    await check_db_results(db, test_asset_id, ticker, enqueued_count)

                    logger.info(f"--- 자산 테스트 종료: {ticker} ---")
                
                logger.info(f"\n📊 간격 테스트 완료: {test_interval}")
                logger.info(f"{'='*40}")
            
            logger.info(f"\n🔧 수집기 테스트 완료: {collector_name}")
            logger.info(f"{'='*60}")

        logger.info("\n--- 모든 수집기 테스트 완료 ---")
        
        # 전체 요약 정보
        all_test_assets = []
        for collector_name in valid_collectors:
            all_test_assets.extend(available_collectors[collector_name]['assets'])
        await generate_summary_report(db, all_test_assets)

    except Exception as e:
        logger.error(f"테스트 중 오류 발생: {e}", exc_info=True)
    finally:
        # 리소스 정리
        db.close()
        if redis_queue_manager.redis_client:
            await redis_queue_manager.redis_client.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] in ['-h', '--help', 'help']:
        print("""
전체 데이터 파이프라인 테스트 스크립트

사용법:
    python scripts/test_full_pipeline.py [CollectorName|ALL]

사용 가능한 Collector:
    - OHLCVCollector (기본값)
    - StockCollector
    - ETFCollector
    - CryptoDataCollector
    - OnchainCollector
    - IndexCollector
    - WorldAssetsCollector

예시:
    python scripts/test_full_pipeline.py                    # OHLCVCollector 테스트 (기본)
    python scripts/test_full_pipeline.py OHLCVCollector     # OHLCVCollector 테스트
    python scripts/test_full_pipeline.py ALL                # 모든 수집기 테스트
    python scripts/test_full_pipeline.py StockCollector     # StockCollector 테스트

각 Collector는 해당하는 자산들과 간격으로 테스트됩니다.
""")
        sys.exit(0)
    
    asyncio.run(main())