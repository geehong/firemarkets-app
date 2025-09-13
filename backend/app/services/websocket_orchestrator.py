"""
WebSocket 오케스트레이터 - 모든 WebSocket 연결을 중앙에서 관리
"""
import asyncio
import logging
from typing import List, Dict, Optional, Set, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import json

from app.services.websocket.base_consumer import BaseWSConsumer, AssetType
from app.services.asset_manager import AssetManager, Asset
from app.core.websocket_config import WebSocketConfig
from app.services.websocket.finnhub_consumer import FinnhubWSConsumer
#from app.services.websocket.tiingo_consumer import TiingoWSConsumer
from app.services.websocket.alpaca_consumer import AlpacaWSConsumer
from app.services.websocket.binance_consumer import BinanceWSConsumer
from app.services.websocket.swissquote_consumer import SwissquoteWSConsumer
# DISABLED: TwelveData WebSocket Consumer
# from app.services.websocket.twelvedata_consumer import TwelveDataWSConsumer
from app.core.config import GLOBAL_APP_CONFIGS

logger = logging.getLogger(__name__)

@dataclass
class ConsumerAssignment:
    """Consumer 할당 정보"""
    consumer: BaseWSConsumer
    assigned_tickers: List[str]
    asset_types: List[AssetType]
    priority: int

