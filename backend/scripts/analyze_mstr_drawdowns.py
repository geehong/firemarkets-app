import asyncio
import sys
import os
from datetime import datetime
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import PostgreSQLSessionLocal
from app.models.asset import Asset, OHLCVData

def find_drawdowns(df, threshold=-0.30):
    drawdowns = []
    
    # Simple algorithm: track peak and trough
    # But to handle multiple drops without full recovery, we might need a different approach.
    # Let's use a rolling window or peak-finding.
    
    # To match user's chart which shows swings:
    # We can calculate the maximum price looking back N days and forward N days.
    # Or simpler: just use a state machine.
    
    peak_price = df['close_price'].iloc[0]
    peak_date = df['timestamp_utc'].iloc[0]
    
    trough_price = peak_price
    trough_date = peak_date
    
    for idx, row in df.iterrows():
        p = row['close_price']
        d = row['timestamp_utc']
        
        # If we make a new high, we check if the previous drawdown was significant
        if p > peak_price:
            drop = (trough_price - peak_price) / peak_price
            if drop <= threshold:
                drawdowns.append({
                    'peak_date': peak_date,
                    'peak_price': peak_price,
                    'trough_date': trough_date,
                    'trough_price': trough_price,
                    'drop_percent': drop * 100,
                    'duration_days': (trough_date - peak_date).days
                })
            
            # Reset peak and trough
            peak_price = p
            peak_date = d
            trough_price = p
            trough_date = d
            
        # If we make a new low, update the trough
        elif p < trough_price:
            trough_price = p
            trough_date = d
            
    # Check the final drawdown
    drop = (trough_price - peak_price) / peak_price
    if drop <= threshold:
        drawdowns.append({
            'peak_date': peak_date,
            'peak_price': peak_price,
            'trough_date': trough_date,
            'trough_price': trough_price,
            'drop_percent': drop * 100,
            'duration_days': (trough_date - peak_date).days
        })
        
    return drawdowns

async def main():
    db = PostgreSQLSessionLocal()
    try:
        # Fetch MSTR data
        rows = db.query(OHLCVData.timestamp_utc, OHLCVData.high_price, OHLCVData.low_price, OHLCVData.close_price)\
                 .join(Asset, Asset.asset_id == OHLCVData.asset_id)\
                 .filter(Asset.ticker == 'MSTR')\
                 .order_by(OHLCVData.timestamp_utc.asc()).all()
                 
        if not rows:
            print("No data found")
            return
            
        df = pd.DataFrame([{
            'timestamp_utc': r.timestamp_utc,
            'high_price': float(r.high_price) if r.high_price else 0,
            'low_price': float(r.low_price) if r.low_price else 0,
            'close_price': float(r.close_price) if r.close_price else 0,
        } for r in rows])
        
        # Filter for data from 2019 onwards (as per user's chart view)
        df = df[df['timestamp_utc'] >= pd.to_datetime('2019-01-01')]
        
        drawdowns = find_drawdowns(df, threshold=-0.30)
        
        # Sort by drop percentage
        drawdowns.sort(key=lambda x: x['drop_percent'])
        
        print("=== Drops >= 30% ===")
        for d in drawdowns:
            print(f"Peak: {d['peak_date'].strftime('%Y-%m-%d')} (${d['peak_price']:.2f}) -> "
                  f"Trough: {d['trough_date'].strftime('%Y-%m-%d')} (${d['trough_price']:.2f}) | "
                  f"Drop: {d['drop_percent']:.2f}% | Duration: {d['duration_days']} days")
                  
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
