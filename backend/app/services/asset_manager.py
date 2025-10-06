"""
자산 관리자 - 데이터베이스에서 실시간 구독이 필요한 자산들을 조회
"""
import asyncio
import logging
from typing import List, Dict, Optional, Set
from dataclasses import dataclass
from sqlalchemy import text
from app.core.database import get_async_session_local
from app.services.websocket.base_consumer import AssetType
from app.core.config import GLOBAL_APP_CONFIGS

logger = logging.getLogger(__name__)

@dataclass
class Asset:
    """자산 정보"""
    ticker: str
    name: str
    asset_type_id: int
    data_source: str
    exchange: Optional[str] = None
    currency: Optional[str] = None
    is_active: bool = True
    # provider-specific eligibility flags
    has_financials: bool = False
    has_etf_info: bool = False
    
    @property
    def asset_type(self) -> AssetType:
        """asset_type_id를 AssetType enum으로 변환"""
        type_mapping = {
            1: AssetType.COMMODITY,  # 상품
            2: AssetType.STOCK,      # 주식
            3: AssetType.COMMODITY,  # 금
            4: AssetType.FOREX,      # 외환
            5: AssetType.ETF,        # ETF
            6: AssetType.STOCK,      # 인덱스
            7: AssetType.STOCK,      # 채권
            8: AssetType.CRYPTO,     # 암호화폐
        }
        return type_mapping.get(self.asset_type_id, AssetType.STOCK)

class AssetManager:
    """자산 관리자"""
    
    def __init__(self):
        self._cache: Dict[str, List[Asset]] = {}
        self._cache_ttl = 300  # 5분 캐시
    
    async def get_active_assets(self, force_refresh: bool = False) -> List[Asset]:
        """실시간 구독이 필요한 활성 자산 목록 조회"""
        cache_key = "active_assets"
        
        # 캐시 확인
        if not force_refresh and cache_key in self._cache:
            return self._cache[cache_key]
        
        try:
            session_local = get_async_session_local()
            async with session_local() as session:
                # 모든 활성 자산 로드
                # - 코인: crypto_data에 존재하는 것만 포함
                # - 비코인(주식/ETF/외환/상품 등): 이전 조건대로 collect_price=true 인 자산만 포함
                query = text(
                    """
                    SELECT 
                        a.ticker,
                        a.name,
                        a.asset_type_id,
                        a.data_source,
                        a.exchange,
                        a.currency,
                        a.is_active,
                        EXISTS(SELECT 1 FROM stock_financials sf WHERE sf.asset_id = a.asset_id) AS has_financials,
                        EXISTS(SELECT 1 FROM etf_info ei WHERE ei.asset_id = a.asset_id) AS has_etf_info
                    FROM assets a
                    WHERE a.is_active = TRUE
                      AND (
                        (a.asset_type_id = 8 AND a.asset_id IN (SELECT asset_id FROM crypto_data))
                        OR
                        (a.asset_type_id <> 8 AND COALESCE(a.collection_settings->>'collect_price', 'true') = 'true')
                      )
                    ORDER BY a.ticker
                    """
                )
                result = await session.execute(query)
                rows = result.fetchall()

                assets: List[Asset] = []
                for row in rows:
                    ticker, name, asset_type_id, data_source, exchange, currency, is_active, has_financials, has_etf_info = row
                    # ETF는 안전하게 has_etf_info를 True로 보정 (테이블 누락 대비)
                    inferred_has_etf_info = bool(has_etf_info)
                    if asset_type_id == 5 and not inferred_has_etf_info:
                        inferred_has_etf_info = True

                    assets.append(Asset(
                        ticker=ticker,
                        name=name,
                        asset_type_id=asset_type_id,
                        data_source=data_source,
                        exchange=exchange,
                        currency=currency,
                        is_active=bool(is_active),
                        has_financials=bool(has_financials),
                        has_etf_info=inferred_has_etf_info
                    ))

                # 캐시 저장
                self._cache[cache_key] = assets
                logger.info(f"Loaded {len(assets)} active assets from database")
                return assets
                    
        except Exception as e:
            logger.error(f"Failed to load active assets: {e}")
            return []
    
    async def get_assets_by_type(self, asset_type: AssetType) -> List[Asset]:
        """특정 자산 타입의 자산 목록 조회"""
        all_assets = await self.get_active_assets()
        return [asset for asset in all_assets if asset.asset_type == asset_type]
    
    async def get_assets_by_provider(self, provider: str) -> List[Asset]:
        """특정 데이터 소스의 자산 목록 조회"""
        all_assets = await self.get_active_assets()
        return [asset for asset in all_assets if asset.data_source == provider]
    
    async def get_assets_by_exchange(self, exchange: str) -> List[Asset]:
        """특정 거래소의 자산 목록 조회"""
        all_assets = await self.get_active_assets()
        return [asset for asset in all_assets if asset.exchange == exchange]
    
    async def refresh_cache(self):
        """캐시 강제 갱신"""
        await self.get_active_assets(force_refresh=True)
    
    async def close(self):
        """리소스 정리"""
        # SQLAlchemy async 세션은 context manager로 관리하므로 별도 정리 불필요
        return
