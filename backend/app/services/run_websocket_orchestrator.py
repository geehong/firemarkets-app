"""
WebSocket Orchestrator 실행 스크립트
"""
import asyncio
import logging
import os
from logging.handlers import RotatingFileHandler
import signal
import sys
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.services.websocket_orchestrator import WebSocketOrchestrator
from app.core.config import load_and_set_global_configs

# 로깅 설정
handlers = [logging.StreamHandler()]
if os.getenv("DISABLE_FILE_LOGS", "false").lower() != "true":
    handlers.append(
        RotatingFileHandler('websocket_orchestrator.log', maxBytes=10 * 1024 * 1024, backupCount=3)
    )

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=handlers
)

logger = logging.getLogger(__name__)

class OrchestratorRunner:
    """오케스트레이터 실행기"""
    
    def __init__(self):
        self.orchestrator = None
        self.shutdown_event = asyncio.Event()
    
    async def start(self):
        """오케스트레이터 시작"""
        try:
            logger.info("🚀 Starting WebSocket Orchestrator...")
            
            # 전역 설정 로드
            logger.info("Loading global configurations...")
            load_and_set_global_configs()
            logger.info("✅ Global configurations loaded successfully")
            
            logger.info("Creating WebSocketOrchestrator instance")
            
            self.orchestrator = WebSocketOrchestrator()
            logger.info("WebSocketOrchestrator instance created successfully")
            
            # 시그널 핸들러 설정
            logger.info("Setting up signal handlers")
            self._setup_signal_handlers()
            logger.info("Signal handlers set up successfully")
            
            # 오케스트레이터 시작
            logger.info("Starting orchestrator")
            await self.orchestrator.start()
            logger.info("Orchestrator started successfully")
            
        except KeyboardInterrupt:
            logger.info("⏹️ Received interrupt signal")
        except Exception as e:
            logger.error(f"❌ Orchestrator failed: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
        finally:
            logger.info("Stopping orchestrator")
            await self.stop()
    
    async def stop(self):
        """오케스트레이터 중지"""
        if self.orchestrator:
            logger.info("🛑 Stopping WebSocket Orchestrator...")
            await self.orchestrator.stop()
        
        self.shutdown_event.set()
        logger.info("✅ WebSocket Orchestrator stopped")
    
    def _setup_signal_handlers(self):
        """시그널 핸들러 설정"""
        def signal_handler(signum, frame):
            logger.info(f"📡 Received signal {signum}")
            asyncio.create_task(self.stop())
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

async def main():
    """메인 함수"""
    logger.info("Starting main function")
    logger.info("Creating OrchestratorRunner instance")
    
    runner = OrchestratorRunner()
    logger.info("OrchestratorRunner instance created successfully")
    
    logger.info("Starting runner")
    await runner.start()
    logger.info("Runner completed")

if __name__ == "__main__":
    logger.info("WebSocket Orchestrator script starting")
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Working directory: {Path.cwd()}")
    
    try:
        logger.info("Running asyncio.run(main())")
        asyncio.run(main())
        logger.info("asyncio.run(main()) completed successfully")
    except KeyboardInterrupt:
        logger.info("👋 Goodbye!")
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        logger.error(f"Exception type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        sys.exit(1)

