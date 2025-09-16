#!/usr/bin/env python3
"""
Tiingo 가격수집 수동 테스트 스크립트
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.external_apis.tiingo_client import TiingoClient
from app.services.api_strategy_manager import ApiStrategyManager
import pandas as pd

async def test_tiingo_connection():
    """Tiingo API 연결 테스트"""
    print("=== Tiingo API 연결 테스트 ===")
    
    client = TiingoClient()
    
    # API 키 확인
    print(f"API Key configured: {'Yes' if client.api_key else 'No'}")
    if not client.api_key:
        print("⚠️  TIINGO_API_KEY 환경변수가 설정되지 않았습니다.")
        return False
    
    # 연결 테스트
    print("API 연결 테스트 중...")
    is_connected = await client.test_connection()
    print(f"연결 상태: {'✅ 성공' if is_connected else '❌ 실패'}")
    
    return is_connected

async def test_tiingo_historical_data():
    """Tiingo 히스토리컬 데이터 테스트"""
    print("\n=== Tiingo 히스토리컬 데이터 테스트 ===")
    
    client = TiingoClient()
    
    # 테스트할 심볼들
    test_symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'SPY']
    
    for symbol in test_symbols:
        print(f"\n📊 {symbol} 데이터 테스트:")
        
        # 날짜 범위 설정 (최근 30일)
        end_date = datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        
        try:
            data = await client.get_historical_prices(symbol, start_date, end_date)
            
            if data:
                print(f"  ✅ 데이터 수집 성공: {len(data)}개 레코드")
                
                # 첫 번째와 마지막 데이터 출력
                if len(data) > 0:
                    first_record = data[0]
                    last_record = data[-1]
                    
                    print(f"  📅 기간: {first_record.get('timestamp_utc')} ~ {last_record.get('timestamp_utc')}")
                    print(f"  💰 최신 가격: Open={first_record.get('open_price')}, Close={first_record.get('close_price')}")
                    
                    # DataFrame으로 변환하여 통계 출력
                    df = pd.DataFrame(data)
                    print(f"  📈 통계: 평균 종가={df['close_price'].mean():.2f}, 최고가={df['close_price'].max():.2f}")
            else:
                print(f"  ❌ 데이터 없음")
                
        except Exception as e:
            print(f"  ❌ 오류: {e}")

async def test_tiingo_quote():
    """Tiingo 실시간 시세 테스트"""
    print("\n=== Tiingo 실시간 시세 테스트 ===")
    
    client = TiingoClient()
    
    test_symbols = ['AAPL', 'MSFT', 'GOOGL']
    
    for symbol in test_symbols:
        print(f"\n💹 {symbol} 실시간 시세:")
        
        try:
            quote = await client.get_quote(symbol)
            
            if quote:
                print(f"  ✅ 시세 수집 성공")
                print(f"  💰 현재가: {quote.get('last')}")
                print(f"  📊 변동: {quote.get('change')} ({quote.get('changePercent')}%)")
                print(f"  📈 고가: {quote.get('high')}, 저가: {quote.get('low')}")
                print(f"  📅 날짜: {quote.get('date')}")
            else:
                print(f"  ❌ 시세 없음")
                
        except Exception as e:
            print(f"  ❌ 오류: {e}")

async def test_api_strategy_manager():
    """API 전략 관리자를 통한 Tiingo 테스트"""
    print("\n=== API 전략 관리자 Tiingo 테스트 ===")
    
    manager = ApiStrategyManager()
    
    test_symbols = ['AAPL', 'MSFT', 'GOOGL']
    
    for symbol in test_symbols:
        print(f"\n🔄 {symbol} API 전략 관리자 테스트:")
        
        try:
            # OHLCV 데이터 가져오기 (Tiingo가 1순위)
            data = await manager.get_ohlcv(symbol, interval="1d", limit=30)
            
            if data is not None and not data.empty:
                print(f"  ✅ 데이터 수집 성공: {len(data)}개 레코드")
                print(f"  📊 데이터 형태: {data.shape}")
                print(f"  📅 기간: {data.index.min()} ~ {data.index.max()}")
                
                # 컬럼 확인
                print(f"  📋 컬럼: {list(data.columns)}")
                
                # 최신 데이터 출력
                latest = data.iloc[-1]
                print(f"  💰 최신 가격: Open={latest.get('open_price', latest.get('open', 'N/A'))}, Close={latest.get('close_price', latest.get('close', 'N/A'))}")
            else:
                print(f"  ❌ 데이터 없음")
                
        except Exception as e:
            print(f"  ❌ 오류: {e}")

async def test_tiingo_rate_limits():
    """Tiingo API 제한 확인"""
    print("\n=== Tiingo API 제한 정보 ===")
    
    client = TiingoClient()
    limits = client.get_rate_limit_info()
    
    print("📊 Tiingo API 제한:")
    for tier, limits_dict in limits.items():
        print(f"  {tier}:")
        for key, value in limits_dict.items():
            print(f"    {key}: {value}")

async def main():
    """메인 테스트 함수"""
    print("🚀 Tiingo 가격수집 수동 테스트 시작")
    print("=" * 50)
    
    # 1. 연결 테스트
    connection_ok = await test_tiingo_connection()
    
    if not connection_ok:
        print("\n❌ API 연결 실패. 환경변수와 네트워크를 확인하세요.")
        return
    
    # 2. API 제한 정보
    await test_tiingo_rate_limits()
    
    # 3. 히스토리컬 데이터 테스트
    await test_tiingo_historical_data()
    
    # 4. 실시간 시세 테스트
    await test_tiingo_quote()
    
    # 5. API 전략 관리자 테스트
    await test_api_strategy_manager()
    
    print("\n" + "=" * 50)
    print("✅ Tiingo 가격수집 테스트 완료")

if __name__ == "__main__":
    asyncio.run(main())

