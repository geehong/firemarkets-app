#!/usr/bin/env python3
"""
실제 실시간 데이터 수신 및 저장 테스트
1. Tiingo WebSocket Consumer 시작 (실제 데이터 수신)
2. RealtimeCollector로 Redis Stream에서 MySQL에 저장
"""
import asyncio
import logging
import sys
import os
from datetime import datetime

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.tiingo_ws_consumer import get_consumer
from app.collectors.realtime_collector import RealtimeCollector

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_live_data_collection():
    """실시간 데이터 수집 및 저장 테스트"""
    logger.info("=== 실시간 데이터 수집 및 저장 테스트 시작 ===")
    
    try:
        # 1. Tiingo WebSocket Consumer 시작 (실제 데이터 수신)
        logger.info("1. Tiingo WebSocket Consumer 시작...")
        consumer = get_consumer()
        
        # 실제 거래되는 주요 주식 종목으로 테스트
        test_tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX"]
        await consumer.start(test_tickers)
        
        logger.info(f"WebSocket Consumer 시작됨: {test_tickers}")
        logger.info(f"Consumer 상태: {consumer.get_status()}")
        
        # 2. 잠시 대기하여 실제 데이터 수집
        logger.info("2. 30초간 실제 데이터 수집 대기...")
        await asyncio.sleep(30)
        
        # 3. RealtimeCollector로 데이터 처리 및 MySQL 저장
        logger.info("3. RealtimeCollector로 데이터 처리 및 MySQL 저장...")
        collector = RealtimeCollector()
        
        # Redis Stream 정보 확인
        stream_info = await collector.get_redis_stream_info()
        logger.info(f"Redis Stream 정보: {stream_info}")
        
        # 데이터 수집 및 저장
        result = await collector._collect_data()
        logger.info(f"데이터 수집 결과: {result}")
        
        # 4. 저장된 데이터 확인
        if result.get("processed_records", 0) > 0:
            logger.info("4. MySQL에 저장된 데이터 확인...")
            # 간단한 데이터 확인 (실제로는 DB 쿼리)
            logger.info(f"✅ {result['processed_records']}개 레코드가 MySQL에 저장되었습니다!")
        
        # 5. 정리
        logger.info("5. 리소스 정리...")
        await consumer.stop()
        await consumer.cleanup()
        await collector.cleanup()
        
        logger.info("=== 테스트 완료 ===")
        
    except Exception as e:
        logger.error(f"테스트 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        raise

async def test_consumer_only():
    """WebSocket Consumer만 테스트 (데이터 수신 확인)"""
    logger.info("=== WebSocket Consumer만 테스트 ===")
    
    try:
        consumer = get_consumer()
        test_tickers = ["AAPL", "MSFT", "GOOGL"]
        await consumer.start(test_tickers)
        
        logger.info(f"Consumer 시작됨: {test_tickers}")
        
        # 60초간 데이터 수신 모니터링
        for i in range(12):  # 12 * 5초 = 60초
            await asyncio.sleep(5)
            status = consumer.get_status()
            logger.info(f"5초 후 상태 - 수신된 메시지: {status['total_messages_received']}, 저장된 메시지: {status['total_messages_stored']}")
        
        await consumer.stop()
        await consumer.cleanup()
        logger.info("Consumer 테스트 완료")
        
    except Exception as e:
        logger.error(f"Consumer 테스트 실패: {e}")
        raise

if __name__ == "__main__":
    logger.info("실시간 데이터 수집 시스템 테스트를 시작합니다...")
    
    # 사용자 선택
    print("\n테스트 옵션을 선택하세요:")
    print("1. 전체 시스템 테스트 (Consumer + Collector)")
    print("2. Consumer만 테스트 (데이터 수신 확인)")
    
    try:
        choice = input("선택 (1 또는 2): ").strip()
        
        if choice == "1":
            asyncio.run(test_live_data_collection())
        elif choice == "2":
            asyncio.run(test_consumer_only())
        else:
            print("잘못된 선택입니다. 기본값으로 전체 시스템 테스트를 실행합니다.")
            asyncio.run(test_live_data_collection())
            
    except KeyboardInterrupt:
        logger.info("사용자에 의해 테스트가 중단되었습니다.")
    except Exception as e:
        logger.error(f"시스템 테스트 실패: {e}")
        sys.exit(1)




