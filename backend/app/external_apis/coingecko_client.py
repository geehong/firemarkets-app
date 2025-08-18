"""
CoinGecko API client for onchain data.
"""
import logging
import httpx
import backoff
from typing import List, Dict, Optional, Any
from datetime import datetime, date

from ..core.config import GLOBAL_APP_CONFIGS
from ..utils.retry import retry_with_backoff, TransientAPIError, PermanentAPIError

logger = logging.getLogger(__name__)


class CoinGeckoClient:
    """CoinGecko API client for onchain metrics"""
    
    def __init__(self):
        self.base_url = "https://api.coingecko.com/api/v3"
        self.api_key = GLOBAL_APP_CONFIGS.get("COIN_GECKO_API_KEY", "")
        self.timeout = GLOBAL_APP_CONFIGS.get("API_REQUEST_TIMEOUT_SECONDS", 30)
        self.max_retries = GLOBAL_APP_CONFIGS.get("MAX_API_RETRY_ATTEMPTS", 3)
    
    @backoff.on_exception(
        backoff.expo,
        (httpx.RequestError, httpx.HTTPStatusError),
        max_tries=3,
        max_time=60
    )
    async def _fetch_async(self, client: httpx.AsyncClient, endpoint: str, params: dict = None):
        """Fetch data from CoinGecko API with retry logic"""
        url = f"{self.base_url}{endpoint}"
        
        # 기본 파라미터
        default_params = {}
        if self.api_key:
            default_params['x_cg_demo_api_key'] = self.api_key
        
        if params:
            default_params.update(params)
        
        async def api_call():
            response = await client.get(url, params=default_params, timeout=self.timeout)
            
            # API 응답 상태 코드에 따른 오류 분류
            if response.status_code == 429:
                raise TransientAPIError(f"Rate limit exceeded for CoinGecko API")
            elif response.status_code >= 500:
                raise TransientAPIError(f"Server error {response.status_code} for CoinGecko API")
            elif response.status_code == 404:
                raise PermanentAPIError(f"Endpoint not found: {endpoint}")
            elif response.status_code in [401, 403]:
                raise PermanentAPIError(f"Authentication failed for CoinGecko API")
            
            response.raise_for_status()
            return response.json()
        
        # 고도화된 재시도 로직 적용
        return await retry_with_backoff(
            api_call,
            max_retries=self.max_retries,
            base_delay=1.0,
            max_delay=30.0,
            jitter=True
        )
    
    async def get_bitcoin_market_data(self) -> Dict:
        """Get Bitcoin market data including some onchain metrics"""
        async with httpx.AsyncClient() as client:
            data = await self._fetch_async(client, "/coins/bitcoin", {
                'localization': 'false',
                'tickers': 'false',
                'market_data': 'true',
                'community_data': 'true',
                'developer_data': 'false',
                'sparkline': 'false'
            })
            return data
    
    async def get_bitcoin_price_history(self, days: int = 30) -> List[Dict]:
        """Get Bitcoin price history"""
        async with httpx.AsyncClient() as client:
            data = await self._fetch_async(client, "/coins/bitcoin/market_chart", {
                'vs_currency': 'usd',
                'days': days
            })
            return data.get('prices', [])
    
    async def get_bitcoin_market_cap_history(self, days: int = 30) -> List[Dict]:
        """Get Bitcoin market cap history"""
        async with httpx.AsyncClient() as client:
            data = await self._fetch_async(client, "/coins/bitcoin/market_chart", {
                'vs_currency': 'usd',
                'days': days
            })
            return data.get('market_caps', [])
    
    async def get_bitcoin_volume_history(self, days: int = 30) -> List[Dict]:
        """Get Bitcoin volume history"""
        async with httpx.AsyncClient() as client:
            data = await self._fetch_async(client, "/coins/bitcoin/market_chart", {
                'vs_currency': 'usd',
                'days': days
            })
            return data.get('total_volumes', [])
    
    def _convert_timestamp(self, timestamp: int) -> datetime:
        """Convert Unix timestamp to datetime"""
        return datetime.fromtimestamp(timestamp / 1000)  # CoinGecko uses milliseconds
    
    def _format_data_for_storage(self, data: List[Dict], metric_name: str) -> List[Dict]:
        """Format CoinGecko data for storage"""
        formatted_data = []
        
        for item in data:
            if len(item) >= 2:
                formatted_item = {
                    'timestamp_utc': self._convert_timestamp(item[0]),
                    'value': item[1],
                    'metric_name': metric_name
                }
                formatted_data.append(formatted_item)
        
        return formatted_data 