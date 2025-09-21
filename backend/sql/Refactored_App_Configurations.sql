-- This script refactors the app_configurations table by grouping related settings into single JSON objects.
-- It first inserts the new grouped configurations and then deletes the old, individual key-value pairs.

BEGIN;

-- Insert the new grouped configuration for API Keys
INSERT INTO public.app_configurations (config_key, config_value, data_type, description, is_sensitive, is_active, category, created_at, updated_at) VALUES
('api_keys', '{
  "ALPHA_VANTAGE_API_KEY_1": {"value": "MJ965EHM5S48YVCV", "type": "string", "description": "Alpha Vantage API Key (Primary)", "is_sensitive": true, "is_active": true},
  "ALPHA_VANTAGE_API_KEY_2": {"value": "ZYIWDUTRJ5VDSMMF", "type": "string", "description": "Alpha Vantage API Key (Secondary)", "is_sensitive": true, "is_active": true},
  "ALPHA_VANTAGE_API_KEY_3": {"value": "4D6E0FWKL4IZ0UFV", "type": "string", "description": "Alpha Vantage API Key (Tertiary)", "is_sensitive": true, "is_active": true},
  "FMP_API_KEY": {"value": "uwuvgPqE1bzAKJB1LAdkerZdp273Bvk1", "type": "string", "description": "Financial Modeling Prep API Key", "is_sensitive": true, "is_active": true},
  "COINMARKETCAP_API_KEY": {"value": "e0d46b45-86dd-4756-81c6-a26391122391", "type": "string", "description": "CoinMarketCap API Key", "is_sensitive": true, "is_active": true},
  "TIINGO_API_KEY": {"value": "6ad65759391ef22e0dccb8d2b171769c782c4853", "type": "string", "description": "Tiingo API Key for stock data collection", "is_sensitive": true, "is_active": true},
  "TWELVEDATA_API_KEY": {"value": "7d438a1ad6ed4ebfaea69eb965fe7e83", "type": "string", "description": "TwelveData API Key for market data", "is_sensitive": true, "is_active": true},
  "EODHD_API_KEY": {"value": "6851fda9861c01.75472022", "type": "string", "description": "EODHD API Key for fundamental data", "is_sensitive": true, "is_active": true},
  "COIN_GECKO_API_KEY": {"value": "CG-aiuQjnSAoeVfuhbY1Q9uZysu", "type": "string", "description": "CoinGecko API Key for crypto data", "is_sensitive": true, "is_active": true}
}', 'json', 'Grouped configuration for all third-party API keys.', false, true, 'grouped_configs', NOW(), NOW());

-- Insert the new grouped configuration for the Data Collection Scheduler
INSERT INTO public.app_configurations (config_key, config_value, data_type, description, is_sensitive, is_active, category, created_at, updated_at) VALUES
('scheduler_settings', '{
  "DATA_COLLECTION_INTERVAL_MINUTES": {"value": 1440, "type": "int", "description": "Data collection scheduler execution interval (minutes)", "is_sensitive": false, "is_active": true},
  "OHLCV_DATA_INTERVAL": {"value": "1d", "type": "string", "description": "OHLCV data collection interval (1d, 1h, 4h, 1w, 1m)", "is_sensitive": false, "is_active": true},
  "OHLCV_DATA_INTERVALS": {"value": ["1d", "4h", "1h"], "type": "json", "description": "Multiple OHLCV data collection intervals to collect", "is_sensitive": false, "is_active": true},
  "ENABLE_MULTIPLE_INTERVALS": {"value": true, "type": "boolean", "description": "Enable collection of multiple OHLCV intervals", "is_sensitive": false, "is_active": true},
  "HISTORICAL_DATA_DAYS_PER_RUN": {"value": 165, "type": "int", "description": "Number of historical data days to fetch per run (for pagination)", "is_sensitive": false, "is_active": true},
  "MAX_HISTORICAL_DAYS": {"value": 10950, "type": "int", "description": "Maximum historical data days (30 years)", "is_sensitive": false, "is_active": true},
  "ENABLE_HISTORICAL_BACKFILL": {"value": true, "type": "boolean", "description": "Enable historical data backfill (fetch missing historical data)", "is_sensitive": false, "is_active": true},
  "MAX_API_RETRY_ATTEMPTS": {"value": 5, "type": "int", "description": "Maximum API call retry attempts", "is_sensitive": false, "is_active": true},
  "API_REQUEST_TIMEOUT_SECONDS": {"value": 30, "type": "int", "description": "API request timeout (seconds)", "is_sensitive": false, "is_active": true},
  "ENABLE_IMMEDIATE_EXECUTION": {"value": false, "type": "boolean", "description": "Enable immediate execution of scheduler jobs on startup", "is_sensitive": false, "is_active": true},
   "DATA_COLLECTION_INTERVAL_DAILY": {"value": 1, "type": "int", "description": "Data collection interval for daily tasks (days)", "is_sensitive": false, "is_active": true}
}', 'json', 'Grouped configuration for data collection and scheduler behavior.', false, true, 'grouped_configs', NOW(), NOW());

