#!/usr/bin/env python3
"""
Alpaca 연결 단계별 디버깅 스크립트
어디서 멈추는지 정확히 파악하기 위한 테스트
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

async def debug_alpaca_step_by_step():
    """Alpaca 연결을 단계별로 디버깅"""
    logger.info("=== Alpaca 단계별 디버깅 시작 ===")
    
    # 1단계: API 키 확인
    logger.info("1단계: API 키 확인")
    if not ALPACA_API_KEY or not ALPACA_SECRET_KEY:
        logger.error("API 키가 설정되지 않았습니다.")
        return
    logger.info(f"✅ API Key: {ALPACA_API_KEY[:10]}...")
    logger.info(f"✅ Secret Key: {ALPACA_SECRET_KEY[:10]}...")
    
    # 2단계: Stream 객체 생성
    logger.info("2단계: Stream 객체 생성")
    try:
        stream = Stream(ALPACA_API_KEY, ALPACA_SECRET_KEY, data_feed='iex')
        logger.info("✅ Stream 객체 생성 성공")
    except Exception as e:
        logger.error(f"❌ Stream 객체 생성 실패: {e}")
        return
    
    # 3단계: 거래 핸들러 정의
    logger.info("3단계: 거래 핸들러 정의")
    async def trade_handler(trade_data):
        logger.info(f"거래 데이터 수신: {trade_data.symbol} - ${trade_data.price}")
    
    # 4단계: 구독 설정
    logger.info("4단계: 구독 설정")
    try:
        stream.subscribe_trades(trade_handler, 'AAPL')
        logger.info("✅ AAPL 구독 설정 성공")
    except Exception as e:
        logger.error(f"❌ 구독 설정 실패: {e}")
        return
    
    # 5단계: 연결 시도
    logger.info("5단계: 연결 시도 (5초간)")
    try:
        # 5초 타임아웃으로 연결 시도
        await asyncio.wait_for(stream._run_forever(), timeout=5.0)
        logger.info("✅ 연결 성공!")
    except asyncio.TimeoutError:
        logger.info("⏰ 5초 타임아웃 - 연결 시도 중...")
    except ValueError as e:
        if "connection limit exceeded" in str(e):
            logger.error(f"❌ 연결 제한 초과: {e}")
        else:
            logger.error(f"❌ ValueError: {e}")
    except Exception as e:
        logger.error(f"❌ 예상치 못한 오류: {e}")
    
    logger.info("=== 디버깅 완료 ===")

if __name__ == "__main__":
    try:
        asyncio.run(debug_alpaca_step_by_step())
    except KeyboardInterrupt:
        logger.info("사용자에 의해 중단됨")
    except Exception as e:
        logger.error(f"예상치 못한 오류: {e}")
        sys.exit(1)


