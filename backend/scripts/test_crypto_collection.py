#!/usr/bin/env python3
"""
암호화폐 데이터 수집 테스트 스크립트
CryptoDataCollector -> Redis Queue -> DataProcessor -> DB
"""
import asyncio
import sys
import os
from datetime import datetime

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.collectors.crypto_data_collector import CryptoDataCollector
from app.services.data_processor import DataProcessor
from app.core.database import get_db
from app.utils.logger import logger
from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager

async def check_crypto_assets(db):
    """데이터베이스에서 암호화폐 자산들을 확인합니다."""
    try:
        from app.models.asset import Asset, AssetType
        from sqlalchemy import and_
        
        # 암호화폐 자산 조회
        crypto_assets = db.query(Asset).join(AssetType).filter(
            and_(
                AssetType.type_name == 'Crypto',
                Asset.is_active == True
            )
        ).all()
        
        logger.info(f"✅ 데이터베이스에서 {len(crypto_assets)}개의 활성 암호화폐 자산을 찾았습니다:")
        for asset in crypto_assets:
            logger.info(f"   - ID: {asset.asset_id}, 티커: {asset.ticker}, 이름: {asset.name}")
        
        return crypto_assets
        
    except Exception as e:
        logger.error(f"암호화폐 자산 확인 중 오류: {e}")
        return []

async def check_crypto_data_table(db):
    """crypto_data 테이블의 현재 상태를 확인합니다."""
    try:
        from sqlalchemy import text
        
        # crypto_data 테이블 통계
        result = db.execute(text("""
            SELECT 
                COUNT(*) as total_records,
                MAX(last_updated) as latest_update,
                MIN(last_updated) as earliest_update,
                COUNT(DISTINCT asset_id) as unique_assets
            FROM crypto_data
        """)).fetchone()
        
        if result:
            logger.info(f"📊 crypto_data 테이블 현황:")
            logger.info(f"   - 총 레코드 수: {result[0]}개")
            logger.info(f"   - 최신 업데이트: {result[1]}")
            logger.info(f"   - 최초 업데이트: {result[2]}")
            logger.info(f"   - 고유 자산 수: {result[3]}개")
        
        # 최근 업데이트된 자산들
        recent_assets = db.execute(text("""
            SELECT asset_id, symbol, name, last_updated
            FROM crypto_data
            ORDER BY last_updated DESC
            LIMIT 5
        """)).fetchall()
        
        if recent_assets:
            logger.info(f"   - 최근 업데이트된 자산들:")
            for asset in recent_assets:
                logger.info(f"     * {asset[1]} ({asset[2]}) - {asset[3]}")
                
    except Exception as e:
        logger.error(f"crypto_data 테이블 확인 중 오류: {e}")

async def test_crypto_collection():
    """암호화폐 데이터 수집을 테스트합니다."""
    logger.info("--- 암호화폐 데이터 수집 테스트 시작 ---")
    
    # 의존성 설정
    db = next(get_db())
    config_manager = ConfigManager()
    api_manager = ApiStrategyManager()
    redis_queue_manager = RedisQueueManager(config_manager=config_manager)
    
    try:
        # 1. 현재 상태 확인
        logger.info("--- 1단계: 현재 상태 확인 ---")
        crypto_assets = await check_crypto_assets(db)
        await check_crypto_data_table(db)
        
        if not crypto_assets:
            logger.error("❌ 테스트할 암호화폐 자산이 없습니다.")
            return
        
        # 2. 암호화폐 수집기 생성 및 테스트
        logger.info("--- 2단계: 암호화폐 데이터 수집 테스트 ---")
        collector = CryptoDataCollector(db, config_manager, api_manager, redis_queue_manager)
        
        # 첫 번째 암호화폐 자산으로 테스트
        test_asset = crypto_assets[0]
        logger.info(f"테스트 대상: {test_asset.ticker} (ID: {test_asset.asset_id})")
        
        # 수집 실행
        result = await collector.collect_with_settings()
        
        if result.get("success"):
            logger.info(f"✅ 암호화폐 데이터 수집 성공:")
            logger.info(f"   - 처리된 자산 수: {result.get('processed_assets', 0)}")
            logger.info(f"   - 추가된 레코드 수: {result.get('total_added_records', 0)}")
        else:
            logger.error(f"❌ 암호화폐 데이터 수집 실패: {result.get('error')}")
            return
        
        # 3. Redis 큐 상태 확인
        logger.info("--- 3단계: Redis 큐 상태 확인 ---")
        queue_size = await redis_queue_manager.get_queue_size()
        logger.info(f"현재 Redis 큐의 작업 개수: {queue_size}")
        
        if queue_size > 0:
            # 4. 데이터 처리기로 큐 처리
            logger.info("--- 4단계: 데이터 처리 및 DB 저장 ---")
            processor = DataProcessor()
            await processor._connect_redis()
            
            processed_count = await processor._process_batch_queue()
            logger.info(f"✅ {processed_count}개의 배치 작업을 처리했습니다.")
            
            # 5. 결과 확인
            logger.info("--- 5단계: 결과 확인 ---")
            await check_crypto_data_table(db)
        else:
            logger.warning("⚠️ 큐에 데이터가 없어 처리 단계를 건너뜁니다.")
        
        logger.info("--- 암호화폐 데이터 수집 테스트 완료 ---")
        
    except Exception as e:
        logger.error(f"테스트 중 오류 발생: {e}", exc_info=True)
    finally:
        # 리소스 정리
        db.close()
        if redis_queue_manager.redis_client:
            await redis_queue_manager.redis_client.close()

