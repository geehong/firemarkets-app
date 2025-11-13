#!/usr/bin/env python3
"""
AMZN, META, MSFT의 1m/5m 데이터 수집 테스트 스크립트
"""
import asyncio
import sys
import os

# 프로젝트 루트를 경로에 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.api_strategy_manager import ApiStrategyManager
from app.core.config_manager import ConfigManager
from app.core.database import SessionLocal
from app.models.asset import Asset

async def test_symbol_interval(symbol: str, interval: str):
    """특정 심볼과 간격에 대한 데이터 수집 테스트"""
    print(f"\n{'='*60}")
    print(f"테스트: {symbol} - {interval} 간격")
    print(f"{'='*60}")
    
    # DB에서 asset_id 조회
    db = SessionLocal()
    try:
        asset = db.query(Asset).filter(Asset.ticker == symbol).first()
        if not asset:
            print(f"❌ {symbol} 자산을 DB에서 찾을 수 없습니다.")
            return False
        
        asset_id = asset.asset_id
        asset_type = asset.asset_type.type_name if asset.asset_type else None
        print(f"✅ 자산 찾음: asset_id={asset_id}, asset_type={asset_type}")
        
    finally:
        db.close()
    
    # API Manager 초기화
    config_manager = ConfigManager()
    api_manager = ApiStrategyManager(config_manager)
    
    # 데이터 수집 시도
    try:
        print(f"\n📡 {symbol} ({interval}) 데이터 수집 시작...")
        df = await api_manager.get_ohlcv(
            ticker=symbol,
            interval=interval,
            asset_type=asset_type,
            asset_id=asset_id
        )
        
        if df is not None and not df.empty:
            print(f"✅ 성공! {len(df)}개의 레코드 수집됨")
            print(f"   최신 데이터: {df['timestamp_utc'].max() if 'timestamp_utc' in df.columns else 'N/A'}")
            print(f"   최초 데이터: {df['timestamp_utc'].min() if 'timestamp_utc' in df.columns else 'N/A'}")
            print(f"\n   첫 3개 레코드:")
            print(df.head(3).to_string())
            return True
        else:
            print(f"❌ 실패: 데이터가 반환되지 않았습니다 (None 또는 빈 DataFrame)")
            return False
            
    except Exception as e:
        print(f"❌ 에러 발생: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """메인 테스트 함수"""
    symbols = ["AMZN", "META", "MSFT"]
    intervals = ["1m", "5m"]
    
    print("="*60)
    print("AMZN, META, MSFT의 1m/5m 데이터 수집 테스트")
    print("="*60)
    
    results = {}
    for symbol in symbols:
        results[symbol] = {}
        for interval in intervals:
            success = await test_symbol_interval(symbol, interval)
            results[symbol][interval] = success
            # API rate limit을 피하기 위해 잠시 대기
            await asyncio.sleep(2)
    
    # 결과 요약
    print(f"\n{'='*60}")
    print("테스트 결과 요약")
    print(f"{'='*60}")
    for symbol in symbols:
        print(f"\n{symbol}:")
        for interval in intervals:
            status = "✅ 성공" if results[symbol][interval] else "❌ 실패"
            print(f"  {interval}: {status}")

if __name__ == "__main__":
    asyncio.run(main())

