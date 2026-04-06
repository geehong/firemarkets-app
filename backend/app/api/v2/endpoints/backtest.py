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

def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

@router.post("/{ticker}")
async def run_backtest_post(
    ticker: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_postgres_db)
):
    """
    Run a complex historical backtest with custom entry/exit rules.
    """
    try:
        asset_id = resolve_asset_identifier(db, ticker)
        
        start_date = payload.get("start_date", "2023-01-01")
        end_date = payload.get("end_date", "2025-04-01")
        initial_capital = float(payload.get("initial_capital", 1000.0))
        leverage = float(payload.get("leverage", 1.0))
        entry_rules = payload.get("entry_rules", {})
        exit_rules = payload.get("exit_rules", {})

        # Fetch 1h data for precise timing (Hour selection)
        query = db.query(
            OHLCVIntradayData.timestamp_utc,
            OHLCVIntradayData.close_price
        ).filter(
            OHLCVIntradayData.asset_id == asset_id,
            OHLCVIntradayData.data_interval == '1h',
            OHLCVIntradayData.timestamp_utc >= start_date,
            OHLCVIntradayData.timestamp_utc <= end_date
        ).order_by(OHLCVIntradayData.timestamp_utc)
        
        records = query.all()
        
        if not records:
            # Fallback to daily if 1h is not available, though user asked for hour precision
            query_daily = db.query(
                OHLCVData.timestamp_utc,
                OHLCVData.close_price
            ).filter(
                OHLCVData.asset_id == asset_id,
                OHLCVData.timestamp_utc >= start_date,
                OHLCVData.timestamp_utc <= end_date
            ).order_by(OHLCVData.timestamp_utc)
            records = query_daily.all()

        if not records:
            raise HTTPException(status_code=404, detail=f"No historical data found for {ticker} in the selected period.")

        df = pd.DataFrame([dict(r._mapping) for r in records])
        df['timestamp_utc'] = pd.to_datetime(df['timestamp_utc'])
        df.set_index('timestamp_utc', inplace=True)
        df['close_price'] = pd.to_numeric(df['close_price'], errors='coerce')
        df = df.dropna()

        # Calculate Indicators
        df['rsi'] = calculate_rsi(df['close_price'])
        df['ma20'] = df['close_price'].rolling(window=20).mean()
        df['ma60'] = df['close_price'].rolling(window=60).mean()
        
        # Simulation State
        balance = initial_capital
        position_size = 0  # Amount of asset held (in units)
        equity_curve = []
        trades = []
        in_position = False
        liquidated = False
        liquidation_time = None
        
        # Stats tracking
        peak_equity = initial_capital
        max_dd = 0
        winning_trades = 0
        total_trades = 0

        side = payload.get("side", "long")
        
        # Mapping for day/month checks
        month_map = {1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun", 7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"}
        day_map = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}

        for ts, row in df.iterrows():
            if liquidated:
                equity_curve.append([int(ts.timestamp() * 1000), 0.0])
                continue

            current_price = float(row['close_price'])
            
            # timezone adjustment
            ts_local = ts
            if entry_rules.get('timezone') == 'KST':
                ts_local = ts + timedelta(hours=9)
            
            current_month = month_map[ts_local.month]
            current_day = day_map[ts_local.weekday()]
            current_hour = ts_local.hour
            
            # Exit Evaluation (Prioritize exit / liquidation check)
            should_exit = False
            if in_position:
                # 1. Seasonal/Rule Exit
                if current_month in exit_rules.get('months', []):
                    should_exit = True
                
                # 2. RSI Tech Exit
                if exit_rules.get('rsi', {}).get('enabled'):
                    rsi_val = exit_rules['rsi'].get('value', 70)
                    if side == "long":
                        if row['rsi'] > rsi_val: should_exit = True
                    else:
                        if row['rsi'] < rsi_val: should_exit = True

                # 3. Liquidation Check
                if side == "long":
                    unrealized_pnl = (current_price - entry_price) * position_size
                else:
                    unrealized_pnl = (entry_price - current_price) * position_size
                
                current_equity = balance + unrealized_pnl
                
                if current_equity <= 0:
                    liquidated = True
                    liquidation_time = ts
                    balance = 0
                    current_equity = 0
                    position_size = 0
                    in_position = False
                    trades.append({'type': 'liquidation', 'price': current_price, 'time': ts})
                    equity_curve.append([int(ts.timestamp() * 1000), 0.0])
                    continue

            # Entry Evaluation
            should_entry = False
            if not in_position and not liquidated:
                if current_month in entry_rules.get('months', []):
                    if entry_rules.get('day') == 'Any' or current_day == entry_rules.get('day'):
                        if current_hour == entry_rules.get('hour'):
                            rsi_cond = True
                            if entry_rules.get('rsi', {}).get('enabled'):
                                rsi_val = entry_rules['rsi'].get('value', 40)
                                operator = entry_rules['rsi'].get('operator', '<')
                                if side == "long":
                                    if operator == '<': rsi_cond = row['rsi'] < rsi_val
                                    else: rsi_cond = row['rsi'] > rsi_val
                                else: # Short entry
                                    if operator == '>': rsi_cond = row['rsi'] > rsi_val
                                    else: rsi_cond = row['rsi'] < rsi_val
                            if rsi_cond:
                                should_entry = True
            
            # Execute Simulation
            if should_entry and not in_position:
                position_size = (balance * leverage) / current_price
                entry_price = current_price
                in_position = True
                trades.append({'type': 'entry', 'side': side, 'price': current_price, 'time': ts})
                
            elif should_exit and in_position:
                if side == "long":
                    profit_loss = (current_price - entry_price) * position_size
                else:
                    profit_loss = (entry_price - current_price) * position_size
                
                balance += profit_loss
                
                total_trades += 1
                if profit_loss > 0:
                    winning_trades += 1
                
                position_size = 0
                in_position = False
                trades.append({'type': 'exit', 'side': side, 'price': current_price, 'time': ts})

            # Track total equity
            current_equity = balance
            if in_position:
                if side == "long":
                    unrealized_pnl = (current_price - entry_price) * position_size
                else:
                    unrealized_pnl = (entry_price - current_price) * position_size
                current_equity += unrealized_pnl
            
            # Update MDD
            if current_equity > peak_equity:
                peak_equity = current_equity
            
            dd = (peak_equity - current_equity) / peak_equity * 100 if peak_equity > 0 else 0
            if dd > max_dd:
                max_dd = dd

            equity_curve.append([int(ts.timestamp() * 1000), round(float(current_equity), 2)])

        # Final stats
        final_value = equity_curve[-1][1]
        total_roi = ((final_value / initial_capital) - 1) * 100 if initial_capital > 0 else 0
        win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0

        # Benchmark Calculation
        first_price = float(df['close_price'].iloc[0])
        benchmark_curve = [[int(ts.timestamp() * 1000), round(float(initial_capital * (row['close_price'] / first_price)), 2)] for ts, row in df.iterrows()]

        # Sampling for chart
        if len(equity_curve) > 500:
            step = len(equity_curve) // 500
            equity_curve = equity_curve[::step]
            benchmark_curve = benchmark_curve[::step]

        return {
            "ticker": ticker,
            "liquidated": liquidated,
            "liquidation_time": liquidation_time,
            "stats": {
                "initial_capital": initial_capital,
                "final_value": round(final_value, 2),
                "total_roi": round(total_roi, 2),
                "max_drawdown": round(max_dd, 2),
                "win_rate": round(win_rate, 2),
                "total_trades": total_trades
            },
            "graph": {
                "strategy": equity_curve,
                "benchmark": benchmark_curve
            }
        }

    except Exception as e:
        logger.exception(f"POST Backtest failed for {ticker}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/optimization/results")
