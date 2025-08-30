"""
SchedulerService: 스케줄러 관리를 위한 중앙화된 서비스 클래스
"""
import asyncio
import logging
from datetime import datetime
from typing import Dict, Optional, List
from apscheduler.schedulers.background import BackgroundScheduler

from ..core.database import SessionLocal
from ..models.system import SchedulerLog, AppConfiguration
from ..models.world_assets import ScrapingLogs
from ..utils.logger import logger

class SchedulerService:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self._setup_logger()
    
    def _setup_logger(self):
        """로거 설정"""
        self.logger = logging.getLogger(__name__)
    
    def _update_heartbeat(self):
        """1분마다 스케줄러의 생존 신호를 DB에 기록합니다."""
        db = SessionLocal()
        try:
            config = db.query(AppConfiguration).filter(AppConfiguration.config_key == 'scheduler_heartbeat').first()
            timestamp = datetime.utcnow().isoformat()
            if config:
                config.config_value = timestamp
            else:
                config = AppConfiguration(
                    config_key='scheduler_heartbeat', 
                    config_value=timestamp,
                    data_type='string',
                    is_active=True
                )
                db.add(config)
            db.commit()
            self.logger.info(f"Scheduler heartbeat updated: {timestamp}")
        except Exception as e:
            self.logger.error(f"Failed to update heartbeat: {e}")
        finally:
            db.close()

    def _create_collection_function(self, collector_class, job_name: str):
        """수집기 실행 함수를 생성합니다."""
        def run_collection_sync():
            from ..collectors import OHLCVCollector, OnchainCollector, StockCollector, ETFCollector, TechnicalCollector, CryptoDataCollector, WorldAssetsCollector
            
            start_time = datetime.now()
            db = SessionLocal()
            
            # 스케줄러 로그 생성
            scheduler_log = SchedulerLog(
                job_name=job_name,
                start_time=start_time,
                status="running"
            )
            db.add(scheduler_log)
            
            # 스크래핑 로그 생성
            scraping_log = ScrapingLogs(
                source=f"{collector_class.__name__}",
                status="running",
                started_at=start_time
            )
            db.add(scraping_log)
            db.commit()
            
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                collector = collector_class()
                result = loop.run_until_complete(collector.collect_with_settings())
                
                # 성공 로그 업데이트
                end_time = datetime.now()
                duration = (end_time - start_time).total_seconds()
                
                # 스케줄러 로그 업데이트
                scheduler_log.end_time = end_time
                scheduler_log.duration_seconds = int(duration)
                scheduler_log.status = "completed"
                scheduler_log.assets_processed = result.get("processed_assets", 0) if result else 0
                scheduler_log.data_points_added = result.get("total_added_records", 0) if result else 0
                
                # 스크래핑 로그 업데이트
                scraping_log.status = "success"
                scraping_log.records_processed = result.get("processed_assets", 0) if result else 0
                scraping_log.records_successful = result.get("total_added_records", 0) if result else 0
                scraping_log.execution_time_seconds = duration
                scraping_log.completed_at = end_time
                
                db.commit()
                
            except Exception as e:
                # 실패 로그 업데이트
                end_time = datetime.now()
                duration = (end_time - start_time).total_seconds()
                
                # 스케줄러 로그 업데이트
                scheduler_log.end_time = end_time
                scheduler_log.duration_seconds = int(duration)
                scheduler_log.status = "failed"
                scheduler_log.error_message = str(e)
                
                # 스크래핑 로그 업데이트
                scraping_log.status = "failed"
                scraping_log.error_message = str(e)
                scraping_log.execution_time_seconds = duration
                scraping_log.completed_at = end_time
                
                db.commit()
                self.logger.error(f"Error in {job_name}: {e}", exc_info=True)
            finally:
                loop.close()
                db.close()
        
        return run_collection_sync

    def setup_jobs(self, run_immediately=False):
        """모든 데이터 수집 작업을 스케줄러에 등록합니다."""
        from ..collectors import OHLCVCollector, OnchainCollector, StockCollector, ETFCollector, TechnicalCollector, CryptoDataCollector, WorldAssetsCollector
        from ..core.config import GLOBAL_APP_CONFIGS
        
        try:
            # 데이터베이스에서 설정 가져오기
            db = SessionLocal()
            try:
                frequent_interval_config = db.query(AppConfiguration).filter(
                    AppConfiguration.config_key == "DATA_COLLECTION_INTERVAL_MINUTES"
                ).first()
                frequent_interval_minutes = int(frequent_interval_config.config_value) if frequent_interval_config else 240
                
                daily_interval_config = db.query(AppConfiguration).filter(
                    AppConfiguration.config_key == "DATA_COLLECTION_INTERVAL_DAILY"
                ).first()
                daily_interval_days = int(daily_interval_config.config_value) if daily_interval_config else 30
                
                immediate_execution_config = db.query(AppConfiguration).filter(
                    AppConfiguration.config_key == "ENABLE_IMMEDIATE_EXECUTION"
                ).first()
                enable_immediate_execution = immediate_execution_config.config_value.lower() == 'true' if immediate_execution_config else False
            finally:
                db.close()
            
            self.logger.info(f"Setting up scheduler with immediate execution: {enable_immediate_execution}")
            
            # 시간 단위를 올바르게 처리
            if frequent_interval_minutes >= 1440:  # 24시간 이상
                frequent_interval_hours = frequent_interval_minutes // 60
                frequent_interval_minutes = frequent_interval_minutes % 60
                use_hours = True
            else:
                frequent_interval_hours = 0
                use_hours = False
            
            self.logger.info(f"Frequent interval: {frequent_interval_hours} hours, {frequent_interval_minutes} minutes")
            
            # OHLCV 데이터 수집 (자주 수집)
            ohlcv_func = self._create_collection_function(OHLCVCollector, "ohlcvcollector_collection")
            if use_hours:
                self.scheduler.add_job(
                    ohlcv_func,
                    'interval',
                    hours=frequent_interval_hours,
                    minutes=frequent_interval_minutes,
                    id='periodic_ohlcv_fetch',
                    replace_existing=True,
                    misfire_grace_time=300,
                    next_run_time=datetime.now() if enable_immediate_execution else None
                )
            else:
                self.scheduler.add_job(
                    ohlcv_func,
                    'interval',
                    minutes=frequent_interval_minutes,
                    id='periodic_ohlcv_fetch',
                    replace_existing=True,
                    misfire_grace_time=300,
                    next_run_time=datetime.now() if enable_immediate_execution else None
                )
            
            # 세계 자산 데이터 수집 (비활성화 - OHLCV만 테스트)
            # world_assets_func = self._create_collection_function(WorldAssetsCollector, "worldassetscollector_collection")
            # if use_hours:
            #     self.scheduler.add_job(
            #         world_assets_func,
            #         'interval',
            #         hours=frequent_interval_hours,
            #         minutes=frequent_interval_minutes,
            #         id='periodic_world_assets_fetch',
            #         replace_existing=True,
            #         misfire_grace_time=300,
            #         next_run_time=datetime.now() if enable_immediate_execution else None
            #     )
            # else:
            #     self.scheduler.add_job(
            #         world_assets_func,
            #         'interval',
            #         minutes=frequent_interval_minutes,
            #         id='periodic_world_assets_fetch',
            #         replace_existing=True,
            #         misfire_grace_time=300,
            #         next_run_time=datetime.now() if enable_immediate_execution else None
            #     )
            
            # 온체인 데이터 수집 (비활성화 - 가격 데이터가 아님)
            # onchain_func = self._create_collection_function(OnchainCollector, "onchaincollector_collection")
            # if use_hours:
            #     self.scheduler.add_job(
            #         onchain_func,
            #         'interval',
            #         hours=frequent_interval_hours,
            #         minutes=frequent_interval_minutes,
            #         id='periodic_onchain_fetch',
            #         replace_existing=True,
            #         misfire_grace_time=300,
            #         next_run_time=datetime.now() if enable_immediate_execution else None
            #     )
            # else:
            #     self.scheduler.add_job(
            #         onchain_func,
            #         'interval',
            #         minutes=frequent_interval_minutes,
            #         id='periodic_onchain_fetch',
            #         replace_existing=True,
            #         misfire_grace_time=300,
            #         next_run_time=datetime.now() if enable_immediate_execution else None
            #     )
            
            # 주식 데이터 수집 (비활성화 - OHLCV만 테스트)
            # stock_func = self._create_collection_function(StockCollector, "stockcollector_collection")
            # self.scheduler.add_job(
            #     stock_func,
            #     'interval',
            #     days=daily_interval_days,
            #     id='periodic_stock_fetch',
            #     replace_existing=True,
            #     misfire_grace_time=300,
            #     next_run_time=datetime.now() if enable_immediate_execution else None
            # )
            
            # ETF 데이터 수집 (비활성화 - 가격 데이터가 아님)
            # etf_func = self._create_collection_function(ETFCollector, "etfcollector_collection")
            # self.scheduler.add_job(
            #     etf_func,
            #     'interval',
            #     days=daily_interval_days,
            #     id='periodic_etf_fetch',
            #     replace_existing=True,
            #     misfire_grace_time=300,
            #     next_run_time=datetime.now() if enable_immediate_execution else None
            # )
            
            # 크립토 데이터 수집 (비활성화 - OHLCV만 테스트)
            # crypto_func = self._create_collection_function(CryptoDataCollector, "cryptocollector_collection")
            # self.scheduler.add_job(
            #     crypto_func,
            #     'interval',
            #     days=daily_interval_days,
            #     id='periodic_crypto_fetch',
            #     replace_existing=True,
            #     misfire_grace_time=300,
            #     next_run_time=datetime.now() if enable_immediate_execution else None
            # )
            
            # 하트비트 작업 추가
            self.scheduler.add_job(self._update_heartbeat, 'interval', minutes=1, id='scheduler_heartbeat')
            self.logger.info("Scheduler heartbeat job added.")
            
            self.logger.info(f"OHLCV Collector only configured - interval: {frequent_interval_minutes} minutes")
            
        except Exception as e:
            self.logger.error(f"Error setting up scheduler jobs: {e}", exc_info=True)

    def start_scheduler(self, run_immediately=False):
        """작업을 설정하고 스케줄러를 시작합니다."""
        if not self.scheduler.running:
            self.setup_jobs(run_immediately)
            self.scheduler.start()
            self.logger.info("Scheduler started successfully.")

    def stop_scheduler(self):
        """스케줄러를 중지하고 DB의 running 상태 작업을 정리합니다."""
        if self.scheduler.running:
            # 실행 중인 모든 작업을 stopped로 변경
            db = SessionLocal()
            try:
                running_jobs = db.query(SchedulerLog).filter(
                    SchedulerLog.status == "running",
                    SchedulerLog.end_time.is_(None)
                ).all()
                
                for job in running_jobs:
                    job.status = "stopped"
                    job.end_time = datetime.now()
                    job.error_message = "Scheduler stopped - job terminated"
                
                db.commit()
                self.logger.info(f"Updated {len(running_jobs)} running jobs to stopped")
            except Exception as e:
                self.logger.error(f"Error updating running jobs: {e}")
            finally:
                db.close()
            
            self.scheduler.shutdown()
            self.logger.info("Scheduler shut down successfully.")

    def get_status(self) -> Dict:
        """스케줄러 상태를 반환합니다."""
        return {
            "running": self.scheduler.running,
            "job_count": len(self.scheduler.get_jobs()),
            "jobs": [{"id": job.id, "next_run_time": job.next_run_time} for job in self.scheduler.get_jobs()]
        }

# 전역 인스턴스
scheduler_service = SchedulerService()


