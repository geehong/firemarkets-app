#!/usr/bin/env python3
import asyncio
import sys
import os

# Add the app directory to the path
sys.path.insert(0, '/app')

from app.external_apis.implementations.binance_client import BinanceClient
from app.core.config import BINANCE_API_KEY, BINANCE_SECRET_KEY

async def test_binance():
    print("=" * 60)
    print("Binance API 테스트")
    print("=" * 60)
    
    # 환경 변수 확인
    print(f"\n1. 환경 변수 확인:")
    print(f"   BINANCE_API_KEY: {BINANCE_API_KEY[:20] + '...' if BINANCE_API_KEY else 'None'}")
    print(f"   BINANCE_SECRET_KEY: {BINANCE_SECRET_KEY[:20] + '...' if BINANCE_SECRET_KEY else 'None'}")
    
    # 클라이언트 생성 및 테스트
    print(f"\n2. Binance 클라이언트 연결 테스트:")
    try:
        client = BinanceClient()
        is_connected = await client.test_connection()
        print(f"   연결 상태: {'✅ 성공' if is_connected else '❌ 실패'}")
        
        # Rate limit 정보
        rate_limits = client.get_rate_limit_info()
        print(f"\n3. Rate Limit 정보:")
        print(f"   {rate_limits}")
        
        return is_connected
    except Exception as e:
        print(f"   ❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_binance())
    sys.exit(0 if result else 1)

