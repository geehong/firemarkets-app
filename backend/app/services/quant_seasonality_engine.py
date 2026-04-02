import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging
from typing import Dict, Any, List, Optional

from app.models.asset import Asset, OHLCVData, OHLCVIntradayData, EconomicIndicator

logger = logging.getLogger(__name__)

class QuantSeasonalityEngine:
    def __init__(self, db: Session):
        self.db = db

    def get_btc_hourly_df(self, asset_id: int) -> pd.DataFrame:
        """Fetch BTC hourly OHLCV data."""
        records = self.db.query(
            OHLCVIntradayData.timestamp_utc,
            OHLCVIntradayData.open_price,
            OHLCVIntradayData.high_price,
            OHLCVIntradayData.low_price,
            OHLCVIntradayData.close_price,
            OHLCVIntradayData.volume
        ).filter(
            OHLCVIntradayData.asset_id == asset_id,
            OHLCVIntradayData.data_interval == '1h'
        ).order_by(OHLCVIntradayData.timestamp_utc).all()

        if not records:
            logger.warning(f"No hourly data found for asset_id {asset_id}")
            return pd.DataFrame()

        df = pd.DataFrame(records)
        df.set_index('timestamp_utc', inplace=True)
        # Ensure index is datetime and non-null
        df = df[df.index.notnull()]
        df.index = pd.to_datetime(df.index)
        for col in ['open_price', 'high_price', 'low_price', 'close_price', 'volume']:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        return df

    def get_daily_price_df(self, asset_id: int) -> pd.DataFrame:
        """Fetch daily OHLCV data."""
        records = self.db.query(
            OHLCVData.timestamp_utc,
            OHLCVData.close_price
        ).filter(OHLCVData.asset_id == asset_id).order_by(OHLCVData.timestamp_utc).all()

        if not records:
            return pd.DataFrame()

        df = pd.DataFrame(records)
        df.set_index('timestamp_utc', inplace=True)
        # Handle decimal values and non-null index
        df = df[df.index.notnull()]
        df.index = pd.to_datetime(df.index).normalize()
        df['close_price'] = pd.to_numeric(df['close_price'], errors='coerce')
        df = df[~df.index.duplicated(keep='last')]
        return df

    def get_rate_regime_series(self) -> pd.Series:
        """Categorize Fed Funds Rate into 'hiking', 'cutting', or 'neutral'."""
        records = self.db.query(
            EconomicIndicator.timestamp,
            EconomicIndicator.value
        ).filter(EconomicIndicator.indicator_code == 'FEDFUNDS').order_by(EconomicIndicator.timestamp).all()

        if not records:
            return pd.Series(dtype=str)

        df = pd.DataFrame(records)
        df.set_index('timestamp', inplace=True)
        df.index = pd.to_datetime(df.index).normalize()
        df['value'] = pd.to_numeric(df['value'], errors='coerce')
        
        # Calculate 3-month change to determine regime
        # Since it's typically monthly data, shift(3) is 3 months
        df['diff'] = df['value'].diff(3)
        df['regime'] = 'neutral'
        df.loc[df['diff'] > 0.1, 'regime'] = 'hiking'
        df.loc[df['diff'] < -0.1, 'regime'] = 'cutting'
        
        return df['regime']

    def calculate_timeframe_winrate(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate win rate and avg returns for various timeframes using 1h data."""
        if df.empty:
            return {}

        results = {}
        timeframes = {
            '1h': 1,
            '4h': 4,
            '12h': 12,
            '1d': 24,
            '1w': 24 * 7,
            '1m': 24 * 30
        }

        for label, hours in timeframes.items():
            returns = df['close_price'].pct_change(hours)
            win_rate = (returns > 0).mean()
            avg_up = returns[returns > 0].mean()
            avg_down = returns[returns < 0].mean()
            
            results[label] = {
                "win_rate": float(win_rate) if not pd.isna(win_rate) else 0.5,
                "avg_up": float(avg_up) if not pd.isna(avg_up) else 0,
                "avg_down": float(avg_down) if not pd.isna(avg_down) else 0,
                "profit_factor": float(abs(avg_up/avg_down)) if not pd.isna(avg_down) and avg_down != 0 else 1.0
            }

        return results

    def calculate_monthly_seasonality(self, df: pd.DataFrame, rate_regime: pd.Series) -> Dict[str, Any]:
        """Calculate monthly and quarterly seasonality."""
        if df.empty:
            return {"all": {"monthly": {}, "quarterly": {}}, "hiking": {"monthly": {}, "quarterly": {}}, "cutting": {"monthly": {}, "quarterly": {}}}

        df = df.copy()
        df['month'] = df.index.strftime('%b')
        df['year'] = df.index.year
        df['quarter'] = 'Q' + df.index.quarter.astype(str)

        # Map rate regime to daily data
        if not rate_regime.empty:
            df = df.join(rate_regime.rename('regime'), how='left')
            df['regime'] = df['regime'].ffill().fillna('neutral')
        else:
            df['regime'] = 'neutral'

        def get_stats(sub_df):
            if sub_df.empty:
                return {"monthly": {}, "quarterly": {}}
            
            monthly_res = {}
            for year, year_df in sub_df.groupby('year'):
                year_str = str(year)
                monthly_res[year_str] = {}
                for month_idx in range(1, 13):
                    month_name = datetime(2000, month_idx, 1).strftime('%b')
                    month_df = year_df[year_df.index.month == month_idx]
                    if not month_df.empty and len(month_df) > 1:
                        ret = (month_df['close_price'].iloc[-1] / month_df['close_price'].iloc[0]) - 1
                        monthly_res[year_str][month_name] = float(ret * 100)
            
            quarterly_res = {}
            for q in ['Q1', 'Q2', 'Q3', 'Q4']:
                q_df = sub_df[sub_df['quarter'] == q]
                if not q_df.empty:
                    q_rets = []
                    for year, qy_df in q_df.groupby('year'):
                        if len(qy_df) > 1:
                            ret = (qy_df['close_price'].iloc[-1] / qy_df['close_price'].iloc[0]) - 1
                            q_rets.append(ret)
                    if q_rets:
                        quarterly_res[q] = float(np.mean(q_rets) * 100)
                    else:
                        quarterly_res[q] = 0.0
                else:
                    quarterly_res[q] = 0.0
            
            return {"monthly": monthly_res, "quarterly": quarterly_res}

        results = {
            "all": get_stats(df),
            "hiking": get_stats(df[df['regime'] == 'hiking']),
            "cutting": get_stats(df[df['regime'] == 'cutting'])
        }

        return results

    def calculate_rolling_correlation(self, btc_df: pd.DataFrame, other_dfs: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """Calculate rolling 30d and 90d correlations."""
        if btc_df.empty:
            return {}

        results = {}
        for ticker, df in other_dfs.items():
            if df.empty:
                continue
            
            # Align data by joining
            combined = btc_df.join(df.rename(columns={'close_price': 'other_close'}), how='inner')
            
            if combined.empty:
                continue
                
            combined['btc_ret'] = combined['close_price'].pct_change()
            combined['other_ret'] = combined['other_close'].pct_change()
            
            combined['r30'] = combined['btc_ret'].rolling(30).corr(combined['other_ret'])
            combined['r90'] = combined['btc_ret'].rolling(90).corr(combined['other_ret'])
            
            data = []
            # Optionally sample data to reduce size
            # Sample every 1 day
            for row in combined.dropna(subset=['r30', 'r90']).itertuples():
                data.append({
                    "date": row.Index.strftime("%Y-%m-%d"),
                    "r30": float(row.r30),
                    "r90": float(row.r90)
                })
            results[ticker] = data

        return results

    def calculate_intraday_effect(self, hourly_df: pd.DataFrame, tz_offset: int = 0) -> Dict[str, Any]:
        """Calculate avg returns by hour of day and day of week, with timezone shift."""
        if hourly_df.empty:
            return {"by_hour": [], "by_weekday": []}

        df = hourly_df.copy()
        # Shift timezone
        if tz_offset != 0:
            df.index = df.index + pd.Timedelta(hours=tz_offset)
            
        df['returns'] = df['close_price'].pct_change()
        df['hour'] = df.index.hour
        df['weekday'] = df.index.strftime('%a')
        
        weekday_order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        
        by_hour = df.groupby('hour')['returns'].mean()
        by_weekday = df.groupby('weekday')['returns'].mean()
        
        res_hour = [{"hour": int(h), "avg_return": float(r * 100)} for h, r in by_hour.items()]
        res_weekday = [{"day": d, "avg_return": float(by_weekday.get(d, 0) * 100)} for d in weekday_order]
        
        return {
            "by_hour": res_hour,
            "by_weekday": res_weekday
        }

    def calculate_rsi(self, series: pd.Series, window: int = 14) -> pd.Series:
        """Calculate Relative Strength Index."""
        delta = series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))

    def calculate_rsi_strategy_backtest(self, df: pd.DataFrame, rsi_buy: float = 30, rsi_sell: float = 70) -> Dict[str, Any]:
        """Simulate RSI strategy: Buy < rsi_buy, Sell > rsi_sell across timeframes."""
        if df.empty:
            return {}

        results = {}
        # Define timeframes and their resampling rules
        tf_configs = {
            '1h': None,
            '1d': 'D',
            '1w': 'W',
            '1m': 'M'
        }

        for label, rule in tf_configs.items():
            if rule:
                tf_df = df['close_price'].resample(rule).last().dropna()
            else:
                tf_df = df['close_price']

            if len(tf_df) < 30: # Need enough data for RSI and trades
                continue

            rsi = self.calculate_rsi(tf_df)
            
            trades = []
            holding = False
            entry_price = 0
            
            for i in range(len(tf_df)):
                current_rsi = rsi.iloc[i]
                current_price = tf_df.iloc[i]
                
                if pd.isna(current_rsi):
                    continue
                
                if not holding and current_rsi < rsi_buy:
                    holding = True
                    entry_price = current_price
                elif holding and current_rsi > rsi_sell:
                    holding = False
                    profit = (current_price / entry_price) - 1
                    trades.append(profit)
            
            if trades:
                profits = np.array(trades)
                win_rate = (profits > 0).mean()
                avg_win = profits[profits > 0].mean() if any(profits > 0) else 0
                avg_loss = profits[profits < 0].mean() if any(profits < 0) else 0
                
                results[label] = {
                    "win_rate": float(win_rate * 100),
                    "avg_win": float(avg_win * 100),
                    "avg_loss": float(avg_loss * 100),
                    "total_trades": len(trades)
                }
            else:
                results[label] = {
                    "win_rate": 0,
                    "avg_win": 0,
                    "avg_loss": 0,
                    "total_trades": 0
                }

        return results

    def run_full_analysis(self, btc_asset_id: int, compare_asset_ids: Dict[str, int], 
                          days: Optional[int] = None, tz_offset: int = 0,
                          rsi_buy: float = 30, rsi_sell: float = 70) -> Dict[str, Any]:
        """Run all analyses and return a consolidated dict."""
        btc_hourly = self.get_btc_hourly_df(btc_asset_id)
        btc_daily = self.get_daily_price_df(btc_asset_id)
        
        # Apply date filters if 'days' is provided
        if days is not None:
            cutoff = datetime.utcnow() - timedelta(days=days)
            btc_hourly = btc_hourly[btc_hourly.index >= cutoff]
            btc_daily = btc_daily[btc_daily.index >= cutoff]
            
        other_daily = {}
        for ticker, aid in compare_asset_ids.items():
            df = self.get_daily_price_df(aid)
            if days is not None:
                df = df[df.index >= cutoff]
            other_daily[ticker] = df
            
        rate_regime = self.get_rate_regime_series()
        
        winrate = self.calculate_timeframe_winrate(btc_hourly)
        seasonality = self.calculate_monthly_seasonality(btc_daily, rate_regime)
        correlation = self.calculate_rolling_correlation(btc_daily, other_daily)
        intraday = self.calculate_intraday_effect(btc_hourly, tz_offset=tz_offset)
        rsi_backtest = self.calculate_rsi_strategy_backtest(btc_hourly, rsi_buy=rsi_buy, rsi_sell=rsi_sell)
        
        return {
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "timeframe_winrate": winrate,
            "monthly_seasonality": {k: v['monthly'] for k, v in seasonality.items()},
            "quarterly_seasonality": {k: v['quarterly'] for k, v in seasonality.items()},
            "rolling_correlation": correlation,
            "intraday_effect": intraday,
            "rsi_backtest": rsi_backtest
        }
