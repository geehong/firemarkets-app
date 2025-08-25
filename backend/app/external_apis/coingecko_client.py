"""
CoinGecko API client for cryptocurrency data.
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx

from .base_client import BaseAPIClient

logger = logging.getLogger(__name__)


class CoinGeckoClient(BaseAPIClient):
    """CoinGecko API client"""
    
    def __init__(self):
        super().__init__()
        self.base_url = "https://api.coingecko.com/api/v3"
    
    async def test_connection(self) -> bool:
        """Test CoinGecko API connection"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/ping"
                response = await client.get(url, timeout=self.api_timeout)
                return response.status_code == 200
        except Exception as e:
            logger.error(f"CoinGecko connection test failed: {e}")
            return False
    
    def get_rate_limit_info(self) -> Dict[str, Any]:
        """Get CoinGecko rate limit information"""
        return {
            "free_tier": {
                "requests_per_minute": 50,
                "requests_per_day": 10000
            },
            "pro_tier": {
                "requests_per_minute": 1000,
                "requests_per_day": 100000
            }
        }
    
    async def get_current_prices(self, symbols: List[str]) -> Dict[str, float]:
        """
        여러 암호화폐의 현재 가격을 조회합니다.
        
        Args:
            symbols: 암호화폐 심볼 리스트 (예: ['bitcoin', 'ethereum'])
            
        Returns:
            {symbol: price} 형태의 딕셔너리
        """
        if not symbols:
            return {}
            
        try:
            async with httpx.AsyncClient() as client:
                # CoinGecko는 쉼표로 구분된 심볼 리스트를 받습니다
                symbols_str = ','.join(symbols)
                url = f"{self.base_url}/simple/price?ids={symbols_str}&vs_currencies=usd"
                
                data = await self._fetch_async(client, url, "CoinGecko", "multiple")
                
                if isinstance(data, dict):
                    # 결과를 {symbol: price} 형태로 변환
                    prices = {}
                    for symbol in symbols:
                        if symbol in data and 'usd' in data[symbol]:
                            prices[symbol.upper()] = self._safe_float(data[symbol]['usd'])
                    
                    logger.info(f"CoinGecko에서 {len(prices)}개 암호화폐 가격 조회 완료")
                    return prices
                else:
                    logger.error("CoinGecko API 응답 형식 오류")
                    return {}
                    
        except Exception as e:
            logger.error(f"CoinGecko 가격 조회 오류: {e}")
            return {}
    
    async def get_trending_coins(self) -> List[Dict[str, Any]]:
        """트렌딩 코인 목록 조회"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/search/trending"
                data = await self._fetch_async(client, url, "CoinGecko", "trending")
                
                if "coins" in data:
                    return [
                        {
                            "id": coin["item"]["id"],
                            "symbol": coin["item"]["symbol"].upper(),
                            "name": coin["item"]["name"],
                            "market_cap_rank": coin["item"]["market_cap_rank"],
                            "price_btc": self._safe_float(coin["item"]["price_btc"]),
                            "score": coin["item"]["score"]
                        }
                        for coin in data["coins"]
                    ]
        except Exception as e:
            logger.error(f"CoinGecko 트렌딩 코인 조회 오류: {e}")
        
        return []
    
    async def get_coin_market_data(self, symbol: str) -> Optional[Dict[str, Any]]:
        """특정 코인의 시장 데이터 조회"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/coins/{symbol}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false"
                data = await self._fetch_async(client, url, "CoinGecko", symbol)
                
                if "market_data" in data:
                    market_data = data["market_data"]
                    return {
                        "id": data.get("id"),
                        "symbol": data.get("symbol", "").upper(),
                        "name": data.get("name"),
                        "current_price_usd": self._safe_float(market_data.get("current_price", {}).get("usd")),
                        "market_cap_usd": self._safe_float(market_data.get("market_cap", {}).get("usd")),
                        "volume_24h_usd": self._safe_float(market_data.get("total_volume", {}).get("usd")),
                        "price_change_24h": self._safe_float(market_data.get("price_change_24h")),
                        "price_change_percentage_24h": self._safe_float(market_data.get("price_change_percentage_24h")),
                        "market_cap_rank": market_data.get("market_cap_rank"),
                        "timestamp": datetime.now()
                    }
        except Exception as e:
            logger.error(f"CoinGecko 시장 데이터 조회 오류 ({symbol}): {e}")
        
        return None 