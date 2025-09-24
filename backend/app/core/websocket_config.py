"""
WebSocket Consumer 설정 관리
"""
from typing import Dict, List
from dataclasses import dataclass
from app.services.websocket.base_consumer import ConsumerConfig, AssetType

@dataclass
class ProviderConfig:
    """API 제공자별 설정"""
    max_subscriptions: int
    supported_asset_types: List[AssetType]
    rate_limit_per_minute: int
    priority: int
    reconnect_interval: int = 30
    health_check_interval: int = 60

class WebSocketConfig:
    """WebSocket 관련 전역 설정"""
    
    # API 제공자별 설정
    PROVIDERS = {
        'finnhub': ProviderConfig(
            max_subscriptions=45,
            supported_asset_types=[AssetType.STOCK, AssetType.FOREX],
            rate_limit_per_minute=60,
            priority=1,  # 동일 우선순위로 분산 배정
            reconnect_interval=30,
            health_check_interval=60
        ),
        'tiingo': ProviderConfig(
            max_subscriptions=20,
            supported_asset_types=[AssetType.STOCK, AssetType.CRYPTO],
            rate_limit_per_minute=100,
            priority=1,  # 동일 우선순위로 분산 배정
            reconnect_interval=30,
            health_check_interval=60
        ),
        'alpaca': ProviderConfig(
            max_subscriptions=25,
            supported_asset_types=[AssetType.STOCK, AssetType.ETF],  # 주식 + ETF 지원
            rate_limit_per_minute=200,
            priority=1,  # 동일 우선순위로 분산 배정
            reconnect_interval=30,
            health_check_interval=60
        ),
        'binance': ProviderConfig(
            max_subscriptions=200,  # 코인 전체 구독을 위해 상향
            supported_asset_types=[AssetType.CRYPTO],  # 암호화폐 전용
            rate_limit_per_minute=300,
            priority=1,  # 암호화폐 1순위
            reconnect_interval=30,
            health_check_interval=60
        ),
        'swissquote': ProviderConfig(
            max_subscriptions=10,  # Swissquote는 제한적 구독
            supported_asset_types=[AssetType.FOREX, AssetType.COMMODITY],  # 외환/커머디티 전용
            rate_limit_per_minute=60,  # 무료 API이므로 제한적
            priority=2,  # 커머디티/외환 전용이므로 낮은 우선순위
            reconnect_interval=30,
            health_check_interval=60
        ),
        'coinbase': ProviderConfig(
            max_subscriptions=200,  # 코인 전체 구독을 위해 상향
            supported_asset_types=[AssetType.CRYPTO],  # 암호화폐 전용
            rate_limit_per_minute=300,
            priority=1,  # 암호화폐 1순위 (바이낸스와 동일)
            reconnect_interval=30,
            health_check_interval=60
        )
    }
    
    # 오케스트레이터 설정
    ORCHESTRATOR = {
        'asset_refresh_interval': 300,  # 5분마다 자산 목록 갱신
        'health_check_interval': 60,    # 1분마다 헬스체크
        'rebalance_interval': 300,      # 5분마다 재조정
        'max_retry_attempts': 3,        # 최대 재시도 횟수
        'retry_delay': 30,              # 재시도 간격 (초)
    }
    
    # 자산 타입별 우선순위
    ASSET_TYPE_PRIORITY = {
        AssetType.STOCK: 1,      # 주식이 가장 중요
        AssetType.CRYPTO: 2,     # 암호화폐
        AssetType.FOREX: 3,      # 외환
        AssetType.COMMODITY: 4   # 상품
    }
    
    # 자산 타입별 Fallback 순서 (1순위 실패 시 다음 순위)
    ASSET_TYPE_FALLBACK = {
        AssetType.CRYPTO: ['binance', 'coinbase', 'finnhub', 'tiingo'],  # 바이낸스 -> 코인베이스 -> 핀허브 -> 팅고
        AssetType.STOCK: ['finnhub', 'alpaca', 'tiingo'],    # 핀허브 -> 알파카 -> 팅고
        AssetType.FOREX: ['finnhub', 'swissquote'],          # 핀허브 -> 스위스쿼트
        AssetType.COMMODITY: ['swissquote', 'finnhub'],      # 스위스쿼트 -> 핀허브
        AssetType.ETF: ['alpaca', 'finnhub', 'tiingo']       # 알파카 -> 핀허브 -> 팅고
    }
    
    @classmethod
    def get_provider_config(cls, provider_name: str) -> ProviderConfig:
        """제공자별 설정 반환"""
        return cls.PROVIDERS.get(provider_name)
    
    @classmethod
    def get_all_providers(cls) -> List[str]:
        """모든 제공자 목록 반환"""
        return list(cls.PROVIDERS.keys())
    
    @classmethod
    def get_providers_by_asset_type(cls, asset_type: AssetType) -> List[str]:
        """특정 자산 타입을 지원하는 제공자 목록 반환"""
        providers = []
        for provider, config in cls.PROVIDERS.items():
            if asset_type in config.supported_asset_types:
                providers.append(provider)
        return providers
