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
from app.services.websocket.coinbase_consumer import CoinbaseWSConsumer
from app.services.websocket.swissquote_consumer import SwissquoteWSConsumer
from app.core.websocket_logging import orchestrator_logger
from app.core.database import SessionLocal
from sqlalchemy import text
# DISABLED: TwelveData WebSocket Consumer
# from app.services.websocket.twelvedata_consumer import TwelveDataWSConsumer
from app.core.config import GLOBAL_APP_CONFIGS

logger = logging.getLogger(__name__)

def log_to_websocket_orchestrator_logs(log_level: str, message: str):
    """WebSocket 오케스트레이터 로그를 websocket_orchestrator_logs 테이블에 저장"""
    db = SessionLocal()
    try:
        db.execute(text("""
            INSERT INTO websocket_orchestrator_logs (log_level, message, created_at)
            VALUES (:log_level, :message, NOW())
        """), {
            'log_level': log_level,
            'message': message
        })
        db.commit()
        logger.debug(f"WebSocket orchestrator log saved: {log_level} - {message}")
    except Exception as e:
        logger.error(f"Failed to save WebSocket orchestrator log: {e}")
        db.rollback()
    finally:
        db.close()

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
        logger.info("Initializing WebSocket Orchestrator")
        
        logger.info("Creating AssetManager")
        self.asset_manager = AssetManager()
        logger.info("AssetManager created successfully")
        
        logger.info("Initializing orchestrator state")
        self.consumers: Dict[str, BaseWSConsumer] = {}
        self.assignments: Dict[str, ConsumerAssignment] = {}
        self.is_running = False
        self.last_rebalance = None
        self.rebalance_interval = WebSocketConfig.ORCHESTRATOR['rebalance_interval']
        logger.info(f"Orchestrator state initialized. Rebalance interval: {self.rebalance_interval}")
        
        # Consumer 클래스 등록
        logger.info("Registering consumer classes")
        self.consumer_classes = {
            'finnhub': FinnhubWSConsumer,
            #'tiingo': TiingoWSConsumer,
            'alpaca': AlpacaWSConsumer,
            'binance': BinanceWSConsumer,
            'coinbase': CoinbaseWSConsumer,
            'swissquote': SwissquoteWSConsumer,
            # DISABLED: TwelveData WebSocket Consumer
            # 'twelvedata': TwelveDataWSConsumer
        }
        logger.info(f"Consumer classes registered: {list(self.consumer_classes.keys())}")
        logger.info("WebSocket Orchestrator initialization completed")
    
    async def start(self):
        """오케스트레이터 시작"""
        logger.info("🚀 WebSocket Orchestrator starting...")
        self.is_running = True
        
        # 오케스트레이터 시작 로그
        logger.info("Logging orchestrator start event")
        log_to_websocket_orchestrator_logs("INFO", "WebSocket Orchestrator starting")
        logger.info("Orchestrator start event logged successfully")
        
        try:
            # 1. 자산 목록 로드
            logger.info("Loading active assets from database")
            assets = await self.asset_manager.get_active_assets()
            logger.info(f"📊 Loaded {len(assets)} active assets")
            
            logger.info("Logging assets loaded event")
            log_to_websocket_orchestrator_logs("INFO", f"Loaded {len(assets)} active assets")
            logger.info("Assets loaded event logged successfully")
            
            # 2. Consumer 초기화
            logger.info("Initializing WebSocket consumers")
            await self._initialize_consumers()
            logger.info("WebSocket consumers initialized successfully")
            
            # 2-1. 샘플 배정 제거 - 모든 Consumer가 동적 배분으로 처리

            # 3. 최적 할당 실행
            logger.info("Starting asset rebalancing")
            await self._rebalance_assignments(assets)
            logger.info("Asset rebalancing completed successfully")
            
            # 리밸런싱 완료 로그
            log_to_websocket_orchestrator_logs("INFO", f"Asset rebalancing completed - {len(assets)} assets, {len(self.consumers)} consumers")
            
            # 4. Consumer 실행
            logger.info("Starting WebSocket consumers")
            await self._start_consumers()
            logger.info("WebSocket consumers started successfully")
            
            # 5. 주기적 재조정 루프
            logger.info("Starting monitoring loop")
            await self._monitoring_loop()
            
        except Exception as e:
            logger.error(f"Orchestrator failed: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # 오케스트레이터 실패 로그
            log_to_websocket_orchestrator_logs("ERROR", f"Orchestrator failed: {e}")
            await self.stop()
    
    async def stop(self):
        """오케스트레이터 중지"""
        logger.info("🛑 WebSocket Orchestrator stopping...")
        self.is_running = False
        
        # 오케스트레이터 중지 로그
        log_to_websocket_orchestrator_logs("INFO", f"WebSocket Orchestrator stopping - {len(self.consumers)} consumers")
        
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
        logger.info("Starting consumer initialization process")
        logger.info(f"Available consumer classes: {list(self.consumer_classes.keys())}")
        
        for provider_name, consumer_class in self.consumer_classes.items():
            logger.info(f"Initializing {provider_name} consumer")
            try:
                # 데이터베이스에서 Consumer 활성화 여부 확인
                enabled_key = f"WEBSOCKET_{provider_name.upper()}_ENABLED"
                logger.debug(f"Checking enabled key: {enabled_key}")
                
                is_enabled = GLOBAL_APP_CONFIGS.get(enabled_key, "1") == "1"
                logger.info(f"{provider_name} enabled status: {is_enabled} (config value: {GLOBAL_APP_CONFIGS.get(enabled_key, '1')})")
                
                if not is_enabled:
                    logger.info(f"⏸️ {provider_name} consumer is disabled in database")
                    continue
                
                logger.debug(f"Getting config for {provider_name}")
                config = WebSocketConfig.get_provider_config(provider_name)
                logger.debug(f"Config for {provider_name}: {config}")
                
                if config and config.max_subscriptions > 0:
                    logger.debug(f"Creating {provider_name} consumer instance")
                    consumer = consumer_class(config)
                    logger.debug(f"Consumer instance created: {consumer}")
                    
                    self.consumers[provider_name] = consumer
                    logger.info(f"✅ Initialized {provider_name} consumer (enabled)")
                    logger.debug(f"Consumer added to consumers dict. Total consumers: {len(self.consumers)}")
                else:
                    logger.warning(f"⚠️ {provider_name} consumer disabled or no valid config")
                    logger.warning(f"Config: {config}, max_subscriptions: {config.max_subscriptions if config else 'None'}")
            except Exception as e:
                logger.error(f"❌ Failed to initialize {provider_name}: {e}")
                logger.error(f"Exception type: {type(e).__name__}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
        
        logger.info(f"Consumer initialization completed. Total initialized consumers: {len(self.consumers)}")
        logger.info(f"Initialized consumers: {list(self.consumers.keys())}")
        
        # Consumer 초기화 완료 로그
        log_to_websocket_orchestrator_logs("INFO", f"Consumer initialization completed - {len(self.consumers)} consumers: {', '.join(self.consumers.keys())}")
    
    async def _rebalance_assignments(self, assets: List[Asset]):
        """자산을 Consumer에 최적 할당"""
        logger.info("🔄 Rebalancing asset assignments...")
        
        # 기존 할당 초기화
        old_assignments = dict(self.assignments)
        self.assignments.clear()
        
        # 자산 할당 변경 로그
        log_to_websocket_orchestrator_logs("INFO", f"Asset assignment rebalancing started - clearing {len(old_assignments)} existing assignments")
        
        # 자산을 세분화된 타입으로 분류 (asset_type_id 기반)
        assets_by_type = self._classify_assets_by_detailed_type(assets)
        
        # 각 자산 타입별로 최적 할당
        for asset_type, type_assets in assets_by_type.items():
            await self._assign_assets_by_type(asset_type, type_assets)
        
        self.last_rebalance = datetime.now()
        logger.info(f"✅ Rebalancing completed. {len(self.assignments)} consumers assigned")
    
    def _classify_assets_by_detailed_type(self, assets: List[Asset]) -> Dict[AssetType, List[Asset]]:
        """자산을 세분화된 타입으로 분류 (자산 타입 기반)"""
        assets_by_type: Dict[AssetType, List[Asset]] = {}
        for asset in assets:
            # AssetManager.Asset.asset_type 프로퍼티는 asset_type_id로부터 변환됨
            asset_type = asset.asset_type
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
        
        # Provider-specific filtering
        # STOCK: do not drop ETFs here; we will route via provider filters
        tickers = [asset.ticker for asset in assets]
        fallback_names = [c[0] for c in available_consumers]
        logger.info(f"📊 Assigning {len(tickers)} {asset_type.value} tickers using fallback order: {fallback_names}")
        
        # 균등 분배 또는 Fallback 순서 기반 할당
        if asset_type == AssetType.CRYPTO and len(available_consumers) > 1:
            # 암호화폐의 경우 균등 분배
            await self._assign_crypto_tickers_equally(tickers, available_consumers, asset_type)
        else:
            # 다른 자산 타입은 기존 Fallback 순서 방식 + 제공자별 제한 적용
            foreign_suffixes = ('.SR', '.HK', '.L', '.TO', '.SW', '.KS', '.KQ', '.SI', '.AX', '.SS', '.SZ')
            def finnhub_filter(t: str) -> bool:
                # 미국 비상장(해외거래소 접미사) 제외. 단, BRK.B는 예외로 허용
                if t == 'BRK.B':
                    return True
                return not any(t.endswith(sfx) for sfx in foreign_suffixes)

            if asset_type == AssetType.STOCK and any(name == 'alpaca' for name, _, _ in available_consumers):
                alpaca_allowed = {a.ticker for a in assets if getattr(a, 'has_etf_info', False)}
                finnhub_allowed = {a.ticker for a in assets if getattr(a, 'has_financials', False)}
                etf_tickers = [t for t in tickers if t in alpaca_allowed]
                non_etf_tickers = [t for t in tickers if t not in alpaca_allowed]

                # 1) ETF 대상은 Alpaca 우선으로 배정
                alpaca_first = []
                others = []
                for name, consumer, config in available_consumers:
                    if name == 'alpaca':
                        alpaca_first.append((name, consumer, config))
                    else:
                        others.append((name, consumer, config))
                consumers_alpaca_first = alpaca_first + others

                if etf_tickers:
                    await self._assign_tickers_fallback_order_with_filters(
                        etf_tickers,
                        consumers_alpaca_first,
                        asset_type,
                        provider_filters={
                            'alpaca': (lambda t: True),  # etf_tickers만 전달되므로 True
                            'finnhub': (lambda t: finnhub_filter(t) and (t in finnhub_allowed))
                        }
                    )

                # 2) 비-ETF는 원래 순서(일반적으로 finnhub 우선)로 배정
                if non_etf_tickers:
                    await self._assign_tickers_fallback_order_with_filters(
                        non_etf_tickers,
                        available_consumers,
                        asset_type,
                        provider_filters={
                            'alpaca': (lambda t: False),  # Alpaca는 ETF만
                            'finnhub': (lambda t: finnhub_filter(t) and (t in finnhub_allowed))
                        }
                    )
            else:
                # Alpaca가 없거나 주식 외 타입: 기본 필터만 적용하여 배정
                await self._assign_tickers_fallback_order_with_filters(
                    tickers,
                    available_consumers,
                    asset_type,
                    provider_filters={
                        'finnhub': (lambda t: finnhub_filter(t) if asset_type == AssetType.STOCK else True)
                    }
                )
        
        # 할당 결과 요약
        for provider_name, assignment in self.assignments.items():
            if assignment.assigned_tickers and asset_type in assignment.asset_types:
                config = WebSocketConfig.get_provider_config(provider_name)
                logger.info(f"✅ {provider_name}: {len(assignment.assigned_tickers)} {asset_type.value} tickers assigned ({len(assignment.assigned_tickers)}/{config.max_subscriptions})")
    
    async def _assign_crypto_tickers_equally(self, tickers: List[str], available_consumers: List, asset_type: AssetType):
        """암호화폐 티커를 Consumer들에 페일오버 방식으로 분배 (모든 Consumer가 모든 티커를 받음)"""
        logger.info(f"🔄 페일오버 분배 모드: {len(tickers)}개 암호화폐 티커를 {len(available_consumers)}개 Consumer에 동일하게 분배")
        
        # 모든 Consumer가 모든 티커를 받도록 할당 (페일오버를 위해)
        for provider_name, consumer, config in available_consumers:
            # 용량 제한 확인
            max_capacity = min(config.max_subscriptions, len(tickers))
            if max_capacity <= 0:
                logger.warning(f"⚠️ {provider_name} 용량 부족, 건너뜀")
                continue
            
            # 모든 티커를 할당 (용량 제한 내에서)
            assigned_tickers = tickers[:max_capacity]
            
            if assigned_tickers:
                if provider_name in self.assignments:
                    self.assignments[provider_name].assigned_tickers.extend(assigned_tickers)
                else:
                    self.assignments[provider_name] = ConsumerAssignment(
                        consumer=consumer,
                        assigned_tickers=assigned_tickers,
                        asset_types=[asset_type],
                        priority=config.priority
                    )
                
                logger.info(f"📋 {provider_name}: {len(assigned_tickers)}개 티커 페일오버 분배 ({assigned_tickers})")
        
        # 용량 제한으로 할당되지 않은 티커가 있으면 Fallback으로 처리
        max_capacity_used = max([min(config.max_subscriptions, len(tickers)) for _, _, config in available_consumers], default=0)
        if max_capacity_used < len(tickers):
            remaining_tickers = tickers[max_capacity_used:]
            logger.warning(f"⚠️ {len(remaining_tickers)}개 티커가 용량 제한으로 할당되지 않음, Fallback으로 처리: {remaining_tickers}")
            await self._assign_tickers_fallback_order(remaining_tickers, available_consumers, asset_type)
    
    async def _assign_tickers_fallback_order(self, tickers: List[str], available_consumers: List, asset_type: AssetType):
        """기존 Fallback 순서 기반 할당"""
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

    async def _assign_tickers_fallback_order_with_filters(self, tickers: List[str], available_consumers: List, asset_type: AssetType, provider_filters: Dict[str, callable]):
        """Fallback 할당(제공자별 필터 적용)"""
        for ticker in tickers:
            assigned = False
            for provider_name, consumer, config in available_consumers:
                # provider filter
                filter_func = provider_filters.get(provider_name, lambda t: True)
                try:
                    if not filter_func(ticker):
                        logger.debug(f"⛔ Skipping {ticker} for {provider_name} due to provider filter")
                        continue
                except Exception:
                    pass

                current_assigned = len(self.assignments.get(provider_name, ConsumerAssignment(consumer, [], [], 0)).assigned_tickers)
                if current_assigned < config.max_subscriptions:
                    if provider_name in self.assignments:
                        self.assignments[provider_name].assigned_tickers.append(ticker)
                    else:
                        self.assignments[provider_name] = ConsumerAssignment(
                            consumer=consumer,
                            assigned_tickers=[ticker],
                            asset_types=[asset_type],
                            priority=config.priority
                        )
                    logger.info(f"📋 Assigned {asset_type.value} ticker {ticker} to {provider_name} (filtered, {current_assigned + 1}/{config.max_subscriptions})")
                    assigned = True
                    break
                else:
                    logger.debug(f"⚠️ {provider_name} is full ({current_assigned}/{config.max_subscriptions})")
            if not assigned:
                logger.warning(f"⚠️ No available slots for {asset_type.value} ticker {ticker} - all consumers at capacity or filtered out")
    
    async def _handle_consumer_failure(self, failed_consumer_name: str, failed_tickers: List[str]):
        """Consumer 실패 시 다른 Consumer로 재할당"""
        logger.warning(f"🔄 {failed_consumer_name} 실패, {len(failed_tickers)}개 티커 재할당 시도: {failed_tickers}")
        log_to_websocket_orchestrator_logs("WARNING", f"Consumer {failed_consumer_name} failed, attempting to reallocate {len(failed_tickers)} tickers")
        
        # 실패한 Consumer의 할당 제거
        if failed_consumer_name in self.assignments:
            del self.assignments[failed_consumer_name]
        
        # 티커들의 자산 타입 확인 (암호화폐로 가정)
        from app.services.websocket.base_consumer import AssetType
        
        # Fallback 순서에서 실패한 Consumer 제외하고 재할당
        fallback_order = WebSocketConfig.ASSET_TYPE_FALLBACK.get(AssetType.CRYPTO, [])
        remaining_consumers = [name for name in fallback_order if name != failed_consumer_name]
        
        logger.info(f"🔄 재할당 대상 Consumer: {remaining_consumers}")
        
        # 사용 가능한 Consumer 찾기
        available_consumers = []
        for provider_name in remaining_consumers:
            if provider_name not in self.consumers:
                continue
                
            # 데이터베이스에서 Consumer 활성화 여부 확인
            enabled_key = f"WEBSOCKET_{provider_name.upper()}_ENABLED"
            is_enabled = GLOBAL_APP_CONFIGS.get(enabled_key, "1") == "1"
            
            if not is_enabled:
                logger.debug(f"⏸️ {provider_name} consumer is disabled")
                continue
                
            config = WebSocketConfig.get_provider_config(provider_name)
            if config and config.max_subscriptions > 0 and AssetType.CRYPTO in config.supported_asset_types:
                consumer = self.consumers[provider_name]
                available_consumers.append((provider_name, consumer, config))
                logger.debug(f"✅ {provider_name} available for reallocation")
        
        if available_consumers:
            # Fallback 순서로 재할당
            await self._assign_tickers_fallback_order(failed_tickers, available_consumers, AssetType.CRYPTO)
            
            # 재할당된 Consumer들 시작
            await self._start_consumers()
        else:
            logger.error(f"❌ {failed_consumer_name} 실패 후 재할당할 Consumer가 없음")
            log_to_websocket_orchestrator_logs("ERROR", f"No available consumers for reallocation after {failed_consumer_name} failure")
    
    async def _start_consumers(self):
        """Consumer 시작"""
        logger.info("Starting consumer tasks")
        logger.info(f"Total assignments: {len(self.assignments)}")
        logger.info(f"Assignment details: {[(name, len(assignment.assigned_tickers)) for name, assignment in self.assignments.items()]}")
        
        tasks = []
        
        for provider_name, assignment in self.assignments.items():
            logger.info(f"Processing assignment for {provider_name}")
            logger.debug(f"Assignment details: {assignment}")
            
            if assignment.assigned_tickers:
                logger.info(f"🔧 Creating task for {provider_name} with {len(assignment.assigned_tickers)} tickers")
                logger.debug(f"Assigned tickers: {assignment.assigned_tickers}")
                
                try:
                    logger.debug(f"Creating asyncio task for {provider_name}")
                    task = asyncio.create_task(
                        self._run_consumer(assignment)
                    )
                    tasks.append(task)
                    logger.info(f"🚀 Starting {provider_name} with {len(assignment.assigned_tickers)} tickers")
                    logger.debug(f"Task created successfully for {provider_name}")
                    
                    # Consumer 시작 로그
                    log_to_websocket_orchestrator_logs("INFO", f"Consumer {provider_name} starting with {len(assignment.assigned_tickers)} tickers")
                except Exception as e:
                    logger.error(f"❌ Failed to create task for {provider_name}: {e}")
                    logger.error(f"Exception type: {type(e).__name__}")
                    import traceback
                    logger.error(f"Traceback: {traceback.format_exc()}")
                    
                    # Consumer 시작 실패 로그
                    log_to_websocket_orchestrator_logs("ERROR", f"Consumer {provider_name} failed to start: {e}")
            else:
                logger.warning(f"No tickers assigned to {provider_name}, skipping")
        
        if tasks:
            logger.info(f"🔧 Starting {len(tasks)} consumer tasks")
            logger.debug(f"Task list: {[task.get_name() for task in tasks]}")
            
            try:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                logger.info(f"All {len(tasks)} consumer tasks completed")
                
                for i, result in enumerate(results):
                    if isinstance(result, Exception):
                        logger.error(f"❌ Task {i} failed with exception: {result}")
                        logger.error(f"Exception type: {type(result).__name__}")
                        import traceback
                        logger.error(f"Traceback: {traceback.format_exc()}")
                    else:
                        logger.debug(f"Task {i} completed successfully")
            except Exception as e:
                logger.error(f"❌ Error in asyncio.gather: {e}")
                logger.error(f"Exception type: {type(e).__name__}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
        else:
            logger.warning("No consumer tasks to start")
    
    async def _run_consumer(self, assignment: ConsumerAssignment):
        """Consumer 실행"""
        consumer = assignment.consumer
        tickers = assignment.assigned_tickers
        
        logger.info(f"🔧 Starting _run_consumer for {consumer.client_name} with {len(tickers)} tickers")
        logger.debug(f"Consumer type: {type(consumer).__name__}")
        logger.debug(f"Consumer config: {consumer.config}")
        logger.debug(f"Assigned tickers: {tickers}")
        
        try:
            # 연결
            logger.info(f"🔌 Attempting to connect {consumer.client_name}")
            logger.debug(f"Calling connect() method for {consumer.client_name}")
            
            connect_result = await consumer.connect()
            logger.debug(f"Connect result for {consumer.client_name}: {connect_result}")
            
            if not connect_result:
                logger.error(f"❌ Failed to connect {consumer.client_name}")
                log_to_websocket_orchestrator_logs("ERROR", f"Consumer {consumer.client_name} connection failed")
                await self._handle_consumer_failure(consumer.client_name, tickers)
                return
            
            logger.info(f"✅ {consumer.client_name} connected successfully")
            log_to_websocket_orchestrator_logs("INFO", f"Consumer {consumer.client_name} connected successfully")
            
            # 구독
            logger.info(f"📋 Attempting to subscribe {consumer.client_name} to {len(tickers)} tickers")
            logger.debug(f"Calling subscribe() method for {consumer.client_name}")
            
            subscribe_result = await consumer.subscribe(tickers)
            logger.debug(f"Subscribe result for {consumer.client_name}: {subscribe_result}")
            
            if not subscribe_result:
                logger.error(f"❌ Failed to subscribe {consumer.client_name}")
                log_to_websocket_orchestrator_logs("ERROR", f"Consumer {consumer.client_name} subscription failed")
                await self._handle_consumer_failure(consumer.client_name, tickers)
                return
            
            logger.info(f"✅ {consumer.client_name} connected and subscribed to {len(tickers)} tickers")
            log_to_websocket_orchestrator_logs("INFO", f"Consumer {consumer.client_name} subscribed to {len(tickers)} tickers")
            
            # 실행
            logger.info(f"🚀 Starting run() method for {consumer.client_name}")
            logger.debug(f"Calling run() method for {consumer.client_name}")
            
            await consumer.run()
            
            logger.info(f"✅ {consumer.client_name} run() method completed")
            
        except Exception as e:
            logger.error(f"❌ Error running {consumer.client_name}: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            await self._handle_consumer_failure(consumer.client_name, tickers)
        finally:
            try:
                logger.debug(f"Disconnecting {consumer.client_name}")
                await consumer.disconnect()
                logger.debug(f"Successfully disconnected {consumer.client_name}")
            except Exception as e:
                logger.error(f"❌ Error disconnecting {consumer.client_name}: {e}")
                logger.error(f"Exception type: {type(e).__name__}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
    
    async def _monitoring_loop(self):
        """모니터링 루프"""
        log_to_websocket_orchestrator_logs("INFO", "Monitoring loop started")
        
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
                log_to_websocket_orchestrator_logs("ERROR", f"Monitoring loop error: {e}")
                await asyncio.sleep(30)
        
        log_to_websocket_orchestrator_logs("INFO", "Monitoring loop stopped")
    
    async def _health_check_consumers(self):
        """Consumer 헬스체크"""
        for provider_name, consumer in self.consumers.items():
            try:
                is_healthy = await consumer.health_check()
                if not is_healthy:
                    logger.warning(f"⚠️ {provider_name} health check failed")
                    log_to_websocket_orchestrator_logs("WARNING", f"Consumer {provider_name} health check failed")
            except Exception as e:
                logger.error(f"❌ Health check failed for {provider_name}: {e}")
                log_to_websocket_orchestrator_logs("ERROR", f"Consumer {provider_name} health check error: {e}")
    
    def _should_rebalance(self) -> bool:
        """재조정 필요 여부 확인"""
        if self.last_rebalance is None:
            return True
        
        # 연결이 끊어진 컨슈머가 있으면 즉시 재조정
        for provider_name, consumer in self.consumers.items():
            if not consumer.is_connected and provider_name in self.assignments:
                logger.warning(f"⚠️ {provider_name} disconnected, triggering immediate rebalance")
                log_to_websocket_orchestrator_logs("WARNING", f"Consumer {provider_name} disconnected, triggering immediate rebalance")
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

