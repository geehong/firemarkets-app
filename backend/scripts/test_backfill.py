#!/usr/bin/env python3
"""
백필 로직 테스트 스크립트
"""
import asyncio
import sys
import os
from datetime import datetime, timedelta

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.services.api_strategy_manager import ApiStrategyManager
from app.models.asset import Asset, OHLCVData, OHLCVIntradayData
from sqlalchemy import func

async def test_backfill_logic():
    """백필 로직 테스트"""
    print("🔍 백필 로직 테스트 시작...")
    
    db = SessionLocal()
    try:
        # 1. 테스트할 자산 선택 (XRP)
        asset = db.query(Asset).filter(Asset.ticker == "XRPUSDT").first()
        if not asset:
            print("❌ XRPUSDT 자산을 찾을 수 없습니다.")
            return
        
        print(f"✅ 테스트 자산: {asset.ticker} (ID: {asset.asset_id})")
        
        # 2. 현재 데이터 상태 확인
        daily_count = db.query(func.count(OHLCVData.ohlcv_id)).filter(
            OHLCVData.asset_id == asset.asset_id
        ).scalar()
        
        intraday_count = db.query(func.count(OHLCVIntradayData.ohlcv_id)).filter(
            OHLCVIntradayData.asset_id == asset.asset_id
        ).scalar()
        
        print(f"📊 현재 데이터 상태:")
        print(f"   - 일봉 데이터: {daily_count}개")
        print(f"   - 인트라데이 데이터: {intraday_count}개")
        
        # 3. 최신/최초 데이터 확인
        oldest_daily = db.query(func.min(OHLCVData.timestamp_utc)).filter(
            OHLCVData.asset_id == asset.asset_id
        ).scalar()
        
        newest_daily = db.query(func.max(OHLCVData.timestamp_utc)).filter(
            OHLCVData.asset_id == asset.asset_id
        ).scalar()
        
        print(f"📅 일봉 데이터 범위:")
        print(f"   - 최초: {oldest_daily}")
        print(f"   - 최신: {newest_daily}")
        
        # 4. 백필 로직 테스트
        api_manager = ApiStrategyManager()
        
        print(f"\n🔧 백필 로직 테스트...")
        
        # 일봉 데이터 백필 테스트
        print(f"📈 일봉 데이터 백필 파라미터 확인:")
        params = api_manager._get_fetch_parameters(asset.asset_id, "1d")
        
        if params:
            print(f"✅ 백필 파라미터 생성됨:")
            print(f"   - 시작일: {params['start_date']}")
            print(f"   - 종료일: {params['end_date']}")
            print(f"   - 제한: {params['limit']}")
        else:
            print(f"ℹ️ 백필 불필요 (데이터가 충분함)")
        
        # 인트라데이 데이터 백필 테스트
        print(f"\n📊 인트라데이 데이터 백필 파라미터 확인:")
        params_intraday = api_manager._get_fetch_parameters(asset.asset_id, "1h")
        
        if params_intraday:
            print(f"✅ 백필 파라미터 생성됨:")
            print(f"   - 시작일: {params_intraday['start_date']}")
            print(f"   - 종료일: {params_intraday['end_date']}")
            print(f"   - 제한: {params_intraday['limit']}")
        else:
            print(f"ℹ️ 백필 불필요 (데이터가 충분함)")
        
        # 5. 실제 백필 실행 테스트 (데이터 수집 및 저장)
        print(f"\n🚀 실제 백필 실행 테스트...")
        
        if params:
            print(f"📥 일봉 데이터 수집 및 저장 시도...")
            try:
                # 실제 데이터 수집 (백필 로직 포함)
                ohlcv_data = await api_manager.get_ohlcv_data(asset.asset_id, "1d")
                if ohlcv_data:
                    print(f"✅ 일봉 데이터 수집 성공: {len(ohlcv_data)}개 레코드")
                    
                    # 데이터 저장 테스트
                    from app.services.data_processor import DataProcessor
                    data_processor = DataProcessor()
                    
                    # 데이터를 저장 형식으로 변환
                    items = []
                    for item in ohlcv_data:
                        items.append({
                            "timestamp_utc": item.timestamp_utc,
                            "open_price": item.open_price,
                            "high_price": item.high_price,
                            "low_price": item.low_price,
                            "close_price": item.close_price,
                            "volume": item.volume,
                            "change_percent": item.change_percent
                        })
                    
                    # 데이터 저장
                    metadata = {"asset_id": asset.asset_id, "interval": "1d"}
                    success = await data_processor._save_ohlcv_data(items, metadata)
                    if success:
                        print(f"✅ 일봉 데이터 저장 성공")
                    else:
                        print(f"❌ 일봉 데이터 저장 실패")
                else:
                    print(f"ℹ️ 일봉 데이터 수집 결과 없음")
            except Exception as e:
                print(f"❌ 일봉 데이터 수집/저장 실패: {e}")
        
        if params_intraday:
            print(f"📥 인트라데이 데이터 수집 및 저장 시도...")
            try:
                # 실제 데이터 수집 (백필 로직 포함)
                ohlcv_data = await api_manager.get_ohlcv_data(asset.asset_id, "1h")
                if ohlcv_data:
                    print(f"✅ 인트라데이 데이터 수집 성공: {len(ohlcv_data)}개 레코드")
                    
                    # 데이터 저장 테스트
                    from app.services.data_processor import DataProcessor
                    data_processor = DataProcessor()
                    
                    # 데이터를 저장 형식으로 변환
                    items = []
                    for item in ohlcv_data:
                        items.append({
                            "timestamp_utc": item.timestamp_utc,
                            "open_price": item.open_price,
                            "high_price": item.high_price,
                            "low_price": item.low_price,
                            "close_price": item.close_price,
                            "volume": item.volume,
                            "change_percent": item.change_percent
                        })
                    
                    # 데이터 저장
                    metadata = {"asset_id": asset.asset_id, "interval": "1h"}
                    success = await data_processor._save_ohlcv_data(items, metadata)
                    if success:
                        print(f"✅ 인트라데이 데이터 저장 성공")
                    else:
                        print(f"❌ 인트라데이 데이터 저장 실패")
                else:
                    print(f"ℹ️ 인트라데이 데이터 수집 결과 없음")
            except Exception as e:
                print(f"❌ 인트라데이 데이터 수집/저장 실패: {e}")
        
        # 6. 수집 후 데이터 상태 확인
        print(f"\n📊 수집 후 데이터 상태 확인...")
        
        new_daily_count = db.query(func.count(OHLCVData.ohlcv_id)).filter(
            OHLCVData.asset_id == asset.asset_id
        ).scalar()
        
        new_intraday_count = db.query(func.count(OHLCVIntradayData.ohlcv_id)).filter(
            OHLCVIntradayData.asset_id == asset.asset_id
        ).scalar()
        
        print(f"📈 수집 후 데이터 상태:")
        print(f"   - 일봉 데이터: {new_daily_count}개 (변화: +{new_daily_count - daily_count})")
        print(f"   - 인트라데이 데이터: {new_intraday_count}개 (변화: +{new_intraday_count - intraday_count})")
        
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_backfill_logic())
