#!/usr/bin/env python3
"""
ETF 수집 테스트 스크립트
AlphaVantage demo API 키를 사용하여 ETF 수집 코드가 정상 작동하는지 확인
"""

import asyncio
import logging
import sys
import os
from typing import Optional

# 프로젝트 루트를 Python 경로에 추가
sys.path.append('/app')

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_etf_collection():
    """ETF 수집 과정을 단계별로 테스트"""
    
    try:
        # 1. 필요한 모듈 import
        logger.info("=== ETF 수집 테스트 시작 ===")
        
        from app.core.config_manager import ConfigManager
        from app.utils.redis_queue_manager import RedisQueueManager
        from app.collectors.etf_collector import ETFCollector
        from app.services.api_strategy_manager import ApiStrategyManager
        from app.external_apis.implementations.alpha_vantage_client import AlphaVantageClient
        
        # 2. ConfigManager 초기화
        logger.info("1. ConfigManager 초기화...")
        config_manager = ConfigManager()
        
        # 3. RedisQueueManager 초기화
        logger.info("2. RedisQueueManager 초기화...")
        redis_queue_manager = RedisQueueManager(config_manager)
        
        # 4. ApiStrategyManager 초기화
        logger.info("3. ApiStrategyManager 초기화...")
        api_manager = ApiStrategyManager(config_manager)
        
        # 5. ETFCollector 초기화
        logger.info("4. ETFCollector 초기화...")
        from app.core.database import SessionLocal
        db = SessionLocal()
        collector = ETFCollector(db, config_manager, api_manager, redis_queue_manager)
        
        # 5. AlphaVantage 클라이언트 직접 테스트 (demo 키 사용)
        logger.info("4. AlphaVantage 클라이언트 직접 테스트...")
        
        # demo 키로 AlphaVantage 클라이언트 생성
        demo_client = AlphaVantageClient()
        demo_client.api_keys = ['demo']  # demo 키 사용
        
        # QQQ ETF 정보 가져오기 테스트
        logger.info("   - QQQ ETF 정보 가져오기 테스트...")
        etf_data = await demo_client.get_etf_info('QQQ')
        
        if etf_data:
            logger.info(f"   ✅ ETF 데이터 수집 성공!")
            logger.info(f"   - Symbol: {etf_data.symbol}")
            logger.info(f"   - Net Assets: {etf_data.net_assets}")
            logger.info(f"   - Expense Ratio: {etf_data.net_expense_ratio}")
            logger.info(f"   - Dividend Yield: {etf_data.dividend_yield}")
            logger.info(f"   - Holdings Count: {len(etf_data.holdings) if etf_data.holdings else 0}")
        else:
            logger.error("   ❌ ETF 데이터 수집 실패")
            return False
        
        # 6. ApiStrategyManager 테스트
        logger.info("5. ApiStrategyManager 테스트...")
        api_manager = ApiStrategyManager(config_manager)
        
        # demo 키로 etf_clients 설정
        api_manager.etf_clients = [demo_client]
        
        # SPY ETF 정보 가져오기 테스트
        logger.info("   - SPY ETF 정보 가져오기 테스트...")
        spy_data = await api_manager.get_etf_info(asset_id=4)  # SPY의 asset_id
        
        if spy_data:
            logger.info(f"   ✅ SPY ETF 데이터 수집 성공!")
            logger.info(f"   - Symbol: {spy_data.symbol}")
            logger.info(f"   - Net Assets: {spy_data.net_assets}")
        else:
            logger.warning("   ⚠️ SPY ETF 데이터 수집 실패 (demo 키 제한으로 예상됨)")
            logger.info("   계속 진행합니다...")
        
        # 7. ETFCollector의 _get_target_asset_ids 테스트
        logger.info("6. ETFCollector 대상 자산 조회 테스트...")
        asset_ids = collector._get_target_asset_ids()
        logger.info(f"   - 대상 자산 수: {len(asset_ids)}")
        logger.info(f"   - 대상 자산 IDs: {asset_ids[:5]}...")  # 처음 5개만 표시
        
        if not asset_ids:
            logger.error("   ❌ 대상 자산이 없습니다")
            return False
        
        # 8. ETFCollector의 _fetch_and_enqueue_for_asset 테스트 (demo 키 사용)
        logger.info("7. ETFCollector 데이터 수집 및 큐 전달 테스트...")
        
        # demo 키로 collector의 api_manager 설정
        collector.api_manager.etf_clients = [demo_client]
        
        # 첫 번째 자산으로 테스트
        test_asset_id = asset_ids[0]
        logger.info(f"   - 테스트 자산 ID: {test_asset_id}")
        
        result = await collector._fetch_and_enqueue_for_asset(test_asset_id)
        logger.info(f"   - 결과: {result}")
        
        if result.get('success') and result.get('enqueued_count', 0) > 0:
            logger.info("   ✅ 데이터 수집 및 큐 전달 성공!")
        else:
            logger.error("   ❌ 데이터 수집 또는 큐 전달 실패")
            return False
        
        # 9. Redis 큐 확인
        logger.info("8. Redis 큐 상태 확인...")
        queue_length = await redis_queue_manager.redis_client.llen('etf_info')
        logger.info(f"   - etf_info 큐 길이: {queue_length}")
        
        if queue_length > 0:
            logger.info("   ✅ Redis 큐에 데이터가 있습니다!")
        else:
            logger.warning("   ⚠️ Redis 큐가 비어있습니다")
        
        logger.info("=== ETF 수집 테스트 완료 ===")
        return True
        
    except Exception as e:
        logger.error(f"❌ 테스트 중 오류 발생: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

async def main():
    """메인 함수"""
    success = await test_etf_collection()
    
    if success:
        logger.info("🎉 모든 테스트가 성공했습니다!")
        sys.exit(0)
    else:
        logger.error("💥 테스트가 실패했습니다!")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
