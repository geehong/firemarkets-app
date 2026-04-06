import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import func, text

# Add common paths
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.asset import Asset, OHLCVIntradayData, OHLCVData

def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def run_simulation(df, entry_rules, exit_rules):
    # Simulation State
    initial_capital = 1000.0
    balance = initial_capital
    position_size = 0  # Amount of asset held
    in_position = False
    
    month_map = {1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun", 7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"}
    day_map = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}

    # Optimization: Use pre-calculated RSI if available
    # Actually for optimization, we pass a df that already has RSI
    
    for ts, row in df.iterrows():
        current_price = float(row['close_price'])
        current_month = month_map[ts.month]
        current_day = day_map[ts.weekday()]
        current_hour = ts.hour
        
        # Entry Evaluation
        should_entry = False
        if not in_position:
            # 1. Seasonality Check
            if not entry_rules.get('months') or current_month in entry_rules.get('months', []):
                # 2. Day Check
                if entry_rules.get('day') == 'Any' or current_day == entry_rules.get('day'):
                    # 3. Hour Check
                    if entry_rules.get('hour') is None or current_hour == entry_rules.get('hour'):
                        # 4. Technical Indicator Check
                        rsi_cond = True
                        if entry_rules.get('rsi_enabled'):
                            rsi_val = entry_rules.get('rsi_value', 40)
                            operator = entry_rules.get('rsi_operator', '<')
                            if operator == '<':
                                rsi_cond = row['rsi'] < rsi_val
                            else:
                                rsi_cond = row['rsi'] > rsi_val
                        
                        if rsi_cond:
                            should_entry = True
        
        # Exit Evaluation
        should_exit = False
        if in_position:
            if current_month in exit_rules.get('months', []):
                should_exit = True
            
            if exit_rules.get('rsi_enabled'):
                rsi_val = exit_rules.get('rsi_value', 70)
                if row['rsi'] > rsi_val:
                    should_exit = True
                    
        # Execute
        if should_entry and not in_position:
            # Buy
            position_size = balance / current_price
            entry_price = current_price
            in_position = True
        elif should_exit and in_position:
            # Sell
            profit_loss = (current_price - entry_price) * position_size
            balance += profit_loss
            position_size = 0
            in_position = False

    # Final Liquidation
    if in_position:
        final_price = float(df['close_price'].iloc[-1])
        balance += (final_price - entry_price) * position_size
        
    return round(((balance / initial_capital) - 1) * 100, 2)

