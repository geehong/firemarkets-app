import asyncio
import sys
import os
import pandas as pd
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import PostgreSQLSessionLocal
from app.models.asset import Asset, OHLCVData

def find_swings(df, threshold=-0.30, window=7):
    highs = df['high_price'].values
    lows = df['low_price'].values
    dates = df['timestamp_utc'].values
    
    pivot_highs = []
    
    for i in range(window, len(df) - window):
        is_pivot = True
        for j in range(1, window + 1):
            if highs[i] < highs[i-j] or highs[i] <= highs[i+j]:
                is_pivot = False
                break
        if is_pivot:
            pivot_highs.append(i)
            
    results = []
    
    for idx, ph_idx in enumerate(pivot_highs):
        peak_price = highs[ph_idx]
        peak_date = dates[ph_idx]
        
        trough_price = lows[ph_idx]
        trough_idx = ph_idx
        
        for i in range(ph_idx + 1, len(df)):
            if highs[i] > peak_price:
                break
            if lows[i] < trough_price:
                trough_price = lows[i]
                trough_idx = i
                
        drop = (trough_price - peak_price) / peak_price
        if drop <= threshold:
            results.append({
                'peak_date': pd.to_datetime(peak_date),
                'peak_price': peak_price,
                'trough_date': pd.to_datetime(dates[trough_idx]),
                'trough_price': trough_price,
                'drop_percent': drop * 100,
                'duration_days': (dates[trough_idx] - peak_date) / np.timedelta64(1, 'D')
            })
            
    unique_results = []
    seen_troughs = set()
    
    results.sort(key=lambda x: x['drop_percent'])
    
    for r in results:
        if r['trough_date'] not in seen_troughs:
            unique_results.append(r)
            seen_troughs.add(r['trough_date'])
            
    return unique_results

def main():
    db = PostgreSQLSessionLocal()
    try:
        rows = db.query(OHLCVData.timestamp_utc, OHLCVData.high_price, OHLCVData.low_price, OHLCVData.close_price)\
                 .join(Asset, Asset.asset_id == OHLCVData.asset_id)\
                 .filter(Asset.ticker == 'MSTR')\
                 .order_by(OHLCVData.timestamp_utc.asc()).all()
                 
        if not rows:
            print("No data found")
            return
            
        df = pd.DataFrame([{
            'timestamp_utc': pd.to_datetime(r.timestamp_utc),
            'high_price': float(r.high_price) if r.high_price else 0,
            'low_price': float(r.low_price) if r.low_price else 0,
            'close_price': float(r.close_price) if r.close_price else 0,
        } for r in rows])
        
        # Analyze data for the entire history
        
        # 14 days lookback/forward for more major swings (like the user chart)
        swings = find_swings(df, threshold=-0.30, window=10)
        
        under_33 = [s for s in swings if s['duration_days'] <= 33]
        over_33 = [s for s in swings if s['duration_days'] > 33]
        
        print(f"=== 하락률 >= 30% 이면서 하락 기간 <= 33일 구간 (총 {len(under_33)}개) ===")
        under_33.sort(key=lambda x: x['peak_date'])
        for d in under_33:
            print(f"- 고점: {d['peak_date'].strftime('%Y-%m-%d')} (${d['peak_price']:.2f}) -> "
                  f"저점: {d['trough_date'].strftime('%Y-%m-%d')} (${d['trough_price']:.2f}) | "
                  f"하락률: {d['drop_percent']:.2f}% | 기간: {int(d['duration_days'])}일")
                  
        print(f"\n=== 하락률 >= 30% 이면서 하락 기간 > 33일 구간 (총 {len(over_33)}개) ===")
        over_33.sort(key=lambda x: x['peak_date'])
        for d in over_33:
            print(f"- 고점: {d['peak_date'].strftime('%Y-%m-%d')} (${d['peak_price']:.2f}) -> "
                  f"저점: {d['trough_date'].strftime('%Y-%m-%d')} (${d['trough_price']:.2f}) | "
                  f"하락률: {d['drop_percent']:.2f}% | 기간: {int(d['duration_days'])}일")
                  
    finally:
        db.close()

if __name__ == "__main__":
    main()
