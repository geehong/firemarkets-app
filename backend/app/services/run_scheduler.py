"""
독립 실행 스케줄러 프로세스
DB의 제어 플래그를 감시하여 스케줄러를 시작/중지하고, 하트비트를 통해 프로세스 상태를 모니터링합니다.
"""

import time
import signal
import sys
from datetime import datetime, timedelta
from app.services.scheduler_service import scheduler_service
from app.utils.logger import logger
from app.core.database import SessionLocal
from app.models.asset import AppConfiguration

def get_db_config(db, key, default_value):
    """DB에서 설정값을 가져옵니다."""
    config = db.query(AppConfiguration).filter(AppConfiguration.config_key == key).first()
    if not config:
        return default_value
    return config.config_value

def check_health():
    """하트비트를 확인하여 스케줄러가 멈췄는지 검사합니다."""
    db = SessionLocal()
    try:
        heartbeat_config = get_db_config(db, 'scheduler_heartbeat', None)
        if heartbeat_config:
            try:
                last_heartbeat = datetime.fromisoformat(heartbeat_config)
                # 하트비트가 30분 이상 갱신되지 않았다면 문제가 있는 것으로 간주
                if datetime.utcnow() - last_heartbeat > timedelta(minutes=30):
                    logger.error("Scheduler heartbeat is stale! Process might be frozen. Attempting restart.")
                    return False
            except (ValueError, TypeError) as e:
                logger.error(f"Invalid heartbeat timestamp format: {e}")
                return False
        else:
            # 하트비트가 없으면 처음 시작하는 것으로 간주
            logger.info("No heartbeat found. This might be the first run.")
    finally:
        db.close()
    return True

def graceful_shutdown(signum, frame):
    """SIGTERM 신호 수신 시 스케줄러를 안전하게 종료합니다."""
    logger.info("Graceful shutdown signal received. Shutting down scheduler...")
    if scheduler_service.scheduler.running:
        scheduler_service.stop_scheduler()
    sys.exit(0)

def main_loop():
    """메인 루프: DB 플래그를 주기적으로 확인하여 스케줄러를 제어합니다."""
    global scheduler_service
    
    # SIGTERM 신호에 대한 핸들러 등록
    signal.signal(signal.SIGTERM, graceful_shutdown)
    signal.signal(signal.SIGINT, graceful_shutdown)
    
    logger.info("Scheduler worker process started.")
    
    while True:
        try:
            db = SessionLocal()
            should_run = get_db_config(db, 'scheduler_enabled', 'false').lower() == 'true'
            test_mode = get_db_config(db, 'test_mode', 'false').lower() == 'true'
            db.close()

            if should_run:
                if not scheduler_service.scheduler.running:
                    logger.info("Control flag is ON. Starting scheduler...")
                    scheduler_service.start_scheduler(test_mode=test_mode)
                # 스케줄러가 실행 중일 때만 헬스 체크 수행
                elif not check_health():
                    logger.warning("Health check failed. Restarting scheduler...")
                    scheduler_service.stop_scheduler() # 문제가 있는 스케줄러 중지
                    time.sleep(5) # 재시작 전 잠시 대기
                    # 새로운 스케줄러 인스턴스 생성
                    from app.services.scheduler_service import SchedulerService
                    scheduler_service = SchedulerService()
                    scheduler_service.start_scheduler(test_mode=test_mode)
            elif not should_run and scheduler_service.scheduler.running:
                logger.info("Control flag is OFF. Stopping scheduler...")
                scheduler_service.stop_scheduler()
            else:
                # 스케줄러가 실행 중이지 않을 때는 헬스 체크를 하지 않음
                pass
                
        except Exception as e:
            logger.error(f"An error occurred in the main scheduler loop: {e}")
        
        time.sleep(60) # 확인 주기를 60초로 조정

if __name__ == "__main__":
    main_loop()


