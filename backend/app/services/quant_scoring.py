import pandas as pd
import numpy as np
import scipy.stats as stats
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.models.asset import Asset, OHLCVData, CryptoMetric

logger = logging.getLogger(__name__)

class QuantScoringEngine:
    def __init__(self, db: Session):
        self.db = db

    def get_crypto_metrics_df(self, asset_id: int) -> pd.DataFrame:
        """Fetch raw on-chain metrics as a Pandas DataFrame."""
        records = self.db.query(
            CryptoMetric.timestamp_utc,
            CryptoMetric.mvrv_z_score,
            CryptoMetric.mvrv,
            CryptoMetric.nupl,
            CryptoMetric.sth_nupl,
            CryptoMetric.lth_nupl,
            CryptoMetric.puell_multiple,
            CryptoMetric.rhodl_ratio,
            CryptoMetric.reserve_risk
        ).filter(CryptoMetric.asset_id == asset_id).order_by(CryptoMetric.timestamp_utc).all()
        
        if not records:
            return pd.DataFrame()
        
        df = pd.DataFrame(records)
        df.set_index('timestamp_utc', inplace=True)
        df.index = pd.to_datetime(df.index)
        for col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            
        return df

    def get_price_df(self, asset_id: int) -> pd.DataFrame:
        """Fetch OHLCV price as a Pandas DataFrame."""
        records = self.db.query(
            OHLCVData.timestamp_utc,
            OHLCVData.close_price
        ).filter(OHLCVData.asset_id == asset_id).order_by(OHLCVData.timestamp_utc).all()

        if not records:
            return pd.DataFrame()

        df = pd.DataFrame(records)
        df.set_index('timestamp_utc', inplace=True)
        df.index = pd.to_datetime(df.index).normalize()
        df['close_price'] = pd.to_numeric(df['close_price'], errors='coerce')
        df = df[~df.index.duplicated(keep='last')]
        return df

    def calculate_hybrid_percentile(self, series: pd.Series, rolling_window_days: int = 1460) -> pd.Series:
        """Calculate 0.5 * Global + 0.5 * Rolling Percentile, mapped to 0~100."""
        if series.empty:
            return series
            
        # Global Percentile
        global_rank = series.rank(pct=True) * 100
        
        # Rolling Percentile
        rolling_rank = series.rolling(window=f"{rolling_window_days}D", min_periods=30).apply(
            lambda x: pd.Series(x).rank(pct=True).iloc[-1] if not pd.isna(x).all() else np.nan,
            raw=False
        ) * 100
        
        rolling_rank.fillna(global_rank, inplace=True)
        hybrid_score = (0.5 * global_rank) + (0.5 * rolling_rank)
        return hybrid_score

    def detect_divergence(self, price_series: pd.Series, score_series: pd.Series, window: int = 21) -> pd.DataFrame:
        """
        Detect macro divergence using localized rolling minimums/maximums over `window` days.
        Returns a DataFrame with divergence signals.
        """
        df = pd.DataFrame({'price': price_series, 'score': score_series})
        
        # Find rolling min/max
        df['price_min'] = df['price'].rolling(window=window, min_periods=window//2).min()
        df['score_min'] = df['score'].rolling(window=window, min_periods=window//2).min()
        
        df['price_max'] = df['price'].rolling(window=window, min_periods=window//2).max()
        df['score_max'] = df['score'].rolling(window=window, min_periods=window//2).max()
        
        # Bullish Divergence (Price Lower Low, Score Higher Low)
        # Compare current min to the min of the previous window
        df['prev_price_min'] = df['price_min'].shift(window)
        df['prev_score_min'] = df['score_min'].shift(window)
        
        # Bearish Divergence (Price Higher High, Score Lower High)
        df['prev_price_max'] = df['price_max'].shift(window)
        df['prev_score_max'] = df['score_max'].shift(window)
        
        is_bullish_div = (df['price'] <= df['price_min']) & (df['price'] < df['prev_price_min']) & (df['score'] > df['prev_score_min'] + 5)
        is_bearish_div = (df['price'] >= df['price_max']) & (df['price'] > df['prev_price_max']) & (df['score'] < df['prev_score_max'] - 5)
        
        df['div_type'] = None
        df.loc[is_bullish_div, 'div_type'] = 'bullish'
        df.loc[is_bearish_div, 'div_type'] = 'bearish'
        
        # Strength based on gap
        df['div_strength'] = 0.0
        df.loc[is_bullish_div, 'div_strength'] = (df['score'] - df['prev_score_min']).clip(0, 100) / 100.0
        df.loc[is_bearish_div, 'div_strength'] = (df['prev_score_max'] - df['score']).clip(0, 100) / 100.0
        
        return df[['div_type', 'div_strength']]

    def get_timeseries_quant_data(self, asset_id: int):
        df_metrics = self.get_crypto_metrics_df(asset_id)
        df_price = self.get_price_df(asset_id)
        
        if df_metrics.empty or df_price.empty:
            return []

        # Forward fill price just in case to align with metrics, or join them
        df = df_price.join(df_metrics, how='inner').copy()
        df.sort_index(inplace=True)
        
        # Component Percentiles (0 to 100)
        df['mvrv_z_score_score'] = self.calculate_hybrid_percentile(df['mvrv_z_score'])
        df['mvrv_score'] = self.calculate_hybrid_percentile(df['mvrv'])
        df['nupl_score'] = self.calculate_hybrid_percentile(df['nupl'])
        df['sth_nupl_score'] = self.calculate_hybrid_percentile(df['sth_nupl'])
        df['lth_nupl_score'] = self.calculate_hybrid_percentile(df['lth_nupl'])
        df['puell_score'] = self.calculate_hybrid_percentile(df['puell_multiple'])
        df['rhodl_score'] = self.calculate_hybrid_percentile(df['rhodl_ratio'])
        df['reserve_risk_score'] = self.calculate_hybrid_percentile(df['reserve_risk'])
        
        # Fill missing scores intelligently
        cols_scores = ['mvrv_z_score_score', 'mvrv_score', 'nupl_score', 'sth_nupl_score', 'lth_nupl_score', 'puell_score', 'rhodl_score', 'reserve_risk_score']
        df[cols_scores] = df[cols_scores].ffill().fillna(50)
        
        # Total Raw Score (weighted) - 0 to 100 range! (Normalized for better UX)
        # We will keep the original weights for Total Score for consistency, or average all of them.
        # Let's average ALL of them to represent the "Total Macro Quant Score"
        df['total_score'] = df[cols_scores].mean(axis=1)
        
        # Divergence Detection
        div_df = self.detect_divergence(df['close_price'], df['total_score'], window=30)
        df['div_type'] = div_df['div_type']
        df['div_strength'] = div_df['div_strength']
        
        # Dynamic Thresholds (5th and 95th percentiles of the trailing 4 years)
        # To avoid early noise, if < 2 years, use global thresholds initially
        # global_p5 = df['total_score'].quantile(0.05)
        # global_p95 = df['total_score'].quantile(0.95)
        df['threshold_bottom'] = df['total_score'].rolling('1460D', min_periods=90).quantile(0.05).ffill().fillna(15)
        df['threshold_top'] = df['total_score'].rolling('1460D', min_periods=90).quantile(0.95).ffill().fillna(85)
        
        results = []
        
        for idx, row in df.iterrows():
            total = row['total_score']
            
            sig = "Neutral"
            if total < row['threshold_bottom']:
                sig = "Extreme Buy"
            elif total < row['threshold_bottom'] * 1.5:
                sig = "Buy"
            elif total > row['threshold_top']:
                sig = "Extreme Sell"
            elif total > row['threshold_top'] * 0.85:
                sig = "Sell"
                
            # Compute confidence simply based on how far it deviates + divergence
            confidence = 0.5
            if sig == "Extreme Buy" and row['div_type'] == 'bullish':
                confidence = 0.9
            elif sig == "Extreme Sell" and row['div_type'] == 'bearish':
                confidence = 0.9
            elif sig in ["Extreme Buy", "Extreme Sell"]:
                confidence = 0.7
                
            results.append({
                "date": idx.strftime("%Y-%m-%d"),
                "price": float(row['close_price']),
                "normalized_score": float(total),  # 0 to 100 UX
                "thresholds": {
                    "bottom": float(row['threshold_bottom']),
                    "top": float(row['threshold_top'])
                },
                "raw_components": {
                    "mvrv_z": float(row['mvrv_z_score']) if pd.notna(row['mvrv_z_score']) else None,
                    "mvrv": float(row['mvrv']) if pd.notna(row['mvrv']) else None,
                    "nupl": float(row['nupl']) if pd.notna(row['nupl']) else None,
                    "sth_nupl": float(row['sth_nupl']) if pd.notna(row['sth_nupl']) else None,
                    "lth_nupl": float(row['lth_nupl']) if pd.notna(row['lth_nupl']) else None,
                    "puell": float(row['puell_multiple']) if pd.notna(row['puell_multiple']) else None,
                    "rhodl": float(row['rhodl_ratio']) if pd.notna(row['rhodl_ratio']) else None,
                    "reserve_risk": float(row['reserve_risk']) if pd.notna(row['reserve_risk']) else None
                },
                "score_components": {
                    "mvrv_z": float(row['mvrv_z_score_score']),
                    "mvrv": float(row['mvrv_score']),
                    "nupl": float(row['nupl_score']),
                    "sth_nupl": float(row['sth_nupl_score']),
                    "lth_nupl": float(row['lth_nupl_score']),
                    "puell": float(row['puell_score']),
                    "rhodl": float(row['rhodl_score']),
                    "reserve_risk": float(row['reserve_risk_score'])
                },
                "signal": sig,
                "confidence": confidence,
                "divergence": {
                    "type": row['div_type'] if pd.notna(row['div_type']) else None,
                    "strength": float(row['div_strength']) if pd.notna(row['div_strength']) else 0.0
                }
            })
            
        return results
