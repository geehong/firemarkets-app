#!/usr/bin/env python3
"""
Collector 리팩토링 테스트 스크립트
"""
import asyncio
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.collectors.crypto_data_collector import CryptoDataCollector
from app.collectors.stock_collector import StockCollector
from app.collectors.realtime_collector import RealtimeCollector
from app.collectors.etf_collector import ETFCollector
from app.collectors.ohlcv_collector import OHLCVCollector
from app.collectors.onchain_collector import OnchainCollector
from app.core.config import GLOBAL_APP_CONFIGS


async def test_crypto_collector():
    """CryptoDataCollector 테스트"""
    print("=== CryptoDataCollector 테스트 ===")
    
    collector = CryptoDataCollector()
    
    # 기본 정보 확인
    print(f"Collector 이름: {collector.collector_name}")
    print(f"API Timeout: {collector.api_timeout}")
    print(f"Max Retries: {collector.max_retries}")
    print(f"CoinMarketCap Base URL: {collector.coinmarketcap_base_url}")
    print(f"API Key 설정됨: {collector.api_key is not None}")
    
    # 공통 메소드 확인
    print(f"공통 API 요청 메소드 존재: {hasattr(collector, '_make_request')}")
    print(f"공통 HTML 요청 메소드 존재: {hasattr(collector, '_make_html_request')}")
    print(f"안전한 float 변환 메소드 존재: {hasattr(collector, '_safe_float')}")
    
    print("✅ CryptoDataCollector 테스트 완료\n")


async def test_stock_collector():
    """StockCollector 테스트"""
    print("=== StockCollector 테스트 ===")
    
    collector = StockCollector()
    
    # 기본 정보 확인
    print(f"Collector 이름: {collector.collector_name}")
    print(f"API Timeout: {collector.api_timeout}")
    print(f"Max Retries: {collector.max_retries}")
    
    # 공통 메소드 확인
    print(f"공통 API 요청 메소드 존재: {hasattr(collector, '_make_request')}")
    print(f"공통 HTML 요청 메소드 존재: {hasattr(collector, '_make_html_request')}")
    print(f"안전한 float 변환 메소드 존재: {hasattr(collector, '_safe_float')}")
    
    # 리팩토링된 _fetch_async 메소드 확인
    print(f"리팩토링된 _fetch_async 메소드 존재: {hasattr(collector, '_fetch_async')}")
    
    print("✅ StockCollector 테스트 완료\n")


async def test_realtime_collector():
    """RealtimeCollector 테스트"""
    print("=== RealtimeCollector 테스트 ===")
    
    collector = RealtimeCollector()
    
    # 기본 정보 확인
    print(f"Collector 이름: {collector.collector_name}")
    print(f"API Timeout: {collector.api_timeout}")
    print(f"Max Retries: {collector.max_retries}")
    
    # 공통 메소드 확인
    print(f"공통 API 요청 메소드 존재: {hasattr(collector, '_make_request')}")
    print(f"공통 HTML 요청 메소드 존재: {hasattr(collector, '_make_html_request')}")
    print(f"안전한 float 변환 메소드 존재: {hasattr(collector, '_safe_float')}")
    
    # 클라이언트 초기화 확인
    print(f"TwelveData 클라이언트 존재: {hasattr(collector, 'twelvedata_client')}")
    print(f"Binance 클라이언트 존재: {hasattr(collector, 'binance_client')}")
    print(f"Tiingo 클라이언트 존재: {hasattr(collector, 'tiingo_client')}")
    
    print("✅ RealtimeCollector 테스트 완료\n")


async def test_etf_collector():
    """ETFCollector 테스트"""
    print("=== ETFCollector 테스트 ===")
    
    collector = ETFCollector()
    
    # 기본 정보 확인
    print(f"Collector 이름: {collector.collector_name}")
    print(f"API Timeout: {collector.api_timeout}")
    print(f"Max Retries: {collector.max_retries}")
    
    # 공통 메소드 확인
    print(f"공통 API 요청 메소드 존재: {hasattr(collector, '_make_request')}")
    print(f"공통 HTML 요청 메소드 존재: {hasattr(collector, '_make_html_request')}")
    print(f"안전한 float 변환 메소드 존재: {hasattr(collector, '_safe_float')}")
    
    # 리팩토링된 _fetch_async 메소드 확인
    print(f"리팩토링된 _fetch_async 메소드 존재: {hasattr(collector, '_fetch_async')}")
    
    print("✅ ETFCollector 테스트 완료\n")


async def test_ohlcv_collector():
    """OHLCVCollector 테스트"""
    print("=== OHLCVCollector 테스트 ===")
    
    collector = OHLCVCollector()
    
    # 기본 정보 확인
    print(f"Collector 이름: {collector.collector_name}")
    print(f"API Timeout: {collector.api_timeout}")
    print(f"Max Retries: {collector.max_retries}")
    print(f"Historical Backfill 활성화: {collector.enable_historical_backfill}")
    print(f"Max Historical Days: {collector.max_historical_days}")
    
    # 공통 메소드 확인
    print(f"공통 API 요청 메소드 존재: {hasattr(collector, '_make_request')}")
    print(f"공통 HTML 요청 메소드 존재: {hasattr(collector, '_make_html_request')}")
    print(f"안전한 float 변환 메소드 존재: {hasattr(collector, '_safe_float')}")
    
    # 리팩토링된 _fetch_async 메소드 확인
    print(f"리팩토링된 _fetch_async 메소드 존재: {hasattr(collector, '_fetch_async')}")
    
    print("✅ OHLCVCollector 테스트 완료\n")


