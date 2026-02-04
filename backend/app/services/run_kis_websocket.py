"""
KIS WebSocket Producer Service
- Connects to Korea Investment & Securities (KIS) WebSocket API.
- Implements `HDFSASP0` (Overseas Realtime Quote) and `H0STCNT0` (Domestic).
- Spec: `readme/kiswebsocks.md`
"""

import asyncio
import logging
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Project root setup
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

# Load .env
load_dotenv(dotenv_path=project_root.parent / '.env')

from app.services.websocket.kis_cunsumer import KisConsumer
from app.services.websocket.base_consumer import ConsumerConfig, AssetType

# Logging
verbose = os.getenv("KIS_WS_VERBOSE", "true").lower() == "true"
log_level = logging.DEBUG if verbose else logging.INFO
logging.basicConfig(level=log_level, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("KIS-WebSocket-Service")

async def main():
    logger.info("Starting KIS WebSocket Service...")
    
    config = ConsumerConfig(
        max_subscriptions=40,
        supported_asset_types=[AssetType.STOCK],
        rate_limit_per_minute=100,
        priority=1
    )
    
    consumer = KisConsumer(config)
    
    try:
        if await consumer.connect():
            # Run the consumer loop
            await consumer.run()
        else:
            logger.error("Failed to connect KIS Consumer.")
    except Exception as e:
        logger.error(f"Service crashed: {e}")
    finally:
        await consumer.disconnect()
        logger.info("Service stopped.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
