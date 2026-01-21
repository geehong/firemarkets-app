
import os
import requests
import logging
from typing import Dict, Any, Optional
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text

# Simple in-memory cache fallback if Redis isn't passed explicitly
# In production, use the Redis connection from app deps
# from app.core.config import settings

logger = logging.getLogger(__name__)

class FundamentalAnalyzer:
    def __init__(self):
        self.api_key = os.getenv("FMP_API_KEY")
        self.base_url = "https://financialmodelingprep.com/api/v3"
        
    def get_treasury_rates(self, db: Session) -> Dict[str, Any]:
        """
        Fetch Treasury Rates from DB (pivoted)
        """
        try:
            # Fetch all treasury data
            query = text("SELECT timestamp, indicator_name, value FROM economic_indicators WHERE indicator_name LIKE 'Treasury%' ORDER BY timestamp DESC")
            rows = db.execute(query).fetchall()
            
            # Pivot data: {date: {year10: val, ...}}
            data_map = {}
            for r in rows:
                date_str = r.timestamp.strftime("%Y-%m-%d")
                if date_str not in data_map:
                    data_map[date_str] = {"date": date_str}
                
                name = r.indicator_name
                val = float(r.value)
                if name == "Treasury10Y": data_map[date_str]["year10"] = val
                elif name == "Treasury2Y": data_map[date_str]["year2"] = val
                elif name == "Treasury1Y": data_map[date_str]["year1"] = val
                elif name == "Treasury3M": data_map[date_str]["month3"] = val
            
            # Convert to list
            result_list = list(data_map.values())
            # Sort generic
            result_list.sort(key=lambda x: x["date"], reverse=True)
            
            return {"data": result_list[:30]}
        except Exception as e:
            logger.error(f"Error fetching treasury rates: {e}")
            return {"error": str(e)}

    def get_yield_curve_spread(self, db: Session) -> Dict[str, Any]:
        """
        Calculate 10Y - 2Y Spread for Recession Signal.
        """
        try:
            query = text("SELECT timestamp, indicator_name, value FROM economic_indicators WHERE indicator_name IN ('Treasury10Y', 'Treasury2Y') ORDER BY timestamp ASC")
            rows = db.execute(query).fetchall()
            
            data_map = {}
            for r in rows:
                date_str = r.timestamp.strftime("%Y-%m-%d")
                if date_str not in data_map: data_map[date_str] = {}
                data_map[date_str][r.indicator_name] = float(r.value)
                
            result_list = []
            for date, val in data_map.items():
                if "Treasury10Y" in val and "Treasury2Y" in val:
                    spread = val["Treasury10Y"] - val["Treasury2Y"]
                    result_list.append({
                        "date": date,
                        "spread": round(spread, 3),
                        "signal": "Recession Warning (Inverted)" if spread < 0 else "Normal"
                    })
            
            return {"data": result_list[-90:]} # Last 90 data points
        except Exception as e:
            logger.error(f"Error calculating yield spread: {e}")
            return {"data": []}

    def get_macro_indicators(self, db: Session) -> Dict[str, Any]:
        """
        Fetch key macro indicators from DB
        """
        indicators = ["GDP", "CPI", "unemploymentRate"]
        results = {}
        
        for ind in indicators:
            try:
                query = text("SELECT timestamp as date, value FROM economic_indicators WHERE indicator_name = :name ORDER BY timestamp DESC LIMIT 50")
                rows = db.execute(query, {"name": ind}).fetchall()
                results[ind] = [{"date": r.date.strftime("%Y-%m-%d"), "value": float(r.value)} for r in rows]
            except Exception as e:
                logger.error(f"Error fetching {ind}: {e}")
                results[ind] = []
                
        return results

fundamental_analyzer = FundamentalAnalyzer()