async def test_specific_crypto(asset_id: int):
    """특정 암호화폐 자산의 데이터 수집을 테스트합니다."""
    logger.info(f"--- 특정 암호화폐 자산 테스트 시작 (ID: {asset_id}) ---")
    
    # 의존성 설정
    db = next(get_db())
    config_manager = ConfigManager()
    api_manager = ApiStrategyManager()
    redis_queue_manager = RedisQueueManager(config_manager=config_manager)
    
    try:
        # 자산 정보 확인
        from app.models.asset import Asset
        asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
        
        if not asset:
            logger.error(f"❌ 자산 ID {asset_id}를 찾을 수 없습니다.")
            return
        
        logger.info(f"테스트 대상: {asset.ticker} (ID: {asset.asset_id}) - {asset.name}")
        
        # 암호화폐 수집기 생성
        collector = CryptoDataCollector(db, config_manager, api_manager, redis_queue_manager)
        
        # 특정 자산에 대한 데이터 수집
        result = await collector._fetch_and_enqueue_for_asset(asset_id)
        
        if result.get("success"):
            logger.info(f"✅ {asset.ticker} 데이터 수집 성공:")
            logger.info(f"   - 큐에 추가된 레코드 수: {result.get('enqueued_count', 0)}")
        else:
            logger.error(f"❌ {asset.ticker} 데이터 수집 실패: {result.get('error')}")
            return
        
        # 큐 처리
        queue_size = await redis_queue_manager.get_queue_size()
        if queue_size > 0:
            processor = DataProcessor()
            await processor._connect_redis()
            processed_count = await processor._process_batch_queue()
            logger.info(f"✅ {processed_count}개의 배치 작업을 처리했습니다.")
        
        logger.info(f"--- {asset.ticker} 테스트 완료 ---")
        
    except Exception as e:
        logger.error(f"테스트 중 오류 발생: {e}", exc_info=True)
    finally:
        db.close()
        if redis_queue_manager.redis_client:
            await redis_queue_manager.redis_client.close()

async def main():
    """메인 함수"""
    if len(sys.argv) > 1:
        if sys.argv[1] == '--help' or sys.argv[1] == '-h':
            print("""
암호화폐 데이터 수집 테스트 스크립트

사용법:
    python scripts/test_crypto_collection.py                    # 전체 암호화폐 수집 테스트
    python scripts/test_crypto_collection.py <asset_id>         # 특정 자산 테스트
    python scripts/test_crypto_collection.py --help             # 도움말

예시:
    python scripts/test_crypto_collection.py                    # 전체 테스트
    python scripts/test_crypto_collection.py 1                  # Bitcoin (ID: 1) 테스트
    python scripts/test_crypto_collection.py 2                  # Ethereum (ID: 2) 테스트
""")
            return
        
        try:
            asset_id = int(sys.argv[1])
            await test_specific_crypto(asset_id)
        except ValueError:
            logger.error("❌ 잘못된 자산 ID입니다. 숫자를 입력해주세요.")
    else:
        await test_crypto_collection()

if __name__ == "__main__":
    asyncio.run(main())