class WebSocketOrchestrator:
    """WebSocket 오케스트레이터"""
    
    def __init__(self):
        self.asset_manager = AssetManager()
        self.consumers: Dict[str, BaseWSConsumer] = {}
        self.assignments: Dict[str, ConsumerAssignment] = {}
        self.is_running = False
        self.last_rebalance = None
        self.rebalance_interval = WebSocketConfig.ORCHESTRATOR['rebalance_interval']
        
        # Consumer 클래스 등록
        self.consumer_classes = {
            'finnhub': FinnhubWSConsumer,
            #'tiingo': TiingoWSConsumer,
            'alpaca': AlpacaWSConsumer,
            'binance': BinanceWSConsumer,
            'swissquote': SwissquoteWSConsumer,
            # DISABLED: TwelveData WebSocket Consumer
            # 'twelvedata': TwelveDataWSConsumer
        }
    
    async def start(self):
        """오케스트레이터 시작"""
        logger.info("🚀 WebSocket Orchestrator starting...")
        self.is_running = True
        
        try:
            # 1. 자산 목록 로드
            assets = await self.asset_manager.get_active_assets()
            logger.info(f"📊 Loaded {len(assets)} active assets")
            
            # 2. Consumer 초기화
            await self._initialize_consumers()
            
            # 2-1. 샘플 배정 제거 - 모든 Consumer가 동적 배분으로 처리

            # 3. 최적 할당 실행
            await self._rebalance_assignments(assets)
            
            # 4. Consumer 실행
            await self._start_consumers()
            
            # 5. 주기적 재조정 루프
            await self._monitoring_loop()
            
        except Exception as e:
            logger.error(f"Orchestrator failed: {e}")
            await self.stop()
    
    async def stop(self):
        """오케스트레이터 중지"""
        logger.info("🛑 WebSocket Orchestrator stopping...")
        self.is_running = False
        
        # 모든 Consumer 중지
        for consumer in self.consumers.values():
            try:
                await consumer.disconnect()
            except Exception as e:
                logger.error(f"Error stopping consumer {consumer.client_name}: {e}")
        
        # 리소스 정리
        await self.asset_manager.close()
    
    async def _initialize_consumers(self):
        """Consumer 초기화 - 데이터베이스 설정에 따라 활성화/비활성화"""
        for provider_name, consumer_class in self.consumer_classes.items():
            try:
                # 데이터베이스에서 Consumer 활성화 여부 확인
                enabled_key = f"WEBSOCKET_{provider_name.upper()}_ENABLED"
                is_enabled = GLOBAL_APP_CONFIGS.get(enabled_key, "1") == "1"
                
                if not is_enabled:
                    logger.info(f"⏸️ {provider_name} consumer is disabled in database")
                    continue
                
                config = WebSocketConfig.get_provider_config(provider_name)
                if config and config.max_subscriptions > 0:
                    consumer = consumer_class(config)
                    self.consumers[provider_name] = consumer
                    logger.info(f"✅ Initialized {provider_name} consumer (enabled)")
                else:
                    logger.warning(f"⚠️ {provider_name} consumer disabled or no valid config")
            except Exception as e:
                logger.error(f"❌ Failed to initialize {provider_name}: {e}")
    
    async def _rebalance_assignments(self, assets: List[Asset]):
        """자산을 Consumer에 최적 할당"""
        logger.info("🔄 Rebalancing asset assignments...")
        
        # 기존 할당 초기화
        self.assignments.clear()
        
        # 자산을 세분화된 타입으로 분류
        assets_by_type = self._classify_assets_by_detailed_type(assets)
        
        # 각 자산 타입별로 최적 할당
        for asset_type, type_assets in assets_by_type.items():
            await self._assign_assets_by_type(asset_type, type_assets)
        
        self.last_rebalance = datetime.now()
        logger.info(f"✅ Rebalancing completed. {len(self.assignments)} consumers assigned")
    
    def _classify_assets_by_detailed_type(self, assets: List[Asset]) -> Dict[AssetType, List[Asset]]:
        """자산을 세분화된 타입으로 분류"""
        from app.services.websocket.base_consumer import AssetType
        
        assets_by_type = {}
        
        # ETF/펀드 티커 목록 (일반적인 패턴)
        etf_tickers = {
            'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'VEA', 'VWO', 'BND', 'AGG', 'TLT',
            'GLD', 'SLV', 'USO', 'UNG', 'VTV', 'VUG', 'VB', 'VO', 'VXUS', 'IEFA',
            'IVV', 'FFEU', 'VTI', 'VTV', 'VXUS'
        }
        
        # 외국계 주식 티커
        foreign_tickers = {
            '2222.SR',  # 사우디아라비아 아람코
            'TCEHY',    # 중국 텐센트
            'TSM',      # 대만 TSMC
        }
        
        # 커머디티 티커 (일반적인 패턴)
        commodity_tickers = {
            'GC', 'SI', 'CL', 'NG', 'HG', 'PL', 'PA', 'ZC', 'ZS', 'ZW',
            'GOLD', 'SILVER', 'OIL', 'GAS', 'GCUSD', 'SIUSD'  # 실제 데이터베이스에 있는 커머디티
        }
        
        for asset in assets:
            ticker = asset.ticker.upper()
            
            # 암호화폐 (USDT로 끝나는 것들)
            if ticker.endswith('USDT'):
                asset_type = AssetType.CRYPTO
            # ETF/펀드
            elif ticker in etf_tickers:
                asset_type = AssetType.ETF
            # 외국계 주식
            elif ticker in foreign_tickers:
                asset_type = AssetType.FOREIGN
            # 커머디티
            elif ticker in commodity_tickers:
                asset_type = AssetType.COMMODITY
                logger.info(f"🔍 Classified {ticker} as COMMODITY")
            # 기본적으로는 개별 주식으로 분류
            else:
                asset_type = AssetType.STOCK
            
            if asset_type not in assets_by_type:
                assets_by_type[asset_type] = []
            assets_by_type[asset_type].append(asset)
        
        # 분류 결과 로깅
        for asset_type, type_assets in assets_by_type.items():
            tickers = [asset.ticker for asset in type_assets]
            logger.info(f"📊 {asset_type.value}: {len(tickers)} assets - {tickers[:5]}{'...' if len(tickers) > 5 else ''}")
        
        return assets_by_type
    
    async def _assign_assets_by_type(self, asset_type: AssetType, assets: List[Asset]):
        """특정 자산 타입의 자산들을 Consumer에 Fallback 순서 기반으로 할당"""
        # Fallback 순서 가져오기
        fallback_order = WebSocketConfig.ASSET_TYPE_FALLBACK.get(asset_type, [])
        
        if not fallback_order:
            logger.warning(f"⚠️ No fallback order defined for {asset_type.value}")
            return
        
        # Fallback 순서에 따라 활성화된 Consumer 찾기
        available_consumers = []
        for provider_name in fallback_order:
            if provider_name not in self.consumers:
                continue
                
            # 데이터베이스에서 Consumer 활성화 여부 확인
            enabled_key = f"WEBSOCKET_{provider_name.upper()}_ENABLED"
            is_enabled = GLOBAL_APP_CONFIGS.get(enabled_key, "1") == "1"
            
            if not is_enabled:
                logger.debug(f"⏸️ {provider_name} consumer is disabled")
                continue
                
            config = WebSocketConfig.get_provider_config(provider_name)
            if config and config.max_subscriptions > 0 and asset_type in config.supported_asset_types:
                consumer = self.consumers[provider_name]
                available_consumers.append((provider_name, consumer, config))
                logger.debug(f"✅ {provider_name} available for {asset_type.value}")
        
        if not available_consumers:
            logger.warning(f"⚠️ No active consumers available for {asset_type.value}")
            return
        
        # 자산 타입별로 이미 분류되었으므로 추가 필터링 불필요
        
        tickers = [asset.ticker for asset in assets]
        fallback_names = [c[0] for c in available_consumers]
        logger.info(f"📊 Assigning {len(tickers)} {asset_type.value} tickers using fallback order: {fallback_names}")
        
        # Fallback 순서 기반 할당
        for ticker in tickers:
            assigned = False
            
            # Fallback 순서대로 할당 시도
            for provider_name, consumer, config in available_consumers:
                current_assigned = len(self.assignments.get(provider_name, ConsumerAssignment(consumer, [], [], 0)).assigned_tickers)
                
                if current_assigned < config.max_subscriptions:
                    # 할당 가능
                    if provider_name in self.assignments:
                        self.assignments[provider_name].assigned_tickers.append(ticker)
                    else:
                        self.assignments[provider_name] = ConsumerAssignment(
                            consumer=consumer,
                            assigned_tickers=[ticker],
                            asset_types=[asset_type],
                            priority=config.priority
                        )
                    
                    logger.info(f"📋 Assigned {asset_type.value} ticker {ticker} to {provider_name} (fallback order, {current_assigned + 1}/{config.max_subscriptions})")
                    assigned = True
                    break
                else:
                    logger.debug(f"⚠️ {provider_name} is full ({current_assigned}/{config.max_subscriptions})")
            
            if not assigned:
                logger.warning(f"⚠️ No available slots for {asset_type.value} ticker {ticker} - all consumers at capacity or unsupported")
        
        # 할당 결과 요약
        for provider_name, assignment in self.assignments.items():
            if assignment.assigned_tickers and asset_type in assignment.asset_types:
                config = WebSocketConfig.get_provider_config(provider_name)
                logger.info(f"✅ {provider_name}: {len(assignment.assigned_tickers)} {asset_type.value} tickers assigned ({len(assignment.assigned_tickers)}/{config.max_subscriptions})")
    
    async def _start_consumers(self):
        """Consumer 시작"""
        tasks = []
        
        for provider_name, assignment in self.assignments.items():
            if assignment.assigned_tickers:
                logger.info(f"🔧 Creating task for {provider_name} with {len(assignment.assigned_tickers)} tickers")
                try:
                    task = asyncio.create_task(
                        self._run_consumer(assignment)
                    )
                    tasks.append(task)
                    logger.info(f"🚀 Starting {provider_name} with {len(assignment.assigned_tickers)} tickers")
                except Exception as e:
                    logger.error(f"❌ Failed to create task for {provider_name}: {e}")
        
        if tasks:
            logger.info(f"🔧 Starting {len(tasks)} consumer tasks")
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"❌ Task {i} failed with exception: {result}")
    
    async def _run_consumer(self, assignment: ConsumerAssignment):
        """Consumer 실행"""
        consumer = assignment.consumer
        tickers = assignment.assigned_tickers
        
        logger.info(f"🔧 Starting _run_consumer for {consumer.client_name} with {len(tickers)} tickers")
        
        try:
            # 연결
            logger.info(f"🔌 Attempting to connect {consumer.client_name}")
            if not await consumer.connect():
                logger.error(f"❌ Failed to connect {consumer.client_name}")
                return
            
            # 구독
            if not await consumer.subscribe(tickers):
                logger.error(f"❌ Failed to subscribe {consumer.client_name}")
                return
            
            logger.info(f"✅ {consumer.client_name} connected and subscribed to {len(tickers)} tickers")
            
            # 실행
            await consumer.run()
            
        except Exception as e:
            logger.error(f"❌ Error running {consumer.client_name}: {e}")
        finally:
            try:
                await consumer.disconnect()
            except Exception as e:
                logger.error(f"❌ Error disconnecting {consumer.client_name}: {e}")
    
    async def _monitoring_loop(self):
        """모니터링 루프"""
        while self.is_running:
            try:
                # 헬스체크
                await self._health_check_consumers()
                
                # 주기적 재조정
                if self._should_rebalance():
                    assets = await self.asset_manager.get_active_assets(force_refresh=True)
                    await self._rebalance_assignments(assets)
                    await self._start_consumers()
                
                # 상태 로깅
                await self._log_status()
                
                await asyncio.sleep(WebSocketConfig.ORCHESTRATOR['health_check_interval'])
                
            except Exception as e:
                logger.error(f"❌ Error in monitoring loop: {e}")
                await asyncio.sleep(30)
    
    async def _health_check_consumers(self):
        """Consumer 헬스체크"""
        for provider_name, consumer in self.consumers.items():
            try:
                is_healthy = await consumer.health_check()
                if not is_healthy:
                    logger.warning(f"⚠️ {provider_name} health check failed")
            except Exception as e:
                logger.error(f"❌ Health check failed for {provider_name}: {e}")
    
    def _should_rebalance(self) -> bool:
        """재조정 필요 여부 확인"""
        if self.last_rebalance is None:
            return True
        
        # 연결이 끊어진 컨슈머가 있으면 즉시 재조정
        for provider_name, consumer in self.consumers.items():
            if not consumer.is_connected and provider_name in self.assignments:
                logger.warning(f"⚠️ {provider_name} disconnected, triggering immediate rebalance")
                return True
        
        return (datetime.now() - self.last_rebalance).seconds >= self.rebalance_interval
    
    async def _log_status(self):
        """상태 로깅"""
        total_tickers = sum(len(assignment.assigned_tickers) for assignment in self.assignments.values())
        active_consumers = sum(1 for consumer in self.consumers.values() if consumer.is_connected)
        
        logger.info(f"📊 Orchestrator Status: {active_consumers}/{len(self.consumers)} consumers active, {total_tickers} total tickers")
        
        for provider_name, assignment in self.assignments.items():
            consumer = assignment.consumer
            logger.info(f"   {provider_name}: {len(assignment.assigned_tickers)} tickers, connected={consumer.is_connected}")