def optimize():
    db = SessionLocal()
    try:
        # 1. Find BTCUSDT asset
        asset = db.query(Asset).filter(Asset.ticker == 'BTCUSDT').first()
        if not asset:
            print("BTCUSDT not found, trying BTC...")
            asset = db.query(Asset).filter(Asset.ticker == 'BTC').first()
        
        if not asset:
            print("Error: BTCUSDT asset not found in database.")
            return

        # 2. Fetch data (last 12 months)
        print(f"Fetching data for {asset.ticker} (ID: {asset.asset_id})...")
        latest_date = db.query(func.max(OHLCVIntradayData.timestamp_utc)).filter(OHLCVIntradayData.asset_id == asset.asset_id).scalar()
        if not latest_date:
            print("No intraday data found, using daily data...")
            latest_date = db.query(func.max(OHLCVData.timestamp_utc)).filter(OHLCVData.asset_id == asset.asset_id).scalar()
            if not latest_date:
                print("No data found at all.")
                return
            
            query = db.query(OHLCVData.timestamp_utc, OHLCVData.close_price).filter(
                OHLCVData.asset_id == asset.asset_id,
                OHLCVData.timestamp_utc >= latest_date - timedelta(days=365)
            ).order_by(OHLCVData.timestamp_utc)
        else:
            query = db.query(OHLCVIntradayData.timestamp_utc, OHLCVIntradayData.close_price).filter(
                OHLCVIntradayData.asset_id == asset.asset_id,
                OHLCVIntradayData.data_interval == '1h',
                OHLCVIntradayData.timestamp_utc >= latest_date - timedelta(days=365)
            ).order_by(OHLCVIntradayData.timestamp_utc)

        records = query.all()
        if not records:
            print("No records found in the last year.")
            return

        df = pd.DataFrame([dict(r._mapping) for r in records])
        df['timestamp_utc'] = pd.to_datetime(df['timestamp_utc'])
        df.set_index('timestamp_utc', inplace=True)
        df['close_price'] = pd.to_numeric(df['close_price'], errors='coerce')
        df = df.dropna()
        df['rsi'] = calculate_rsi(df['close_price'])
        
        print(f"Loaded {len(df)} bars. Latest date: {latest_date}")

        # 3. Load Existing Results (Cache)
        output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "btcusdt_optimization_results.json")
        cache = {}
        if os.path.exists(output_file):
            try:
                import json
                with open(output_file, 'r') as f:
                    cache_data = json.load(f)
                    cache = cache_data.get("cache", {})
            except:
                cache = {}

        periods = {
            "1 Month": latest_date - timedelta(days=30),
            "3 Months": latest_date - timedelta(days=90),
            "6 Months": latest_date - timedelta(days=180),
            "1 Year": latest_date - timedelta(days=365)
        }

        # Optimization Parameters
        hours = [None, 0, 4, 8, 12, 16, 20]
        days = ['Any', 'Mon', 'Wed', 'Fri', 'Sun']
        rsi_values = [30, 40, 50, 60]

        best_per_period = {}
        new_cache_entries = 0

        for period_name, start_date in periods.items():
            print(f"\n--- Optimizing for {period_name} (since {start_date.date()}) ---")
            period_df = df[df.index >= start_date]
            if len(period_df) < 50:
                print(f"Not enough data for {period_name}")
                continue
            
            # Use data range in cache key to ensure validity if data updates
            date_key = f"{start_date.date()}_{latest_date.date()}"
            
            best_roi = -9999
            best_params = None
            
            for h in hours:
                for d in days:
                    for r in rsi_values:
                        # Cache Key: Period/Dates + Params
                        cache_key = f"{date_key}_{h}_{d}_{r}"
                        
                        if cache_key in cache:
                            roi = cache[cache_key]
                        else:
                            entry_rules = {
                                'hour': h,
                                'day': d,
                                'rsi_enabled': True,
                                'rsi_value': r,
                                'rsi_operator': '<'
                            }
                            exit_rules = {
                                'rsi_enabled': True,
                                'rsi_value': 70
                            }
                            roi = run_simulation(period_df, entry_rules, exit_rules)
                            cache[cache_key] = roi
                            new_cache_entries += 1
                        
                        if roi > best_roi:
                            best_roi = roi
                            best_params = (h, d, r)
            
            best_per_period[period_name] = {"roi": best_roi, "params": best_params}
            print(f"Best ROI: {best_roi}% | Hour: {best_params[0]}, Day: {best_params[1]}, RSI: {best_params[2]}")

        # Sell in May Strategy
        print("\n--- Sell in May Strategy (Buy Nov, Sell May) ---")
        date_key_seasonal = f"seasonal_{df.index[0].date()}_{latest_date.date()}"
        if date_key_seasonal in cache:
            sim_roi = cache[date_key_seasonal]
        else:
            sim_entry = {'months': ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'], 'day': 'Any', 'hour': None, 'rsi_enabled': False}
            sim_exit = {'months': ['May']}
            sim_roi = run_simulation(df, sim_entry, sim_exit)
            cache[date_key_seasonal] = sim_roi
            new_cache_entries += 1
            
        print(f"Sell in May Strategy ROI: {sim_roi}%")
        best_per_period["Sell in May"] = {"roi": sim_roi, "params": "Nov-Apr Hold"}

        # Save to JSON
        import json
        json_data = {
            "ticker": asset.ticker,
            "latest_analysis_date": latest_date.isoformat() if hasattr(latest_date, 'isoformat') else str(latest_date),
            "best_results": best_per_period,
            "cache": cache
        }
        
        with open(output_file, 'w') as f:
            json.dump(json_data, f, indent=2)

        if new_cache_entries > 0:
            print(f"\nAdded {new_cache_entries} new simulations to cache.")
        else:
            print("\nAll conditions were already cached. No new simulations performed.")
        print(f"Results saved to: {output_file}")
        
        # Summary Report
        print("\n\n" + "="*40)
        print("          OPTIMIZATION REPORT")
        print("="*40)
        for p, r in best_per_period.items():
            print(f"{p:10} | ROI: {r['roi']:>8}% | Params: {r['params']}")
        print("="*40)

    finally:
        db.close()

if __name__ == "__main__":
    optimize()
