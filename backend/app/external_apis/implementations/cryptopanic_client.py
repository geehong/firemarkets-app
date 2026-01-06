# backend/app/external_apis/cryptopanic_client.py
import aiohttp
from typing import List, Optional
from datetime import datetime
from app.core.config import CRYPTOPANIC_API_KEY
import logging

logger = logging.getLogger(__name__)

class CryptoPanicClient:
    """CryptoPanic API 클라이언트"""
    
    BASE_URL = "https://cryptopanic.com/api/developer/v2"
    
    def __init__(self):
        self.api_key = CRYPTOPANIC_API_KEY
        # aiohttp session is best managed as context manager per request 
        # or initialized in an async method. For simplicity/reliability in this context:
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    
    async def get_posts(
        self, 
        currencies: Optional[str] = None,  # "BTC,ETH"
        filter: str = "hot",  # hot, rising, bullish, bearish, important
        kind: str = "news",   # news, media
        public: bool = True
    ) -> List[dict]:
        """뉴스 목록 조회"""
        params = {
            "auth_token": self.api_key,
            "filter": filter,
            "kind": kind,
            "public": str(public).lower()
        }
        if currencies:
            params["currencies"] = currencies
        
        try:
            async with aiohttp.ClientSession(headers=self.headers) as session:
                async with session.get(f"{self.BASE_URL}/posts/", params=params, timeout=30.0) as response:
                    # aiohttp raises on status if we check, but we can just check status manually or use raise_for_status
                    response.raise_for_status()
                    data = await response.json()
                    return data.get("results", [])
        except aiohttp.ClientError as e:
            logger.error(f"CryptoPanic API Error: {e}")
            return []
        except Exception as e:
            logger.error(f"CryptoPanic Client Unexpected Error: {e}")
            return []
    
    def normalize(self, raw: dict) -> dict:
        """API 응답을 통일된 형식으로 변환"""
        return {
            "source": "cryptopanic",
            "external_id": str(raw.get("id")),
            "title": raw.get("title"),
            "url": raw.get("url"),
            "published_at": self._parse_date(raw.get("published_at")),
            "currencies": [c.get("code") for c in raw.get("currencies", [])] if raw.get("currencies") else [],
            "sentiment": raw.get("votes", {}).get("sentiment"),  # positive/negative
        }

    def _parse_date(self, date_str):
        if not date_str:
            return None
        # Replace 'Z' with '+00:00' for isoformat compatibility
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    
    async def close(self):
        # No persistent session to close
        pass
