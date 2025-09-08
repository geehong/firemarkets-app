"""
자산 관리자 - 데이터베이스에서 실시간 구독이 필요한 자산들을 조회
"""
import asyncio
import logging
from typing import List, Dict, Optional, Set
from dataclasses import dataclass
import aiomysql
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
    
    @property
    def asset_type(self) -> AssetType:
        """asset_type_id를 AssetType enum으로 변환"""
        type_mapping = {
            1: AssetType.COMMODITY,  # 상품
            2: AssetType.STOCK,      # 주식
            3: AssetType.COMMODITY,  # 금
            4: AssetType.FOREX,      # 외환
            5: AssetType.STOCK,      # ETF
            6: AssetType.STOCK,      # 인덱스
            7: AssetType.STOCK,      # 채권
            8: AssetType.CRYPTO,     # 암호화폐
        }
        return type_mapping.get(self.asset_type_id, AssetType.STOCK)

class AssetManager:
    """자산 관리자"""
    
    def __init__(self):
        self.db_config = {
            'host': GLOBAL_APP_CONFIGS.get('DB_HOST', 'db'),  # Docker 네트워크에서 'db' 사용
            'port': GLOBAL_APP_CONFIGS.get('DB_PORT', 3306),
            'user': GLOBAL_APP_CONFIGS.get('DB_USERNAME', 'geehong'),
            'password': GLOBAL_APP_CONFIGS.get('DB_PASSWORD', 'Power6100'),
            'db': GLOBAL_APP_CONFIGS.get('DB_DATABASE', 'markets'),
            'charset': 'utf8mb4',
            'autocommit': True
        }
        self._connection_pool = None
        self._cache: Dict[str, List[Asset]] = {}
        self._cache_ttl = 300  # 5분 캐시
    
    async def _get_connection_pool(self):
        """데이터베이스 연결 풀 생성"""
        if self._connection_pool is None:
            self._connection_pool = await aiomysql.create_pool(
                minsize=1,
                maxsize=10,
                **self.db_config
            )
        return self._connection_pool
    
    async def get_active_assets(self, force_refresh: bool = False) -> List[Asset]:
        """실시간 구독이 필요한 활성 자산 목록 조회"""
        cache_key = "active_assets"
        
        # 캐시 확인
        if not force_refresh and cache_key in self._cache:
            return self._cache[cache_key]
        
        try:
            pool = await self._get_connection_pool()
            async with pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    query = """
                    SELECT ticker, name, asset_type_id, data_source, exchange, currency, is_active
                    FROM assets 
                    WHERE JSON_EXTRACT(collection_settings, '$.collect_price') = true 
                    AND is_active = 1
                    ORDER BY asset_type_id, ticker
                    """
                    await cursor.execute(query)
                    results = await cursor.fetchall()
                    
                    assets = []
                    for row in results:
                        asset = Asset(
                            ticker=row[0],
                            name=row[1],
                            asset_type_id=row[2],
                            data_source=row[3],
                            exchange=row[4],
                            currency=row[5],
                            is_active=bool(row[6])
                        )
                        assets.append(asset)
                    
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
        if self._connection_pool:
            self._connection_pool.close()
            await self._connection_pool.wait_closed()
