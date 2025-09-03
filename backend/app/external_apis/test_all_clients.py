"""
모든 API 클라이언트 테스트 스크립트
온체인을 제외하고 각 클라이언트별로 가격 데이터 5개씩 수집
"""
import asyncio
import logging
from datetime import datetime
from typing import List

# 모든 클라이언트 import
from app.external_apis.implementations import (
    # Traditional Financial API Clients
    FMPClient, TiingoClient, AlphaVantageClient, PolygonClient, TwelveDataClient,
    # Cryptocurrency API Clients  
    BinanceClient, CoinbaseClient, CoinGeckoClient, CoinMarketCapClient
)

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_tradfi_client(client, client_name: str, symbol: str):
    """전통 금융 API 클라이언트 테스트"""
    print(f"\n{'='*60}")
    print(f"🔵 {client_name.upper()} CLIENT 테스트 ({symbol} - 5개 데이터)")
    print(f"{'='*60}")
    
    try:
        # 1. 연결 테스트
        print("1️⃣ 연결 테스트...")
        is_connected = await client.test_connection()
        print(f"   연결 상태: {'✅ 성공' if is_connected else '❌ 실패'}")
        
        if not is_connected:
            print(f"   ⚠️ {client_name} 연결 실패로 테스트 중단")
            return
        
        # 2. Rate Limit 정보
        rate_info = client.get_rate_limit_info()6
        print(f"   📊 Rate Limit: {rate_info}")
        
        # 3. OHLCV 데이터 (5개)
        print("\n2️⃣ OHLCV 데이터 (5개)...")
        ohlcv_data = await client.get_ohlcv_data(symbol, "1d", limit=5)
        if ohlcv_data:
            print(f"   ✅ {len(ohlcv_data)}개 데이터 수집")
            # 첫 번째 데이터만 간단하게 출력
            first_data = ohlcv_data[0]
            print(f"   📊 첫 번째 데이터:")
            print(f"      날짜: {first_data.timestamp_utc.strftime('%Y-%m-%d')}")
            print(f"      시가: ${first_data.open_price:.2f}")
            print(f"      고가: ${first_data.high_price:.2f}")
            print(f"      저가: ${first_data.low_price:.2f}")
            print(f"      종가: ${first_data.close_price:.2f}")
            print(f"      거래량: {first_data.volume:,.0f}")
        else:
            print("   ❌ OHLCV 데이터 수집 실패")
        
        # 4. 실시간 시세
        print("\n3️⃣ 실시간 시세...")
        quote = await client.get_realtime_quote(symbol)
        if quote:
            print(f"   ✅ 시세: ${quote.price:.2f} ({quote.change_percent:+.2f}%)")
        else:
            print("   ❌ 실시간 시세 수집 실패")
        
        # 5. 기업 프로필
        print("\n4️⃣ 기업 프로필...")
        profile = await client.get_company_profile(symbol)
        if profile:
            print(f"   ✅ 기업명: {profile.name}")
            if profile.market_cap:
                print(f"   📈 시가총액: ${profile.market_cap:,.0f}")
        else:
            print("   ❌ 기업 프로필 수집 실패")
        
        # 6. 재무 데이터
        print("\n5️⃣ 재무 데이터...")
        financials = await client.get_stock_financials(symbol)
        if financials:
            if financials.pe_ratio:
                print(f"   ✅ P/E 비율: {financials.pe_ratio:.2f}")
            if financials.eps:
                print(f"   📊 EPS: ${financials.eps:.2f}")
        else:
            print("   ❌ 재무 데이터 수집 실패")
        
        # 7. ETF 섹터 노출 (지원하는 경우)
        print("\n6️⃣ ETF 섹터 노출...")
        try:
            sector_data = await client.get_etf_sector_exposure(symbol)
            if sector_data:
                print(f"   ✅ {len(sector_data)}개 섹터 데이터")
            else:
                print("   ⚠️ 미지원 항목")
        except NotImplementedError:
            print("   ⚠️ 미지원 항목")
        
    except Exception as e:
        print(f"   ❌ 오류: {e}")

