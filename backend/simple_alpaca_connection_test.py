#!/usr/bin/env python3
"""
Alpaca API 기본 연결 테스트
연결 제한 문제를 확인하기 위한 간단한 테스트
"""

import asyncio
import logging
import os
import sys
from alpaca_trade_api.stream import Stream

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Alpaca API 설정
ALPACA_API_KEY = os.getenv("ALPACA_API_KEY")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")

async def test_alpaca_connection():
    """Alpaca API 기본 연결 테스트"""
    logger.info("=== Alpaca API 연결 테스트 시작 ===")
    
    if not ALPACA_API_KEY or not ALPACA_SECRET_KEY:
        logger.error("Alpaca API 키가 설정되지 않았습니다.")
        return
    
    logger.info(f"API Key: {ALPACA_API_KEY[:10]}...")
    logger.info(f"Secret Key: {ALPACA_SECRET_KEY[:10]}...")
    
    try:
        # Stream 객체 생성
        logger.info("Alpaca Stream 객체 생성 중...")
        stream = Stream(ALPACA_API_KEY, ALPACA_SECRET_KEY, data_feed='iex')
        logger.info("✅ Alpaca Stream 객체 생성 성공")
        
        # 간단한 거래 핸들러 (async 함수여야 함)
        async def simple_trade_handler(trade_data):
            logger.info(f"거래 데이터 수신: {trade_data.symbol} - ${trade_data.price}")
        
        # AAPL만 구독
        logger.info("AAPL 구독 중...")
        stream.subscribe_trades(simple_trade_handler, 'AAPL')
        logger.info("✅ AAPL 구독 완료")
        
        # 10초간 실행
        logger.info("10초간 데이터 수신 대기...")
        await asyncio.sleep(10)
        
        # 연결 종료
        logger.info("연결 종료 중...")
        await stream.close()
        logger.info("✅ 연결 종료 완료")
        
    except ValueError as e:
        if "connection limit exceeded" in str(e):
            logger.error(f"❌ 연결 제한 초과: {e}")
            logger.info("💡 해결 방법:")
            logger.info("1. 다른 Alpaca 계정 사용")
            logger.info("2. 기존 연결들을 모두 종료")
            logger.info("3. 잠시 후 재시도")
        else:
            logger.error(f"❌ ValueError: {e}")
    except Exception as e:
        logger.error(f"❌ 예상치 못한 오류: {e}")
    
    logger.info("=== 테스트 완료 ===")

if __name__ == "__main__":
    try:
        asyncio.run(test_alpaca_connection())
    except KeyboardInterrupt:
        logger.info("사용자에 의해 중단됨")
    except Exception as e:
        logger.error(f"예상치 못한 오류: {e}")
        sys.exit(1)
