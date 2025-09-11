"""
WebSocket Consumer Base Class
모든 WebSocket 클라이언트가 상속받아야 할 표준 인터페이스
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Set
from dataclasses import dataclass
from enum import Enum
import asyncio
import logging

logger = logging.getLogger(__name__)

class AssetType(Enum):
    STOCK = "stock"           # 개별 주식
    ETF = "etf"              # ETF/펀드
    CRYPTO = "crypto"        # 암호화폐
    FOREX = "forex"          # 외환
    COMMODITY = "commodity"  # 커머디티
    FOREIGN = "foreign"      # 외국계 주식

@dataclass
class ConsumerConfig:
    """WebSocket Consumer 설정"""
    max_subscriptions: int
    supported_asset_types: List[AssetType]
    rate_limit_per_minute: int
    priority: int  # 1=높음, 2=중간, 3=낮음
    reconnect_interval: int = 30
    health_check_interval: int = 60

class BaseWSConsumer(ABC):
    """모든 WebSocket Consumer의 기본 클래스"""
    
    def __init__(self, config: ConsumerConfig):
        self.config = config
        self.is_connected = False
        self.is_running = False
        self.subscribed_tickers: Set[str] = set()
        self.last_health_check = None
        self.connection_errors = 0
        self.max_connection_errors = 5
        
    @property
    @abstractmethod
    def client_name(self) -> str:
        """Consumer 이름 (예: 'finnhub', 'tiingo', 'alpaca')"""
        pass
    
    @property
    @abstractmethod
    def api_key(self) -> Optional[str]:
        """API 키"""
        pass
    
    @abstractmethod
    async def connect(self) -> bool:
        """WebSocket 연결"""
        pass
    
    @abstractmethod
    async def disconnect(self):
        """WebSocket 연결 해제"""
        pass
    
    @abstractmethod
    async def subscribe(self, tickers: List[str]) -> bool:
        """티커 구독"""
        pass
    
    @abstractmethod
    async def unsubscribe(self, tickers: List[str]) -> bool:
        """티커 구독 해제"""
        pass
    
    @abstractmethod
    async def run(self):
        """메인 실행 루프 (데이터 수신 및 Redis 전송)"""
        pass
    
    async def health_check(self) -> bool:
        """헬스체크"""
        try:
            if not self.is_connected:
                return False
            
            # 각 Consumer별로 구체적인 헬스체크 구현
            return await self._perform_health_check()
        except Exception as e:
            logger.error(f"{self.client_name} health check failed: {e}")
            return False
    
    @abstractmethod
    async def _perform_health_check(self) -> bool:
        """구체적인 헬스체크 로직"""
        pass
    
    def can_subscribe(self, tickers: List[str], asset_types: List[AssetType]) -> bool:
        """구독 가능 여부 확인"""
        # 최대 구독 수 확인
        if len(tickers) > self.config.max_subscriptions:
            return False
        
        # 지원하는 자산 타입 확인
        for asset_type in asset_types:
            if asset_type not in self.config.supported_asset_types:
                return False
        
        return True
    
    def get_status(self) -> Dict:
        """현재 상태 반환"""
        return {
            'client_name': self.client_name,
            'is_connected': self.is_connected,
            'is_running': self.is_running,
            'subscribed_count': len(self.subscribed_tickers),
            'max_subscriptions': self.config.max_subscriptions,
            'supported_types': [t.value for t in self.config.supported_asset_types],
            'connection_errors': self.connection_errors,
            'last_health_check': self.last_health_check
        }