-- Insert the new grouped configuration for On-chain Metrics Collection Toggles
INSERT INTO public.app_configurations (config_key, config_value, data_type, description, is_sensitive, is_active, category, created_at, updated_at) VALUES
('onchain_metrics_toggles', '{
  "ONCHAIN_COLLECT_MVRV_ZSCORE": {"value": true, "type": "boolean", "description": "Collect MVRV Z-Score", "is_sensitive": false, "is_active": true},
  "ONCHAIN_COLLECT_SOPR": {"value": true, "type": "boolean", "description": "Collect SOPR", "is_sensitive": false, "is_active": true},
  "ONCHAIN_COLLECT_NUPL": {"value": true, "type": "boolean", "description": "Collect NUPL", "is_sensitive": false, "is_active": true},
  "ONCHAIN_COLLECT_REALIZED_PRICE": {"value": true, "type": "boolean", "description": "Collect Realized Price", "is_sensitive": false, "is_active": true},
  "ONCHAIN_COLLECT_HASHRATE": {"value": true, "type": "boolean", "description": "Collect Hashrate", "is_sensitive": false, "is_active": true},
  "ONCHAIN_COLLECT_DIFFICULTY_BTC": {"value": true, "type": "boolean", "description": "Collect Difficulty (BTC)", "is_sensitive": false, "is_active": true},
  "ONCHAIN_COLLECT_MINER_RESERVES": {"value": true, "type": "boolean", "description": "Collect Miner Reserves", "is_sensitive": false, "is_active": true},
  "ONCHAIN_COLLECT_ETF_BTC_TOTAL": {"value": true, "type": "boolean", "description": "Collect ETF BTC Total", "is_sensitive": false, "is_active": true},
  "ONCHAIN_COLLECT_OPEN_INTEREST_FUTURES": {"value": true, "type": "boolean", "description": "Collect Open Interest Futures", "is_sensitive": false, "is_active": true},
  "ONCHAIN_COLLECT_CAP_REAL_USD": {"value": true, "type": "boolean", "description": "Collect Realized Cap (USD)", "is_sensitive": false, "is_active": true},
  "ONCHAIN_COLLECT_CDD_90DMA": {"value": true, "type": "boolean", "description": "Collect CDD 90dma", "is_sensitive": false, "is_active": true},
  "ONCHAIN_COLLECT_TRUE_MARKET_MEAN": {"value": true, "type": "boolean", "description": "Collect True Market Mean", "is_sensitive": false, "is_active": true},
  "ONCHAIN_COLLECT_NRPL_BTC": {"value": true, "type": "boolean", "description": "Collect NRPL (BTC)", "is_sensitive": false, "is_active": true},
  "ONCHAIN_COLLECT_AVIV": {"value": true, "type": "boolean", "description": "Collect AVIV", "is_sensitive": false, "is_active": true},
  "ONCHAIN_COLLECT_THERMO_CAP": {"value": true, "type": "boolean", "description": "Collect Thermo Cap", "is_sensitive": false, "is_active": true},
  "ONCHAIN_COLLECT_HODL_WAVES_SUPPLY": {"value": true, "type": "boolean", "description": "Collect HODL Waves Supply", "is_sensitive": false, "is_active": true},
  "ONCHAIN_COLLECT_ETF_BTC_FLOW": {"value": true, "type": "boolean", "description": "Collect ETF BTC Flow", "is_sensitive": false, "is_active": true}
}', 'json', 'Grouped toggles for enabling/disabling collection of specific on-chain metrics.', false, true, 'grouped_configs', NOW(), NOW());

