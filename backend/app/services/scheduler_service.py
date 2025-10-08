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

from app.core.database import SessionLocal
from app.models.asset import AppConfiguration
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
    }

    def __init__(self):
        self.scheduler = BackgroundScheduler(timezone="UTC")
        self._setup_logger()
        
        # --- Dependency Injection Singletons ---
        # Create only loop-agnostic singletons here. ApiStrategyManager creates async
        # clients/locks under the hood, so it must be created within the target event loop.
        self.config_manager = ConfigManager()
        self.redis_queue_manager = RedisQueueManager(config_manager=self.config_manager)

    def _setup_logger(self):
        """Sets up the logger for this service."""
        self.logger = logging.getLogger(__name__)

    def _create_collection_function(self, collector_class: Type[BaseCollector]):
        """
        Creates a wrapper function to run an async collector from the sync scheduler.
        It handles dependency injection and session management.
        """
        def run_collection_sync():
            # Create a new event loop for this thread.
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            db: Session = SessionLocal()
            try:
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
                # The `collect_with_settings` method in BaseCollector handles all logging.
                loop.run_until_complete(collector_instance.collect_with_settings())
            except Exception as e:
                self.logger.critical(f"Unhandled exception in {collector_class.__name__} runner: {e}", exc_info=True)
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
                                                "crypto_clients": ["CryptoInfo"],
                                                "onchain_clients": ["Onchain"],
                                                "stock_financials_clients": [],
                                                "stock_analyst_estimates_clients": [],
                                                "etf_clients": ["ETFInfo"],
                                                "world_assets_clients": ["WorldAssets"],
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

    def start_scheduler(self, test_mode: bool = False):
        """Sets up jobs and starts the scheduler if not already running."""
        if not self.scheduler.running:
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
