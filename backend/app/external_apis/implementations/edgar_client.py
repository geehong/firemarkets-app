"""
SEC EDGAR API client for retrieving financial statements data.
"""
import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import date, datetime
import httpx
import json

from ..base.tradfi_client import TradFiAPIClient
import os

# ... (imports)

# from ...config import settings  <-- Removed
from ...utils.retry import retry_decorator

log = logging.getLogger(__name__)


class EdgarClient(TradFiAPIClient):
    """
    Client for interacting with the SEC EDGAR API to retrieve financial data.
    
    Note: Real-world EDGAR integration is complex, involving CIK mapping, 
    filing search (10-K, 10-Q), and XBRL concept data extraction.
    This implementation provides a foundation for financial data retrieval.
    """
    
    BASE_URL = "https://data.sec.gov/api/xbrl/companyconcept/CIK"
    CIK_LOOKUP_URL = "https://data.sec.gov/api/xbrl/companyfacts/CIK"
    
    def __init__(self):
        super().__init__()
        
        # EDGAR API requires a User-Agent with contact info
        edgar_email = os.getenv("EDGAR_USER_AGENT_EMAIL")
        if not edgar_email:
            log.warning("EDGAR_USER_AGENT_EMAIL not set. EDGAR API requests may fail.")
            self.headers = {
                'User-Agent': 'Personal Application your.email@example.com'
            }
        else:
            self.headers = {
                'User-Agent': f'Personal Application {edgar_email}'
            }
    
    async def test_connection(self) -> bool:
        """Test connection to SEC EDGAR API"""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                # Test with a simple company facts request
                test_url = f"{self.CIK_LOOKUP_URL}0000320193.json"  # Apple's CIK
                response = await client.get(test_url, headers=self.headers)
                return response.status_code == 200
        except Exception as e:
            log.error(f"EDGAR connection test failed: {e}")
            return False
    
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Get rate limit information for EDGAR API"""
        return {
            "requests_per_second": 10,  # SEC EDGAR rate limit
            "description": "SEC EDGAR API rate limit: 10 requests per second"
        }
    
    async def _get_cik_from_ticker(self, ticker: str) -> Optional[str]:
        """
        Get CIK (Central Index Key) for a given ticker symbol.
        This is a simplified implementation - in production, you'd use a comprehensive mapping.
        """
        # Common ticker to CIK mappings (simplified)
        ticker_cik_map = {
            'AAPL': '0000320193',
            'MSFT': '0000789019',
            'GOOGL': '0001652044',
            'AMZN': '0001018724',
            'TSLA': '0001318605',
            'META': '0001326801',
            'NVDA': '0001045810',
            'NFLX': '0001067983',
            'AMD': '0000002488',
            'INTC': '0000050863'
        }
        
        return ticker_cik_map.get(ticker.upper())
    
    @retry_decorator(max_retries=3, base_delay=1.0)
    async def _fetch_concept_data(self, cik: str, taxonomy: str, concept: str) -> List[Dict[str, Any]]:
        """
        Fetch XBRL concept data for a specific CIK, taxonomy, and concept.
        
        Args:
            cik: The CIK (Central Index Key, zero-padded to 10 digits)
            taxonomy: The namespace of the concept (e.g., 'us-gaap', 'ifrs-full')
            concept: The XBRL concept name (e.g., 'Assets', 'Revenues')
            
        Returns:
            List of financial data points
        """
        # Ensure CIK is zero-padded to 10 digits as required by SEC API
        padded_cik = cik.zfill(10)
        url = f"{self.BASE_URL}{padded_cik}/{taxonomy}/{concept}.json"
        
        log.debug(f"Fetching EDGAR data from: {url}")
        
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            
            data = response.json()
            
            if 'units' not in data:
                return []
            
            results = []
            
            # Process USD units (most common)
            if 'USD' in data['units']:
                for item in data['units']['USD']:
                    # Filter for relevant financial periods
                    if 'frame' in item and ('Q' in item['frame'] or 'FY' in item['frame']):
                        results.append({
                            "end_date": item.get('end'),
                            "start_date": item.get('start'),
                            "filed_date": item.get('filed'),
                            "value": item.get('val'),
                            "form": item.get('form'),
                            "frame": item.get('frame'),
                            "concept": concept,
                            "unit": "USD"
                        })
            
            return results
    
    # Implement abstract methods from TradFiAPIClient
    
    async def get_ohlcv_data(
        self, 
        symbol: str, 
        interval: str = "1d",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[Any]:
        """EDGAR does not provide OHLCV data."""
        return []
    
    async def get_company_profile(self, symbol: str) -> Optional[Any]:
        """EDGAR focuses on raw financial data, not company profiles."""
        return None
    
    async def get_market_cap(self, symbol: str) -> Optional[float]:
        """EDGAR does not provide market cap data directly."""
        return None
    
    async def get_realtime_quote(self, symbol: str) -> Optional[Any]:
        """EDGAR does not provide real-time price data."""
        return None
    
    async def get_technical_indicators(self, symbol: str) -> Optional[Any]:
        """EDGAR does not provide technical indicators."""
        return None
    
    async def get_etf_sector_exposure(self, symbol: str) -> Optional[List[Any]]:
        """EDGAR does not provide ETF sector exposure data."""
        return None
    
    async def get_stock_financials(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get comprehensive stock financials using EDGAR data.
        Returns data matching the stock_financials table structure.
        
        Note: SEC EDGAR only provides fundamental financial data.
        Market data (prices, ratios) requires additional data sources.
        """
        try:
            cik = await self._get_cik_from_ticker(symbol)
            if not cik:
                log.warning(f"Could not find CIK for ticker: {symbol}")
                return None
            
            # Fetch multiple financial concepts from EDGAR
            financial_data = {}
            
            # Define the concepts we want to fetch (prioritized by importance)
            # Reduced to core metrics to minimize API calls and respect SEC limits
            concepts_to_fetch = {
                'revenue_ttm': ['Revenues'],
                'net_income': ['NetIncomeLoss'],
                'total_assets': ['Assets'],
                'stockholders_equity': ['StockholdersEquity'],
                'operating_income': ['OperatingIncomeLoss'],
                'gross_profit_ttm': ['GrossProfit'],
                'shares_outstanding': ['WeightedAverageNumberOfSharesOutstandingBasic']
            }
            
            # Fetch data sequentially to respect SEC rate limits (10 requests/second max)
            for field_name, concept_list in concepts_to_fetch.items():
                for concept in concept_list:
                    try:
                        data = await self._fetch_concept_data(cik, "us-gaap", concept)
                        if data:
                            # Get the most recent data point
                            latest_data = max(data, key=lambda x: x.get('end_date', ''))
                            financial_data[field_name] = latest_data.get('value')
                            log.info(f"Found {field_name} data for {symbol}: {latest_data.get('value')}")
                            break  # Found data for this field, move to next
                    except Exception as e:
                        log.debug(f"Failed to fetch {concept} for {field_name}: {e}")
                        continue
                
                # Add delay between requests to respect SEC rate limits (100ms = 10 requests/second)
                await asyncio.sleep(0.1)
            
            # Calculate derived metrics
            calculated_metrics = self._calculate_derived_metrics(financial_data)
            financial_data.update(calculated_metrics)
            
            # Format the response to match stock_financials table structure
            result = {
                "symbol": symbol,
                "snapshot_date": datetime.now().date().isoformat(),
                "currency": "USD",
                "market_cap": financial_data.get('market_cap'),
                "ebitda": financial_data.get('ebitda'),
                "shares_outstanding": financial_data.get('shares_outstanding'),
                "pe_ratio": financial_data.get('pe_ratio'),
                "peg_ratio": financial_data.get('peg_ratio'),
                "beta": financial_data.get('beta'),
                "eps": financial_data.get('eps'),
                "dividend_yield": financial_data.get('dividend_yield'),
                "dividend_per_share": financial_data.get('dividend_per_share'),
                "profit_margin_ttm": financial_data.get('profit_margin_ttm'),
                "return_on_equity_ttm": financial_data.get('return_on_equity_ttm'),
                "revenue_ttm": financial_data.get('revenue_ttm'),
                "price_to_book_ratio": financial_data.get('price_to_book_ratio'),
                "week_52_high": financial_data.get('week_52_high'),
                "week_52_low": financial_data.get('week_52_low'),
                "day_50_moving_avg": financial_data.get('day_50_moving_avg'),
                "day_200_moving_avg": financial_data.get('day_200_moving_avg'),
                "book_value": financial_data.get('book_value'),
                "revenue_per_share_ttm": financial_data.get('revenue_per_share_ttm'),
                "operating_margin_ttm": financial_data.get('operating_margin_ttm'),
                "return_on_assets_ttm": financial_data.get('return_on_assets_ttm'),
                "gross_profit_ttm": financial_data.get('gross_profit_ttm'),
                "quarterly_earnings_growth_yoy": financial_data.get('quarterly_earnings_growth_yoy'),
                "quarterly_revenue_growth_yoy": financial_data.get('quarterly_revenue_growth_yoy'),
                "analyst_target_price": financial_data.get('analyst_target_price'),
                "trailing_pe": financial_data.get('trailing_pe'),
                "forward_pe": financial_data.get('forward_pe'),
                "price_to_sales_ratio_ttm": financial_data.get('price_to_sales_ratio_ttm'),
                "ev_to_revenue": financial_data.get('ev_to_revenue'),
                "ev_to_ebitda": financial_data.get('ev_to_ebitda'),
                "updated_at": datetime.now().isoformat(),
                "source": "SEC EDGAR"
            }
            
            return result
            
        except Exception as e:
            log.error(f"Error fetching stock financials for {symbol}: {e}")
            return None
    
    def _calculate_derived_metrics(self, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate derived financial metrics from base data."""
        calculated = {}
        
        # Calculate ratios and margins
        revenue = financial_data.get('revenue_ttm')
        net_income = financial_data.get('net_income')
        operating_income = financial_data.get('operating_income')
        total_assets = financial_data.get('total_assets')
        stockholders_equity = financial_data.get('stockholders_equity')
        shares_outstanding = financial_data.get('shares_outstanding')
        gross_profit = financial_data.get('gross_profit_ttm')
        
        # Profit margin
        if revenue and net_income:
            calculated['profit_margin_ttm'] = round((net_income / revenue) * 100, 4)
        
        # Operating margin
        if revenue and operating_income:
            calculated['operating_margin_ttm'] = round((operating_income / revenue) * 100, 6)
        
        # Return on equity
        if stockholders_equity and net_income:
            calculated['return_on_equity_ttm'] = round((net_income / stockholders_equity) * 100, 4)
        
        # Return on assets
        if total_assets and net_income:
            calculated['return_on_assets_ttm'] = round((net_income / total_assets) * 100, 6)
        
        # Revenue per share
        if revenue and shares_outstanding:
            calculated['revenue_per_share_ttm'] = round(revenue / shares_outstanding, 4)
        
        # EPS (Earnings Per Share)
        if net_income and shares_outstanding:
            calculated['eps'] = round(net_income / shares_outstanding, 4)
        
        # Book value per share
        if stockholders_equity and shares_outstanding:
            book_value_per_share = stockholders_equity / shares_outstanding
            calculated['book_value_per_share'] = round(book_value_per_share, 4)
        
        # Gross profit margin
        if revenue and gross_profit:
            calculated['gross_profit_margin'] = round((gross_profit / revenue) * 100, 4)
        
        return calculated
    
    async def get_financial_statements(
        self, 
        symbol: str, 
        statement_type: str, 
        period: str = "annual",
        limit: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Get financial statements data from SEC EDGAR.
        
        Args:
            symbol: Stock symbol
            statement_type: Type of financial statement
            period: Period type ('annual' or 'quarterly')
            limit: Maximum number of periods to retrieve
            
        Returns:
            List of financial statement data
        """
        try:
            # Get CIK for the ticker
            cik = await self._get_cik_from_ticker(symbol)
            if not cik:
                log.warning(f"Could not find CIK for ticker: {symbol}")
                return []
            
            # Map statement type to EDGAR concepts (try multiple concepts)
            concept_mapping = {
                'balance-sheet': ['Assets', 'Liabilities', 'StockholdersEquity'],
                'income-statement': ['Revenues', 'NetIncomeLoss', 'OperatingIncomeLoss'],
                'cash-flow': ['NetCashProvidedByUsedInOperatingActivities', 'NetCashProvidedByUsedInInvestingActivities', 'NetCashProvidedByUsedInFinancingActivities']
            }
            
            concepts = concept_mapping.get(statement_type.lower())
            if not concepts:
                log.warning(f"Unsupported statement type: {statement_type}")
                return []
            
            # Try multiple concepts until we find data
            raw_data = []
            for concept in concepts:
                try:
                    concept_data = await self._fetch_concept_data(cik, "us-gaap", concept)
                    if concept_data:
                        raw_data.extend(concept_data)
                        log.info(f"Found data for concept: {concept}")
                        break  # Use first successful concept
                except Exception as e:
                    log.debug(f"Concept {concept} failed: {e}")
                    continue
            
            # Filter by period type
            if period.lower() == 'annual':
                filtered_data = [d for d in raw_data if 'Q' not in d.get('frame', '')]
            elif period.lower() == 'quarterly':
                filtered_data = [d for d in raw_data if 'Q' in d.get('frame', '')]
            else:
                log.warning(f"Unsupported period type: {period}")
                return []
            
            # Sort by end date (most recent first) and apply limit
            filtered_data.sort(key=lambda x: x.get('end_date', ''), reverse=True)
            final_results = filtered_data[:limit]
            
            # Format the output
            formatted_data = []
            for item in final_results:
                formatted_data.append({
                    "date": item.get('end_date'),
                    "value": item.get('value'),
                    "unit": item.get('unit', 'USD'),
                    "source": "SEC EDGAR",
                    "concept": item.get('concept'),
                    "filing_form": item.get('form'),
                    "frame": item.get('frame'),
                    "filed_date": item.get('filed_date')
                })
            
            return formatted_data
            
        except httpx.HTTPStatusError as e:
            log.error(f"HTTP Error fetching EDGAR data for {symbol}: {e}")
            return []
        except Exception as e:
            log.error(f"Unexpected error fetching EDGAR data for {symbol}: {e}")
            return []
