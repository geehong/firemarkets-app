
import pandas as pd
import numpy as np
from fastapi import HTTPException
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.crud.asset import crud_asset, crud_ohlcv
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

def calculate_correlation_matrix(db: Session, tickers: List[str], days: int = 90) -> Dict[str, Any]:
    """
    Calculate correlation matrix for given tickers over the last N days.
    """
    data = {}
    
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days + 30) 

    excluded = []
    asset_info = {}
    
    try:
        valid_tickers = []

        for ticker in tickers:
            asset = crud_asset.get_by_ticker(db, ticker)
            if not asset:
                excluded.append({"ticker": ticker, "reason": "not_found", "available": 0})
                continue
            
            ohlcvs = crud_ohlcv.get_ohlcv_data(
                db, 
                asset_id=asset.asset_id, 
                start_date=start_date,
                limit=days + 20
            )
            
            if not ohlcvs or len(ohlcvs) < days * 0.6:
                 excluded.append({
                     "ticker": ticker, 
                     "reason": "insufficient_data", 
                     "available": len(ohlcvs) if ohlcvs else 0
                 })
                 continue

            ohlcvs_sorted = sorted(ohlcvs, key=lambda x: x.timestamp_utc)
            dates = [x.timestamp_utc.date() for x in ohlcvs_sorted]
            closes = [float(x.close_price) for x in ohlcvs_sorted]
            
            series = pd.Series(data=closes, index=dates, name=ticker)
            series = series[~series.index.duplicated(keep='last')]
            
            data[ticker] = series
            # Store asset info for frontend (exclude same group logic)
            # Ensure asset.asset_type is loaded
            asset_type_name = asset.asset_type.type_name if asset.asset_type else "Unknown"

            asset_info[ticker] = {
                "name": asset.name,
                "type": asset_type_name
            }
            valid_tickers.append(ticker)

        if len(valid_tickers) < 2:
            return {
                "error": "Not enough valid assets", 
                "matrix": [], 
                "heatmap_data": [], 
                "excluded": excluded,
                "asset_info": {}
            }

        df = pd.DataFrame(data)
        df = df.dropna()

        if df.empty:
             return {
                 "error": "No overlapping data", 
                 "matrix": [], 
                 "heatmap_data": [], 
                 "excluded": excluded,
                 "asset_info": {}
             }
        
        pct_change = df.pct_change().dropna()
        correlation_matrix = pct_change.corr(method='pearson')
        
        matrix_dict = correlation_matrix.to_dict()
        
        heatmap_data = []
        for y in valid_tickers:
            if y not in matrix_dict: continue
            row = {"id": y, "data": []}
            for x in valid_tickers:
                if x not in matrix_dict[y]: continue
                val = matrix_dict.get(y, {}).get(x, 0)
                if pd.isna(val): val = 0
                row["data"].append({"x": x, "y": val})
            heatmap_data.append(row)

        return {
            "tickers": valid_tickers,
            "matrix": matrix_dict,
            "heatmap_data": heatmap_data,
            "excluded": excluded,
            "asset_info": asset_info
        }
    except Exception as e:
        logger.error(f"Error calculating correlation matrix: {e}", exc_info=True)
        # Fallback empty
        return {"error": str(e), "matrix": [], "heatmap_data": []}

def calculate_spread_analysis(db: Session, ticker_a: str, ticker_b: str, days: int = 90) -> Dict[str, Any]:
    """
    Calculate spread and Z-Score between two assets for Statistical Arbitrage.
    Strategy: Log Price Ratio Spread (log(A) - log(B)) and its Z-Score.
    """
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days + 60) # Buffer for rolling calculations

    try:
        # Fetch Data
        assets = []
        for t in [ticker_a, ticker_b]:
            asset = crud_asset.get_by_ticker(db, t)
            if not asset:
                raise HTTPException(status_code=404, detail=f"Asset not found: {t}")
            
            ohlcvs = crud_ohlcv.get_ohlcv_data(
                db, 
                asset_id=asset.asset_id, 
                start_date=start_date,
                limit=days + 365 # Ensure we get full history (default is 1000)
            )
            if not ohlcvs or len(ohlcvs) < 30: # Minimal check for rolling window
                 raise HTTPException(status_code=400, detail=f"Insufficient data for {t} (Need at least 30 days)")
                 
            # Create Series
            # Helper to convert to series
            df_t = pd.DataFrame([{
                "date": x.timestamp_utc.date(), 
                "close": float(x.close_price)
            } for x in ohlcvs])
            df_t.set_index("date", inplace=True)
            df_t = df_t[~df_t.index.duplicated(keep='last')]
            assets.append(df_t["close"])
            
        data = pd.concat(assets, axis=1).dropna()
        data.columns = [ticker_a, ticker_b]
        
        if data.empty:
            raise HTTPException(status_code=400, detail="No overlapping data found")
            
        # Calculate Log Ratio Spread
        # spread = log(PriceA) - log(PriceB)
        data["log_spread"] = np.log(data[ticker_a]) - np.log(data[ticker_b])
        
        # Calculate Z-Score (Rolling 30-day window)
        window = 30
        data["mean"] = data["log_spread"].rolling(window=window).mean()
        data["std"] = data["log_spread"].rolling(window=window).std()
        data["z_score"] = (data["log_spread"] - data["mean"]) / data["std"]
        
        # Drop initial NaN for rolling
        data = data.dropna()
        
        # Format for Linear Chart
        # data points: {date, z_score, spread, price_a, price_b}
        chart_data = []
        for date, row in data.iterrows():
            chart_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "z_score": row["z_score"] if not pd.isna(row["z_score"]) else 0,
                "spread": row["log_spread"],
                "price_a": row[ticker_a],
                "price_b": row[ticker_b]
            })
            
        return {
            "ticker_a": ticker_a,
            "ticker_b": ticker_b,
            "data": chart_data[-days:], # Return requested duration
            "latest_z_score": chart_data[-1]["z_score"] if chart_data else 0
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error calculating spread: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
