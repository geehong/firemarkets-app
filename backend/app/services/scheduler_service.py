"""
SchedulerService: A centralized service for managing and scheduling data collection jobs.
This service uses dependency injection to orchestrate collectors and their dependencies.
"""
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Type

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import SessionLocal
from app.models.asset import AppConfiguration, SchedulerLog
from app.utils.logger import logger
from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager

# --- Import all available collectors ---
from app.collectors.base_collector import BaseCollector
from app.collectors.ohlcv_collector import OHLCVCollector
from app.collectors.onchain_collector import OnchainCollector
from app.collectors.stock_collector import StockCollector
from app.collectors.etf_collector import ETFCollector
from app.collectors.crypto_data_collector import CryptoDataCollector
from app.collectors.world_assets_collector import WorldAssetsCollector
# from app.collectors.index_collector import IndexCollector  # Temporarily disabled
from app.collectors.macrotrends_financials_collector import MacrotrendsFinancialsCollector
from app.collectors.commodity_ohlcv_aggregator_collector import CommodityOHLCVAggregatorCollector
from app.collectors.news_collector import NewsCollector
from app.collectors.rss_collector import RSSCollector
from app.services.news_clustering_service import NewsClusteringService
from app.services.news_ai_agent import NewsAIEditorAgent
from app.models.blog import Post
from app.collectors.fred_collector import FredCollector
from app.collectors.us_backfill_collector import USBackfillCollector