-- Insert the new grouped configuration for On-chain API settings
INSERT INTO public.app_configurations (config_key, config_value, data_type, description, is_sensitive, is_active, category, created_at, updated_at) VALUES
('onchain_api_settings', '{
  "BGEO_API_BASE_URL": {"value": "https://bitcoin-data.com", "type": "string", "description": "Onchaindata API Base URL", "is_sensitive": false, "is_active": true},
  "ONCHAIN_API_DELAY_SECONDS": {"value": 480, "type": "int", "description": "Delay between on-chain API calls (seconds)", "is_sensitive": false, "is_active": true},
  "ONCHAIN_SEMAPHORE_LIMIT": {"value": 1, "type": "int", "description": "Concurrency limit for on-chain API calls", "is_sensitive": false, "is_active": true},
  "ONCHAIN_COLLECTION_INTERVAL_HOURS": {"value": 24, "type": "int", "description": "On-chain data collection interval (hours)", "is_sensitive": false, "is_active": true},
  "ONCHAIN_API_PRIORITY": {"value": "coingecko,coinmarketcap,bitcoin-data", "type": "string", "description": "Priority order of on-chain data sources", "is_sensitive": false, "is_active": true}
}', 'json', 'Grouped settings specific to on-chain data provider APIs.', false, true, 'grouped_configs', NOW(), NOW());

-- Insert the new grouped configuration for Realtime Data Processing
INSERT INTO public.app_configurations (config_key, config_value, data_type, description, is_sensitive, is_active, category, created_at, updated_at) VALUES
('realtime_settings', '{
  "REALTIME_PROCESSING_INTERVAL_SECONDS": {"value": 60.0, "type": "float", "description": "실시간 데이터 처리 주기 (초)", "is_sensitive": false, "is_active": true},
  "REALTIME_BATCH_SIZE": {"value": 1000, "type": "int", "description": "실시간 데이터 배치 처리 크기", "is_sensitive": false, "is_active": true},
  "REALTIME_QUOTE_RETENTION_HOURS": {"value": 24, "type": "int", "description": "실시간 인용 데이터 보관 시간 (시간)", "is_sensitive": false, "is_active": true},
  "REALTIME_STREAM_BLOCK_MS": {"value": 100, "type": "int", "description": "Redis 스트림 읽기 블록 시간 (밀리초)", "is_sensitive": false, "is_active": true},
  "REALTIME_DISPLAY_INTERVAL_SECONDS": {"value": 15.0, "type": "float", "description": "실시간 데이터 표시 주기 (초)", "is_sensitive": false, "is_active": true},
  "REALTIME_DATA_FRESHNESS_THRESHOLD_SECONDS": {"value": 120, "type": "int", "description": "실시간 데이터 신선도 임계값 (초)", "is_sensitive": false, "is_active": true}
}', 'json', 'Grouped settings for real-time data processing and Redis streams.', false, true, 'grouped_configs', NOW(), NOW());

