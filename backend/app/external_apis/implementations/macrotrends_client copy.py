"""
Macrotrends web scraping client for fundamental data (income, balance, cash flow, ratios).

References:
- Income Statement: https://www.macrotrends.net/stocks/charts/{symbol}/{slug}/income-statement
- Balance Sheet:  https://www.macrotrends.net/stocks/charts/{symbol}/{slug}/balance-sheet
- Cash Flow:      https://www.macrotrends.net/stocks/charts/{symbol}/{slug}/cash-flow-statement
- Ratios:         https://www.macrotrends.net/stocks/charts/{symbol}/{slug}/financial-ratios
"""
import logging
import json
import re
from typing import List, Dict, Any, Optional

import httpx
from bs4 import BeautifulSoup

from ..base.tradfi_client import TradFiAPIClient


logger = logging.getLogger(__name__)


class MacrotrendsClient(TradFiAPIClient):
    """Scraper for Macrotrends fundamentals pages."""

    BASE = "https://www.macrotrends.net/stocks/charts/{symbol}/{slug}/{page}"
    # Macrotrends uses company slug in URL; default to symbol-lower for generic access

    _ORIGINAL_DATA_PATTERN = re.compile(r"var\s+originalData\s*=\s*(\[\{[\s\S]*?\}\]);", re.MULTILINE)

    def __init__(self):
        super().__init__()
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

    async def test_connection(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=self.api_timeout, follow_redirects=True, headers=self.headers) as client:
                resp = await client.get(self.BASE.format(symbol="AAPL", slug="apple", page="income-statement"))
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"Macrotrends connection failed: {e}")
            return False

    def get_rate_limit_info(self) -> Dict[str, Any]:
        return {
            "requests_per_minute": 30,
            "requests_per_hour": 600,
            "note": "Be respectful of Macrotrends ToS; scraping limits are not official."
        }

    # ---- Public scraping methods ----

    async def get_income_statement(self, symbol: str, company_slug: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
        return await self._fetch_table(symbol, company_slug or symbol.lower(), "income-statement")

    async def get_balance_sheet(self, symbol: str, company_slug: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
        return await self._fetch_table(symbol, company_slug or symbol.lower(), "balance-sheet")

    async def get_cash_flow(self, symbol: str, company_slug: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
        return await self._fetch_table(symbol, company_slug or symbol.lower(), "cash-flow-statement")

    async def get_financial_ratios(self, symbol: str, company_slug: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
        return await self._fetch_table(symbol, company_slug or symbol.lower(), "financial-ratios")

    # ---- Internal helpers ----

    async def _fetch_table(self, symbol: str, slug: str, page: str) -> Optional[List[Dict[str, Any]]]:
        url = self.BASE.format(symbol=symbol.upper(), slug=slug, page=page)
        try:
            async with httpx.AsyncClient(timeout=self.api_timeout, follow_redirects=True, headers=self.headers) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                soup = BeautifulSoup(resp.content, "html.parser")
                script_text = self._find_original_data_script(soup)
                if not script_text:
                    return None
                raw = self._extract_original_data(script_text)
                if raw is None:
                    return None
                return self._normalize_records(raw)
        except Exception as e:
            logger.error(f"Macrotrends fetch failed for {symbol} {page}: {e}")
            return None

    def _find_original_data_script(self, soup: BeautifulSoup) -> Optional[str]:
        for s in soup.find_all("script"):
            content = (s.string or s.get_text() or "")
            if "var originalData" in content:
                return content
        return None

    def _extract_original_data(self, text: str) -> Optional[List[Dict[str, Any]]]:
        m = self._ORIGINAL_DATA_PATTERN.search(text)
        if not m:
            return None
        return json.loads(m.group(1))

    def _strip_html(self, snippet: str) -> str:
        if not snippet:
            return ""
        return BeautifulSoup(snippet, "html.parser").get_text(strip=True)

    def _to_number(self, value: str) -> Optional[float]:
        v = value.strip()
        if v == "":
            return None
        try:
            f = float(v)
            return int(f) if f.is_integer() else f
        except ValueError:
            return None

    def _normalize_records(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        normalized: List[Dict[str, Any]] = []
        for rec in records:
            new_rec: Dict[str, Any] = {}
            for key, value in rec.items():
                if key == "popup_icon":
                    continue
                if key == "field_name":
                    new_rec[key] = self._strip_html(value)
                    continue
                if isinstance(value, str):
                    casted = self._to_number(value)
                    new_rec[key] = casted if casted is not None else value
                else:
                    new_rec[key] = value
            normalized.append(new_rec)
        return normalized

    # ---- Implement abstract methods from TradFiAPIClient (minimal stubs) ----

    async def get_ohlcv_data(self, symbol: str, interval: str = "1d", start_date: Optional[str] = None, end_date: Optional[str] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        return []

    async def get_company_profile(self, symbol: str) -> Optional[Dict[str, Any]]:
        return None

    async def get_market_cap(self, symbol: str) -> Optional[float]:
        return None

    async def get_realtime_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        return None

    async def get_technical_indicators(self, symbol: str) -> Optional[Dict[str, Any]]:
        return None

    async def get_etf_sector_exposure(self, symbol: str) -> Optional[List[Dict[str, Any]]]:
        return None

    async def get_stock_financials(self, symbol: str) -> Optional[Dict[str, Any]]:
        # Combine common sections as a convenience helper
        income = await self.get_income_statement(symbol)
        balance = await self.get_balance_sheet(symbol)
        cash = await self.get_cash_flow(symbol)
        ratios = await self.get_financial_ratios(symbol)
        return {
            "income_statement": income,
            "balance_sheet": balance,
            "cash_flow": cash,
            "financial_ratios": ratios,
        }

    async def get_stock_analyst_estimates(self, symbol: str) -> Optional[Dict[str, Any]]:
        return None

    async def get_etf_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        return None

    async def get_etf_holdings(self, symbol: str) -> Optional[Dict[str, Any]]:
        return None

    async def get_index_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        return None

    async def get_bond_market_data(self, symbol: str) -> Optional[Dict[str, Any]]:
        return None

    async def get_world_assets_ranking(self) -> Optional[Dict[str, Any]]:
        return None

    async def get_financial_statements(
        self,
        symbol: str,
        statement_type: str,
        period: str = "annual",
        limit: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Fetch standardized list of financial statements from Macrotrends.
        statement_type: 'income-statement' | 'balance-sheet' | 'cash-flow' (alias of 'cash-flow-statement')
        period/limit are accepted for signature compatibility; Macrotrends page already provides annual series.
        """
        st = statement_type.lower()
        if st in ("income", "income-statement"):
            data = await self.get_income_statement(symbol)
        elif st in ("balance", "balance-sheet"):
            data = await self.get_balance_sheet(symbol)
        elif st in ("cash", "cash-flow", "cash-flow-statement"):
            data = await self.get_cash_flow(symbol)
        else:
            return []

        if not data:
            return []

        # Optionally trim to limit (per-row is a metric; columns are dates). We keep full rows; callers can post-process.
        return data


