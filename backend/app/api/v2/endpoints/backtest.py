from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
import logging
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

from app.core.database import get_postgres_db
from app.models.asset import Asset, OHLCVData, OHLCVIntradayData
from app.api.v2.endpoints.assets.shared.resolvers import resolve_asset_identifier

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/{ticker}")
async def run_backtest(
    ticker: str,
    start_date: str = Query("2023-01-01"),
    end_date: str = Query("2025-04-01"),
    initial_capital: float = Query(1000.0),
    leverage: float = Query(1.0),
    strategy_type: str = Query("buy_and_hold"),
    db: Session = Depends(get_postgres_db)
):
    """
    Run a historical backtest for a given ticker and period.
    """
    try:
        asset_id = resolve_asset_identifier(db, ticker)
        
        # Fetch daily data for the period
        # We need a bit more data before start_date if we use indicators, but for now let's just get the period
        query = db.query(
            OHLCVData.timestamp_utc,
            OHLCVData.open_price,
            OHLCVData.high_price,
            OHLCVData.low_price,
            OHLCVData.close_price
        ).filter(
            OHLCVData.asset_id == asset_id,
            OHLCVData.timestamp_utc >= start_date,
            OHLCVData.timestamp_utc <= end_date
        ).order_by(OHLCVData.timestamp_utc)
        
        records = query.all()
        
        if not records:
            # Try intraday data (1h) if daily is missing or if we want more precision
            query_1h = db.query(
                OHLCVIntradayData.timestamp_utc,
                OHLCVIntradayData.open_price,
                OHLCVIntradayData.high_price,
                OHLCVIntradayData.low_price,
                OHLCVIntradayData.close_price
            ).filter(
                OHLCVIntradayData.asset_id == asset_id,
                OHLCVIntradayData.data_interval == '1h',
                OHLCVIntradayData.timestamp_utc >= start_date,
                OHLCVIntradayData.timestamp_utc <= end_date
            ).order_by(OHLCVIntradayData.timestamp_utc)
            records = query_1h.all()

        if not records:
            raise HTTPException(status_code=404, detail=f"No historical data found for {ticker} in the selected period.")

        df = pd.DataFrame([dict(r._mapping) for r in records])
        df['timestamp_utc'] = pd.to_datetime(df['timestamp_utc'])
        df.set_index('timestamp_utc', inplace=True)
        for col in ['open_price', 'high_price', 'low_price', 'close_price']:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        df = df.dropna(subset=['close_price'])
        
        if df.empty:
            raise HTTPException(status_code=404, detail="Data is empty after processing.")

        # Simple Buy & Hold Simulation
        # portfolio_value = initial_capital * (current_price / first_price)
        first_price = float(df['close_price'].iloc[0])
        df['benchmark_return'] = (df['close_price'] / first_price)
        df['benchmark_value'] = initial_capital * df['benchmark_return']
        
        # Strategy Simulation (Simple Buy & Hold for now, can be extended)
        # We'll call it 'strategy_value'
        df['strategy_value'] = df['benchmark_value'] # For now, strategy is buy & hold

        # Calculate Stats
        final_value = float(df['strategy_value'].iloc[-1])
        total_roi = (final_value / initial_capital - 1) * 100
        
        # Max Drawdown
        rolling_max = df['strategy_value'].cummax()
        drawdown = (df['strategy_value'] - rolling_max) / rolling_max
        max_drawdown = float(drawdown.min() * 100)
        
        # Prepare Graph Data
        # Sampling for the graph if data is too large (e.g. > 500 points)
        if len(df) > 500:
            step = len(df) // 500
            sampled_df = df.iloc[::step]
        else:
            sampled_df = df
            
        graph_data_strategy = []
        graph_data_benchmark = []
        
        for ts, row in sampled_df.iterrows():
            ms = int(ts.timestamp() * 1000)
            graph_data_strategy.append([ms, round(float(row['strategy_value']), 2)])
            graph_data_benchmark.append([ms, round(float(row['benchmark_value']), 2)])

        return {
            "ticker": ticker,
            "period": {
                "start": df.index[0].isoformat(),
                "end": df.index[-1].isoformat()
            },
            "stats": {
                "initial_capital": initial_capital,
                "final_value": round(final_value, 2),
                "total_roi": round(total_roi, 2),
                "max_drawdown": round(max_drawdown, 2),
                "win_rate": 65.0, # Placeholder for now
                "total_trades": 1 # Placeholder for now
            },
            "graph": {
                "strategy": graph_data_strategy,
                "benchmark": graph_data_benchmark
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Backtest failed for {ticker}")
        raise HTTPException(status_code=500, detail=str(e))
