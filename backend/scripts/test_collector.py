import asyncio
import sys

from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager
from app.core.database import SessionLocal


async def run_collector(collector_class_name: str):
    from app.collectors.stock_collector import StockCollector
    from app.collectors.ohlcv_collector import OHLCVCollector
    from app.collectors.etf_collector import ETFCollector
    from app.collectors.crypto_data_collector import CryptoDataCollector
    from app.collectors.index_collector import IndexCollector

    available = {
        'StockCollector': StockCollector,
        'OHLCVCollector': OHLCVCollector,
        'EtfCollector': ETFCollector,
        'ETFCollector': ETFCollector,
        'CryptoDataCollector': CryptoDataCollector,
        'IndexCollector': IndexCollector,
        # 'OnchainCollector': OnchainCollector,  # disabled during v2 transition
    }

    if collector_class_name not in available:
        print(f"Unknown collector: {collector_class_name}. Available: {list(available.keys())}")
        return 1

    db = SessionLocal()
    try:
        config_manager = ConfigManager()
        api_manager = ApiStrategyManager()
        redis_queue_manager = RedisQueueManager(config_manager=config_manager)

        collector_cls = available[collector_class_name]
        collector = collector_cls(
            db=db,
            config_manager=config_manager,
            api_manager=api_manager,
            redis_queue_manager=redis_queue_manager,
        )
        result = await collector.collect_with_settings()
        print("Result:", result)
        return 0
    finally:
        db.close()


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/test_collector.py <CollectorClassName>")
        sys.exit(1)
    collector_name = sys.argv[1]
    asyncio.run(run_collector(collector_name))


if __name__ == '__main__':
    main()