-- Insert the new grouped configuration for WebSocket Consumers
INSERT INTO public.app_configurations (config_key, config_value, data_type, description, is_sensitive, is_active, category, created_at, updated_at) VALUES
('websocket_config', '{
  "WEBSOCKET_TIME_WINDOW_MINUTES": {"value": 15, "type": "int", "description": "웹소켓 누적 저장 시간 윈도우 (분)", "is_sensitive": false, "is_active": true},
  "WEBSOCKET_CONSUMER_GROUP_PREFIX": {"value": "processor_group", "type": "string", "description": "웹소켓 컨슈머 그룹 접두사", "is_sensitive": false, "is_active": true},
  "WEBSOCKET_RECONNECT_DELAY_SECONDS": {"value": 5, "type": "int", "description": "웹소켓 재연결 지연 시간 (초)", "is_sensitive": false, "is_active": true},
  "WEBSOCKET_HEALTH_CHECK_INTERVAL_SECONDS": {"value": 30, "type": "int", "description": "웹소켓 헬스체크 주기 (초)", "is_sensitive": false, "is_active": true},
  "WEBSOCKET_CONSUMER_INTERVAL_SECONDS": {"value": 15, "type": "int", "description": "웹소켓 컨슈머 수신 주기 (초)", "is_sensitive": false, "is_active": true},
  "WEBSOCKET_FINNHUB_ENABLED": {"value": true, "type": "boolean", "description": "Finnhub WebSocket Consumer 활성화 여부", "is_sensitive": false, "is_active": true},
  "WEBSOCKET_BINANCE_ENABLED": {"value": true, "type": "boolean", "description": "Binance WebSocket Consumer 활성화 여부", "is_sensitive": false, "is_active": true},
  "WEBSOCKET_ALPACA_ENABLED": {"value": true, "type": "boolean", "description": "Alpaca WebSocket Consumer 활성화 여부", "is_sensitive": false, "is_active": true},
  "WEBSOCKET_TIINGO_ENABLED": {"value": false, "type": "boolean", "description": "Tiingo WebSocket Consumer 활성화 여부", "is_sensitive": false, "is_active": true},
  "WEBSOCKET_TWELVEDATA_ENABLED": {"value": true, "type": "boolean", "description": "TwelveData WebSocket consumer enabled", "is_sensitive": false, "is_active": true},
  "WEBSOCKET_SWISSQUOTE_ENABLED": {"value": true, "type": "boolean", "description": "Enable Swissquote WebSocket Consumer", "is_sensitive": false, "is_active": true},
  "WEBSOCKET_COINBASE_ENABLED": {"value": true, "type": "boolean", "description": "Coinbase WebSocket Consumer 활성화 여부", "is_sensitive": false, "is_active": true}
}', 'json', 'Grouped settings for all WebSocket consumers and their behavior.', false, true, 'grouped_configs', NOW(), NOW());

-- Insert the new grouped configuration for Data Collection Toggles
INSERT INTO public.app_configurations (config_key, config_value, data_type, description, is_sensitive, is_active, category, created_at, updated_at) VALUES
('data_collection_toggles', '{
    "ENABLE_ETF_COLLECTION": {"value": true, "type": "boolean", "description": "Enable ETF data collection", "is_sensitive": false, "is_active": true},
    "ENABLE_CRYPTO_COLLECTION": {"value": true, "type": "boolean", "description": "Enable crypto data collection", "is_sensitive": false, "is_active": true},
    "ENABLE_OHLCV_COLLECTION": {"value": true, "type": "boolean", "description": "Enable OHLCV data collection", "is_sensitive": false, "is_active": true},
    "ENABLE_STOCK_COLLECTION": {"value": true, "type": "boolean", "description": "Enable stock data collection", "is_sensitive": false, "is_active": true},
    "ENABLE_ONCHAIN_COLLECTION": {"value": true, "type": "boolean", "description": "Enable on-chain data collection", "is_sensitive": false, "is_active": true},
    "ENABLE_WORLD_ASSETS_COLLECTION": {"value": true, "type": "boolean", "description": "Enable world assets data collection", "is_sensitive": false, "is_active": true}
}', 'json', 'Master toggles to enable or disable major data collection categories.', false, true, 'grouped_configs', NOW(), NOW());