class SchedulerService:
    """Manages the lifecycle and scheduling of all collector jobs."""

    # Maps configuration keys to collector classes and their job metadata.
    # This makes the service data-driven and easy to extend.
    JOB_MAPPING = {
        "OHLCV": {"class": OHLCVCollector, "config_key": "is_ohlcv_collection_enabled"},
        "Onchain": {"class": OnchainCollector, "config_key": "is_onchain_collection_enabled"},
        "StockProfile": {"class": StockCollector, "config_key": "is_stock_collection_enabled"},
        "ETFInfo": {"class": ETFCollector, "config_key": "is_etf_collection_enabled"},
        "CryptoInfo": {"class": CryptoDataCollector, "config_key": "is_crypto_collection_enabled"},
        "WorldAssets": {"class": WorldAssetsCollector, "config_key": "is_world_assets_collection_enabled"},
        "StockFinancialsMacrotrends": {"class": MacrotrendsFinancialsCollector, "config_key": "is_stock_collection_enabled"},
        "CommodityOHLCVAggregator": {"class": CommodityOHLCVAggregatorCollector, "config_key": "is_ohlcv_collection_enabled"},
        "News": {"class": NewsCollector, "config_key": "is_news_collection_enabled"},
        "RSS": {"class": RSSCollector, "config_key": "is_rss_collection_enabled"},
        "Fred": {"class": FredCollector, "config_key": "is_fred_collection_enabled"},
        "USBackfill": {"class": USBackfillCollector, "config_key": "is_ohlcv_collection_enabled"},
    }
    
    # Maps temp.json collector keys to actual job configurations
    COLLECTOR_KEY_MAPPING = {
        "ohlcv_day_clients": {
            "job_key": "OHLCV",
            "config": {
                "scheduled_intervals": ["1d"],
                "asset_type_filter": ["Stocks", "ETFs", "Indices", "Currencies", "Bonds"]
            }
        },
        "ohlcv_intraday_clients": {
            "job_key": "OHLCV",
            "config": {
                "scheduled_intervals": ["1m", "5m", "15m", "30m", "1h", "4h"],
                "asset_type_filter": ["Stocks", "ETFs", "Indices"]
            }
        },
        "crypto_ohlcv_clients": {
            "job_key": "OHLCV",
            "config": {
                "scheduled_intervals": ["1m", "5m", "15m", "30m", "1h", "4h", "1d"],
                "asset_type_filter": ["Crypto"]
            }
        },
        "commodity_ohlcv_clients": {
            "job_key": "OHLCV",
            "config": {
                "scheduled_intervals": ["1d"],
                "asset_type_filter": ["Commodities"]
            }
        },
        "onchain_clients": {
            "job_key": "Onchain",
            "config": {}
        },
        "crypto_clients": {
            "job_key": "CryptoInfo",
            "config": {}
        },
        "etf_clients": {
            "job_key": "ETFInfo",
            "config": {}
        },
        "us_backfill_daily": {
            "job_key": "USBackfill",
            "config": {}
        },
        "stock_profiles_clients": {
            "job_key": "StockProfile",
            "config": {}
        },
        "stock_profiles_fmp_clients": {
            "job_key": "StockProfile",
            "config": {"use_fmp": True}
        },
        "stock_financials_clients": {
            "job_key": "StockProfile",
            "config": {"collect_financials": True}
        },
        "stock_analyst_estimates_clients": {
            "job_key": "StockProfile",
            "config": {"collect_estimates": True}
        },
        "stock_financials_macrotrends_clients": {
            "job_key": "StockFinancialsMacrotrends",
            "config": {}
        },
        "world_assets_clients": {
            "job_key": "WorldAssets",
            "config": {}
        },
        "commodity_ohlcv_aggregator_intraday": {
            "job_key": "CommodityOHLCVAggregator",
            "config": {"intervals": ["1h", "4h"]}
        },
        "commodity_ohlcv_aggregator_daily": {
            "job_key": "CommodityOHLCVAggregator",
            "config": {"intervals": ["1d"]}
        },
        "news_collector_job": {
            "job_key": "News",
            "config": {}
        },
        "rss_collector_job": {
            "job_key": "RSS",
            "config": {}
        },
        "fred_clients": {
            "job_key": "Fred",
            "config": {}
        }
    }

    def __init__(self):
        self.scheduler = BackgroundScheduler(timezone="UTC")
        self._setup_logger()
        
        # --- Dependency Injection Singletons ---
        # Create only loop-agnostic singletons here. ApiStrategyManager creates async
        # clients/locks under the hood, so it must be created within the target event loop.
        self.config_manager = ConfigManager()
        self.redis_queue_manager = RedisQueueManager(config_manager=self.config_manager)
        
        # 스케줄러 시작 시 OHLCV intervals 설정 확인
        try:
            intervals = self.config_manager.get_ohlcv_intervals()
            self.logger.info(f"[SchedulerService] OHLCV intervals 설정 로드: {intervals} (1d 포함 여부: {'1d' in intervals})")
        except Exception as e:
            self.logger.warning(f"[SchedulerService] OHLCV intervals 설정 로드 실패: {e}")

    def _setup_logger(self):
        """Sets up the logger for this service."""
        self.logger = logging.getLogger(__name__)

    def _create_collection_function(self, collector_class: Type[BaseCollector], collector_config: Dict[str, Any] = None):
        """
        Creates a wrapper function to run an async collector from the sync scheduler.
        It handles dependency injection and session management.
        
        Args:
            collector_class: The collector class to instantiate
            collector_config: Optional configuration for the collector (filters, etc.)
        """
        def run_collection_sync():
            # Create a new event loop for this thread.
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            db: Session = SessionLocal()
            start_time = datetime.now()
            job_name = collector_class.__name__
            scheduler_log = None
            
            try:
                # 스케줄러 로그 시작 기록
                scheduler_log = SchedulerLog(
                    job_name=job_name,
                    status="running",
                    start_time=start_time,
                    current_task=f"Starting {job_name} collection"
                )
                db.add(scheduler_log)
                db.commit()
                db.refresh(scheduler_log)
                
                self.logger.info(f"📋 Scheduler log created for {job_name} (ID: {scheduler_log.log_id})")
                
                # Instantiate the collector with all required dependencies.
                # IMPORTANT: ApiStrategyManager must be constructed inside this loop to avoid
                # cross-event-loop Futures/Locks.
                api_manager = ApiStrategyManager(config_manager=self.config_manager)
                collector_instance = collector_class(
                    db=db,
                    config_manager=self.config_manager,
                    api_manager=api_manager,
                    redis_queue_manager=self.redis_queue_manager,
                )
                
                # Apply filters for OHLCVCollector
                if isinstance(collector_instance, OHLCVCollector) and collector_config:
                    scheduled_intervals = collector_config.get("scheduled_intervals")
                    asset_type_filter = collector_config.get("asset_type_filter")
                    if scheduled_intervals or asset_type_filter:
                        collector_instance.set_schedule_config(
                            scheduled_intervals=scheduled_intervals,
                            asset_type_filter=asset_type_filter
                        )
                        self.logger.info(
                            f"Applied filters to {job_name} - intervals: {scheduled_intervals}, "
                            f"asset_types: {asset_type_filter}"
                        )
                
                # The `collect_with_settings` method in BaseCollector handles all logging.
                result = loop.run_until_complete(collector_instance.collect_with_settings())
                
                # 성공 로그 업데이트
                end_time = datetime.now()
                duration = int((end_time - start_time).total_seconds())
                
                if scheduler_log:
                    scheduler_log.status = "completed"
                    scheduler_log.end_time = end_time
                    scheduler_log.duration_seconds = duration
                    scheduler_log.current_task = f"Completed {job_name} collection"
                    
                    # 결과에서 데이터 추출
                    if result and isinstance(result, dict):
                        scheduler_log.assets_processed = result.get('assets_processed', 0)
                        scheduler_log.data_points_added = result.get('data_points_added', 0)
                        scheduler_log.details = {
                            "success": result.get('success', True),
                            "message": result.get('message', 'Collection completed successfully'),
                            "collector_result": result
                        }
                    
                    db.commit()
                    self.logger.info(f"✅ Scheduler log updated for {job_name} - Completed in {duration}s")
                
            except Exception as e:
                self.logger.critical(f"Unhandled exception in {collector_class.__name__} runner: {e}", exc_info=True)
                
                # 실패 로그 업데이트
                end_time = datetime.now()
                duration = int((end_time - start_time).total_seconds())
                
                if scheduler_log:
                    scheduler_log.status = "failed"
                    scheduler_log.end_time = end_time
                    scheduler_log.duration_seconds = duration
                    scheduler_log.error_message = str(e)
                    scheduler_log.current_task = f"Failed {job_name} collection"
                    scheduler_log.details = {
                        "error": str(e),
                        "error_type": type(e).__name__
                    }
                    
                    try:
                        db.commit()
                        self.logger.error(f"❌ Scheduler log updated for {job_name} - Failed after {duration}s")
                    except Exception as commit_error:
                        self.logger.error(f"Failed to update scheduler log: {commit_error}")
                
                # Ensure transaction is rolled back on error
                try:
                    db.rollback()
                except Exception as rollback_error:
                    self.logger.error(f"Failed to rollback transaction: {rollback_error}")
            finally:
                try:
                    db.close()
                except Exception as close_error:
                    self.logger.error(f"Failed to close database session: {close_error}")
                loop.close()

        return run_collection_sync

    def _create_news_pipeline_function(self):
        """
        Creates a sync wrapper for the News AI Pipeline (Cluster -> Analyze -> Save).
        """
        def run_pipeline_sync():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            db: Session = SessionLocal()
            job_name = "NewsAIPipeline"
            
            try:
                self.logger.info(f"[{job_name}] Started")
                
                # Dependencies
                clustering_service = NewsClusteringService()
                ai_agent = None
                try:
                    ai_agent = NewsAIEditorAgent()
                except Exception as e:
                    self.logger.warning(f"[{job_name}] AI Agent init failed: {e}. Skipping AI analysis.")

                async def _pipeline_logic():
                    # 1. Fetch pending raw_news
                    raw_posts = db.query(Post).filter(Post.post_type == 'raw_news', Post.status == 'draft').all()
                    
                    if not raw_posts:
                        self.logger.info(f"[{job_name}] No pending news to process.")
                        return 0

                    self.logger.info(f"[{job_name}] Processing {len(raw_posts)} raw articles.")

                    # 2. Cluster
                    clusters = clustering_service.cluster_posts(raw_posts)
                    processed_count = 0
                    
                    for cluster in clusters:
                        if not cluster:
                            continue
                            
                        # 3. Analyze
                        if ai_agent and len(cluster) >= 1: 
                            try:
                                analysis = await ai_agent.analyze_cluster(cluster)
                                if analysis:
                                    # Mark raw posts as processed only if analysis succeeded
                                    for p in cluster:
                                        p.status = 'archived'
                                    # 4. Save Insight (HTML Format)
                                    # Ensure analysis dict has keys, handle potential missing keys safely
                                    title_ko = analysis.get('title_ko', 'No Title')
                                    title_en = analysis.get('title_en', 'No Title')
                                    
                                    summary_text_ko = analysis.get('summary_ko', '')
                                    analysis_text_ko = analysis.get('analysis_ko', '').replace('\n', '<br>')
                                    
                                    summary_text_en = analysis.get('summary_en', '')
                                    analysis_text_en = analysis.get('analysis_en', '').replace('\n', '<br>')
                                    
                                    # HTML Content Construction: 서술형(Narrative) 스타일로 구성
                                    # 요약문은 문단 처음에 굵게 강조하여 서론 느낌을 주고, 이어서 상세 분석이 나오도록 함
                                    # content_html_ko = f"<h2>{title_ko}</h2><p><strong>{summary_text_ko}</strong></p><p>{analysis_text_ko}</p>"
                                    # content_html_en = f"<h2>{title_en}</h2><p><strong>{summary_text_en}</strong></p><p>{analysis_text_en}</p>"
                                    content_html_ko = f"<p><strong>{summary_text_ko}</strong></p><p>{analysis_text_ko}</p>"
                                    content_html_en = f"<p><strong>{summary_text_en}</strong></p><p>{analysis_text_en}</p>"
                                    
                                    # Aggregate Metadata from Cluster
                                    all_tickers = set()
                                    primary_post = cluster[0]
                                    primary_info = primary_post.post_info or {}
                                    
                                    for p in cluster:
                                        if p.post_info and isinstance(p.post_info, dict):
                                            tickers = p.post_info.get('tickers')
                                            if tickers:
                                                if isinstance(tickers, list):
                                                    all_tickers.update(tickers)
                                                else:
                                                    all_tickers.add(str(tickers))

                                    ai_tickers = analysis.get('tickers', [])
                                    ai_keywords = analysis.get('keywords', [])
                                    ai_tags = analysis.get('tags', [])
                                    
                                    # Merge AI tickers with source tickers
                                    if ai_tickers:
                                        all_tickers.update(ai_tickers)

                                    slug = f"ai-insight-{int(datetime.utcnow().timestamp())}-{processed_count}"
                                    insight_post = Post(
                                        title={"en": title_en, "ko": title_ko},
                                        slug=slug,
                                        description={"ko": summary_text_ko, "en": summary_text_en}, # Description keeps text summary
                                        content=content_html_en, 
                                        content_ko=content_html_ko,
                                        post_type="ai_draft_news", 
                                        status="draft",
                                        post_info={
                                            "url": primary_info.get('url'),
                                            "author": primary_info.get('author'),
                                            "source": primary_info.get('source'),
                                            "tickers": list(all_tickers),
                                            "keywords": ai_keywords,
                                            "tags": ai_tags,
                                            "image_url": primary_info.get('image_url'),
                                            "analysis": analysis,
                                            "source_articles": [p.slug for p in cluster]
                                        },
                                        published_at=datetime.utcnow()
                                    )
                                    db.add(insight_post)
                                    processed_count += 1
                            except Exception as e:
                                self.logger.error(f"[{job_name}] AI analysis failed for cluster: {e}")
                    
                    db.commit()
                    return processed_count

                processed = loop.run_until_complete(_pipeline_logic())
                self.logger.info(f"[{job_name}] Completed. Generated {processed} AI insights.")
                
            except Exception as e:
                self.logger.error(f"[{job_name}] Failed: {e}", exc_info=True)
                db.rollback()
            finally:
                db.close()
                loop.close()
        
        return run_pipeline_sync

    def _create_cleanup_function(self):
        """
        Creates a sync wrapper for the daily cleanup job.
        """
        def run_cleanup_sync():
            from app.services.cleanup_service import CleanupService
            
            db: Session = SessionLocal()
            try:
                self.logger.info("[CleanupJob] Starting daily cleanup...")
                count = CleanupService.cleanup_old_raw_news(db)
                self.logger.info(f"[CleanupJob] Raw news deleted: {count}")
                
                ai_count = CleanupService.cleanup_old_ai_news(db, retention_days=2)
                self.logger.info(f"[CleanupJob] AI news deleted: {ai_count}")
                
                self.logger.info(f"[CleanupJob] Completed. Total items deleted: {count + ai_count}")
            except Exception as e:
                self.logger.error(f"[CleanupJob] Failed: {e}", exc_info=True)
            finally:
                db.close()
        
        return run_cleanup_sync

    def _create_view_refresh_function(self):
        """
        Creates a sync wrapper to refresh materialized views in the background.
        """
        def run_refresh_sync():
            db: Session = SessionLocal()
            try:
                self.logger.info("[ViewRefreshJob] Refreshing mv_treemap_performance...")
                db.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_treemap_performance"))
                db.commit()
                self.logger.info("[ViewRefreshJob] Successfully refreshed mv_treemap_performance.")
            except Exception as e:
                self.logger.error(f"[ViewRefreshJob] Failed to refresh view: {e}")
                db.rollback()
            finally:
                db.close()
        
        return run_refresh_sync

    def _create_quant_seasonality_function(self):
        """
        Creates a sync wrapper for the daily quant seasonality calculation.
        """
        def run_quant_seasonality_sync():
            from app.services.quant_seasonality_engine import QuantSeasonalityEngine
            from app.models.asset import Asset
            import json

            db: Session = SessionLocal()
            try:
                self.logger.info("[QuantSeasonalityJob] Starting daily calculation...")
                engine = QuantSeasonalityEngine(db)
                
                # Resolve BTC asset (same as API)
                btc_asset = db.query(Asset).filter(Asset.ticker == 'BTCUSDT').first()
                if not btc_asset:
                    btc_asset = db.query(Asset).filter(Asset.ticker == 'BTC').first()
                
                if not btc_asset:
                    self.logger.error("[QuantSeasonalityJob] BTC asset not found")
                    return

                # Compare assets (SPY, QQQ, GLD)
                compare_tickers = ["SPY", "QQQ", "GLD"]
                compare_assets = {}
                for ticker in compare_tickers:
                    asset = db.query(Asset).filter(Asset.ticker == ticker).first()
                    if asset:
                        compare_assets[ticker] = asset.asset_id
                
                # Run full analysis
                result = engine.run_full_analysis(btc_asset.asset_id, compare_assets)
                
                # Save to Redis for high-speed API access
                async def save_to_redis(res):
                    client = await self.redis_queue_manager._ensure_client()
                    await client.set("quant:seasonality:btc", json.dumps(res), ex=86400)

                loop.run_until_complete(save_to_redis(result))
                self.logger.info("[QuantSeasonalityJob] Successfully saved result to Redis.")
                
                self.logger.info("[QuantSeasonalityJob] Completed successfully.")
            except Exception as e:
                self.logger.error(f"[QuantSeasonalityJob] Failed: {e}", exc_info=True)
            finally:
                db.close()

        return run_quant_seasonality_sync

    def setup_jobs(self, test_mode: bool = False):
        """
        Sets up all data collection jobs based on DB configuration.
        Priority:
          1) If unified SCHEDULER_CONFIG (JSON) is present, use it to create cron jobs
          2) Else fallback to legacy interval-based jobs (test vs normal)
        """
        if not self.config_manager.is_scheduler_enabled():
            self.logger.warning("Scheduler is globally disabled via configuration. No jobs will be added.")
            return

        # --- Unified scheduler config path ---
        try:
            raw = self.config_manager.get_scheduler_config()
        except Exception:
            raw = None

        if raw:
            self.logger.info("Unified SCHEDULER_CONFIG detected. Scheduling cron-based jobs.")
            try:
                import json
                cfg = json.loads(raw)
            except Exception as e:
                self.logger.error(f"Failed to parse SCHEDULER_CONFIG. Falling back. Error: {e}")
                cfg = None

            if cfg:
                tz = cfg.get("timezone") or "UTC"
                # Recreate scheduler with provided timezone if needed
                if str(self.scheduler.timezone) != tz:
                    try:
                        # Shutdown old scheduler if running and create a new one with tz
                        if self.scheduler.running:
                            self.scheduler.shutdown()
                        self.scheduler = BackgroundScheduler(timezone=tz)
                    except Exception as e:
                        self.logger.warning(f"Failed to rebuild scheduler with timezone {tz}: {e}. Using existing timezone.")

                schedules = cfg.get("schedules") or []
                for schedule in schedules:
                    collectors = schedule.get("collectors") or []
                    day_of_week = schedule.get("day_of_week")
                    hour = schedule.get("hour")
                    minute = schedule.get("minute")

                    # Handle array of hours and minutes - create separate jobs for each combination
                    hours_to_schedule = hour if isinstance(hour, list) else [hour]
                    minutes_to_schedule = minute if isinstance(minute, list) else [minute]
                    
                    for current_hour in hours_to_schedule:
                        for current_minute in minutes_to_schedule:
                            trigger = CronTrigger(day_of_week=day_of_week, hour=current_hour, minute=current_minute, timezone=self.scheduler.timezone)

                            for name in collectors:
                                # Ensure each scheduled time gets a unique job id so multiple times don't overwrite
                                # the same logical job (replace_existing=True would otherwise replace prior times).
                                # Example id: world_assets_clients_2200_cron_job
                                try:
                                    hour_str = f"{int(current_hour):02d}" if current_hour is not None else "xx"
                                    minute_str = f"{int(current_minute):02d}" if current_minute is not None else "yy"
                                except Exception:
                                    # If hour/minute are wildcards (e.g., "*"), keep them as-is but sanitized
                                    hour_str = str(current_hour).replace(":", "_").replace(" ", "_") if current_hour is not None else "xx"
                                    minute_str = str(current_minute).replace(":", "_").replace(" ", "_") if current_minute is not None else "yy"

                                job_id = f"{name}_{hour_str}{minute_str}_cron_job"
                                # Map collector name group to actual collector classes present in JOB_MAPPING
                                # We schedule via wrapper to call each enabled collector in that logical group
                                def _make_group_runner(group_name: str):
                                    def _run_group():
                                        loop = asyncio.new_event_loop()
                                        asyncio.set_event_loop(loop)
                                        db: Session = SessionLocal()
                                        try:
                                            # ApiStrategyManager must be per-event-loop to avoid cross-loop issues
                                            api_manager = ApiStrategyManager(config_manager=self.config_manager)
                                            tasks = []
                                            # Determine which collectors to run from group name
                                            mapping = {
                                                "ohlcv_day_clients": ["OHLCV"],
                                                "ohlcv_intraday_clients": ["OHLCV"],
                                                "crypto_ohlcv_clients": ["OHLCV"],
                                                "commodity_ohlcv_clients": ["OHLCV"],
                                                "stock_profiles_clients": ["StockProfile"],
                                                "stock_profiles_fmp_clients": ["StockProfile"],  # ⭐ FMP 전용 프로필 수집 (일요일)
                                                "crypto_clients": ["CryptoInfo"],
                                                "onchain_clients": ["Onchain"],
                                                "stock_financials_clients": [],
                                                "stock_financials_macrotrends_clients": ["StockFinancialsMacrotrends"],
                                                "stock_analyst_estimates_clients": [],
                                                "etf_clients": ["ETFInfo"],
                                                "world_assets_clients": ["WorldAssets"],
                                                "commodity_ohlcv_aggregator_intraday": ["CommodityOHLCVAggregator"],
                                                "commodity_ohlcv_aggregator_intraday": ["CommodityOHLCVAggregator"],
                                                "commodity_ohlcv_aggregator_daily": ["CommodityOHLCVAggregator"],
                                                "fred_clients": ["Fred"],
                                            }
                                            job_names = mapping.get(group_name, [])
                                            for job_name in job_names:
                                                meta = self.JOB_MAPPING.get(job_name)
                                                if not meta:
                                                    continue
                                                is_enabled_method = getattr(self.config_manager, meta["config_key"])
                                                if not is_enabled_method():
                                                    continue
                                                collector_class = meta["class"]
                                                collector_instance = collector_class(
                                                    db=db,
                                                    config_manager=self.config_manager,
                                                    api_manager=api_manager,
                                                    redis_queue_manager=self.redis_queue_manager,
                                                )
                                                
                                                # StockCollector인 경우 스케줄 그룹에 따라 데이터 타입 제한 설정
                                                if collector_class.__name__ == "StockCollector" and hasattr(collector_instance, 'set_schedule_config'):
                                                    if group_name == "stock_profiles_clients":
                                                        # 프로필만 수집
                                                        collector_instance.set_schedule_config(scheduled_data_types=["profile"])
                                                        self.logger.info(f"Setting scheduled_data_types=['profile'] for {group_name}")
                                                    elif group_name == "stock_profiles_fmp_clients":
                                                        # FMP 프로필만 수집
                                                        collector_instance.set_schedule_config(scheduled_data_types=["profile"])
                                                        collector_instance.use_fmp_clients = True
                                                        self.logger.info(f"Setting scheduled_data_types=['profile'] and use_fmp_clients=True for {group_name}")
                                                    elif group_name == "stock_financials_clients":
                                                        # 재무만 수집
                                                        collector_instance.set_schedule_config(scheduled_data_types=["financials"])
                                                        self.logger.info(f"Setting scheduled_data_types=['financials'] for {group_name}")
                                                    elif group_name == "stock_analyst_estimates_clients":
                                                        # 추정치만 수집
                                                        collector_instance.set_schedule_config(scheduled_data_types=["estimates"])
                                                        self.logger.info(f"Setting scheduled_data_types=['estimates'] for {group_name}")
                                                
                                                # OHLCVCollector인 경우 스케줄 그룹에 따라 interval 필터링 설정
                                                if collector_class.__name__ == "OHLCVCollector" and hasattr(collector_instance, 'set_schedule_config'):
                                                    if group_name == "ohlcv_day_clients":
                                                        # 일봉 데이터만 수집 (1d, 1w, 1mo 등)
                                                        collector_instance.set_schedule_config(scheduled_intervals=["1d", "1w", "1mo", "1month"])
                                                        self.logger.info(f"Setting scheduled_intervals=['1d', '1w', '1mo', '1month'] for {group_name}")
                                                    elif group_name == "ohlcv_intraday_clients":
                                                        # 인트라데이 데이터만 수집 (1m, 5m, 15m, 30m, 1h, 4h 등)
                                                        collector_instance.set_schedule_config(scheduled_intervals=["1m", "5m", "15m", "30m", "1h", "4h"])
                                                        self.logger.info(f"Setting scheduled_intervals=['1m', '5m', '15m', '30m', '1h', '4h'] for {group_name}")
                                                    elif group_name == "crypto_ohlcv_clients":
                                                        # 암호화폐 OHLCV 데이터 수집 (1m, 5m, 15m, 30m, 1h, 4h, 1d)
                                                        collector_instance.set_schedule_config(
                                                            scheduled_intervals=["1m", "5m", "15m", "30m", "1h", "4h", "1d"],
                                                            asset_type_filter=["Crypto"]
                                                        )
                                                        self.logger.info(f"Setting scheduled_intervals=['1m', '5m', '15m', '30m', '1h', '4h', '1d'] and asset_type_filter=['Crypto'] for {group_name}")
                                                    elif group_name == "commodity_ohlcv_clients":
                                                        # 원자재 OHLCV 데이터 수집 (1d)
                                                        collector_instance.set_schedule_config(
                                                            scheduled_intervals=["1d"],
                                                            asset_type_filter=["Commodities"]
                                                        )
                                                        self.logger.info(f"Setting scheduled_intervals=['1d'] and asset_type_filter=['Commodities'] for {group_name}")
                                                
                                                # CommodityOHLCVAggregatorCollector인 경우 집계할 interval 설정
                                                if collector_class.__name__ == "CommodityOHLCVAggregatorCollector" and hasattr(collector_instance, 'set_schedule_config'):
                                                    if group_name == "commodity_ohlcv_aggregator_intraday":
                                                        collector_instance.set_schedule_config(intervals=["1h", "4h"])
                                                        self.logger.info(f"Setting aggregation intervals=['1h', '4h'] for {group_name}")
                                                    elif group_name == "commodity_ohlcv_aggregator_daily":
                                                        collector_instance.set_schedule_config(intervals=["1d"])
                                                        self.logger.info(f"Setting aggregation intervals=['1d'] for {group_name}")
                                                
                                                # stock_profiles_fmp_clients 그룹인 경우 FMP 클라이언트 사용 설정 (위에서 이미 처리됨)
                                                if group_name == "stock_profiles_fmp_clients" and hasattr(collector_instance, 'use_fmp_clients'):
                                                    if not collector_instance.use_fmp_clients:  # 위에서 설정하지 않은 경우에만
                                                        collector_instance.use_fmp_clients = True
                                                        self.logger.info(f"Setting use_fmp_clients=True for {collector_instance.__class__.__name__}")
                                                
                                                tasks.append(collector_instance.collect_with_settings())
                                            if tasks:
                                                loop.run_until_complete(asyncio.gather(*tasks))
                                        except Exception as e:
                                            self.logger.error(f"Group runner error for {group_name}: {e}", exc_info=True)
                                            # Ensure transaction is rolled back on error
                                            try:
                                                db.rollback()
                                            except Exception as rollback_error:
                                                self.logger.error(f"Failed to rollback transaction: {rollback_error}")
                                        finally:
                                            try:
                                                db.close()
                                            except Exception as close_error:
                                                self.logger.error(f"Failed to close database session: {close_error}")
                                            loop.close()
                                    return _run_group

                                self.scheduler.add_job(
                                    _make_group_runner(name),
                                    trigger,
                                    id=job_id,
                                    replace_existing=True,
                                    misfire_grace_time=3600,
                                )
                                self.logger.info(f"✅ Scheduled cron job: '{job_id}' ({day_of_week} {current_hour:02d}:{current_minute:02d} {self.scheduler.timezone})")

                # Always add heartbeat
                self.scheduler.add_job(self._update_heartbeat, 'interval', minutes=1, id='scheduler_heartbeat', replace_existing=True)
                self.logger.info("✅ Scheduled job: 'scheduler_heartbeat'")
                
                # --- News Pipeline Job ---
                if self.config_manager.is_news_collection_enabled():
                    self.scheduler.add_job(
                        self._create_news_pipeline_function(),
                        'interval',
                        minutes=15, 
                        id='news_ai_pipeline',
                        replace_existing=True
                    )
                    self.logger.info("✅ Scheduled job: 'news_ai_pipeline' (15m)")

                # --- Daily Cleanup Job ---
                # Default to 00:30 (midnight) in the scheduler's timezone
                self.scheduler.add_job(
                    self._create_cleanup_function(),
                    'cron',
                    hour=0,
                    minute=30,
                    id='daily_raw_news_cleanup',
                    replace_existing=True
                )
                self.logger.info(f"✅ Scheduled job: 'daily_raw_news_cleanup' (Daily at 00:30 {self.scheduler.timezone})")

                # --- View Refresh Job (Treemap) ---
                # Refresh every 15 minutes to keep it relatively fresh
                self.scheduler.add_job(
                    self._create_view_refresh_function(),
                    'interval',
                    minutes=15,
                    id='treemap_view_refresh',
                    replace_existing=True
                )
                self.logger.info("✅ Scheduled job: 'treemap_view_refresh' (15m)")

                if self.config_manager.is_ohlcv_collection_enabled():
                    self.scheduler.add_job(
                        self._create_collection_function(USBackfillCollector),
                        'cron',
                        hour=21,
                        minute=0,
                        id='daily_us_backfill_collection_job',
                        replace_existing=True
                    )
                    self.logger.info(f"✅ Scheduled job: 'daily_us_backfill_collection_job' (Daily at 06:00 KST / 21:00 UTC)")

                # --- Daily Quant Seasonality Job ---
                # Run at 01:00 UTC (10:00 KST) after US market close
                self.scheduler.add_job(
                    self._create_quant_seasonality_function(),
                    'cron',
                    hour=1,
                    minute=0,
                    id='daily_quant_seasonality_job',
                    replace_existing=True
                )
                self.logger.info(f"✅ Scheduled job: 'daily_quant_seasonality_job' (Daily at 01:00 UTC)")

                return

        # --- Legacy interval-based path ---
        mode_text = "TEST MODE" if test_mode else "NORMAL MODE"
        self.logger.info(f"Setting up scheduler jobs in {mode_text}...")

        # 테스트 모드: 모든 스케줄을 동일한 간격으로 설정 (3분)
        test_interval_minutes = 3  # 하드코딩된 테스트 간격 (원하는 시간으로 변경 가능)
        
        for job_name, meta in self.JOB_MAPPING.items():
            collector_class = meta["class"]
            is_enabled_method = getattr(self.config_manager, meta["config_key"])

            if is_enabled_method():
                # This collector is enabled in the DB, so we schedule it.
                job_func = self._create_collection_function(collector_class)
                job_id = f"{job_name.lower()}_collection_job"
                
                if test_mode:
                    # 테스트 모드: 모든 스케줄을 동일한 간격으로 설정 (수동 실행만)
                    self.scheduler.add_job(
                        job_func,
                        'interval',
                        minutes=test_interval_minutes,
                        id=job_id,
                        replace_existing=True,
                        misfire_grace_time=3600, # 1 hour
                        # next_run_time 제거 - 수동 실행만 가능
                    )
                    self.logger.info(f"✅ Scheduled job: '{job_id}' (TEST MODE: {test_interval_minutes}분 간격, 수동 실행만)")
                else:
                    # 일반 모드: 모든 컬렉터 1일 간격으로 통일
                    self.scheduler.add_job(
                        job_func,
                        'interval',
                        days=1,
                        id=job_id,
                        replace_existing=True,
                        misfire_grace_time=3600, # 1 hour
                    )
                    self.logger.info(f"✅ Scheduled job: '{job_id}' (NORMAL MODE: 24시간 간격)")
            else:
                self.logger.info(f"❌ Job for '{job_name}' is disabled via configuration.")

        # --- System Jobs ---
        self.scheduler.add_job(self._update_heartbeat, 'interval', minutes=1, id='scheduler_heartbeat')
        self.logger.info("✅ Scheduled job: 'scheduler_heartbeat'")

        # --- News Pipeline Job ---
        # --- News Pipeline Job ---
        if self.config_manager.is_news_collection_enabled():
            self.scheduler.add_job(
                self._create_news_pipeline_function(),
                'interval',
                minutes=15, 
                id='news_ai_pipeline',
                replace_existing=True
            )
            self.logger.info("✅ Scheduled job: 'news_ai_pipeline' (15m)")

        # --- Daily Cleanup Job ---
        # Run at 00:30 KST. If scheduler is UTC, this is 15:30 UTC previous day.
        # But here we use 'cron' with scheduler's timezone.
        self.scheduler.add_job(
            self._create_cleanup_function(),
            'cron',
            hour=0,
            minute=30,
            id='daily_raw_news_cleanup',
            replace_existing=True
        )
        self.logger.info(f"✅ Scheduled job: 'daily_raw_news_cleanup' (Daily at 00:30 {self.scheduler.timezone})")

        # --- View Refresh Job (Treemap) ---
        # Refresh every 15 minutes to keep it relatively fresh
        self.scheduler.add_job(
            self._create_view_refresh_function(),
            'interval',
            minutes=15,
            id='treemap_view_refresh',
            replace_existing=True
        )
        self.logger.info("✅ Scheduled job: 'treemap_view_refresh' (15m)")

        # --- Daily US Stock Backfill Job ---
        # Run at 06:00 KST / 21:00 UTC
        if self.config_manager.is_ohlcv_collection_enabled():
            self.scheduler.add_job(
                self._create_collection_function(USBackfillCollector),
                'cron',
                hour=21,
                minute=0,
                id='daily_us_backfill_collection_job',
                replace_existing=True
            )
            self.logger.info(f"✅ Scheduled job: 'daily_us_backfill_collection_job' (Daily at 06:00 KST / 21:00 UTC)")

    def _update_heartbeat(self):
        """Writes a heartbeat to the DB every minute to show the scheduler is alive."""
        db = SessionLocal()
        try:
            config = db.query(AppConfiguration).filter(AppConfiguration.config_key == 'scheduler_heartbeat').first()
            timestamp = datetime.utcnow().isoformat()
            if config:
                config.config_value = timestamp
            else:
                config = AppConfiguration(config_key='scheduler_heartbeat', config_value=timestamp)
                db.add(config)
            db.commit()
            self.logger.debug(f"Scheduler heartbeat updated: {timestamp}")
        except Exception as e:
            self.logger.error(f"Failed to update heartbeat: {e}", exc_info=True)
            db.rollback()
        finally:
            db.close()


    def schedule_jobs_from_config(self):
        """Schedule jobs from temp.json configuration."""
        try:
            import json
            config_json = self.config_manager.get_scheduler_config()
            if not config_json:
                self.logger.warning("No scheduler config found in temp.json")
                return
            
            config = json.loads(config_json)
            schedules = config.get("schedules", [])
            timezone = config.get("timezone", "UTC")
            
            for schedule in schedules:
                hour = schedule.get("hour")
                minute = schedule.get("minute", 0)
                day_of_week = schedule.get("day_of_week", "*")
                collectors = schedule.get("collectors", [])
                
                # Convert hour list to comma-separated string for CronTrigger
                if isinstance(hour, list):
                    hour_str = ",".join(str(h) for h in hour)
                else:
                    hour_str = str(hour) if hour is not None else "*"

                # Convert minute list to comma-separated string for CronTrigger
                if isinstance(minute, list):
                    minute_str = ",".join(str(m) for m in minute)
                else:
                    minute_str = str(minute) if minute is not None else "0"
                
                for collector_key in collectors:
                    # Map temp.json key to actual job configuration
                    if collector_key not in self.COLLECTOR_KEY_MAPPING:
                        self.logger.warning(f"Unknown collector key in temp.json: {collector_key}")
                        continue
                    
                    mapping = self.COLLECTOR_KEY_MAPPING[collector_key]
                    job_key = mapping["job_key"]
                    collector_config = mapping.get("config", {})
                    
                    if job_key not in self.JOB_MAPPING:
                        self.logger.warning(f"No JOB_MAPPING for: {job_key}")
                        continue
                    
                    collector_class = self.JOB_MAPPING[job_key]["class"]
                    
                    # Create job function with filters
                    job_func = self._create_collection_function(collector_class, collector_config)
                    
                    # Create unique job ID (use first hour if list)
                    hour_id = hour[0] if isinstance(hour, list) else hour
                    job_id = f"{collector_key}_{hour_id}_{minute}"
                    
                    # Schedule the job
                    # Schedule the job
                    self.scheduler.add_job(
                        job_func,
                        trigger=CronTrigger(
                            hour=hour_str,
                            minute=minute_str,
                            day_of_week=day_of_week,
                            timezone=timezone
                        ),
                        id=job_id,
                        replace_existing=True,
                        misfire_grace_time=300  # 5 minutes
                    )
                    
                    self.logger.info(
                        f"✅ Scheduled {collector_key} ({job_key}) at {hour_str}:{minute_str} "
                        f"({day_of_week}) with filters: {collector_config}"
                    )
            
            # Always add heartbeat job
            self.scheduler.add_job(self._update_heartbeat, 'interval', minutes=1, id='scheduler_heartbeat', replace_existing=True)
            self.logger.info("✅ Scheduled job: 'scheduler_heartbeat'")
            
            # --- News Pipeline Job ---
            if self.config_manager.is_news_collection_enabled():
                self.scheduler.add_job(
                    self._create_news_pipeline_function(),
                    'interval',
                    minutes=15, 
                    id='news_ai_pipeline',
                    replace_existing=True
                )
                self.logger.info("✅ Scheduled job: 'news_ai_pipeline' (15m)")

            # --- Daily Cleanup Job ---
            self.scheduler.add_job(
                self._create_cleanup_function(),
                'cron',
                hour=0,
                minute=30,
                id='daily_raw_news_cleanup',
                replace_existing=True
            )
            self.logger.info(f"✅ Scheduled job: 'daily_raw_news_cleanup' (Daily at 00:30 {timezone})")

            # --- Daily US Stock Backfill Job ---
            # Run at 06:00 KST / 21:00 UTC
            if self.config_manager.is_ohlcv_collection_enabled():
                self.scheduler.add_job(
                    self._create_collection_function(USBackfillCollector),
                    'cron',
                    hour=21,
                    minute=0,
                    id='daily_us_backfill_collection_job',
                    replace_existing=True,
                    timezone=timezone
                )
                self.logger.info(f"✅ Scheduled job: 'daily_us_backfill_collection_job' (Daily at 06:00 KST / 21:00 UTC)")

            # --- View Refresh Job (Treemap) ---
            # Always add view refresh job to ensure data consistency
            self.scheduler.add_job(
                self._create_view_refresh_function(),
                'interval',
                minutes=15,
                id='treemap_view_refresh',
                replace_existing=True
            )
            self.logger.info("✅ Scheduled job: 'treemap_view_refresh' (15m)")
            
            self.logger.info(f"✅ Scheduled {len(self.scheduler.get_jobs())} jobs from temp.json config")
            
        except Exception as e:
            self.logger.error(f"Failed to schedule jobs from config: {e}", exc_info=True)

    def start_scheduler(self, test_mode: bool = False):
        """Sets up jobs and starts the scheduler if not already running."""
        if not self.scheduler.running:
            # Try to use temp.json config first, fallback to setup_jobs
            try:
                self.schedule_jobs_from_config()
                self.logger.info("Using temp.json configuration for scheduling")
            except Exception as e:
                self.logger.warning(f"Failed to load temp.json config, using default setup_jobs: {e}")
                self.setup_jobs(test_mode=test_mode)
            
            self.scheduler.start()
            mode_text = "TEST MODE" if test_mode else "NORMAL MODE"
            self.logger.info(f"Scheduler started successfully in {mode_text}.")

    def stop_scheduler(self):
        """Stops the scheduler gracefully."""
        if self.scheduler.running:
            self.scheduler.shutdown()
            self.logger.info("Scheduler shut down successfully.")

    async def start_all_jobs(self) -> Dict:
        """Starts all scheduled jobs."""
        try:
            if not self.scheduler.running:
                self.scheduler.start()
            return {"success": True, "message": "All jobs started successfully"}
        except Exception as e:
            return {"success": False, "message": f"Failed to start jobs: {str(e)}"}

    async def stop_all_jobs(self) -> Dict:
        """Stops all scheduled jobs."""
        try:
            if self.scheduler.running:
                self.scheduler.shutdown()
            return {"success": True, "message": "All jobs stopped successfully"}
        except Exception as e:
            return {"success": False, "message": f"Failed to stop jobs: {str(e)}"}

    async def run_all_collections_once(self) -> Dict:
        """관리자 수동 실행: 모든 데이터 수집 작업을 즉시 1번씩 실행"""
        try:
            results = []
            
            for job_name, meta in self.JOB_MAPPING.items():
                collector_class = meta["class"]
                is_enabled_method = getattr(self.config_manager, meta["config_key"])
                
                if is_enabled_method():
                    # 각 컬렉터마다 별도의 세션 사용
                    db = SessionLocal()
                    try:
                        # ApiStrategyManager는 이벤트 루프 내에서 생성되어야 함
                        api_manager = ApiStrategyManager(config_manager=self.config_manager)
                        
                        # Collector 인스턴스 생성 및 실행
                        collector_instance = collector_class(
                            db=db,
                            config_manager=self.config_manager,
                            api_manager=api_manager,
                            redis_queue_manager=self.redis_queue_manager,
                        )
                        
                        # 비동기 실행
                        result = await collector_instance.collect_with_settings()
                        results.append({
                            "collector": job_name,
                            "success": result.get("success", False),
                            "message": result.get("message", "Completed"),
                            "duration": result.get("duration", 0)
                        })
                        
                        self.logger.info(f"✅ Manual execution completed: {job_name}")
                        
                    except Exception as e:
                        self.logger.error(f"❌ Manual execution failed for {job_name}: {e}")
                        # Ensure transaction is rolled back on error
                        try:
                            db.rollback()
                        except Exception as rollback_error:
                            self.logger.error(f"Failed to rollback transaction: {rollback_error}")
                        results.append({
                            "collector": job_name,
                            "success": False,
                            "message": f"Error: {str(e)}",
                            "duration": 0
                        })
                    finally:
                        try:
                            db.close()
                        except Exception as close_error:
                            self.logger.error(f"Failed to close database session: {close_error}")
                else:
                    results.append({
                        "collector": job_name,
                        "success": False,
                        "message": "Disabled via configuration",
                        "duration": 0
                    })
            
            return {
                "success": True,
                "message": "All collections executed manually",
                "results": results
            }
            
        except Exception as e:
            self.logger.error(f"Failed to run manual collections: {e}")
            return {"success": False, "message": f"Failed to run manual collections: {str(e)}"}

    def get_status(self) -> Dict:
        """Returns the current status of the scheduler."""
        jobs_info = []
        for job in self.scheduler.get_jobs():
            jobs_info.append({
                "id": job.id,
                "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None
            })
        return {
            "is_running": self.scheduler.running,
            "job_count": len(jobs_info),
            "jobs": jobs_info
        }

# --- Global Singleton Instance ---
scheduler_service = SchedulerService()
