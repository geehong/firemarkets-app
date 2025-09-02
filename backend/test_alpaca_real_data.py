#!/usr/bin/env python3
"""
Alpaca 실제 거래 데이터 수신 테스트
실제 AAPL 거래 데이터를 받아오는 테스트
"""

import asyncio
import logging
import os
import sys
from datetime import datetime
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

# 데이터 수신 카운터
received_trades = 0
received_quotes = 0

async def trade_handler(trade_data):
    """실시간 거래 데이터 핸들러"""
    global received_trades
    received_trades += 1
    
    logger.info(f"🔥 거래 데이터 #{received_trades}:")
    logger.info(f"   종목: {trade_data.symbol}")
    logger.info(f"   가격: ${trade_data.price}")
    logger.info(f"   수량: {trade_data.size}")
    logger.info(f"   시간: {trade_data.timestamp}")
    logger.info(f"   거래소: {trade_data.exchange}")
    logger.info("   " + "-" * 40)

async def quote_handler(quote_data):
    """실시간 호가 데이터 핸들러"""
    global received_quotes
    received_quotes += 1
    
    logger.info(f"📊 호가 데이터 #{received_quotes}:")
    logger.info(f"   종목: {quote_data.symbol}")
    logger.info(f"   매수호가: ${quote_data.bid}")
    logger.info(f"   매도호가: ${quote_data.ask}")
    logger.info(f"   매수수량: {quote_data.bidsize}")
    logger.info(f"   매도수량: {quote_data.asksize}")
    logger.info(f"   시간: {quote_data.timestamp}")
    logger.info("   " + "-" * 40)

async def test_alpaca_real_data():
    """실제 Alpaca 데이터 수신 테스트"""
    logger.info("=== Alpaca 실제 데이터 수신 테스트 시작 ===")
    
    if not ALPACA_API_KEY or not ALPACA_SECRET_KEY:
        logger.error("API 키가 설정되지 않았습니다.")
        return
    
    logger.info(f"API Key: {ALPACA_API_KEY[:10]}...")
    logger.info(f"Secret Key: {ALPACA_SECRET_KEY[:10]}...")
    
    try:
        # Stream 객체 생성
        logger.info("Alpaca Stream 객체 생성 중...")
        stream = Stream(ALPACA_API_KEY, ALPACA_SECRET_KEY, data_feed='iex')
        logger.info("✅ Stream 객체 생성 성공")
        
        # 거래 데이터 구독
        logger.info("AAPL 거래 데이터 구독 중...")
        stream.subscribe_trades(trade_handler, 'AAPL')
        logger.info("✅ AAPL 거래 데이터 구독 완료")
        
        # 호가 데이터 구독 (선택사항)
        logger.info("AAPL 호가 데이터 구독 중...")
        stream.subscribe_quotes(quote_handler, 'AAPL')
        logger.info("✅ AAPL 호가 데이터 구독 완료")
        
        # 추가 종목들 구독
        additional_symbols = ['MSFT', 'GOOGL', 'TSLA']
        for symbol in additional_symbols:
            stream.subscribe_trades(trade_handler, symbol)
            stream.subscribe_quotes(quote_handler, symbol)
            logger.info(f"✅ {symbol} 구독 완료")
        
        logger.info(f"총 {len(additional_symbols) + 1}개 종목 구독 완료")
        logger.info("30초간 실제 데이터 수신 대기...")
        logger.info("(실시간 거래가 있을 때만 데이터가 수신됩니다)")
        
        # 30초간 데이터 수신 대기
        start_time = datetime.now()
        await asyncio.sleep(30)
        end_time = datetime.now()
        
        # 결과 요약
        logger.info("=== 데이터 수신 결과 ===")
        logger.info(f"수신 시간: {end_time - start_time}")
        logger.info(f"수신된 거래: {received_trades}건")
        logger.info(f"수신된 호가: {received_quotes}건")
        
        if received_trades == 0 and received_quotes == 0:
            logger.warning("⚠️  데이터가 수신되지 않았습니다.")
            logger.info("   가능한 이유:")
            logger.info("   1. 현재 거래시간이 아님 (미국 주식시장 폐장)")
            logger.info("   2. 구독한 종목에 실시간 거래가 없음")
            logger.info("   3. IEX 데이터 피드의 제한")
        
    except ValueError as e:
        if "connection limit exceeded" in str(e):
            logger.error(f"❌ 연결 제한 초과: {e}")
        else:
            logger.error(f"❌ ValueError: {e}")
    except Exception as e:
        logger.error(f"❌ 예상치 못한 오류: {e}")
    
    logger.info("=== 테스트 완료 ===")

if __name__ == "__main__":
    try:
        asyncio.run(test_alpaca_real_data())
    except KeyboardInterrupt:
        logger.info("사용자에 의해 중단됨")
    except Exception as e:
        logger.error(f"예상치 못한 오류: {e}")
        sys.exit(1)
