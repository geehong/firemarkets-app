from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.api import deps
from app.collectors.fred_collector import FredCollector
from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager

router = APIRouter()

# Available Economic Indicators in DB (as of 2026-01-29):
# -------------------------------------------------------
# Money Supply:
# - M1SL: M1
# - M2SL: M2
# - MABMM301USM189S: M3 for the United States
# - M2_GROWTH_YOY: M2 Money Supply Growth (YoY)
#
# Interest Rates & Yields:
# - DFF: Federal Funds Effective Rate
# - DGS10: Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity
# - DGS2: Market Yield on U.S. Treasury Securities at 2-Year Constant Maturity
# - DGS1: Market Yield on U.S. Treasury Securities at 1-Year Constant Maturity
# - T10Y2Y: 10-Year Treasury Constant Maturity Minus 2-Year Treasury Constant Maturity
# - MORTGAGE30US: 30-Year Fixed Rate Mortgage Average in the United States
#
# Economic Health & Inflation:
# - GDP: Gross Domestic Product
# - CPIAUCSL: Consumer Price Index for All Urban Consumers: All Items
# - PCEPI: Personal Consumption Expenditures: Chain-type Price Index
# - PPIFIS: Producer Price Index by Commodity: Final Demand
# - UNRATE: Unemployment Rate
# - PAYEMS: All Employees, Total Nonfarm
# - ICSA: Initial Claims
# - INDPRO: Industrial Production: Total Index
# - RSXFS: Advance Retail Sales: Retail and Food Services
# - STLFSI4: St. Louis Fed Financial Stress Index


