"""
WebSocket 오케스트레이터 테스트
"""
import unittest
from unittest.mock import Mock, AsyncMock, patch
import asyncio
from typing import List

from app.services.websocket.base_consumer import BaseWSConsumer, ConsumerConfig, AssetType
from app.services.asset_manager import Asset, AssetManager
from app.services.websocket_orchestrator import WebSocketOrchestrator
from app.core.websocket_config import WebSocketConfig

class MockConsumer(BaseWSConsumer):
    """테스트용 Mock Consumer"""
    
    def __init__(self, config: ConsumerConfig, name: str = "mock"):
        super().__init__(config)
        self._name = name
        self._api_key = "test_key"
    
    @property
    def client_name(self) -> str:
        return self._name
    
    @property
    def api_key(self) -> str:
        return self._api_key
    
    async def connect(self) -> bool:
        self.is_connected = True
        return True
    
    async def disconnect(self):
        self.is_connected = False
    
    async def subscribe(self, tickers: List[str]) -> bool:
        self.subscribed_tickers.update(tickers)
        return True
    
    async def unsubscribe(self, tickers: List[str]) -> bool:
        for ticker in tickers:
            self.subscribed_tickers.discard(ticker)
        return True
    
    async def run(self):
        self.is_running = True
        # 무한 루프 시뮬레이션
        while self.is_running:
            await asyncio.sleep(0.1)
    
    async def _perform_health_check(self) -> bool:
        return self.is_connected

class TestWebSocketOrchestrator(unittest.TestCase):
    """WebSocket 오케스트레이터 테스트"""
    
    def setUp(self):
        """테스트 설정"""
        self.orchestrator = WebSocketOrchestrator()
        
        # Mock Consumer 설정
        self.mock_config = ConsumerConfig(
            max_subscriptions=10,
            supported_asset_types=[AssetType.STOCK, AssetType.CRYPTO],
            rate_limit_per_minute=60,
            priority=1
        )
        
        self.mock_consumer = MockConsumer(self.mock_config, "test_consumer")
    
    def test_consumer_initialization(self):
        """Consumer 초기화 테스트"""
        self.assertEqual(self.mock_consumer.client_name, "test_consumer")
        self.assertEqual(self.mock_consumer.api_key, "test_key")
        self.assertFalse(self.mock_consumer.is_connected)
        self.assertFalse(self.mock_consumer.is_running)
    
    def test_consumer_connect(self):
        """Consumer 연결 테스트"""
        async def test_connect():
            result = await self.mock_consumer.connect()
            self.assertTrue(result)
            self.assertTrue(self.mock_consumer.is_connected)
        
        asyncio.run(test_connect())
    
    def test_consumer_subscribe(self):
        """Consumer 구독 테스트"""
        async def test_subscribe():
            await self.mock_consumer.connect()
            tickers = ["AAPL", "MSFT", "GOOGL"]
            result = await self.mock_consumer.subscribe(tickers)
            
            self.assertTrue(result)
            self.assertEqual(len(self.mock_consumer.subscribed_tickers), 3)
            self.assertIn("AAPL", self.mock_consumer.subscribed_tickers)
        
        asyncio.run(test_subscribe())
    
    def test_consumer_unsubscribe(self):
        """Consumer 구독 해제 테스트"""
        async def test_unsubscribe():
            await self.mock_consumer.connect()
            await self.mock_consumer.subscribe(["AAPL", "MSFT", "GOOGL"])
            
            result = await self.mock_consumer.unsubscribe(["AAPL", "MSFT"])
            
            self.assertTrue(result)
            self.assertEqual(len(self.mock_consumer.subscribed_tickers), 1)
            self.assertIn("GOOGL", self.mock_consumer.subscribed_tickers)
        
        asyncio.run(test_unsubscribe())
    
    def test_consumer_health_check(self):
        """Consumer 헬스체크 테스트"""
        async def test_health_check():
            # 연결 전
            self.assertFalse(await self.mock_consumer.health_check())
            
            # 연결 후
            await self.mock_consumer.connect()
            self.assertTrue(await self.mock_consumer.health_check())
        
        asyncio.run(test_health_check())
    
    def test_consumer_status(self):
        """Consumer 상태 테스트"""
        status = self.mock_consumer.get_status()
        
        self.assertEqual(status['client_name'], "test_consumer")
        self.assertFalse(status['is_connected'])
        self.assertFalse(status['is_running'])
        self.assertEqual(status['subscribed_count'], 0)
        self.assertEqual(status['max_subscriptions'], 10)
        self.assertEqual(status['supported_types'], ['stock', 'crypto'])
    
    @patch('app.services.asset_manager.AssetManager.get_active_assets')
    def test_asset_assignment(self, mock_get_assets):
        """자산 할당 테스트"""
        # Mock 자산 데이터
        mock_assets = [
            Asset("AAPL", "Apple Inc.", 2, "finnhub"),  # 주식
            Asset("MSFT", "Microsoft Corp.", 2, "finnhub"),  # 주식
            Asset("BTC-USD", "Bitcoin", 8, "finnhub"),  # 암호화폐
        ]
        mock_get_assets.return_value = mock_assets
        
        async def test_assignment():
            # Consumer 등록
            self.orchestrator.consumers["test_consumer"] = self.mock_consumer
            
            # 자산 할당
            await self.orchestrator._rebalance_assignments(mock_assets)
            
            # 할당 확인
            self.assertIn("test_consumer", self.orchestrator.assignments)
            assignment = self.orchestrator.assignments["test_consumer"]
            self.assertEqual(len(assignment.assigned_tickers), 3)
            self.assertIn("AAPL", assignment.assigned_tickers)
            self.assertIn("MSFT", assignment.assigned_tickers)
            self.assertIn("BTC-USD", assignment.assigned_tickers)
        
        asyncio.run(test_assignment())
    
    def test_websocket_config(self):
        """WebSocket 설정 테스트"""
        # Finnhub 설정 확인
        finnhub_config = WebSocketConfig.get_provider_config('finnhub')
        self.assertIsNotNone(finnhub_config)
        self.assertEqual(finnhub_config.max_subscriptions, 50)
        self.assertIn(AssetType.STOCK, finnhub_config.supported_asset_types)
        self.assertIn(AssetType.CRYPTO, finnhub_config.supported_asset_types)
        
        # Tiingo 설정 확인
        tiingo_config = WebSocketConfig.get_provider_config('tiingo')
        self.assertIsNotNone(tiingo_config)
        self.assertEqual(tiingo_config.max_subscriptions, 1000)
        
        # Alpaca 설정 확인
        alpaca_config = WebSocketConfig.get_provider_config('alpaca')
        self.assertIsNotNone(alpaca_config)
        self.assertEqual(alpaca_config.max_subscriptions, 30)
        self.assertEqual(len(alpaca_config.supported_asset_types), 1)
        self.assertIn(AssetType.STOCK, alpaca_config.supported_asset_types)
    
    def test_asset_type_priority(self):
        """자산 타입 우선순위 테스트"""
        priorities = WebSocketConfig.ASSET_TYPE_PRIORITY
        
        self.assertEqual(priorities[AssetType.STOCK], 1)  # 가장 높은 우선순위
        self.assertEqual(priorities[AssetType.CRYPTO], 2)
        self.assertEqual(priorities[AssetType.FOREX], 3)
        self.assertEqual(priorities[AssetType.COMMODITY], 4)  # 가장 낮은 우선순위

if __name__ == '__main__':
    unittest.main()

