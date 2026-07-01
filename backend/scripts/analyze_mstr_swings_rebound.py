import asyncio
import sys
import os
import pandas as pd
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import PostgreSQLSessionLocal
from app.models.asset import Asset, OHLCVData

def find_swings_with_rebound(df, drop_threshold=-0.30, rebound_threshold=0.30):
    results = []
    
    if df.empty:
        return results
        
    peak_price = df['high_price'].iloc[0]
    peak_date = df['timestamp_utc'].iloc[0]
    trough_price = df['low_price'].iloc[0]
    trough_date = df['timestamp_utc'].iloc[0]
    
    for idx, row in df.iterrows():
        # High and low for the day to capture intraday extremes
        high_p = row['high_price']
        low_p = row['low_price']
        close_p = row['close_price']
        d = row['timestamp_utc']
        
        # If we hit a new high relative to peak_price, update peak
        if high_p > peak_price:
            peak_price = high_p
            peak_date = d
            trough_price = low_p
            trough_date = d
            
        # If we hit a new low relative to trough_price, update trough
        if low_p < trough_price:
            trough_price = low_p
            trough_date = d
            
        # Check if the price has rebounded by rebound_threshold from the trough
        # Use close price for rebound confirmation to avoid intraday wicks triggering false rebounds, 
        # or use high_p? Let's use high_p as the user tracks swings visually (peaks and troughs).
        if high_p >= trough_price * (1 + rebound_threshold):
            # A 30% rebound occurred!
            # Did we drop at least 30% from the peak before this rebound?
            drop = (trough_price - peak_price) / peak_price
            if drop <= drop_threshold:
                results.append({
                    'peak_date': peak_date,
                    'peak_price': peak_price,
                    'trough_date': trough_date,
                    'trough_price': trough_price,
                    'drop_percent': drop * 100,
                    'duration_days': (trough_date - peak_date).days
                })
            
            # Start tracking a new swing from this rebound peak
            peak_price = high_p
            peak_date = d
            trough_price = low_p
            trough_date = d
            
    # Check the final open swing at the end of the data
    drop = (trough_price - peak_price) / peak_price
    if drop <= drop_threshold:
        results.append({
            'peak_date': peak_date,
            'peak_price': peak_price,
            'trough_date': trough_date,
            'trough_price': trough_price,
            'drop_percent': drop * 100,
            'duration_days': (trough_date - peak_date).days
        })
        
    return results

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
        
        # Filter for dates >= 2020-08-01 (Bitcoin strategy era)
        df = df[df['timestamp_utc'] >= pd.to_datetime('2020-08-01')]
        
        swings = find_swings_with_rebound(df, drop_threshold=-0.30, rebound_threshold=0.30)
        
        # Deduplicate identical swings (just in case)
        unique_swings = []
        seen = set()
        for s in swings:
            k = (s['peak_date'], s['trough_date'])
            if k not in seen:
                seen.add(k)
                unique_swings.append(s)
                
        under_33 = [s for s in unique_swings if s['duration_days'] <= 33]
        over_33 = [s for s in unique_swings if s['duration_days'] > 33]
        
        print(f"=== 하락률 >= 30% 이면서 하락 기간 <= 33일 구간 (총 {len(under_33)}개) ===")
        under_33.sort(key=lambda x: x['peak_date'])
        for d in under_33:
            print(f"- 고점: {d['peak_date'].strftime('%Y-%m-%d')} (${d['peak_price']:.2f}) -> "
                  f"저점: {d['trough_date'].strftime('%Y-%m-%d')} (${d['trough_price']:.2f}) | "
                  f"하락률: {d['drop_percent']:.2f}% | 기간: {d['duration_days']}일")
                  
        print(f"\\n=== 하락률 >= 30% 이면서 하락 기간 > 33일 구간 (총 {len(over_33)}개) ===")
        over_33.sort(key=lambda x: x['peak_date'])
        for d in over_33:
            print(f"- 고점: {d['peak_date'].strftime('%Y-%m-%d')} (${d['peak_price']:.2f}) -> "
                  f"저점: {d['trough_date'].strftime('%Y-%m-%d')} (${d['trough_price']:.2f}) | "
                  f"하락률: {d['drop_percent']:.2f}% | 기간: {d['duration_days']}일")
                  
    finally:
        db.close()

if __name__ == "__main__":
    main()
