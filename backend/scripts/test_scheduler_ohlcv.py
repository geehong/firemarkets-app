#!/usr/bin/env python3
"""
스케줄러를 통한 정상적인 OHLCV 수집 테스트
"""
import asyncio
import sys
import os
from datetime import datetime

# 프로젝트 루트를 Python 경로에 추가
sys.path.append('/app')

from app.services.scheduler_service import SchedulerService
from app.utils.logger import logger

async def test_scheduler_ohlcv_collection():
    """스케줄러를 통한 OHLCV 수집 테스트"""
    logger.info("🚀 스케줄러를 통한 OHLCV 수집 테스트 시작")
    
    try:
        # 스케줄러 서비스 생성
        scheduler_service = SchedulerService()
        logger.info("✅ SchedulerService 인스턴스 생성 완료")
        
        # 모든 수집 작업을 한 번씩 실행
        logger.info("📊 모든 수집 작업 실행 중...")
        result = await scheduler_service.run_all_collections_once()
        
        if result["success"]:
            logger.info("✅ 모든 수집 작업 완료")
            logger.info(f"📋 결과: {result['message']}")
            
            # 각 수집기별 결과 출력
            for collector_result in result["results"]:
                collector_name = collector_result["collector"]
                success = collector_result["success"]
                message = collector_result["message"]
                duration = collector_result.get("duration", 0)
                
                status_icon = "✅" if success else "❌"
                logger.info(f"{status_icon} {collector_name}: {message} (소요시간: {duration:.2f}초)")
                
                # OHLCV 수집기 결과 상세 출력
                if collector_name == "OHLCV":
                    logger.info(f"   📈 OHLCV 수집기 상세 결과: {collector_result}")
        else:
            logger.error(f"❌ 수집 작업 실패: {result['message']}")
            
    except Exception as e:
        logger.error(f"❌ 테스트 실행 중 오류: {e}")
        import traceback
        logger.error(f"상세 오류: {traceback.format_exc()}")

async def test_ohlcv_only():
    """OHLCV 수집기만 테스트"""
    logger.info("🎯 OHLCV 수집기만 테스트 시작")
    
    try:
        from app.collectors.ohlcv_collector import OHLCVCollector
        from app.core.database import SessionLocal
        from app.core.config_manager import ConfigManager
        from app.services.api_strategy_manager import ApiStrategyManager
        from app.utils.redis_queue_manager import RedisQueueManager
        
        # 의존성 주입
        db = SessionLocal()
        config_manager = ConfigManager()
        api_manager = ApiStrategyManager()
        redis_queue_manager = RedisQueueManager(config_manager=config_manager)
        
        try:
            # OHLCV 수집기 인스턴스 생성
            ohlcv_collector = OHLCVCollector(
                db=db,
                config_manager=config_manager,
                api_manager=api_manager,
                redis_queue_manager=redis_queue_manager
            )
            
            logger.info("✅ OHLCVCollector 인스턴스 생성 완료")
            
            # 수집 실행
            logger.info("📊 OHLCV 수집 실행 중...")
            result = await ohlcv_collector.collect_with_settings()
            
            logger.info(f"📋 OHLCV 수집 결과: {result}")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ OHLCV 테스트 실행 중 오류: {e}")
        import traceback
        logger.error(f"상세 오류: {traceback.format_exc()}")

async def main():
    """메인 함수"""
    logger.info("=" * 60)
    logger.info("🧪 스케줄러를 통한 OHLCV 수집 테스트")
    logger.info(f"⏰ 시작 시간: {datetime.now()}")
    logger.info("=" * 60)
    
    # 테스트 옵션 선택
    test_option = input("테스트 옵션을 선택하세요:\n1. 모든 수집기 테스트\n2. OHLCV만 테스트\n선택 (1 또는 2): ").strip()
    
    if test_option == "1":
        await test_scheduler_ohlcv_collection()
    elif test_option == "2":
        await test_ohlcv_only()
    else:
        logger.info("기본값으로 모든 수집기 테스트를 실행합니다.")
        await test_scheduler_ohlcv_collection()
    
    logger.info("=" * 60)
    logger.info("🏁 테스트 완료")
    logger.info(f"⏰ 종료 시간: {datetime.now()}")
    logger.info("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())

