import logging
import pandas as pd
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

from app.collectors.base_collector import BaseCollector
from app.models.asset import EconomicIndicator, M2Data
from fredapi import Fred

logger = logging.getLogger(__name__)

class FredCollector(BaseCollector):
    def __init__(self, db: Session, config_manager, api_manager, redis_queue_manager):
        super().__init__(db, config_manager, api_manager, redis_queue_manager)
        self.fred_api_key = self.config_manager.get_fred_api_key()
        if not self.fred_api_key:
            logger.warning("FRED_API_KEY is not set. FredCollector may fail.")
        else:
            self.fred = Fred(api_key=self.fred_api_key)

        # Mapping of Series ID to (Indicator Name, Unit, Category/Table)
        self.indicators_map = {
            # Inflation
            'CPIAUCSL': {'name': 'Consumer Price Index for All Urban Consumers: All Items', 'unit': 'Index 1982-1984=100', 'table': 'economic'},
            'PCEPI': {'name': 'Personal Consumption Expenditures: Chain-type Price Index', 'unit': 'Index 2012=100', 'table': 'economic'},
            'PPIFIS': {'name': 'Producer Price Index by Commodity: Final Demand', 'unit': 'Index Nov 2009=100', 'table': 'economic'},
            # Interest Rates
            'DFF': {'name': 'Federal Funds Effective Rate', 'unit': 'Percent', 'table': 'economic'},
            'DGS10': {'name': 'Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity', 'unit': 'Percent', 'table': 'economic'},
            'DGS2': {'name': 'Market Yield on U.S. Treasury Securities at 2-Year Constant Maturity', 'unit': 'Percent', 'table': 'economic'},
            'DGS1': {'name': 'Market Yield on U.S. Treasury Securities at 1-Year Constant Maturity', 'unit': 'Percent', 'table': 'economic'},
            'T10Y2Y': {'name': '10-Year Treasury Constant Maturity Minus 2-Year Treasury Constant Maturity', 'unit': 'Percent', 'table': 'economic'}, # Calculated or direct series
            'MORTGAGE30US': {'name': '30-Year Fixed Rate Mortgage Average in the United States', 'unit': 'Percent', 'table': 'economic'},
            # Labor Market
            'PAYEMS': {'name': 'All Employees, Total Nonfarm', 'unit': 'Thousands of Persons', 'table': 'economic'},
            'UNRATE': {'name': 'Unemployment Rate', 'unit': 'Percent', 'table': 'economic'},
            'ICSA': {'name': 'Initial Claims', 'unit': 'Number', 'table': 'economic'},
            # Growth
            'GDP': {'name': 'Gross Domestic Product', 'unit': 'Billions of Dollars', 'table': 'economic'},
            'INDPRO': {'name': 'Industrial Production: Total Index', 'unit': 'Index 2017=100', 'table': 'economic'},
            'RSXFS': {'name': 'Advance Retail Sales: Retail and Food Services', 'unit': 'Millions of Dollars', 'table': 'economic'},
            # Liquidity / Money
            'M2SL': {'name': 'M2', 'unit': 'Billions of Dollars', 'table': 'm2'}, # M2 Money Supply
            'M1SL': {'name': 'M1', 'unit': 'Billions of Dollars', 'table': 'economic'}, # M1 Money Supply
            'MABMM301USM189S': {'name': 'M3 for the United States', 'unit': 'Billions of Dollars', 'table': 'economic'}, # M3 (IMF source, Scaled)
            # 'WALCL': {'name': 'Assets: Total Assets: Total Assets (Less Eliminations from Consolidation): Wednesday Level', 'unit': 'Millions of Dollars', 'table': 'economic'}, # Fed Balance sheet
             'STLFSI4': {'name': 'St. Louis Fed Financial Stress Index', 'unit': 'Index', 'table': 'economic'}
        }

    async def _collect_data(self) -> Dict[str, Any]:
        """
        Collects data for all configured FRED series.
        """
        if not self.fred_api_key:
             return {"success": False, "error": "Missing FRED API Key"}

        stats = {"processed": 0, "errors": 0, "inserted_economic": 0, "inserted_m2": 0}

        for series_id, info in self.indicators_map.items():
            try:
                logger.info(f"[{self.collector_name}] Fetching {series_id}...")
                data_series = self.fred.get_series(series_id) 
                
                count = self._save_series_data(series_id, data_series, info)
                
                if info['table'] == 'm2':
                    stats['inserted_m2'] += count
                    # For M2 we insert twice (Supply + Growth), so technically we inserted more economic records
                    # But keeping count simple is fine, or we can adjust logic.
                    # Let's count actual rows inserted which return value of _save_series_data handles partially
                    pass 
                
                stats['inserted_economic'] += count # Rough count
                stats['processed'] += 1

            except Exception as e:
                self.db.rollback()
                logger.error(f"[{self.collector_name}] Error fetching {series_id}: {e}")
                stats['errors'] += 1
        
        return stats

    def _save_series_data(self, series_id: str, data_series: pd.Series, info: Dict) -> int:
        target_table = info['table']
        
        records = []
        for date, value in data_series.items():
            if pd.isna(value):
                continue
            
            # Scale M3 to Billions if it is the M3 series (to prevent overflow)
            if series_id == 'MABMM301USM189S':
                value = value / 1_000_000_000

            if target_table == 'economic':
                records.append({
                    'indicator_code': series_id,
                    'indicator_name': info['name'],
                    'timestamp': date.date(),
                    'value': float(value),
                    'unit': info['unit'],
                    'description': f"From FRED {series_id}"
                })
            elif target_table == 'm2':
                previous_year_date = date - pd.DateOffset(years=1)
                growth_yoy = None
                
                if previous_year_date in data_series.index:
                    prev_val = data_series.loc[previous_year_date]
                    if prev_val != 0:
                        growth_yoy = ((value - prev_val) / prev_val) * 100

                records.append({
                    'timestamp_utc': date.date(),
                    'm2_supply': float(value),
                    'm2_growth_yoy': float(growth_yoy) if growth_yoy is not None else None,
                    'source': 'FRED',
                    'notes': info['name']
                })
        
        if not records:
            return 0

        # Bulk upsert logic
        economic_records = []
        
        if target_table == 'm2':
             # Convert m2 records back to economic format for dual storage
             for r in records:
                 # 1. M2 Supply
                 economic_records.append({
                    'indicator_code': series_id,
                    'indicator_name': info['name'],
                    'timestamp': r['timestamp_utc'], 
                    'value': r['m2_supply'],         
                    'unit': info['unit'],
                    'description': f"From FRED {series_id}"
                 })
                 
                 # 2. M2 Growth YoY (Requested new indicator)
                 if r['m2_growth_yoy'] is not None:
                     economic_records.append({
                        'indicator_code': 'M2_GROWTH_YOY', # Special code
                        'indicator_name': 'M2 Money Supply Growth (YoY)',
                        'timestamp': r['timestamp_utc'], 
                        'value': r['m2_growth_yoy'],         
                        'unit': 'Percent',
                        'description': f"Calculated YoY Growth from {series_id}"
                     })
             
             # Also insert into M2Data (original logic)
             stmt_m2 = insert(M2Data).values(records)
             stmt_m2 = stmt_m2.on_conflict_do_update(
                constraint='uq_m2_data_timestamp',
                set_={
                    'm2_supply': stmt_m2.excluded.m2_supply,
                    'm2_growth_yoy': stmt_m2.excluded.m2_growth_yoy,
                    'updated_at': datetime.now()
                }
             )
             self.db.execute(stmt_m2)
             
        else:
            economic_records = records

        if economic_records:
            stmt = insert(EconomicIndicator).values(economic_records)
            stmt = stmt.on_conflict_do_update(
                constraint='uq_economic_indicator_code_timestamp',
                set_={
                    'value': stmt.excluded.value,
                    'updated_at': datetime.now()
                }
            )
            self.db.execute(stmt)
        
        self.db.commit()
        return len(records)