async def test_crypto_client(client, client_name: str, symbol: str):
    """암호화폐 API 클라이언트 테스트"""
    print(f"\n{'='*60}")
    print(f"🟡 {client_name.upper()} CLIENT 테스트 ({symbol} - 5개 데이터)")
    print(f"{'='*60}")
    
    try:
        # 1. 연결 테스트
        print("1️⃣ 연결 테스트...")
        is_connected = await client.test_connection()
        print(f"   연결 상태: {'✅ 성공' if is_connected else '❌ 실패'}")
        
        if not is_connected:
            print(f"   ⚠️ {client_name} 연결 실패로 테스트 중단")
            return
        
        # 2. Rate Limit 정보
        rate_info = client.get_rate_limit_info()
        print(f"   📊 Rate Limit: {rate_info}")
        
        # 3. OHLCV 데이터 (5개)
        print("\n2️⃣ OHLCV 데이터 (5개)...")
        ohlcv_data = await client.get_ohlcv_data(symbol, "1d", limit=5)
        if ohlcv_data:
            print(f"   ✅ {len(ohlcv_data)}개 데이터 수집")
            # 첫 번째 데이터만 간단하게 출력
            first_data = ohlcv_data[0]
            print(f"   📊 첫 번째 데이터:")
            print(f"      날짜: {first_data.timestamp_utc.strftime('%Y-%m-%d')}")
            print(f"      시가: ${first_data.open_price:.2f}")
            print(f"      고가: ${first_data.high_price:.2f}")
            print(f"      저가: ${first_data.low_price:.2f}")
            print(f"      종가: ${first_data.close_price:.2f}")
            print(f"      거래량: {first_data.volume:,.0f}")
        else:
            print("   ❌ OHLCV 데이터 수집 실패")
        
        # 4. 실시간 시세
        print("\n3️⃣ 실시간 시세...")
        quote = await client.get_realtime_quote(symbol)
        if quote:
            change_str = f"({quote.change_percent:+.2f}%)" if quote.change_percent else ""
            print(f"   ✅ 시세: ${quote.price:.2f} {change_str}")
        else:
            print("   ❌ 실시간 시세 수집 실패")
        
        # 5. 암호화폐 데이터
        print("\n4️⃣ 암호화폐 데이터...")
        crypto_data = await client.get_crypto_data(symbol)
        if crypto_data:
            print(f"   ✅ 현재 가격: ${crypto_data.price:.2f}")
            if crypto_data.volume_24h:
                print(f"   📊 24시간 거래량: {crypto_data.volume_24h:,.0f}")
            if crypto_data.change_24h:
                print(f"   📈 24시간 변화: {crypto_data.change_24h:+.2f}%")
        else:
            print("   ❌ 암호화폐 데이터 수집 실패")
        
        # 6. 글로벌 메트릭
        print("\n5️⃣ 글로벌 메트릭...")
        try:
            global_metrics = await client.get_global_metrics()
            if global_metrics:
                print(f"   ✅ 글로벌 메트릭 수집 성공")
                if "total_market_cap" in global_metrics:
                    print(f"   📊 총 시가총액: ${global_metrics['total_market_cap']:,.0f}")
            else:
                print("   ❌ 글로벌 메트릭 수집 실패")
        except NotImplementedError:
            print("   ⚠️ 미지원 항목")
        
    except Exception as e:
        print(f"   ❌ 오류: {e}")

async def main():
    """메인 테스트 함수"""
    print("🚀 모든 API 클라이언트 테스트 시작")
    print(f"📅 테스트 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Traditional Financial API Clients
    tradfi_clients = [
        (FMPClient(), "FMP", "MS"),
        (TiingoClient(), "Tiingo", "AAPL"),
        (AlphaVantageClient(), "Alpha Vantage", "GOOGL"),
        (PolygonClient(), "Polygon", "TSLA"),
        (TwelveDataClient(), "Twelve Data", "AMZN")
    ]
    
    # Cryptocurrency API Clients
    crypto_clients = [
        (BinanceClient(), "Binance", "BTCUSDT"),
        (CoinbaseClient(), "Coinbase", "BTC-USD"),
        (CoinGeckoClient(), "CoinGecko", "bitcoin"),
        (CoinMarketCapClient(), "CoinMarketCap", "BTC")
    ]
    
    # Traditional Financial 클라이언트 테스트
    print("\n" + "="*80)
    print("🏦 TRADITIONAL FINANCIAL API CLIENTS")
    print("="*80)
    
    for client, name, symbol in tradfi_clients:
        await test_tradfi_client(client, name, symbol)
        await asyncio.sleep(1)  # API 호출 간격 조절
    
    # Cryptocurrency 클라이언트 테스트
    print("\n" + "="*80)
    print("🪙 CRYPTOCURRENCY API CLIENTS")
    print("="*80)
    
    for client, name, symbol in crypto_clients:
        await test_crypto_client(client, name, symbol)
        await asyncio.sleep(1)  # API 호출 간격 조절
    
    print("\n" + "="*80)
    print("🎉 모든 클라이언트 테스트 완료!")
    print("="*80)

if __name__ == "__main__":
    asyncio.run(main())
