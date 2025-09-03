#!/usr/bin/env python3
"""
하이브리드 API 클라이언트 테스트 스크립트
각 클라이언트별로 5개의 데이터만 수집
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, '/app')

from app.external_apis.implementations.fmp_client import FMPClient
from app.external_apis.implementations.binance_client import BinanceClient
from app.external_apis.implementations.bitcoin_data_client import BitcoinDataClient
from app.external_apis.base.schemas import (
    OhlcvDataPoint, RealtimeQuoteData, CompanyProfileData,
    StockFinancialsData, EtfSectorExposureData, CryptoData,
    OnChainMetricData, CryptoMetricsData
)

async def test_fmp_client():
    """FMP 클라이언트 테스트 - 주식 데이터 5개"""
    print("\n" + "="*60)
    print("🔵 FMP CLIENT 테스트 (주식 데이터 5개)")
    print("="*60)
    
    client = FMPClient()
    
    try:
        # 1. 연결 테스트
        print("1️⃣ 연결 테스트...")
        is_connected = await client.test_connection()
        print(f"   연결 상태: {'✅ 성공' if is_connected else '❌ 실패'}")
        
        # 2. OHLCV 데이터 (5개)
        print("\n2️⃣ OHLCV 데이터 (MS, 5개)...")
        ohlcv_data = await client.get_ohlcv_data("MS", "1d", limit=5)
        if ohlcv_data:
            print(f"   ✅ {len(ohlcv_data)}개 데이터 수집")
            print(f"   📊 첫 번째 데이터: {ohlcv_data[0].model_dump()}")
        else:
            print("   ❌ 데이터 수집 실패")
        
        # 3. 실시간 시세
        print("\n3️⃣ 실시간 시세...")
        quote = await client.get_realtime_quote("MS")
        if quote:
            print(f"   ✅ 시세: ${quote.price:.2f} ({quote.change_percent:+.2f}%)")
        else:
            print("   ❌ 시세 수집 실패")
        
        # 4. 기업 프로필
        print("\n4️⃣ 기업 프로필...")
        profile = await client.get_company_profile("MS")
        if profile:
            print(f"   ✅ 기업명: {profile.name}")
            print(f"   📈 시가총액: ${profile.market_cap:,}")
        else:
            print("   ❌ 프로필 수집 실패")
        
        # 5. 재무 데이터
        print("\n5️⃣ 재무 데이터...")
        financials = await client.get_stock_financials("MS")
        if financials:
            print(f"   ✅ EPS: ${financials.eps:.2f}")
            print(f"   📊 P/E 비율: {financials.pe_ratio:.2f}")
        else:
            print("   ❌ 재무 데이터 수집 실패")
        
        # 6. ETF 섹터 노출 (미지원)
        print("\n6️⃣ ETF 섹터 노출...")
        etf_data = await client.get_etf_sector_exposure("SPY")
        if etf_data is None:
            print("   ⚠️ 미지원 항목")
        else:
            print(f"   ✅ {len(etf_data)}개 섹터 데이터")
        
    except Exception as e:
        print(f"   ❌ 오류: {e}")

async def test_binance_client():
    """Binance 클라이언트 테스트 - 암호화폐 데이터 5개"""
    print("\n" + "="*60)
    print("🟡 BINANCE CLIENT 테스트 (암호화폐 데이터 5개)")
    print("="*60)
    
    client = BinanceClient()
    
    try:
        # 1. 연결 테스트
        print("1️⃣ 연결 테스트...")
        is_connected = await client.test_connection()
        print(f"   연결 상태: {'✅ 성공' if is_connected else '❌ 실패'}")
        
        # 2. OHLCV 데이터 (5개)
        print("\n2️⃣ OHLCV 데이터 (BTCUSDT, 5개)...")
        ohlcv_data = await client.get_ohlcv_data("BTCUSDT", "1d", limit=5)
        if ohlcv_data:
            print(f"   ✅ {len(ohlcv_data)}개 데이터 수집")
            print(f"   📊 첫 번째 데이터: {ohlcv_data[0].model_dump()}")
        else:
            print("   ❌ 데이터 수집 실패")
        
        # 3. 실시간 시세
        print("\n3️⃣ 실시간 시세...")
        quote = await client.get_realtime_quote("BTCUSDT")
        if quote:
            print(f"   ✅ 시세: ${quote.price:.2f} ({quote.change_percent:+.2f}%)")
        else:
            print("   ❌ 시세 수집 실패")
        
        # 4. 암호화폐 데이터
        print("\n4️⃣ 암호화폐 데이터...")
        crypto_data = await client.get_crypto_data("BTCUSDT")
        if crypto_data:
            print(f"   ✅ 24시간 거래량: {crypto_data.volume_24h:,.0f}")
            print(f"   📊 가격 변화: {crypto_data.change_24h:+.2f}%")
        else:
            print("   ❌ 암호화폐 데이터 수집 실패")
        
        # 5. 거래소 정보
        print("\n5️⃣ 거래소 정보...")
        exchange_info = await client.get_exchange_info()
        if exchange_info:
            print(f"   ✅ 거래소 상태: {exchange_info.get('status', 'N/A')}")
        else:
            print("   ❌ 거래소 정보 수집 실패")
        
        # 6. 글로벌 메트릭 (미지원)
        print("\n6️⃣ 글로벌 메트릭...")
        try:
            global_metrics = await client.get_global_metrics()
            print(f"   ✅ {global_metrics}")
        except NotImplementedError:
            print("   ⚠️ 미지원 항목")
        
    except Exception as e:
        print(f"   ❌ 오류: {e}")

async def test_bitcoin_data_client():
    """Bitcoin Data 클라이언트 테스트 - 온체인 데이터 (MVRV-Z-Score 대표)"""
    print("\n" + "="*60)
    print("🟢 BITCOIN DATA CLIENT 테스트 (온체인 데이터 - MVRV-Z-Score)")
    print("="*60)
    
    client = BitcoinDataClient()
    
    try:
        # 1. 연결 테스트
        print("1️⃣ 연결 테스트...")
        is_connected = await client.test_connection()
        print(f"   연결 상태: {'✅ 성공' if is_connected else '❌ 실패'}")
        
        # Rate limit 정보 표시
        rate_limit = client.get_rate_limit_info()
        print(f"   📊 Rate Limit: 시간당 {rate_limit['free_tier']['requests_per_hour']}개")
        
        # 2. 온체인 메트릭 (MVRV-Z-Score 대표)
        print("\n2️⃣ 온체인 메트릭 (MVRV-Z-Score, 5개)...")
        onchain_metrics = await client.get_onchain_metrics("mvrv", days=5)
        if onchain_metrics:
            print(f"   ✅ {len(onchain_metrics)}개 메트릭 데이터 수집")
            print(f"   📊 첫 번째 데이터: {onchain_metrics[0].model_dump()}")
        else:
            print("   ❌ 온체인 메트릭 수집 실패")
        
        # 3. 네트워크 통계
        print("\n3️⃣ 네트워크 통계...")
        network_stats = await client.get_network_stats()
        if network_stats:
            print(f"   ✅ {len(network_stats)}개 네트워크 데이터")
            print(f"   📊 첫 번째 데이터: {network_stats[0].model_dump()}")
        else:
            print("   ❌ 네트워크 통계 수집 실패")
        
        # 4. 암호화폐 데이터
        print("\n4️⃣ 암호화폐 데이터...")
        crypto_data = await client.get_crypto_data("BTC")
        if crypto_data:
            print(f"   ✅ 현재 가격: ${crypto_data.current_price:.2f}")
            print(f"   📊 시가총액: ${crypto_data.market_cap:,.0f}")
        else:
            print("   ❌ 암호화폐 데이터 수집 실패")
        
        # 5. 암호화폐 메트릭 (Rate Limit으로 인해 생략)
        print("\n5️⃣ 암호화폐 메트릭 (Rate Limit으로 인해 생략)...")
        print("   ⚠️ Bitcoin Data API Rate Limit (시간당 4개)으로 인해 생략")
        print("   📊 실제 운영에서는 60초 간격으로 호출 필요")
        
    except Exception as e:
        print(f"   ❌ 오류: {e}")

async def test_schema_validation():
    """Pydantic 스키마 검증 테스트"""
    print("\n" + "="*60)
    print("🔍 PYDANTIC SCHEMA 검증 테스트")
    print("="*60)
    
    try:
        # OHLCV 데이터 검증
        print("1️⃣ OHLCV 데이터 검증...")
        ohlcv_data = OhlcvDataPoint(
            timestamp_utc=datetime.now(),
            open_price=100.0,
            high_price=105.0,
            low_price=98.0,
            close_price=103.0,
            volume=1000000.0,
            change_percent=3.0
        )
        print(f"   ✅ OHLCV 데이터 생성 성공: ${ohlcv_data.close_price}")
        
        # JSON 직렬화 테스트
        json_data = ohlcv_data.model_dump_json()
        print(f"   ✅ JSON 직렬화 성공: {json_data[:100]}...")
        
        # 실시간 시세 데이터 검증
        print("\n2️⃣ 실시간 시세 데이터 검증...")
        quote_data = RealtimeQuoteData(
            symbol="MS",
            price=103.50,
            change_percent=2.5,
            timestamp=datetime.now()  # alias 사용
        )
        print(f"   ✅ 시세 데이터 생성 성공: {quote_data.symbol} ${quote_data.price}")
        
        print("\n✅ 모든 스키마 검증 성공!")
        
    except Exception as e:
        print(f"   ❌ 스키마 검증 오류: {e}")

async def main():
    """메인 테스트 함수"""
    print("🚀 하이브리드 API 클라이언트 테스트 시작")
    print(f"📅 테스트 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 각 클라이언트별 테스트 실행
    await test_fmp_client()
    await test_binance_client()
    await test_bitcoin_data_client()
    await test_schema_validation()
    
    print("\n" + "="*60)
    print("🎉 모든 테스트 완료!")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(main())