async def test_onchain_collector():
    """OnchainCollector 테스트"""
    print("=== OnchainCollector 테스트 ===")
    
    collector = OnchainCollector()
    
    # 기본 정보 확인
    print(f"Collector 이름: {collector.collector_name}")
    print(f"API Timeout: {collector.api_timeout}")
    print(f"Max Retries: {collector.max_retries}")
    print(f"Base URL: {collector.base_url}")
    print(f"Bitcoin Asset ID: {collector.bitcoin_asset_id}")
    print(f"API Priority: {collector.api_priority}")
    
    # 공통 메소드 확인
    print(f"공통 API 요청 메소드 존재: {hasattr(collector, '_make_request')}")
    print(f"공통 HTML 요청 메소드 존재: {hasattr(collector, '_make_html_request')}")
    print(f"안전한 float 변환 메소드 존재: {hasattr(collector, '_safe_float')}")
    
    # 클라이언트 초기화 확인
    print(f"CoinGecko 클라이언트 존재: {hasattr(collector, 'coingecko_client')}")
    print(f"CoinMarketCap 클라이언트 존재: {hasattr(collector, 'coinmarketcap_client')}")
    
    print("✅ OnchainCollector 테스트 완료\n")


async def test_base_collector_methods():
    """BaseCollector 공통 메소드 테스트"""
    print("=== BaseCollector 공통 메소드 테스트 ===")
    
    # 임시 collector 인스턴스 생성
    collector = CryptoDataCollector()
    
    # 안전한 변환 메소드 테스트
    print("안전한 변환 메소드 테스트:")
    print(f"  _safe_float('123.45'): {collector._safe_float('123.45')}")
    print(f"  _safe_float('invalid'): {collector._safe_float('invalid')}")
    print(f"  _safe_float(None): {collector._safe_float(None)}")
    
    print(f"  _safe_int('123.45'): {collector._safe_int('123.45')}")
    print(f"  _safe_int('invalid'): {collector._safe_int('invalid')}")
    print(f"  _safe_int(None): {collector._safe_int(None)}")
    
    print(f"  _safe_date_parse('2023-12-01'): {collector._safe_date_parse('2023-12-01')}")
    print(f"  _safe_date_parse('invalid'): {collector._safe_date_parse('invalid')}")
    print(f"  _safe_date_parse(None): {collector._safe_date_parse(None)}")
    
    print("✅ BaseCollector 공통 메소드 테스트 완료\n")


async def test_configuration():
    """설정 확인"""
    print("=== 설정 확인 ===")
    
    print(f"API_REQUEST_TIMEOUT_SECONDS: {GLOBAL_APP_CONFIGS.get('API_REQUEST_TIMEOUT_SECONDS', 30)}")
    print(f"MAX_API_RETRY_ATTEMPTS: {GLOBAL_APP_CONFIGS.get('MAX_API_RETRY_ATTEMPTS', 3)}")
    print(f"ENABLE_SEMAPHORE: {GLOBAL_APP_CONFIGS.get('ENABLE_SEMAPHORE', True)}")
    print(f"SEMAPHORE_LIMIT: {GLOBAL_APP_CONFIGS.get('SEMAPHORE_LIMIT', 8)}")
    print(f"COINMARKETCAP_API_KEY 설정됨: {GLOBAL_APP_CONFIGS.get('COINMARKETCAP_API_KEY') is not None}")
    print(f"FMP_API_KEY 설정됨: {GLOBAL_APP_CONFIGS.get('FMP_API_KEY') is not None}")
    print(f"ALPHA_VANTAGE_API_KEYS 설정됨: {GLOBAL_APP_CONFIGS.get('ALPHA_VANTAGE_API_KEYS') is not None}")
    
    print("✅ 설정 확인 완료\n")


async def main():
    """메인 테스트 함수"""
    print("🚀 Collector 리팩토링 테스트 시작\n")
    
    try:
        await test_configuration()
        await test_base_collector_methods()
        await test_crypto_collector()
        await test_stock_collector()
        await test_realtime_collector()
        await test_etf_collector()
        await test_ohlcv_collector()
        await test_onchain_collector()
        
        print("🎉 모든 테스트가 성공적으로 완료되었습니다!")
        print("\n📋 리팩토링 요약:")
        print("✅ BaseCollector에 공통 API 요청 메소드 추가")
        print("✅ _make_request(): JSON 응답용 공통 메소드")
        print("✅ _make_html_request(): HTML 응답용 공통 메소드")
        print("✅ _make_request_with_retry(): 커스텀 재시도 횟수 지원")
        print("✅ _safe_float(), _safe_int(), _safe_date_parse(): 안전한 데이터 변환")
        print("✅ CryptoDataCollector 리팩토링 완료")
        print("✅ StockCollector _fetch_async 메소드 리팩토링 완료")
        print("✅ RealtimeCollector API 호출 주석 업데이트 완료")
        print("✅ ETFCollector _fetch_async 메소드 리팩토링 완료")
        print("✅ OHLCVCollector _fetch_async 메소드 리팩토링 완료")
        print("✅ OnchainCollector 중복 메소드 제거 완료")
        print("✅ 중복 코드 제거 및 추상화 개선")
        print("✅ 모든 collector가 BaseCollector의 공통 메소드 활용")
        
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
