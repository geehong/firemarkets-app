#!/usr/bin/env python3
"""
Alpaca WebSocket Consumer 테스트 스크립트
실시간 데이터 수집 및 저장 시스템을 테스트합니다.
"""

import asyncio
import logging
import sys
import os
from datetime import datetime

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.alpaca_ws_consumer import AlpacaWSConsumer
from app.collectors.realtime_collector import RealtimeCollector
from app.core.database import SessionLocal

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_alpaca_system():
    """Alpaca 실시간 데이터 수집 시스템 테스트"""
    logger.info("=== Alpaca 실시간 데이터 수집 및 저장 테스트 시작 ===")
    
    # 1. Alpaca WebSocket Consumer 시작
    logger.info("1. Alpaca WebSocket Consumer 시작...")
    consumer = AlpacaWSConsumer()
    
    try:
        # Consumer 시작
        await consumer.start(['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'])
        
        # Consumer 상태 확인
        status = consumer.get_status()
        logger.info(f"Consumer 상태: {status}")
        
        # 2. 30초간 실제 데이터 수집 대기
        logger.info("2. 30초간 실제 데이터 수집 대기...")
        await asyncio.sleep(30)
        
        # 3. RealtimeCollector로 데이터 처리 및 MySQL 저장
        logger.info("3. RealtimeCollector로 데이터 처리 및 MySQL 저장...")
        db = SessionLocal()
        collector = RealtimeCollector(db)
        
        result = await collector._collect_data()
        logger.info(f"데이터 수집 결과: {result}")
        
        # 4. 저장된 데이터 확인
        if result.get('processed_records', 0) > 0:
            logger.info(f"4. {result['processed_records']}개의 레코드가 저장되었습니다.")
        else:
            logger.info("4. 저장된 데이터가 없습니다.")
        
        # 5. Redis Stream 정보 확인
        stream_info = await collector.get_redis_stream_info()
        logger.info(f"Redis Stream 정보: {stream_info}")
        
    except Exception as e:
        logger.error(f"테스트 중 오류 발생: {e}")
    finally:
        # 6. 리소스 정리
        logger.info("5. 리소스 정리...")
        await consumer.stop()
        await collector.cleanup()
        logger.info("=== 테스트 완료 ===")

if __name__ == "__main__":
    try:
        asyncio.run(test_alpaca_system())
    except KeyboardInterrupt:
        logger.info("사용자에 의해 중단됨")
    except Exception as e:
        logger.error(f"예상치 못한 오류: {e}")
        sys.exit(1)
