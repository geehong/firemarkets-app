"""
SchedulerService: A centralized service for managing and scheduling data collection jobs.
This service uses dependency injection to orchestrate collectors and their dependencies.
"""
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Type

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.system import AppConfiguration
from app.utils.logger import logger
from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager

# --- Import all available collectors ---
from app.collectors.base_collector import BaseCollector
from app.collectors.ohlcv_collector import OHLCVCollector
# from app.collectors.onchain_collector import OnchainCollector  # Temporarily disabled during v2 transition
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
        # "Onchain": {"class": OnchainCollector, "config_key": "is_onchain_collection_enabled"},
        "StockProfile": {"class": StockCollector, "config_key": "is_stock_collection_enabled"},
        "ETFInfo": {"class": ETFCollector, "config_key": "is_etf_collection_enabled"},
        "CryptoInfo": {"class": CryptoDataCollector, "config_key": "is_crypto_collection_enabled"},
        "WorldAssets": {"class": WorldAssetsCollector, "config_key": "is_world_assets_collection_enabled"},
    }

    def __init__(self):
        self.scheduler = BackgroundScheduler(timezone="UTC")
        self._setup_logger()
        
        # --- Dependency Injection Singletons ---
        # These instances are created once and injected into collectors.
        self.config_manager = ConfigManager()
        self.api_manager = ApiStrategyManager()
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
                collector_instance = collector_class(
                    db=db,
                    config_manager=self.config_manager,
                    api_manager=self.api_manager,
                    redis_queue_manager=self.redis_queue_manager,
                )
                # The `collect_with_settings` method in BaseCollector handles all logging.
                loop.run_until_complete(collector_instance.collect_with_settings())
            except Exception as e:
                self.logger.critical(f"Unhandled exception in {collector_class.__name__} runner: {e}", exc_info=True)
            finally:
                db.close()
                loop.close()

        return run_collection_sync

    def setup_jobs(self, run_immediately: bool | None = None):
        """
        Sets up all data collection jobs based on DB configuration.
        This method is now data-driven via JOB_MAPPING.
        """
        if not self.config_manager.is_scheduler_enabled():
            self.logger.warning("Scheduler is globally disabled via configuration. No jobs will be added.")
            return

        self.logger.info("Setting up scheduler jobs...")

        # Get common scheduling configurations
        if run_immediately is None:
            run_immediately = self.config_manager.is_immediate_execution_enabled()
        
        for job_name, meta in self.JOB_MAPPING.items():
            collector_class = meta["class"]
            is_enabled_method = getattr(self.config_manager, meta["config_key"])

            if is_enabled_method():
                # This collector is enabled in the DB, so we schedule it.
                job_func = self._create_collection_function(collector_class)
                job_id = f"{job_name.lower()}_collection_job"
                
                # Here you can add logic to get intervals from ConfigManager for each job type
                # For now, we'll use a placeholder daily schedule.
                self.scheduler.add_job(
                    job_func,
                    'interval',
                    days=1, # TODO: Make this configurable per job via ConfigManager
                    id=job_id,
                    replace_existing=True,
                    misfire_grace_time=3600, # 1 hour
                    next_run_time=datetime.utcnow() if run_immediately else None
                )
                self.logger.info(f"✅ Scheduled job: '{job_id}'")
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

    def start_scheduler(self, run_immediately: bool | None = None):
        """Sets up jobs and starts the scheduler if not already running."""
        if not self.scheduler.running:
            self.setup_jobs(run_immediately=run_immediately)
            self.scheduler.start()
            self.logger.info("Scheduler started successfully.")

    def stop_scheduler(self):
        """Stops the scheduler gracefully."""
        if self.scheduler.running:
            self.scheduler.shutdown()
            self.logger.info("Scheduler shut down successfully.")

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
