"""
KIS (Korea Investment & Securities) API Client.
"""
import logging
import os
import json
import time
from typing import Dict, List, Optional, Any
import httpx
import asyncio
from datetime import datetime, timedelta

from app.external_apis.base.tradfi_client import TradFiAPIClient
from app.external_apis.base.schemas import (
    OhlcvDataPoint, RealtimeQuoteData, CompanyProfileData,
    StockFinancialsData, TechnicalIndicatorsData,
    StockAnalystEstimatesData
)
from app.external_apis.utils.helpers import safe_float

logger = logging.getLogger(__name__)

class KisClient(TradFiAPIClient):
    """
    Korea Investment & Securities (KIS) API Client.
    Supports domestic Korean stocks.
    """

    def __init__(self):
        super().__init__()
        # Default to real domain, can be switched to virtual (dev) via config if needed
        # Documentation:
        # Real: https://openapi.koreainvestment.com:9443
        # Virtual: https://openapivts.koreainvestment.com:29443
        
        self.use_virtual = os.getenv("KIS_USE_VIRTUAL", "false").lower() == "true"
        self.base_url = "https://openapivts.koreainvestment.com:29443" if self.use_virtual else "https://openapi.koreainvestment.com:9443"
        
        self.app_key = os.getenv("KIS_APP_KEY", "")
        self.app_secret = os.getenv("KIS_APP_SECRET", "")
        self.account_no = os.getenv("KIS_ACCOUNT_NO", "") # CANO (First 8 digits)
        
        # Token Management
        self.access_token = None
        self.token_expiry = 0
        
        if not self.app_key or not self.app_secret:
            logger.warning("KIS Client initialized but APP_KEY or APP_SECRET is missing.")
        else:
            logger.info(f"KIS Client initialized (Virtual: {self.use_virtual})")

    async def _get_access_token(self) -> Optional[str]:
        """
        Get or refresh OAuth access token.
        """
        if self.access_token and time.time() < self.token_expiry:
            return self.access_token
            
        url = f"{self.base_url}/oauth2/tokenP"
        headers = {"content-type": "application/json"}
        body = {
            "grant_type": "client_credentials",
            "appkey": self.app_key,
            "appsecret": self.app_secret
        }
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, headers=headers, json=body, timeout=10.0)
                resp.raise_for_status()
                data = resp.json()
                
                self.access_token = data.get("access_token")
                expires_in = data.get("expires_in", 86400)
                # Buffer time of 60 seconds
                self.token_expiry = time.time() + int(expires_in) - 60
                
                logger.info("KIS API access token refreshed successfully.")
                return self.access_token
        except Exception as e:
            logger.error(f"Failed to get KIS access token: {e}")
            return None

    def _is_korean_stock(self, symbol: str) -> bool:
        """
        Check if the symbol corresponds to a Korean stock format (6 digits).
        """
        # Simple check: 6 digits. 
        # Note: KIS format is strictly 6 digits for requests.
        return len(symbol) == 6 and symbol.isdigit()

    def _get_market_code(self, symbol: str) -> str:
        """
        Determine market code (US, HK, JP, CN, etc.)
        This is a heuristic. In a real app, we should use the Master Data mapping.
        """
        if self._is_korean_stock(symbol):
            return "KR"
        
        # Simple heuristics for demo
        if symbol.isalpha(): return "US" # AAPL, TSLA
        if symbol.isdigit() and len(symbol) == 4: return "HK" # 0700, 1299 (HK usually 5 digits in KIS? 00700?)
        if symbol.isdigit() and len(symbol) == 5: return "HK" # KIS might use 5 digits for HK
        if symbol.isdigit() and len(symbol) == 6: 
            # Could be CN (600519) or JP (7203 is 4, but maybe 72030?)
            # China A shares are 6 digits.
            # Japan is 4 digits usually.
            return "CN" 
        
        return "US" # Fallback


    async def _request(self, method: str, path: str, headers: Dict[str, Any] = None, params: Dict[str, Any] = None, body: Dict[str, Any] = None) -> Any:
        """
        Internal helper for Authenticated KIS requests.
        """
        token = await self._get_access_token()
        if not token:
            logger.error("Cannot perform request without access token.")
            return None
            
        url = f"{self.base_url}{path}"
        
        default_headers = {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {token}",
            "appkey": self.app_key,
            "appsecret": self.app_secret,
            "tr_id": "", # Must be set by caller
            "tr_cont": "", # Default empty
            "custtype": "P", # Private individual
        }
        
        if headers:
            default_headers.update(headers)
            
        try:
            async with httpx.AsyncClient() as client:
                if method.upper() == "GET":
                    resp = await client.get(url, headers=default_headers, params=params, timeout=self.api_timeout)
                elif method.upper() == "POST":
                    resp = await client.post(url, headers=default_headers, json=body, timeout=self.api_timeout)
                else:
                    raise ValueError(f"Unsupported method: {method}")
                    
                resp.raise_for_status()
                return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"KIS API Status Error: {e.response.status_code} - {e.response.text}")
            return None
        except Exception as e:
            logger.error(f"KIS API Request Failed: {e}")
            return None

    async def get_ohlcv_data(self, symbol: str, interval: str = "1d", start_date: str = None, end_date: str = None, limit: int = None) -> Optional[List[OhlcvDataPoint]]:
        """
        Get OHLCV data from KIS.
        Note: KIS inquire-daily-price implies daily data.
        Interval support is limited compared to others.
        """
        if not self._is_korean_stock(symbol):
            return None
            
        if interval != "1d":
            # KIS might support others, but we focus on '1d' based on doc 'inquire-daily-price'
            logger.warning(f"KIS Client currently only supports '1d' interval. Requested: {interval}")
            return None

        # Endpoint: /uapi/domestic-stock/v1/quotations/inquire-daily-price
        # TR_ID: FHKST01010400
        path = "/uapi/domestic-stock/v1/quotations/inquire-daily-price"
        
        # Period Code: D (Day), W (Week), M (Month)
        period_code = "D"
        
        headers = {
            "tr_id": "FHKST01010400"
        }
        
        params = {
            "FID_COND_MRKT_DIV_CODE": "J", # J: Stock
            "FID_INPUT_ISCD": symbol,
            "FID_PERIOD_DIV_CODE": period_code,
            "FID_ORG_ADJ_PRC": "0" # 0: Adjusted price, 1: Unadjusted
        }
        
        data = await self._request("GET", path, headers=headers, params=params)
        
        if not data:
            return None
            
        # Check return code
        rt_cd = data.get("rt_cd")
        if rt_cd != "0":
            logger.error(f"KIS API Error: {data.get('msg1')}")
            return None
            
        output = data.get("output", [])
        if not output:
            return []
            
        result = []
        for item in output:
            # item keys: stck_bsop_date(date), stck_oprc(open), stck_hgpr(high), stck_lwpr(low), stck_clpr(close), acml_vol(volume)
            try:
                date_str = item.get("stck_bsop_date") # YYYYMMDD
                if not date_str: 
                    continue
                    
                timestamp = datetime.strptime(date_str, "%Y%m%d")
                
                # Filter by date range if provided
                ts_str_iso = timestamp.strftime("%Y-%m-%d")
                if start_date and ts_str_iso < start_date:
                    continue
                if end_date and ts_str_iso > end_date:
                    continue
                
                point = OhlcvDataPoint(
                    timestamp_utc=timestamp,
                    open_price=safe_float(item.get("stck_oprc")),
                    high_price=safe_float(item.get("stck_hgpr")),
                    low_price=safe_float(item.get("stck_lwpr")),
                    close_price=safe_float(item.get("stck_clpr")),
                    volume=safe_float(item.get("acml_vol")),
                    change_percent=None # Calculate if needed, or extract if available
                )
                result.append(point)
            except Exception as e:
                logger.warning(f"Error parsing KIS OHLCV item: {e}")
                continue
                
        # KIS returns desc order usually (latest first). Ensure sorting if needed?
        # Typically strategy manager handles sorting, but returning standardized list is good.
        result.sort(key=lambda x: x.timestamp_utc)
        
        return result

    async def get_realtime_quote(self, symbol: str) -> Optional[RealtimeQuoteData]:
        """
        Get current price from KIS.
        """
        if not self._is_korean_stock(symbol):
            return None
            
        # Endpoint: /uapi/domestic-stock/v1/quotations/inquire-price
        # TR_ID: FHKST01010100
        path = "/uapi/domestic-stock/v1/quotations/inquire-price"
        
        headers = {
            "tr_id": "FHKST01010100"
        }
        
        params = {
            "FID_COND_MRKT_DIV_CODE": "J",
            "FID_INPUT_ISCD": symbol
        }
        
        data = await self._request("GET", path, headers=headers, params=params)
        
        if not data:
            return None
            
        rt_cd = data.get("rt_cd")
        if rt_cd != "0":
            logger.error(f"KIS API Error (Quote): {data.get('msg1')}")
            return None
            
        output = data.get("output", {})
        if not output:
            return None
            
        # stck_prpr: current price
        # prdy_ctrt: change percent
        try:
            quote = RealtimeQuoteData(
                symbol=symbol,
                price=safe_float(output.get("stck_prpr")),
                change_percent=safe_float(output.get("prdy_ctrt")),
                timestamp_utc=datetime.now() # KIS doesn't return timestamp in this response explicitly, usually implies 'now'
            )
            return quote
        except Exception as e:
            logger.error(f"Error parsing KIS Quote: {e}")
            return None

    async def get_overseas_realtime_quote(self, symbol: str, exchange_code: str) -> Optional[RealtimeQuoteData]:
        """
        Get current price for Overseas stocks.
        Exchange Code: NAS, NYS, AMS, HKS, TSE, SHS, SZI, HNX, HSX
        """
        # Endpoint: /uapi/overseas-price/v1/quotations/price
        path = "/uapi/overseas-price/v1/quotations/price"
        
        # TR_ID selection
        # US: HHDFS00000300
        # Others (HK, CN, JP, VN): HHDFS76200200
        # This is a guess based on common KIS patterns.
        
        if exchange_code in ["NAS", "NYS", "AMS"]:
            tr_id = "HHDFS00000300"
        else:
            tr_id = "HHDFS76200200"
            
        headers = {
            "tr_id": tr_id
        }
        
        # Params:
        # AUTH: ?
        # EXCD: Exchange Code (NAS, NYS, HKS...)
        # SYMB: Symbol
        
        params = {
            "AUTH": "", # Usually empty for public?
            "EXCD": exchange_code,
            "SYMB": symbol
        }
        
        data = await self._request("GET", path, headers=headers, params=params)
        
        if not data:
            return None
            
        rt_cd = data.get("rt_cd")
        if rt_cd != "0":
            logger.error(f"KIS Overseas Error ({exchange_code}:{symbol}): {data.get('msg1')}")
            return None
            
        output = data.get("output", {})
        if not output:
            return None
            
        # Output keys for Overseas might differ:
        # last: Current Price
        # rate: Change Rate
        # diff: Change Amount
        
        try:
            price = safe_float(output.get("last")) 
            change_percent = safe_float(output.get("rate"))
            
            quote = RealtimeQuoteData(
                symbol=symbol,
                price=price,
                change_percent=change_percent,
                timestamp_utc=datetime.now()
            )
            return quote
        except Exception as e:
            logger.error(f"Error parsing KIS Overseas Quote: {e}")
            return None


    # --- Methods not fully supported or implemented yet ---

    async def get_company_profile(self, symbol: str) -> Optional[CompanyProfileData]:
        return None

    async def get_market_cap(self, symbol: str) -> Optional[float]:
        # Could be extracted from inquire-price (hts_avls)
        try:
            # We can use get_realtime_quote logic but extract HTS_AVLS (Market Cap)
            # For efficiency, re-implementing request here or calling helper
            if not self._is_korean_stock(symbol): return None
            
            path = "/uapi/domestic-stock/v1/quotations/inquire-price"
            headers = {"tr_id": "FHKST01010100"}
            params = {"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": symbol}
            
            data = await self._request("GET", path, headers=headers, params=params)
            if data and data.get("rt_cd") == "0":
                output = data.get("output", {})
                # hts_avls: HTS 시가총액 (Unit: 100 million KRW usually? Need to check unit)
                # API Spec says "hts_avls": "HTS 시가총액". Usually returns raw number or formatted?
                # For safety, return raw float if possible.
                return safe_float(output.get("hts_avls")) 
        except:
            pass
        return None

    async def get_technical_indicators(self, symbol: str) -> Optional[TechnicalIndicatorsData]:
        return None

    async def get_stock_financials(self, symbol: str) -> Optional[StockFinancialsData]:
        return None

    async def get_financial_statements(self, symbol: str, statement_type: str, period: str = "annual", limit: int = 4) -> List[Dict[str, Any]]:
        return []

    async def get_etf_sector_exposure(self, symbol: str) -> Optional[List[dict]]:
        return None

    # --- Abstract Methods Implementation ---

    async def test_connection(self) -> bool:
        """Test KIS API connection by requesting a simple quote for Samsung Electronics."""
        try:
            # Using Samsung Electronics (005930) as a test ticker
            quote = await self.get_realtime_quote("005930")
            return quote is not None
        except Exception as e:
            logger.error(f"KIS Connection Test Failed: {e}")
            return False

    def get_rate_limit_info(self) -> Dict[str, Any]:
        """
        Return rate limit info.
        KIS limits vary by account type (Personal/Corporate) and server (Real/Virtual).
        Virtual: ~20 calls/sec?
        Real: ~20 calls/sec?
        Defaulting to a safe conservative limit.
        """
        return {
            "free_tier": {
                "calls_per_minute": 120, # Approx 2 calls/sec is safe start
                "calls_per_day": 10000 
            }
        }