async def get_optimization_results():
    """
    Get the latest optimization results for BTCUSDT.
    """
    import os
    import json
    # Use relative path from the app root
    file_path = os.path.join(os.getcwd(), "scripts", "btcusdt_optimization_results.json")
    if not os.path.exists(file_path):
        # Try another path if running inside docker with different CWD
        file_path = os.path.join("/app", "scripts", "btcusdt_optimization_results.json")
    
    if not os.path.exists(file_path):
        return {"error": "Optimization results not found"}
        
    try:
        with open(file_path, "r") as f:
            return json.load(f)
    except Exception as e:
        return {"error": str(e)}

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
    Run a simple historical backtest (Compatibility wrapper).
    """
    # Simply call the logic from post or keep a simple placeholder
    # For now, we'll keep the basic buy & hold as fallback for GET
    try:
        asset_id = resolve_asset_identifier(db, ticker)
        query = db.query(OHLCVData.timestamp_utc, OHLCVData.close_price).filter(
            OHLCVData.asset_id == asset_id,
            OHLCVData.timestamp_utc >= start_date,
            OHLCVData.timestamp_utc <= end_date
        ).order_by(OHLCVData.timestamp_utc)
        records = query.all()
        if not records: raise HTTPException(status_code=404, detail="No data")
        df = pd.DataFrame([dict(r._mapping) for r in records])
        first_price = float(df['close_price'].iloc[0])
        df['val'] = initial_capital * (df['close_price'].astype(float) / first_price)
        graph = [[int(pd.to_datetime(ts).timestamp() * 1000), round(float(val), 2)] for ts, val in zip(df['timestamp_utc'], df['val'])]
        return {
            "stats": {"initial_capital": initial_capital, "final_value": graph[-1][1], "total_roi": round((graph[-1][1]/initial_capital-1)*100, 2)},
            "graph": {"strategy": graph, "benchmark": graph}
        }
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
