"""
WebSocket Orchestrator 실행 스크립트
"""
import asyncio
import logging
import signal
import sys
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.services.websocket_orchestrator import WebSocketOrchestrator

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('websocket_orchestrator.log')
    ]
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
            
            self.orchestrator = WebSocketOrchestrator()
            
            # 시그널 핸들러 설정
            self._setup_signal_handlers()
            
            # 오케스트레이터 시작
            await self.orchestrator.start()
            
        except KeyboardInterrupt:
            logger.info("⏹️ Received interrupt signal")
        except Exception as e:
            logger.error(f"❌ Orchestrator failed: {e}")
        finally:
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
    runner = OrchestratorRunner()
    await runner.start()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("👋 Goodbye!")
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        sys.exit(1)

