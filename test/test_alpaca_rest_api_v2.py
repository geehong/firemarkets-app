#!/usr/bin/env python3
"""
Alpaca REST API v2 테스트
올바른 엔드포인트로 현재 가격 조회
"""

import os
import requests
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Alpaca API 설정
ALPACA_API_KEY = os.getenv("ALPACA_API_KEY")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")
BASE_URL = "https://paper-api.alpaca.markets/v2"

def test_alpaca_rest_api_v2():
    """Alpaca REST API v2 테스트"""
    logger.info("=== Alpaca REST API v2 테스트 시작 ===")
    
    if not ALPACA_API_KEY or not ALPACA_SECRET_KEY:
        logger.error("API 키가 설정되지 않았습니다.")
        return
    
    headers = {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY
    }
    
    try:
        # 1. 계정 정보 조회
        logger.info("1. 계정 정보 조회...")
        account_url = f"{BASE_URL}/account"
        response = requests.get(account_url, headers=headers)
        
        if response.status_code == 200:
            account_data = response.json()
            logger.info(f"✅ 계정 정보 조회 성공")
            logger.info(f"   계정 ID: {account_data.get('id')}")
            logger.info(f"   상태: {account_data.get('status')}")
            logger.info(f"   통화: {account_data.get('currency')}")
        else:
            logger.error(f"❌ 계정 정보 조회 실패: {response.status_code}")
            logger.error(f"   응답: {response.text}")
            return
        
        # 2. 현재 가격 조회 (AAPL) - 올바른 엔드포인트
        logger.info("2. AAPL 현재 가격 조회...")
        quote_url = f"{BASE_URL}/stocks/AAPL/quote"
        response = requests.get(quote_url, headers=headers)
        
        if response.status_code == 200:
            quote_data = response.json()
            logger.info(f"✅ AAPL 가격 조회 성공")
            logger.info(f"   현재가: ${quote_data.get('ap', 'N/A')}")
            logger.info(f"   매수호가: ${quote_data.get('bp', 'N/A')}")
            logger.info(f"   매도호가: ${quote_data.get('as', 'N/A')}")
            logger.info(f"   거래량: {quote_data.get('s', 'N/A')}")
            logger.info(f"   시간: {quote_data.get('t', 'N/A')}")
        else:
            logger.error(f"❌ AAPL 가격 조회 실패: {response.status_code}")
            logger.error(f"   응답: {response.text}")
            
            # 3. 대안: 최신 거래 데이터 조회
            logger.info("3. AAPL 최신 거래 데이터 조회...")
            trade_url = f"{BASE_URL}/stocks/AAPL/trades/latest"
            response = requests.get(trade_url, headers=headers)
            
            if response.status_code == 200:
                trade_data = response.json()
                logger.info(f"✅ AAPL 최신 거래 조회 성공")
                logger.info(f"   가격: ${trade_data.get('p', 'N/A')}")
                logger.info(f"   수량: {trade_data.get('s', 'N/A')}")
                logger.info(f"   시간: {trade_data.get('t', 'N/A')}")
            else:
                logger.error(f"❌ AAPL 최신 거래 조회 실패: {response.status_code}")
                logger.error(f"   응답: {response.text}")
        
        # 4. 여러 종목 가격 조회
        logger.info("4. 여러 종목 가격 조회...")
        symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA']
        for symbol in symbols:
            quote_url = f"{BASE_URL}/stocks/{symbol}/quote"
            response = requests.get(quote_url, headers=headers)
            
            if response.status_code == 200:
                quote_data = response.json()
                current_price = quote_data.get('ap', 'N/A')
                logger.info(f"   {symbol}: ${current_price}")
            else:
                logger.error(f"   {symbol}: 조회 실패 ({response.status_code})")
        
    except Exception as e:
        logger.error(f"❌ REST API 테스트 중 오류: {e}")
    
    logger.info("=== REST API v2 테스트 완료 ===")

if __name__ == "__main__":
    test_alpaca_rest_api_v2()


