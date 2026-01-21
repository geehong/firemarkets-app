
import pandas as pd
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from app.crud import crud_asset
from app.crud import crud_ohlcv

logger = logging.getLogger(__name__)

def calculate_moving_averages(
    db: Session, 
    ticker: str, 
    periods: List[int] = [10, 20, 50, 111, 200, 365, 700], 
    days: int = 1500  # Fetch enough history for long MAs
) -> Dict[str, Any]:
    """
    Calculate Simple Moving Averages (SMA) for a given asset.
    """
    try:
        # 1. Fetch Asset
        asset = crud_asset.get_by_ticker(db, ticker)
        if not asset:
            return {"error": f"Asset not found: {ticker}"}

        # 2. Fetch Data
        # We need extra buffer for the longest period calculation
        max_period = max(periods) if periods else 200
        start_date = datetime.utcnow().date() - timedelta(days=days + max_period) 
        
        ohlcvs = crud_ohlcv.get_ohlcv_data(db, asset_id=asset.asset_id, start_date=start_date)
        
        if not ohlcvs or len(ohlcvs) < max_period:
             return {"error": f"Insufficient data for {ticker}. Need at least {max_period} days."}

        # 3. Process with Pandas
        df = pd.DataFrame([{
            "date": x.timestamp_utc, 
            "close": float(x.close_price)
        } for x in ohlcvs])
        
        df.sort_values("date", inplace=True)
        df.set_index("date", inplace=True)

        # 4. Calculate MAs
        result_data = {}
        # Keep the raw close price as well for charting
        # We'll return dates as strings for JSON serialization
        
        # Calculate each MA
        for p in periods:
            col_name = f"SMA_{p}"
            df[col_name] = df["close"].rolling(window=p).mean()

        # Trim invalid initial rows if desired, or keep them as null
        # We usually want to return the recent 'days' requested, not the buffer
        # But for charting we might want more. Let's return the last 'days' records.
        cutoff_date = pd.Timestamp(datetime.utcnow().date() - timedelta(days=days))
        df_filtered = df[df.index >= cutoff_date]
        
        # Format Output
        chart_data = []
        for date, row in df_filtered.iterrows():
            item = {
                "date": date.strftime("%Y-%m-%dT%H:%M:%S"),
                "close": row["close"]
            }
            for p in periods:
                val = row[f"SMA_{p}"]
                # Handle NaN
                item[f"SMA_{p}"] = val if pd.notna(val) else None
            
            chart_data.append(item)

        return {
            "ticker": ticker,
            "periods": periods,
            "data": chart_data
        }

    except Exception as e:
        logger.error(f"Error calculating MA: {e}", exc_info=True)
        return {"error": str(e)}
