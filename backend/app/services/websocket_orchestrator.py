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
from app.services.websocket.tiingo_consumer import TiingoWSConsumer
from app.services.websocket.alpaca_consumer import AlpacaWSConsumer
from app.services.websocket.binance_consumer import BinanceWSConsumer
from app.services.websocket.coinbase_consumer import CoinbaseWSConsumer
from app.services.websocket.swissquote_consumer import SwissquoteWSConsumer
from app.core.websocket_logging import orchestrator_logger
from app.core.database import SessionLocal
from sqlalchemy import text
from app.services.websocket.twelvedata_consumer import TwelveDataWSConsumer
from app.services.websocket.polygon_consumer import PolygonWSConsumer
from app.core.config import GLOBAL_APP_CONFIGS

logger = logging.getLogger(__name__)

def log_to_websocket_orchestrator_logs(log_level: str, message: str, details: str = None):
    """WebSocket 오케스트레이터 로그를 websocket_orchestrator_logs 테이블에 저장"""
    db = SessionLocal()
    try:
        # 상세 정보가 있으면 메시지에 포함
        full_message = message
        if details:
            full_message = f"{message} | Details: {details}"
            
        db.execute(text("""
            INSERT INTO websocket_orchestrator_logs (log_level, message, created_at)
            VALUES (:log_level, :message, NOW())
        """), {
            'log_level': log_level,
            'message': full_message
        })
        db.commit()
        logger.debug(f"WebSocket orchestrator log saved: {log_level} - {full_message}")
    except Exception as e:
        logger.error(f"Failed to save WebSocket orchestrator log: {e}")
        db.rollback()
    finally:
        db.close()

def log_consumer_connection_attempt(consumer_name: str, attempt: int, max_attempts: int, error: str = None):
    """Consumer 연결 시도 로그"""
    if error:
        log_to_websocket_orchestrator_logs(
            "WARNING", 
            f"Consumer {consumer_name} connection attempt {attempt}/{max_attempts} failed",
            f"Error: {error}"
        )
    else:
        log_to_websocket_orchestrator_logs(
            "INFO", 
            f"Consumer {consumer_name} connection attempt {attempt}/{max_attempts}",
            "Connection attempt started"
        )

def log_ticker_reallocation(failed_consumer: str, ticker_count: int, target_consumers: list):
    """Ticker 재할당 로그"""
    log_to_websocket_orchestrator_logs(
        "WARNING",
        f"Consumer {failed_consumer} failed, attempting to reallocate {ticker_count} tickers",
        f"Target consumers: {', '.join(target_consumers)}"
    )

def log_api_key_fallback(consumer_name: str, failed_key: str, new_key: str, reason: str):
    """API 키 fallback 로그"""
    log_to_websocket_orchestrator_logs(
        "INFO",
        f"Consumer {consumer_name} API key fallback triggered",
        f"Failed key: {failed_key[:10]}... → New key: {new_key[:10]}... | Reason: {reason}"
    )

def log_consumer_status_change(consumer_name: str, old_status: str, new_status: str, details: str = None):
    """Consumer 상태 변화 로그"""
    log_to_websocket_orchestrator_logs(
        "INFO",
        f"Consumer {consumer_name} status changed: {old_status} → {new_status}",
        details
    )

