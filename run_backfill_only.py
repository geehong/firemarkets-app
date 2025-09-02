#!/usr/bin/env python3

import asyncio
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.append('/home/geehong/firemarkets-app/backend')

from app.collectors.ohlcv_collector import OHLCVCollector
from app.core.database import get_db
from app.models.asset import Asset

async def run_backfill_only():
    """백필만 실행하는 함수 - 새로운 api_manager 방식 사용"""
    try:
        # OHLCVCollector 초기화
        collector = OHLCVCollector()
        
        # 수집이 활성화된 자산들 가져오기
        db = next(get_db())
        try:
            # 하이브리드 방식: True/False와 true/false 모두 지원
            condition1 = Asset.collection_settings.contains({"collect_price": True})
            condition2 = "JSON_EXTRACT(collection_settings, '$.collect_price') = true"
            
            # 모든 자산 타입 포함 (크립토 포함)
            from app.models.asset import AssetType
            assets = db.query(Asset).join(AssetType).filter(
                Asset.is_active == True,
                (condition1 | condition2)
            ).all()
            
            asset_ids = [asset.asset_id for asset in assets]
            
            print(f"백필 실행 대상: {len(asset_ids)}개 자산")
            print(f"자산 ID 목록: {asset_ids}")
            
        finally:
            db.close()
        
        # 새로운 방식: api_manager를 통한 백필 실행
        # api_manager의 _get_fetch_parameters가 백필 필요 여부를 자동으로 판단
        for asset_id in asset_ids:
            try:
                # Asset 정보 조회
                db = next(get_db())
                asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
                if not asset:
                    db.close()
                    continue
                
                ticker = asset.ticker
                asset_type = asset.asset_type.type_name.lower() if asset.asset_type else ""
                db.close()
                
                print(f"백필 확인 중: {ticker} (ID: {asset_id})")
                
                # api_manager를 사용하여 데이터 수집 (백필 로직 포함)
                from app.services.api_strategy_manager import api_manager
                
                if 'crypto' in asset_type:
                    data = await api_manager.get_ohlcv(ticker, "1d", asset_type=asset_type, asset_id=asset_id)
                else:
                    data = await api_manager.get_ohlcv(ticker, "1d", asset_type=asset_type, asset_id=asset_id)
                
                if data is not None and not data.empty:
                    # 데이터를 OHLCV 형식으로 변환하여 저장
                    ohlcv_data = []
                    for index, row in data.iterrows():
                        if not isinstance(index, (datetime, pd.Timestamp)):
                            continue
                        
                        close_price = collector._safe_float(row.get('close', row.get('close_price')))
                        if close_price is not None and close_price > 0:
                            ohlcv_record = {
                                "timestamp_utc": index.to_pydatetime() if hasattr(index, 'to_pydatetime') else index,
                                "open_price": collector._safe_float(row.get('open', row.get('open_price'))),
                                "high_price": collector._safe_float(row.get('high', row.get('high_price'))),
                                "low_price": collector._safe_float(row.get('low', row.get('low_price'))),
                                "close_price": close_price,
                                "volume": collector._safe_float(row.get('volume', 0.0)),
                                "asset_id": asset_id,
                                "data_interval": "1d"
                            }
                            ohlcv_data.append(ohlcv_record)
                    
                    if ohlcv_data:
                        added_count = await collector._store_ohlcv_data_with_interval(asset_id, ohlcv_data, "1d")
                        print(f"[{ticker}] 백필 완료: {added_count}개 데이터 추가")
                    else:
                        print(f"[{ticker}] 백필 실패: 유효한 데이터 없음")
                else:
                    print(f"[{ticker}] 백필 불필요: 데이터가 이미 최신 상태이거나 수집 실패")
                
            except Exception as e:
                print(f"백필 실행 중 오류 ({ticker}): {e}")
        
        print("백필 실행 완료!")
        
    except Exception as e:
        print(f"백필 실행 중 오류: {e}")

if __name__ == "__main__":
    asyncio.run(run_backfill_only())
