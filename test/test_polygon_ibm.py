#!/usr/bin/env python3

import asyncio
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.append('/home/geehong/firemarkets-app/backend')

from app.external_apis.polygon_client import PolygonClient
from app.core.database import get_db
from app.models.asset import Asset
from app.crud import crud_ohlcv
from datetime import datetime

async def test_polygon_ibm():
    try:
        # Polygon API로 IBM 데이터 수집
        client = PolygonClient()
        data = await client.get_historical_prices('IBM', '2025-08-28', '2025-09-02', '1d')
        
        print(f'Polygon 데이터: {len(data)}개 레코드')
        
        if not data:
            print("데이터가 없습니다.")
            return
        
        # 데이터베이스에 저장
        db = next(get_db())
        try:
            asset = db.query(Asset).filter(Asset.ticker == 'IBM').first()
            
            if not asset:
                print("IBM 자산을 찾을 수 없습니다.")
                return
            
            print(f"IBM 자산 ID: {asset.asset_id}")
            
            # OHLCV 데이터 형식으로 변환
            ohlcv_data = []
            for item in data:
                ohlcv_record = {
                    'timestamp_utc': item['timestamp_utc'],
                    'open_price': item['open_price'],
                    'high_price': item['high_price'],
                    'low_price': item['low_price'],
                    'close_price': item['close_price'],
                    'volume': item['volume'],
                    'asset_id': asset.asset_id,
                    'data_interval': '1d'
                }
                ohlcv_data.append(ohlcv_record)
            
            # 데이터베이스에 저장
            result = crud_ohlcv.create_multiple_ohlcv(db, ohlcv_data)
            db.commit()
            
            print(f'저장된 레코드: {len(result)}개')
            print("IBM 데이터가 성공적으로 저장되었습니다!")
            
        except Exception as e:
            print(f"데이터베이스 저장 중 오류: {e}")
            db.rollback()
        finally:
            db.close()
            
    except Exception as e:
        print(f"오류 발생: {e}")

if __name__ == "__main__":
    asyncio.run(test_polygon_ibm())