def log_error_with_traceback(consumer_name: str, error: Exception, context: str = None):
    """에러와 스택 트레이스 로그"""
    import traceback
    traceback_str = traceback.format_exc()
    details = f"Context: {context} | Traceback: {traceback_str}" if context else f"Traceback: {traceback_str}"
    
    log_to_websocket_orchestrator_logs(
        "ERROR",
        f"Consumer {consumer_name} error: {str(error)}",
        details
    )

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
            'alpaca': AlpacaWSConsumer,
            'binance': BinanceWSConsumer,
            'coinbase': CoinbaseWSConsumer,
            'swissquote': SwissquoteWSConsumer,
            'twelvedata': TwelveDataWSConsumer,
            'polygon': PolygonWSConsumer
        }
        # Conditionally register tiingo only if explicitly enabled
        # if GLOBAL_APP_CONFIGS.get('WEBSOCKET_TIINGO_ENABLED', '0') == '1':
        #     self.consumer_classes['tiingo'] = TiingoWSConsumer
        # else:
        #     logger.info("tiingo consumer registration skipped (WEBSOCKET_TIINGO_ENABLED!=1)")
        logger.info("tiingo consumer registration disabled (commented out)")
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
                
                # Handle both boolean and string values for enabled status
                enabled_value = GLOBAL_APP_CONFIGS.get(enabled_key, True)
                if isinstance(enabled_value, bool):
                    is_enabled = enabled_value
                else:
                    is_enabled = str(enabled_value).lower() in ["1", "true", "yes"]
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
        """특정 자산 타입의 자산들을 Consumer에 할당 (선호 Consumer 우선, Fallback 순서 적용)"""
        
        # 1. 선호 Consumer가 있는 자산들을 먼저 처리
        preferred_assets = []
        default_assets = []
        
        for asset in assets:
            if asset.preferred_websocket_consumer:
                # 사용자의 요청에 따라 Polygon에서 VTI, AGG는 선호를 무시하고 일반 ETF 할당 순서(fallback)를 따르게 함
                if asset.preferred_websocket_consumer == 'polygon' and asset.ticker.upper() in ['VTI', 'AGG']:
                    default_assets.append(asset)
                else:
                    preferred_assets.append(asset)
            else:
                default_assets.append(asset)

        
        # 선호 Consumer가 있는 자산들 처리
        if preferred_assets:
            await self._assign_preferred_assets(preferred_assets, asset_type)
        
        # 나머지 자산들은 기존 Fallback 순서로 처리
        if default_assets:
            await self._assign_default_assets(default_assets, asset_type)
    
    async def _assign_preferred_assets(self, assets: List[Asset], asset_type: AssetType):
        """선호 Consumer가 지정된 자산들을 할당"""
        # 선호 Consumer별로 그룹화
        preferred_groups = {}
        for asset in assets:
            consumer_name = asset.preferred_websocket_consumer
            if consumer_name not in preferred_groups:
                preferred_groups[consumer_name] = []
            preferred_groups[consumer_name].append(asset)
        
        for consumer_name, consumer_assets in preferred_groups.items():
            # Consumer가 존재하고 활성화되어 있는지 확인
            if consumer_name not in self.consumers:
                logger.warning(f"⚠️ Preferred consumer '{consumer_name}' not available for {[a.ticker for a in consumer_assets]}")
                continue
            
            # Consumer 활성화 여부 확인
            enabled_key = f"WEBSOCKET_{consumer_name.upper()}_ENABLED"
            # Handle both boolean and string values for enabled status
            enabled_value = GLOBAL_APP_CONFIGS.get(enabled_key, True)
            if isinstance(enabled_value, bool):
                is_enabled = enabled_value
            else:
                is_enabled = str(enabled_value).lower() in ["1", "true", "yes"]
            if not is_enabled:
                logger.warning(f"⚠️ Preferred consumer '{consumer_name}' is disabled for {[a.ticker for a in consumer_assets]}")
                continue
            
            # Consumer가 해당 자산 타입을 지원하는지 확인
            config = WebSocketConfig.get_provider_config(consumer_name)
            if not config or asset_type not in config.supported_asset_types:
                logger.warning(f"⚠️ Preferred consumer '{consumer_name}' doesn't support {asset_type.value} for {[a.ticker for a in consumer_assets]}")
                continue
            
            # 선호 Consumer에 할당
            tickers = [asset.ticker for asset in consumer_assets]
            # 선호 Consumer만 포함된 consumers 리스트 생성
            preferred_consumer_config = WebSocketConfig.get_provider_config(consumer_name)
            if preferred_consumer_config:
                preferred_consumers = [(consumer_name, self.consumers[consumer_name], preferred_consumer_config)]
                await self._assign_tickers_fallback_order(tickers, preferred_consumers, asset_type)
                logger.info(f"🎯 Assigned {len(tickers)} assets to preferred consumer '{consumer_name}': {tickers}")
    
    async def _assign_default_assets(self, assets: List[Asset], asset_type: AssetType):
        """기본 Fallback 순서로 자산들을 할당"""
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
            # Handle both boolean and string values for enabled status
            enabled_value = GLOBAL_APP_CONFIGS.get(enabled_key, True)
            if isinstance(enabled_value, bool):
                is_enabled = enabled_value
            else:
                is_enabled = str(enabled_value).lower() in ["1", "true", "yes"]
            
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
        
        # Strong type guards: restrict providers per asset type
        # STOCK: allow finnhub, alpaca, twelvedata, polygon (tiingo excluded due to bandwidth)
        # ETF: allow alpaca, twelvedata, polygon (finnhub unsupported; tiingo excluded due to bandwidth)
        def _filter_by_type(consumers_list):
            if asset_type == AssetType.STOCK:
                allowed = { 'finnhub', 'alpaca', 'twelvedata', 'polygon' }
            elif asset_type == AssetType.ETF:
                allowed = { 'alpaca', 'twelvedata', 'polygon' }
            else:
                return consumers_list
            filtered = [(n, c, cfg) for (n, c, cfg) in consumers_list if n in allowed]
            if not filtered:
                logger.warning(f"⚠️ No allowed providers remaining for {asset_type.value} after type-guard filter")
            return filtered or consumers_list

        available_consumers = _filter_by_type(available_consumers)

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
            
            def polygon_filter(t: str) -> bool:
                # VTI, AGG 제외 (사용자 요청: 429 에러 방지)
                return t.upper() not in ['VTI', 'AGG']


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
                            'finnhub': (lambda t: finnhub_filter(t) and (t in finnhub_allowed)),
                            'polygon': (lambda t: polygon_filter(t))
                        }
                    )


                # 2) 비-ETF는 원래 순서(일반적으로 finnhub 우선)로 배정
                if non_etf_tickers:
                    await self._assign_tickers_fallback_order_with_filters(
                        non_etf_tickers,
                        _filter_by_type(available_consumers),
                        asset_type,
                        provider_filters={
                            'alpaca': (lambda t: True),  # Alpaca도 주식 지원 허용 (Finnhub 가득 찼을 때 대비)
                            'finnhub': (lambda t: finnhub_filter(t) and (t in finnhub_allowed)),
                            'polygon': (lambda t: polygon_filter(t))
                        }
                    )

            else:
                # Alpaca가 없거나 주식 외 타입: 기본 필터만 적용하여 배정
                await self._assign_tickers_fallback_order_with_filters(
                    tickers,
                    _filter_by_type(available_consumers),
                    asset_type,
                    provider_filters={
                        'finnhub': (lambda t: finnhub_filter(t) if asset_type == AssetType.STOCK else True),
                        'polygon': (lambda t: polygon_filter(t))
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
            logger.warning(f"⚠️ {len(remaining_tickers)}개 티커가 용량 제한으로 할당되지 않음: {remaining_tickers}")
            # 재귀 호출 대신 로그만 남김 (용량 제한으로 할당 불가)
    
    async def _assign_tickers_fallback_order(self, tickers: List[str], available_consumers: List, asset_type: AssetType):
        """기존 Fallback 순서 기반 할당"""
        # Enforce type-guarded providers per asset_type
        def _filter_by_type(consumers_list):
            if asset_type == AssetType.STOCK:
                allowed = { 'finnhub', 'alpaca', 'twelvedata', 'polygon' }
            elif asset_type == AssetType.ETF:
                allowed = { 'alpaca', 'twelvedata', 'polygon' }
            else:
                return consumers_list
            filtered = [(n, c, cfg) for (n, c, cfg) in consumers_list if n in allowed]
            return filtered or consumers_list

        available_consumers = _filter_by_type(available_consumers)

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
        
        # 상세한 실패 로그
        log_ticker_reallocation(
            failed_consumer_name, 
            len(failed_tickers), 
            [ticker[:10] + "..." if len(ticker) > 10 else ticker for ticker in failed_tickers[:5]]
        )
        
        # 실패한 Consumer의 할당 제거 및 정리
        if failed_consumer_name in self.assignments:
            old_assignment = self.assignments[failed_consumer_name]
            del self.assignments[failed_consumer_name]
            logger.info(f"🗑️ Removed assignment for failed consumer {failed_consumer_name}: {len(old_assignment.assigned_tickers)} tickers")
            
            # 실패한 Consumer 정리
            await self._cleanup_failed_consumer(failed_consumer_name, old_assignment.consumer)
        
        # 티커들의 자산 타입 확인
        from app.services.websocket.base_consumer import AssetType
        
        # 기본적으로 STOCK으로 가정하거나, 첫 번째 티커의 타입을 추정
        # 더 정확하려면 AssetManager 등을 통해 각 티커의 실제 타입을 조회해야 함
        # 여기서는 실패한 Consumer가 지원하던 주요 타입을 사용하거나 기본값 사용
        fallback_asset_type = AssetType.STOCK
        if failed_consumer_name in ['coinbase', 'binance']:
            fallback_asset_type = AssetType.CRYPTO
        elif failed_consumer_name in ['alpaca', 'polygon']:
            # ETF 또는 STOCK일 가능성이 높음. 
            # Alpaca 실패 시 대부분 ETF/STOCK이므로 STOCK fallback을 사용
            fallback_asset_type = AssetType.STOCK 
            if failed_tickers and any(t in ['VTI', 'AGG', 'SPY', 'QQQ'] for t in failed_tickers):
                fallback_asset_type = AssetType.ETF
        elif failed_consumer_name == 'twelvedata':
            fallback_asset_type = AssetType.STOCK

        # Fallback 순서에서 실패한 Consumer 제외하고 재할당
        fallback_order = WebSocketConfig.ASSET_TYPE_FALLBACK.get(fallback_asset_type, [])


        remaining_consumers = [name for name in fallback_order if name != failed_consumer_name]
        
        logger.info(f"🔄 재할당 대상 Consumer: {remaining_consumers}")
        log_to_websocket_orchestrator_logs(
            "INFO", 
            f"Consumer failure reallocation started",
            f"Failed: {failed_consumer_name} | Tickers: {len(failed_tickers)} | Available: {remaining_consumers}"
        )
        
        # 사용 가능한 Consumer 찾기
        available_consumers = []
        disabled_consumers = []
        unsupported_consumers = []
        
        for provider_name in remaining_consumers:
            if provider_name not in self.consumers:
                logger.warning(f"⚠️ {provider_name} consumer not initialized")
                continue
                
            # 데이터베이스에서 Consumer 활성화 여부 확인
            enabled_key = f"WEBSOCKET_{provider_name.upper()}_ENABLED"
            # Handle both boolean and string values for enabled status
            enabled_value = GLOBAL_APP_CONFIGS.get(enabled_key, True)
            if isinstance(enabled_value, bool):
                is_enabled = enabled_value
            else:
                is_enabled = str(enabled_value).lower() in ["1", "true", "yes"]
            
            if not is_enabled:
                disabled_consumers.append(provider_name)
                logger.debug(f"⏸️ {provider_name} consumer is disabled")
                continue
                
            config = WebSocketConfig.get_provider_config(provider_name)
            if config and config.max_subscriptions > 0 and fallback_asset_type in config.supported_asset_types:
                consumer = self.consumers[provider_name]
                available_consumers.append((provider_name, consumer, config))
                logger.debug(f"✅ {provider_name} available for reallocation (max: {config.max_subscriptions})")
            else:
                unsupported_consumers.append(provider_name)
                logger.warning(f"⚠️ {provider_name} not suitable for {fallback_asset_type.value} reallocation")

        
        # 상세한 Consumer 상태 로그
        log_to_websocket_orchestrator_logs(
            "INFO",
            f"Consumer availability analysis completed",
            f"Available: {[c[0] for c in available_consumers]} | Disabled: {disabled_consumers} | Unsupported: {unsupported_consumers}"
        )
        
        if available_consumers:
            # Fallback 순서로 재할당
            logger.info(f"🔄 Starting reallocation to {len(available_consumers)} available consumers")
            await self._assign_tickers_fallback_order(failed_tickers, available_consumers, fallback_asset_type)

            
            # 재할당된 Consumer들 시작
            logger.info(f"🚀 Starting reallocated consumers")
            await self._start_consumers()
            
            # 재할당 완료 로그
            log_to_websocket_orchestrator_logs(
                "INFO",
                f"Consumer failure reallocation completed",
                f"Failed: {failed_consumer_name} | Reallocated to: {[c[0] for c in available_consumers]} | Tickers: {len(failed_tickers)}"
            )
        else:
            logger.error(f"❌ {failed_consumer_name} 실패 후 재할당할 Consumer가 없음")
            log_to_websocket_orchestrator_logs(
                "ERROR", 
                f"No available consumers for reallocation after {failed_consumer_name} failure",
                f"Disabled: {disabled_consumers} | Unsupported: {unsupported_consumers} | Total tickers lost: {len(failed_tickers)}"
            )
    
    async def _start_consumers(self):
        """Consumer 시작"""
        logger.info("Starting consumer tasks")
        logger.info(f"Total assignments: {len(self.assignments)}")
        logger.info(f"Assignment details: {[(name, len(assignment.assigned_tickers)) for name, assignment in self.assignments.items()]}")
        
        # Consumer 시작 통계 로그
        total_tickers = sum(len(assignment.assigned_tickers) for assignment in self.assignments.values())
        log_to_websocket_orchestrator_logs(
            "INFO",
            f"Consumer startup initiated",
            f"Total consumers: {len(self.assignments)} | Total tickers: {total_tickers}"
        )
        
        tasks = []
        skipped_consumers = []
        failed_consumers = []
        
        for provider_name, assignment in self.assignments.items():
            logger.info(f"Processing assignment for {provider_name}")
            logger.debug(f"Assignment details: {assignment}")
            
            if assignment.assigned_tickers:
                # Consumer 상태 확인 및 조율
                consumer = assignment.consumer
                is_running = getattr(consumer, 'is_running', False)
                is_running_task = getattr(consumer, '_is_running_task', False)
                is_connected = getattr(consumer, 'is_connected', False)
                
                # 이미 실행 중이면 중복 시작 방지
                if is_running or is_running_task:
                    # 연결 상태도 확인하여 재연결이 필요한지 판단
                    if not is_connected:
                        logger.warning(f"⚠️ {provider_name} is running but not connected, allowing restart")
                        # 연결되지 않은 상태면 재시작 허용
                    else:
                        logger.info(f"⏭️ Skipping start for {provider_name}: already running and connected")
                        skipped_consumers.append(provider_name)
                        log_consumer_status_change(provider_name, "stopped", "running", "Already running and connected, skipping restart")
                        continue
                    
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
                    log_to_websocket_orchestrator_logs(
                        "INFO", 
                        f"Consumer {provider_name} starting with {len(assignment.assigned_tickers)} tickers",
                        f"Tickers: {assignment.assigned_tickers[:5]}{'...' if len(assignment.assigned_tickers) > 5 else ''}"
                    )
                    log_consumer_status_change(provider_name, "stopped", "starting", f"Starting with {len(assignment.assigned_tickers)} tickers")
                    
                except Exception as e:
                    logger.error(f"❌ Failed to create task for {provider_name}: {e}")
                    logger.error(f"Exception type: {type(e).__name__}")
                    import traceback
                    logger.error(f"Traceback: {traceback.format_exc()}")
                    
                    failed_consumers.append(provider_name)
                    # Consumer 시작 실패 로그
                    log_error_with_traceback(provider_name, e, f"Failed to create task for {provider_name}")
                    log_consumer_status_change(provider_name, "stopped", "failed", f"Task creation failed: {str(e)}")
            else:
                logger.warning(f"No tickers assigned to {provider_name}, skipping")
                skipped_consumers.append(provider_name)
                log_to_websocket_orchestrator_logs(
                    "WARNING",
                    f"Consumer {provider_name} skipped",
                    "No tickers assigned"
                )
        
        if tasks:
            logger.info(f"🔧 Starting {len(tasks)} consumer tasks")
            logger.debug(f"Task list: {[task.get_name() for task in tasks]}")
            
            # Consumer 시작 통계 로그
            log_to_websocket_orchestrator_logs(
                "INFO",
                f"Consumer tasks execution started",
                f"Starting: {len(tasks)} | Skipped: {len(skipped_consumers)} | Failed: {len(failed_consumers)}"
            )
            
            try:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                logger.info(f"All {len(tasks)} consumer tasks completed")
                
                # 결과 분석
                successful_tasks = 0
                failed_tasks = []
                
                for i, result in enumerate(results):
                    if isinstance(result, Exception):
                        failed_tasks.append((i, result))
                        logger.error(f"❌ Task {i} failed with exception: {result}")
                        logger.error(f"Exception type: {type(result).__name__}")
                        import traceback
                        logger.error(f"Traceback: {traceback.format_exc()}")
                        
                        # 개별 태스크 실패 로그
                        log_error_with_traceback(f"Task_{i}", result, f"Consumer task {i} execution failed")
                    else:
                        successful_tasks += 1
                        logger.debug(f"Task {i} completed successfully")
                
                # Consumer 실행 완료 통계 로그
                log_to_websocket_orchestrator_logs(
                    "INFO",
                    f"Consumer tasks execution completed",
                    f"Successful: {successful_tasks} | Failed: {len(failed_tasks)} | Skipped: {len(skipped_consumers)}"
                )
                
                # 완료된 Task들 정리
                for task in tasks:
                    if not task.done():
                        task.cancel()
                        try:
                            await task
                        except asyncio.CancelledError:
                            pass
                
            except Exception as e:
                logger.error(f"❌ Error in asyncio.gather: {e}")
                logger.error(f"Exception type: {type(e).__name__}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                
                # asyncio.gather 실패 로그
                log_error_with_traceback("asyncio.gather", e, "Error in consumer tasks execution")
        else:
            logger.warning("No consumer tasks to start")
            log_to_websocket_orchestrator_logs(
                "WARNING",
                f"No consumer tasks to start",
                f"Skipped: {skipped_consumers} | Failed: {failed_consumers}"
            )
    
    async def _run_consumer(self, assignment: ConsumerAssignment):
        """Consumer 실행"""
        consumer = assignment.consumer
        tickers = assignment.assigned_tickers
        
        logger.info(f"🔧 Starting _run_consumer for {consumer.client_name} with {len(tickers)} tickers")
        logger.debug(f"Consumer type: {type(consumer).__name__}")
        logger.debug(f"Consumer config: {consumer.config}")
        logger.debug(f"Assigned tickers: {tickers}")
        
        # Consumer 실행 시작 로그
        log_consumer_status_change(consumer.client_name, "starting", "connecting", f"Starting with {len(tickers)} tickers")
        
        try:
            # 연결
            logger.info(f"🔌 Attempting to connect {consumer.client_name}")
            logger.debug(f"Calling connect() method for {consumer.client_name}")
            
            connect_result = await consumer.connect()
            logger.debug(f"Connect result for {consumer.client_name}: {connect_result}")
            
            if not connect_result:
                logger.error(f"❌ Failed to connect {consumer.client_name}")
                log_to_websocket_orchestrator_logs(
                    "ERROR", 
                    f"Consumer {consumer.client_name} connection failed",
                    f"Tickers: {tickers[:5]}{'...' if len(tickers) > 5 else ''}"
                )
                log_consumer_status_change(consumer.client_name, "connecting", "failed", "Connection failed")
                await self._handle_consumer_failure(consumer.client_name, tickers)
                return
            
            logger.info(f"✅ {consumer.client_name} connected successfully")
            log_to_websocket_orchestrator_logs(
                "INFO", 
                f"Consumer {consumer.client_name} connected successfully",
                f"Connection established"
            )
            log_consumer_status_change(consumer.client_name, "connecting", "subscribing", "Connection successful")
            
            # 구독
            logger.info(f"📋 Attempting to subscribe {consumer.client_name} to {len(tickers)} tickers")
            logger.debug(f"Calling subscribe() method for {consumer.client_name}")
            
            subscribe_result = await consumer.subscribe(tickers)
            logger.debug(f"Subscribe result for {consumer.client_name}: {subscribe_result}")
            
            if not subscribe_result:
                logger.error(f"❌ Failed to subscribe {consumer.client_name}")
                log_to_websocket_orchestrator_logs(
                    "ERROR", 
                    f"Consumer {consumer.client_name} subscription failed",
                    f"Tickers: {tickers[:5]}{'...' if len(tickers) > 5 else ''}"
                )
                log_consumer_status_change(consumer.client_name, "subscribing", "failed", "Subscription failed")
                await self._handle_consumer_failure(consumer.client_name, tickers)
                return
            
            logger.info(f"✅ {consumer.client_name} connected and subscribed to {len(tickers)} tickers")
            log_to_websocket_orchestrator_logs(
                "INFO", 
                f"Consumer {consumer.client_name} subscribed to {len(tickers)} tickers",
                f"Tickers: {tickers[:5]}{'...' if len(tickers) > 5 else ''}"
            )
            log_consumer_status_change(consumer.client_name, "subscribing", "running", f"Subscribed to {len(tickers)} tickers")
            
            # 실행
            logger.info(f"🚀 Starting run() method for {consumer.client_name}")
            logger.debug(f"Calling run() method for {consumer.client_name}")
            
            await consumer.run()
            
            logger.info(f"✅ {consumer.client_name} run() method completed")
            log_consumer_status_change(consumer.client_name, "running", "completed", "Consumer run completed successfully")
            
        except Exception as e:
            logger.error(f"❌ Error running {consumer.client_name}: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Consumer 실행 중 에러 로그
            log_error_with_traceback(consumer.client_name, e, f"Consumer {consumer.client_name} execution failed")
            log_consumer_status_change(consumer.client_name, "running", "failed", f"Execution failed: {str(e)}")
            
            await self._handle_consumer_failure(consumer.client_name, tickers)
        finally:
            # Consumer가 정상적으로 실행 중이면 disconnect하지 않음 (재연결 허용)
            if not getattr(consumer, 'is_running', False):
                try:
                    logger.debug(f"Disconnecting {consumer.client_name} (not running)")
                    await consumer.disconnect()
                    logger.debug(f"Successfully disconnected {consumer.client_name}")
                    log_consumer_status_change(consumer.client_name, "running", "disconnected", "Consumer disconnected")
                except Exception as e:
                    logger.error(f"❌ Error disconnecting {consumer.client_name}: {e}")
                    logger.error(f"Exception type: {type(e).__name__}")
                    import traceback
                    logger.error(f"Traceback: {traceback.format_exc()}")
                    
                    # Consumer 연결 해제 에러 로그
                    log_error_with_traceback(consumer.client_name, e, f"Consumer {consumer.client_name} disconnect failed")
            else:
                logger.info(f"⏭️ Skipping disconnect for {consumer.client_name} (still running, allowing reconnection)")
    
    async def _cleanup_failed_consumer(self, consumer_name: str, consumer):
        """실패한 Consumer 정리"""
        try:
            logger.info(f"🧹 Cleaning up failed consumer: {consumer_name}")
            
            # Consumer 상태 정리
            if hasattr(consumer, 'is_running'):
                consumer.is_running = False
            if hasattr(consumer, '_is_running_task'):
                consumer._is_running_task = False
            if hasattr(consumer, 'is_connected'):
                consumer.is_connected = False
            
            # Consumer 연결 해제
            try:
                await consumer.disconnect()
                logger.info(f"✅ Successfully disconnected failed consumer: {consumer_name}")
            except Exception as e:
                logger.warning(f"⚠️ Error disconnecting failed consumer {consumer_name}: {e}")
            
            # Consumer 리소스 정리
            if hasattr(consumer, '_ws') and consumer._ws:
                consumer._ws = None
            if hasattr(consumer, 'websocket') and consumer.websocket:
                consumer.websocket = None
            
            # 실패한 Consumer 로그
            log_to_websocket_orchestrator_logs(
                "INFO", 
                f"Failed consumer {consumer_name} cleaned up",
                f"Consumer resources released and state reset"
            )
            
        except Exception as e:
            logger.error(f"❌ Error cleaning up failed consumer {consumer_name}: {e}")
            log_to_websocket_orchestrator_logs(
                "ERROR", 
                f"Failed consumer {consumer_name} cleanup error: {e}",
                f"Cleanup failed but continuing"
            )
    
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
        """Consumer 헬스체크 - 재연결과 조율"""
        for provider_name, consumer in self.consumers.items():
            try:
                # Consumer 상태 확인
                is_running = getattr(consumer, 'is_running', False)
                is_connected = getattr(consumer, 'is_connected', False)
                
                # 실행 중이지만 연결되지 않은 경우
                if is_running and not is_connected:
                    logger.warning(f"⚠️ {provider_name} is running but not connected - allowing internal reconnection")
                    log_to_websocket_orchestrator_logs(
                        "WARNING", 
                        f"Consumer {provider_name} running but disconnected",
                        f"Allowing internal reconnection logic to handle"
                    )
                    continue  # 내부 재연결 로직에 맡김
                
                # 헬스체크 실행
                is_healthy = await consumer.health_check()
                if not is_healthy:
                    logger.warning(f"⚠️ {provider_name} health check failed")
                    log_to_websocket_orchestrator_logs("WARNING", f"Consumer {provider_name} health check failed")
                    
                    # 헬스체크 실패 시 Consumer가 실행 중이면 내부 재연결에 맡김
                    if is_running:
                        logger.info(f"🔄 {provider_name} health check failed but running - letting internal reconnection handle")
                        continue
                    
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