@router.get("/indicators", response_model=Dict[str, Any])
def get_fred_indicators(
    type: str = Query("all", enum=["all", "treasury", "indicators", "yield_spread"]),
    db: Session = Depends(deps.get_current_db)
):
    """
    Get aggregated FRED economic indicators.
    mimics the V1 /api/v1/analysis/macro structure but using FRED data.
    """
    from sqlalchemy import text
    from datetime import datetime

    response = {}

    # 1. Treasury Rates
    if type in ["all", "treasury"]:
        # FRED Series: DGS10 (10Y), DGS2 (2Y), DGS1 (1Y), TB3MS (3M), DFF (Fed Funds)
        # Using DGS10, DGS2, DGS1, TB3MS for chart
        
        # Determine date range (e.g., last 2 years for rates)
        query = text("""
            SELECT timestamp, indicator_code, value 
            FROM economic_indicators 
            WHERE indicator_code IN ('DGS10', 'DGS2', 'DGS1', 'TB3MS', 'DFF') 
            ORDER BY timestamp DESC
            LIMIT 2000
        """)
        rows = db.execute(query).fetchall()
        
        data_map = {}
        for r in rows:
            date_str = r.timestamp.strftime("%Y-%m-%d")
            if date_str not in data_map:
                data_map[date_str] = {"date": date_str}
            
            val = float(r.value)
            if r.indicator_code == 'DGS10':
                data_map[date_str]["year10"] = val
            elif r.indicator_code == 'DGS2':
                data_map[date_str]["year2"] = val
            elif r.indicator_code == 'DGS1':
                data_map[date_str]["year1"] = val
            elif r.indicator_code == 'TB3MS':
                data_map[date_str]["month3"] = val
            elif r.indicator_code == 'DFF':
                data_map[date_str]["fed_funds"] = val
        
        # Convert to list and sort
        treasury_data = list(data_map.values())
        treasury_data.sort(key=lambda x: x["date"], reverse=True)
        
        # Filter out incomplete rows if strict charting needed, or keep gaps
        response["treasury"] = {"data": treasury_data}

    # 2. Key Economic Indicators (GDP, CPI, Unemployment, etc.)
    if type in ["all", "indicators"]:
        # FRED Series Mapping
        target_indicators = {
            # Growth & Output
            "GDP": "GDP",
            "INDPRO": "INDPRO",
            "RetailSales": "RSXFS",
            # Inflation
            "CPI": "CPIAUCSL",
            "PCE": "PCEPI",
            "PPI": "PPIFIS",
            # Labor Market
            "unemploymentRate": "UNRATE",
            "NonfarmPayrolls": "PAYEMS",
            "InitialClaims": "ICSA",
            # Money & Liquidity
            "m2Growth": "M2_GROWTH_YOY",
            "M1": "M1SL",
            "M2": "M2SL",
            "M3": "MABMM301USM189S",
            # Housing & Finance
            "Mortgage30Y": "MORTGAGE30US",
            "FinancialStress": "STLFSI4"
        }
        
        indicators_data = {}
        
        for key, code in target_indicators.items():
            query = text("""
                SELECT timestamp, value 
                FROM economic_indicators 
                WHERE indicator_code = :code 
                ORDER BY timestamp DESC 
                LIMIT 120
            """) # LIMIT 120: 10 years for monthly
            
            rows = db.execute(query, {"code": code}).fetchall()
            indicators_data[key] = [
                {"date": r.timestamp.strftime("%Y-%m-%d"), "value": float(r.value)} 
                for r in rows
            ]
            
        response["indicators"] = indicators_data

    # 3. Yield Spread (10Y - 2Y)
    if type in ["all", "yield_spread"]:
        # FRED Series: T10Y2Y (Spread), DGS10, DGS2
        query = text("""
            SELECT timestamp, indicator_code, value 
            FROM economic_indicators 
            WHERE indicator_code IN ('T10Y2Y', 'DGS10', 'DGS2') 
            ORDER BY timestamp ASC
        """) 
        
        rows = db.execute(query).fetchall()
        
        # Pivot for spread chart
        spread_map = {}
        for r in rows:
            date_str = r.timestamp.strftime("%Y-%m-%d")
            if date_str not in spread_map:
                spread_map[date_str] = {"date": date_str}
            
            val = float(r.value)
            if r.indicator_code == 'T10Y2Y':
                spread_map[date_str]["spread"] = val
                spread_map[date_str]["signal"] = "Recession Warning (Inverted)" if val < 0 else "Normal"
            elif r.indicator_code == 'DGS10':
                spread_map[date_str]["year10"] = val
            elif r.indicator_code == 'DGS2':
                spread_map[date_str]["year2"] = val

        spread_data = list(spread_map.values())
        spread_data.sort(key=lambda x: x["date"]) # Ensure ascending for chart

        # Filter: Ensure we have spread data (optional, but keep it robust)
        # Some days might have 10Y but not 2Y or Spread. Charts handle gaps usually.
        
        response["yield_spread"] = {"data": spread_data[-365:]} # Last year for daily data

    # If asking for specific type, return that key's content directly to match V1 behavior more closely?
    # V1: 
    # if type == "treasury": return {...}
    # else: return { treasury: ..., ... }
    
    if type == "treasury":
        return response["treasury"]
    elif type == "indicators":
        return response["indicators"]
    elif type == "yield_spread":
        return response["yield_spread"]
    
    return response

@router.post("/collect", response_model=Dict[str, Any])
async def collect_fred_data(
    db: Session = Depends(deps.get_current_db)
):
    """
    Trigger FRED data collection manually.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info("FRED collection endpoint called")
    try:
        # Manually verify/get dependencies since they are not all standard Depends currently
        # In a real app, these managers might be singletons or injected via Depends
        config_manager = ConfigManager()
        # api_manager = ApiStrategyManager(config_manager) # Heavy initialization, skipping for now
        redis_queue_manager = RedisQueueManager(config_manager)

        collector = FredCollector(
            db=db,
            config_manager=config_manager,
            api_manager=None,
            redis_queue_manager=redis_queue_manager
        )
        
        result = await collector.collect_with_settings()
        return result
    except Exception as e:
        logger.error(f"Error in collect_fred_data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
