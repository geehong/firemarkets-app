#!/usr/bin/env python3
"""
실시간 데이터 수집 시스템 테스트 스크립트
새로운 Redis Stream 기반 아키텍처를 테스트합니다.
"""
import asyncio
import logging
import sys
import os

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

async def test_realtime_system():
    """실시간 데이터 수집 시스템 테스트"""
    logger.info("=== 실시간 데이터 수집 시스템 테스트 시작 ===")
    
    try:
        # 1. Tiingo WebSocket Consumer 시작 (데이터 수신자)
        logger.info("1. Tiingo WebSocket Consumer 시작...")
        consumer = get_consumer()
        
        # 테스트용 티커 설정
        test_tickers = ["AAPL", "MSFT", "GOOGL"]
        await consumer.start(test_tickers)
        
        logger.info(f"WebSocket Consumer 시작됨: {test_tickers}")
        logger.info(f"Consumer 상태: {consumer.get_status()}")
        
        # 2. 잠시 대기하여 데이터 수집
        logger.info("2. 10초간 데이터 수집 대기...")
        await asyncio.sleep(10)
        
        # 3. RealtimeCollector로 데이터 처리 (데이터 저장자)
        logger.info("3. RealtimeCollector로 데이터 처리...")
        collector = RealtimeCollector()
        
        # Redis Stream 정보 확인
        stream_info = await collector.get_redis_stream_info()
        logger.info(f"Redis Stream 정보: {stream_info}")
        
        # 데이터 수집 및 저장
        result = await collector._collect_data()
        logger.info(f"데이터 수집 결과: {result}")
        
        # 4. 정리
        logger.info("4. 리소스 정리...")
        await consumer.stop()
        await consumer.cleanup()
        await collector.cleanup()
        
        logger.info("=== 테스트 완료 ===")
        
    except Exception as e:
        logger.error(f"테스트 중 오류 발생: {e}")
        raise

async def test_redis_only():
    """Redis 연결만 테스트"""
    logger.info("=== Redis 연결 테스트 ===")
    
    try:
        collector = RealtimeCollector()
        stream_info = await collector.get_redis_stream_info()
        logger.info(f"Redis Stream 정보: {stream_info}")
        
        await collector.cleanup()
        logger.info("Redis 연결 테스트 완료")
        
    except Exception as e:
        logger.error(f"Redis 테스트 중 오류: {e}")

if __name__ == "__main__":
    logger.info("실시간 데이터 수집 시스템 테스트를 시작합니다...")
    
    # Redis 연결만 먼저 테스트
    try:
        asyncio.run(test_redis_only())
    except Exception as e:
        logger.error(f"Redis 연결 테스트 실패: {e}")
        logger.info("Redis 서버가 실행 중인지 확인하세요.")
        sys.exit(1)
    
    # 전체 시스템 테스트
    try:
        asyncio.run(test_realtime_system())
    except KeyboardInterrupt:
        logger.info("사용자에 의해 테스트가 중단되었습니다.")
    except Exception as e:
        logger.error(f"시스템 테스트 실패: {e}")
        sys.exit(1)




