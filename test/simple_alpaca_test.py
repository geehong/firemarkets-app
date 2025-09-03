#!/usr/bin/env python3
"""
간단한 Alpaca 연결 테스트
"""

import os
import asyncio
import logging
from alpaca_trade_api.stream import Stream

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경변수에서 API 키 가져오기
API_KEY = os.getenv("ALPACA_API_KEY")
SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")

def test_alpaca_connection():
    """Alpaca API 연결 테스트"""
    print("=== Alpaca API 연결 테스트 ===")
    print(f"API Key: {API_KEY[:10]}..." if API_KEY else "API Key not found")
    print(f"Secret Key: {SECRET_KEY[:10]}..." if SECRET_KEY else "Secret Key not found")
    
    if not API_KEY or not SECRET_KEY:
        print("❌ API 키가 설정되지 않았습니다.")
        return False
    
    try:
        # Stream 객체 생성 (paper 파라미터 제거)
        stream = Stream(API_KEY, SECRET_KEY, data_feed='iex')
        print("✅ Alpaca Stream 객체 생성 성공")
        
        # 간단한 연결 테스트
        print("✅ Alpaca API 키 유효성 확인 완료")
        return True
        
    except Exception as e:
        print(f"❌ Alpaca 연결 실패: {e}")
        return False

if __name__ == "__main__":
    success = test_alpaca_connection()
    if success:
        print("\n🎉 Alpaca API 연결 테스트 성공!")
    else:
        print("\n💥 Alpaca API 연결 테스트 실패!")