-- Delete the old, individual configuration keys that have been grouped.
DELETE FROM public.app_configurations
WHERE config_key IN (
  'ALPHA_VANTAGE_API_KEY_1', 'ALPHA_VANTAGE_API_KEY_2', 'ALPHA_VANTAGE_API_KEY_3',
  'FMP_API_KEY', 'COINMARKETCAP_API_KEY', 'BGEO_API_BASE_URL', 'DATA_COLLECTION_INTERVAL_MINUTES',
  'OHLCV_DATA_INTERVAL', 'OHLCV_DATA_INTERVALS', 'ENABLE_MULTIPLE_INTERVALS', 'HISTORICAL_DATA_DAYS_PER_RUN',
  'MAX_HISTORICAL_DAYS', 'ENABLE_HISTORICAL_BACKFILL', 'MAX_API_RETRY_ATTEMPTS', 'API_REQUEST_TIMEOUT_SECONDS',
  'ONCHAIN_COLLECT_MVRV_ZSCORE', 'ONCHAIN_COLLECT_SOPR', 'ONCHAIN_COLLECT_NUPL', 'ONCHAIN_COLLECT_REALIZED_PRICE',
  'ONCHAIN_COLLECT_HASHRATE', 'ONCHAIN_COLLECT_DIFFICULTY_BTC', 'ONCHAIN_COLLECT_MINER_RESERVES',
  'ONCHAIN_COLLECT_ETF_BTC_TOTAL', 'ONCHAIN_COLLECT_OPEN_INTEREST_FUTURES', 'ONCHAIN_COLLECT_CAP_REAL_USD',
  'ONCHAIN_COLLECT_CDD_90DMA', 'ONCHAIN_COLLECT_TRUE_MARKET_MEAN', 'ONCHAIN_COLLECT_NRPL_BTC',
  'ONCHAIN_COLLECT_AVIV', 'ONCHAIN_COLLECT_THERMO_CAP', 'ONCHAIN_COLLECT_HODL_WAVES_SUPPLY',
  'ONCHAIN_COLLECT_ETF_BTC_FLOW', 'DATA_COLLECTION_INTERVAL_DAILY', 'ONCHAIN_API_DELAY_SECONDS',
  'ONCHAIN_SEMAPHORE_LIMIT', 'ONCHAIN_COLLECTION_INTERVAL_HOURS', 'ONCHAIN_API_PRIORITY',
  'ENABLE_IMMEDIATE_EXECUTION', 'TIINGO_API_KEY', 'TWELVEDATA_API_KEY', 'EODHD_API_KEY',
  'COIN_GECKO_API_KEY', 'REALTIME_PROCESSING_INTERVAL_SECONDS', 'REALTIME_BATCH_SIZE',
  'WEBSOCKET_TIME_WINDOW_MINUTES', 'WEBSOCKET_CONSUMER_GROUP_PREFIX', 'REALTIME_QUOTE_RETENTION_HOURS',
  'WEBSOCKET_RECONNECT_DELAY_SECONDS', 'REALTIME_STREAM_BLOCK_MS', 'WEBSOCKET_HEALTH_CHECK_INTERVAL_SECONDS',
  'WEBSOCKET_CONSUMER_INTERVAL_SECONDS', 'WEBSOCKET_FINNHUB_ENABLED', 'WEBSOCKET_BINANCE_ENABLED',
  'WEBSOCKET_ALPACA_ENABLED', 'WEBSOCKET_TIINGO_ENABLED', 'REALTIME_DISPLAY_INTERVAL_SECONDS',
  'REALTIME_DATA_FRESHNESS_THRESHOLD_SECONDS', 'WEBSOCKET_TWELVEDATA_ENABLED', 'ENABLE_ETF_COLLECTION',
  'ENABLE_CRYPTO_COLLECTION', 'WEBSOCKET_SWISSQUOTE_ENABLED', 'WEBSOCKET_COINBASE_ENABLED',
  'ENABLE_OHLCV_COLLECTION', 'ENABLE_STOCK_COLLECTION', 'ENABLE_ONCHAIN_COLLECTION', 'ENABLE_WORLD_ASSETS_COLLECTION'
);

COMMIT;
