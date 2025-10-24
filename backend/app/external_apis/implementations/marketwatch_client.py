"""
MarketWatch web scraping client for financial data.
"""
import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import date, datetime
import httpx
import re
from bs4 import BeautifulSoup
import json

from ..base.tradfi_client import TradFiAPIClient
from ...config import settings

log = logging.getLogger(__name__)


class MarketWatchClient(TradFiAPIClient):
    """
    Client for scraping MarketWatch financial data.
    
    Note: This is for educational purposes. MarketWatch has terms of service
    that may restrict automated scraping. Use responsibly and consider rate limits.
    """
    
    BASE_URL = "https://www.marketwatch.com"
    FINANCIALS_URL = "https://www.marketwatch.com/investing/stock/{symbol}/financials"
    PROFILE_URL = "https://www.marketwatch.com/investing/stock/{symbol}"
    
    def __init__(self):
        super().__init__()
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
        }
    
    async def test_connection(self) -> bool:
        """Test connection to MarketWatch"""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(f"{self.BASE_URL}/investing/stock/MSFT", headers=self.headers)
                return response.status_code == 200
        except Exception as e:
            log.error(f"MarketWatch connection test failed: {e}")
            return False
    
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Get rate limit information for MarketWatch scraping"""
        return {
            "requests_per_second": 1,  # Conservative rate limit for scraping
            "description": "MarketWatch scraping rate limit: 1 request per second (be respectful)"
        }
    
    async def _fetch_page(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch and parse a web page"""
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                
                # Debug: Log the response content
                log.info(f"Response status: {response.status_code}")
                log.info(f"Response headers: {dict(response.headers)}")
                log.info(f"Response content length: {len(response.content)}")
                
                # Log first 1000 characters of HTML content
                html_content = response.content.decode('utf-8', errors='ignore')
                log.info(f"HTML content preview (first 1000 chars):\n{html_content[:1000]}")
                
                soup = BeautifulSoup(response.content, 'html.parser')
                return soup
        except Exception as e:
            log.error(f"Failed to fetch page {url}: {e}")
            return None
    
    async def _extract_financial_data(self, symbol: str) -> Dict[str, Any]:
        """Extract financial data from MarketWatch page using actual HTML structure"""
        try:
            url = self.FINANCIALS_URL.format(symbol=symbol)
            soup = await self._fetch_page(url)
            
            if not soup:
                log.error(f"Failed to fetch page for {symbol}")
                return {}
            
            financial_data = {}
            
            # Debug: Log the page title to see if we're getting the right page
            title = soup.find('title')
            if title:
                log.info(f"Page title: {title.get_text()}")
            
            # Extract data from MarketWatch's specific table structure
            # Look for the main financials table with class "table table--overflow align--right"
            tables = soup.find_all('table', class_='table table--overflow align--right')
            log.info(f"Found {len(tables)} tables with class 'table table--overflow align--right'")
            
            if not tables:
                # Try alternative selectors
                tables = soup.find_all('table')
                log.info(f"Found {len(tables)} total tables")
                
                # Look for any table with financial data
                for table in tables:
                    if 'financial' in table.get('class', []) or 'data' in table.get('class', []):
                        log.info(f"Found financial table with classes: {table.get('class')}")
                        tables = [table]
                        break
            
            for table in tables:
                # Get table body rows
                tbody = table.find('tbody', class_='table__body row-hover')
                if not tbody:
                    # Try alternative tbody selectors
                    tbody = table.find('tbody', class_='table__body')
                    if not tbody:
                        tbody = table.find('tbody')
                
                if tbody:
                    rows = tbody.find_all('tr', class_='table__row')
                    log.info(f"Found {len(rows)} rows in tbody")
                    
                    for row in rows:
                        cells = row.find_all(['td', 'th'])
                        if len(cells) >= 2:
                            # First cell contains the financial item name
                            item_cell = cells[0]
                            # Get the text from the cell content div
                            item_content = item_cell.find('div', class_='cell__content')
                            if item_content:
                                item_name = item_content.get_text(strip=True)
                            else:
                                item_name = item_cell.get_text(strip=True)
                            
                            if not item_name:
                                continue
                            
                            # Look for the most recent year's data (usually the last data column before trend)
                            # MarketWatch shows years like 2021, 2022, 2023, 2024, 2025
                            # We want the most recent year (2025 in this case)
                            for i in range(1, len(cells) - 1):  # Exclude the last trend column
                                cell = cells[i]
                                cell_content = cell.find('div', class_='cell__content')
                                if cell_content:
                                    value_span = cell_content.find('span')
                                    if value_span:
                                        value_text = value_span.get_text(strip=True)
                                        if value_text and value_text != '-' and value_text != '':
                                            # Parse the financial value
                                            parsed_value = self._parse_financial_value(value_text)
                                            if parsed_value is not None:
                                                financial_data[item_name] = parsed_value
                                                log.info(f"Found {item_name}: {parsed_value}")
                                                break  # Use the most recent year's data
                                else:
                                    # Try direct text content
                                    value_text = cell.get_text(strip=True)
                                    if value_text and value_text != '-' and value_text != '':
                                        parsed_value = self._parse_financial_value(value_text)
                                        if parsed_value is not None:
                                            financial_data[item_name] = parsed_value
                                            log.info(f"Found {item_name}: {parsed_value}")
                                            break
                else:
                    log.warning("No tbody found in table")
            
            log.info(f"Extracted {len(financial_data)} financial data points")
            
            # Also try to extract from key statistics section
            key_stats = await self._extract_key_statistics(symbol)
            financial_data.update(key_stats)
            
            return financial_data
            
        except Exception as e:
            log.error(f"Failed to extract financial data for {symbol}: {e}")
            return {}
    
    def _parse_financial_value(self, value_str: str) -> Optional[float]:
        """Parse financial value string to float"""
        try:
            # Remove common suffixes and convert to number
            value_str = value_str.replace(',', '').replace('$', '').replace('%', '')
            
            # Handle different scales
            if 'B' in value_str:
                return float(value_str.replace('B', '')) * 1_000_000_000
            elif 'M' in value_str:
                return float(value_str.replace('M', '')) * 1_000_000
            elif 'K' in value_str:
                return float(value_str.replace('K', '')) * 1_000
            else:
                return float(value_str)
        except (ValueError, AttributeError):
            return None
    
    async def _extract_key_statistics(self, symbol: str) -> Dict[str, Any]:
        """Extract key statistics from MarketWatch"""
        try:
            url = self.PROFILE_URL.format(symbol=symbol)
            soup = await self._fetch_page(url)
            
            if not soup:
                return {}
            
            key_stats = {}
            
            # Look for key statistics in various sections
            # MarketWatch uses specific class names for financial data
            stat_sections = soup.find_all(['div', 'span'], class_=re.compile(r'stat|metric|value|data'))
            
            for section in stat_sections:
                text = section.get_text(strip=True)
                if any(keyword in text.lower() for keyword in ['market cap', 'pe ratio', 'eps', 'beta', 'revenue', 'income']):
                    # Extract the value (this is simplified)
                    key_stats[text] = self._parse_financial_value(text)
            
            # Also try to find data in tables
            tables = soup.find_all('table')
            for table in tables:
                rows = table.find_all('tr')
                for row in rows:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 2:
                        label = cells[0].get_text(strip=True)
                        value_text = cells[1].get_text(strip=True)
                        if value_text and value_text != '-':
                            key_stats[label] = self._parse_financial_value(value_text)
            
            return key_stats
            
        except Exception as e:
            log.error(f"Failed to extract key statistics for {symbol}: {e}")
            return {}
    
    # Implement abstract methods from TradFiAPIClient
    
    async def get_ohlcv_data(
        self, 
        symbol: str, 
        interval: str = "1d",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[Any]:
        """MarketWatch scraping doesn't provide OHLCV data directly."""
        return []
    
    async def get_company_profile(self, symbol: str) -> Optional[Any]:
        """Get company profile from MarketWatch"""
        try:
            url = self.PROFILE_URL.format(symbol=symbol)
            soup = await self._fetch_page(url)
            
            if not soup:
                return None
            
            # Extract basic company information
            profile = {
                "symbol": symbol,
                "name": None,
                "sector": None,
                "industry": None,
                "website": None,
                "description": None
            }
            
            # Look for company name
            title_elem = soup.find('h1')
            if title_elem:
                profile["name"] = title_elem.get_text(strip=True)
            
            # Look for sector/industry information
            # This would need more sophisticated parsing in a real implementation
            
            return profile
            
        except Exception as e:
            log.error(f"Failed to get company profile for {symbol}: {e}")
            return None
    
    async def get_market_cap(self, symbol: str) -> Optional[float]:
        """Get market cap from MarketWatch"""
        try:
            key_stats = await self._extract_key_statistics(symbol)
            # This would need more sophisticated parsing
            return None
        except Exception as e:
            log.error(f"Failed to get market cap for {symbol}: {e}")
            return None
    
    async def get_realtime_quote(self, symbol: str) -> Optional[Any]:
        """Get real-time quote from MarketWatch"""
        try:
            url = self.PROFILE_URL.format(symbol=symbol)
            soup = await self._fetch_page(url)
            
            if not soup:
                return None
            
            # Look for current price
            price_elem = soup.find('span', class_=re.compile(r'price|quote|value'))
            if not price_elem:
                # Try alternative selectors
                price_elem = soup.find('div', class_=re.compile(r'price|quote'))
            
            if price_elem:
                price_text = price_elem.get_text(strip=True)
                price = self._parse_financial_value(price_text)
                
                return {
                    "symbol": symbol,
                    "price": price,
                    "timestamp": datetime.now()
                }
            
            return None
            
        except Exception as e:
            log.error(f"Failed to get real-time quote for {symbol}: {e}")
            return None
    
    async def get_technical_indicators(self, symbol: str) -> Optional[Dict[str, Any]]:
        """MarketWatch scraping doesn't provide technical indicators directly."""
        return None
    
    async def get_etf_sector_exposure(self, symbol: str) -> Optional[List[Any]]:
        """MarketWatch scraping doesn't provide ETF sector exposure directly."""
        return None
    
    async def get_stock_financials(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get comprehensive stock financials by scraping MarketWatch.
        Returns data matching the stock_financials table structure.
        """
        try:
            # Extract financial data from MarketWatch
            financial_data = await self._extract_financial_data(symbol)
            key_stats = await self._extract_key_statistics(symbol)
            
            # Map MarketWatch data to our schema
            result = {
                "symbol": symbol,
                "snapshot_date": datetime.now().date().isoformat(),
                "currency": "USD",
                "market_cap": None,
                "ebitda": None,
                "shares_outstanding": None,
                "pe_ratio": None,
                "peg_ratio": None,
                "beta": None,
                "eps": None,
                "dividend_yield": None,
                "dividend_per_share": None,
                "profit_margin_ttm": None,
                "return_on_equity_ttm": None,
                "revenue_ttm": None,
                "price_to_book_ratio": None,
                "week_52_high": None,
                "week_52_low": None,
                "day_50_moving_avg": None,
                "day_200_moving_avg": None,
                "book_value": None,
                "revenue_per_share_ttm": None,
                "operating_margin_ttm": None,
                "return_on_assets_ttm": None,
                "gross_profit_ttm": None,
                "quarterly_earnings_growth_yoy": None,
                "quarterly_revenue_growth_yoy": None,
                "analyst_target_price": None,
                "trailing_pe": None,
                "forward_pe": None,
                "price_to_sales_ratio_ttm": None,
                "ev_to_revenue": None,
                "ev_to_ebitda": None,
                "updated_at": datetime.now().isoformat(),
                "source": "MarketWatch (Scraped)"
            }
            
            # Map extracted data to result fields using MarketWatch's actual field names
            for key, value in financial_data.items():
                key_lower = key.lower()
                if 'sales/revenue' in key_lower:
                    result['revenue_ttm'] = value
                elif 'net income' in key_lower:
                    result['net_income'] = value
                elif 'gross income' in key_lower:
                    result['gross_profit_ttm'] = value
                elif 'ebitda' in key_lower:
                    result['ebitda'] = value
                elif 'eps (basic)' in key_lower or 'eps (diluted)' in key_lower:
                    result['eps'] = value
                elif 'basic shares outstanding' in key_lower or 'diluted shares outstanding' in key_lower:
                    result['shares_outstanding'] = value
                elif 'pretax income' in key_lower:
                    result['pretax_income'] = value
                elif 'income tax' in key_lower:
                    result['income_tax'] = value
                elif 'consolidated net income' in key_lower:
                    result['net_income'] = value
                elif 'net income available to common' in key_lower:
                    result['net_income_available'] = value
                elif 'ebit after unusual expense' in key_lower:
                    result['ebit'] = value
                elif 'interest expense' in key_lower:
                    result['interest_expense'] = value
                elif 'non operating interest income' in key_lower:
                    result['interest_income'] = value
                elif 'sga expense' in key_lower:
                    result['sga_expense'] = value
                elif 'research & development' in key_lower:
                    result['rd_expense'] = value
                elif 'cost of goods sold' in key_lower or 'cogs' in key_lower:
                    result['cost_of_goods_sold'] = value
                elif 'depreciation & amortization expense' in key_lower:
                    result['depreciation_amortization'] = value
                elif 'unusual expense' in key_lower:
                    result['unusual_expense'] = value
            
            return result
            
        except Exception as e:
            log.error(f"Error fetching stock financials for {symbol}: {e}")
            return None
    
    async def get_financial_statements(
        self, 
        symbol: str, 
        statement_type: str, 
        period: str = "annual",
        limit: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Get financial statements data from MarketWatch scraping.
        """
        try:
            financial_data = await self._extract_financial_data(symbol)
            
            # Convert to our expected format
            formatted_data = []
            for key, value in financial_data.items():
                if value is not None:
                    formatted_data.append({
                        "concept": key,
                        "value": value,
                        "unit": "USD",
                        "source": "MarketWatch (Scraped)",
                        "date": datetime.now().isoformat()
                    })
            
            return formatted_data[:limit]
            
        except Exception as e:
            log.error(f"Error fetching financial statements for {symbol}: {e}")
            return []
