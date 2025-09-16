-- =====================================================
-- Phase 2: 전역 스위치 설정 제거 마이그레이션
-- =====================================================

-- Step 1: 기존 테이블 백업 (필요시)
-- CREATE TABLE app_configurations_backup AS SELECT * FROM app_configurations;

-- Step 2: 기존 테이블 삭제
DROP TABLE IF EXISTS `app_configurations`;

-- Step 3: 새로운 테이블 생성 (실제 필요한 설정만 포함)
CREATE TABLE `app_configurations` (
  `config_id` INT NOT NULL AUTO_INCREMENT,
  `config_key` VARCHAR(100) NOT NULL COMMENT 'Unique key for configuration item',
  `config_value` TEXT DEFAULT NULL COMMENT 'Configuration value',
  `data_type` VARCHAR(20) DEFAULT 'string' COMMENT 'Data type (string, int, float, boolean, json)',
  `description` TEXT DEFAULT NULL COMMENT 'Description of the configuration',
  `is_sensitive` BOOLEAN DEFAULT FALSE COMMENT 'Whether this is sensitive information (API keys, passwords)',
  `is_active` BOOLEAN DEFAULT TRUE COMMENT 'Configuration activation status',
  `category` VARCHAR(50) DEFAULT 'general' COMMENT 'Configuration category (api_keys, scheduler, onchain_metrics)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`config_id`),
  UNIQUE KEY `config_key` (`config_key`),
  INDEX `idx_category` (`category`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'Application configuration information';

-- Step 4: 실제 필요한 설정들만 삽입

-- =====================================================
-- 1단계: API 키 설정 (6개)
-- =====================================================
INSERT INTO `app_configurations` (
  `config_key`,
  `config_value`,
  `data_type`,
  `description`,
  `is_sensitive`,
  `is_active`,
  `category`
) VALUES
  (
    'ALPHA_VANTAGE_API_KEY_1',
    '4D6E0FWKL4IZ0UFV',
    'string',
    'Alpha Vantage API Key (Primary)',
    TRUE,
    TRUE,
    'api_keys'
  ),
  (
    'ALPHA_VANTAGE_API_KEY_2',
    'ZYIWDUTRJ5VDSMMF',
    'string',
    'Alpha Vantage API Key (Secondary)',
    TRUE,
    TRUE,
    'api_keys'
  ),
  (
    'ALPHA_VANTAGE_API_KEY_3',
    '',
    'string',
    'Alpha Vantage API Key (Tertiary)',
    TRUE,
    TRUE,
    'api_keys'
  ),
  (
    'FMP_API_KEY',
    'uwuvgPqE1bzAKJB1LAdkerZdp273Bvk1',
    'string',
    'Financial Modeling Prep API Key',
    TRUE,
    TRUE,
    'api_keys'
  ),
  (
    'COINMARKETCAP_API_KEY',
    '',
    'string',
    'CoinMarketCap API Key',
    TRUE,
    TRUE,
    'api_keys'
  ),
  (
    'BGEO_API_BASE_URL',
    'https://bitcoin-data.com',
    'string',
    'Onchaindata API Base URL',
    FALSE,
    TRUE,
    'api_keys'
  );

-- =====================================================
-- 2단계: 스케줄러 설정 (9개)
-- =====================================================
INSERT INTO `app_configurations` (
  `config_key`,
  `config_value`,
  `data_type`,
  `description`,
  `is_sensitive`,
  `is_active`,
  `category`
) VALUES
  (
    'DATA_COLLECTION_INTERVAL_MINUTES',
    '240',
    'int',
    'Data collection scheduler execution interval (minutes)',
    FALSE,
    TRUE,
    'scheduler'
  ),
  (
    'OHLCV_DATA_INTERVAL',
    '1d',
    'string',
    'OHLCV data collection interval (1d, 1h, 4h, 1w, 1m)',
    FALSE,
    TRUE,
    'scheduler'
  ),
  (
    'OHLCV_DATA_INTERVALS',
    '["1d", "1h", "4h"]',
    'json',
    'Multiple OHLCV data collection intervals to collect',
    FALSE,
    TRUE,
    'scheduler'
  ),
  (
    'ENABLE_MULTIPLE_INTERVALS',
    'false',
    'boolean',
    'Enable collection of multiple OHLCV intervals',
    FALSE,
    TRUE,
    'scheduler'
  ),
  (
    'HISTORICAL_DATA_DAYS_PER_RUN',
    '1000',
    'int',
    'Number of historical data days to fetch per run (for pagination)',
    FALSE,
    TRUE,
    'scheduler'
  ),
  (
    'MAX_HISTORICAL_DAYS',
    '10950',
    'int',
    'Maximum historical data days (30 years)',
    FALSE,
    TRUE,
    'scheduler'
  ),
  (
    'ENABLE_HISTORICAL_BACKFILL',
    'true',
    'boolean',
    'Enable historical data backfill (fetch missing historical data)',
    FALSE,
    TRUE,
    'scheduler'
  ),
  (
    'MAX_API_RETRY_ATTEMPTS',
    '3',
    'int',
    'Maximum API call retry attempts',
    FALSE,
    TRUE,
    'scheduler'
  ),
  (
    'API_REQUEST_TIMEOUT_SECONDS',
    '30',
    'int',
    'API request timeout (seconds)',
    FALSE,
    TRUE,
    'scheduler'
  ),
  (
    'DATA_COLLECTION_INTERVAL_DAILY',
    '30',
    'int',
    'Data collection interval for daily tasks (days) - 한 달에 1번 (30일마다)',
    FALSE,
    TRUE,
    'scheduler'
  );

-- =====================================================
-- 3단계: 온체인 데이터 수집 설정 (17개)
-- =====================================================
INSERT INTO `app_configurations` (
  `config_key`,
  `config_value`,
  `data_type`,
  `description`,
  `is_sensitive`,
  `is_active`,
  `category`
) VALUES
  (
    'ONCHAIN_COLLECT_MVRV_ZSCORE',
    'true',
    'boolean',
    'MVRV Z-Score 온체인 데이터 수집 활성화',
    FALSE,
    TRUE,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_SOPR',
    'true',
    'boolean',
    'SOPR 온체인 데이터 수집 활성화',
    FALSE,
    TRUE,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_NUPL',
    'true',
    'boolean',
    'NUPL 온체인 데이터 수집 활성화',
    FALSE,
    TRUE,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_REALIZED_PRICE',
    'true',
    'boolean',
    'Realized Price 온체인 데이터 수집 활성화',
    FALSE,
    TRUE,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_HASHRATE',
    'true',
    'boolean',
    'Hashrate 온체인 데이터 수집 활성화',
    FALSE,
    TRUE,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_DIFFICULTY_BTC',
    'true',
    'boolean',
    'Difficulty (BTC) 온체인 데이터 수집 활성화',
    FALSE,
    TRUE,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_MINER_RESERVES',
    'true',
    'boolean',
    'Miner Reserves 온체인 데이터 수집 활성화',
    FALSE,
    TRUE,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_ETF_BTC_TOTAL',
    'true',
    'boolean',
    'ETF BTC Total 온체인 데이터 수집 활성화',
    FALSE,
    TRUE,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_OPEN_INTEREST_FUTURES',
    'true',
    'boolean',
    'Open Interest Futures 온체인 데이터 수집 활성화',
    FALSE,
    TRUE,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_CAP_REAL_USD',
    'true',
    'boolean',
    'Realized Cap (USD) 온체인 데이터 수집 활성화',
    FALSE,
    TRUE,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_CDD_90DMA',
    'true',
    'boolean',
    'CDD 90dma 온체인 데이터 수집 활성화',
    FALSE,
    TRUE,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_TRUE_MARKET_MEAN',
    'true',
    'boolean',
    'True Market Mean 온체인 데이터 수집 활성화',
    FALSE,
    TRUE,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_NRPL_BTC',
    'true',
    'boolean',
    'NRPL (BTC) 온체인 데이터 수집 활성화',
    FALSE,
    TRUE,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_AVIV',
    'true',
    'boolean',
    'AVIV 온체인 데이터 수집 활성화',
    FALSE,
    TRUE,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_THERMO_CAP',
    'true',
    'boolean',
    'Thermo Cap 온체인 데이터 수집 활성화',
    FALSE,
    TRUE,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_HODL_WAVES_SUPPLY',
    'true',
    'boolean',
    'HODL Waves Supply 온체인 데이터 수집 활성화',
    FALSE,
    TRUE,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_ETF_BTC_FLOW',
    'true',
    'boolean',
    'ETF BTC Flow 온체인 데이터 수집 활성화',
    FALSE,
    TRUE,
    'onchain_metrics'
  );

-- =====================================================
-- 제거된 전역 스위치 설정들 목록 (참고용)
-- =====================================================
/*
제거된 전역 스위치 설정들:
- ENABLE_COMPANY_INFO_COLLECTION (개별 자산 설정으로 대체)
- ENABLE_ETF_INFO_COLLECTION (개별 자산 설정으로 대체)
- ENABLE_ONCHAIN_COLLECTION (개별 자산 설정으로 대체)
- ENABLE_WORLD_ASSETS_COLLECTION (개별 자산 설정으로 대체)
- ENABLE_TECHNICAL_INDICATORS_COLLECTION (개별 자산 설정으로 대체)
- ENABLE_CRYPTO_METRICS_COLLECTION (개별 자산 설정으로 대체)

제거된 기타 설정들:
- WORLD_ASSETS_COLLECTION_INTERVAL_HOURS (DATA_COLLECTION_INTERVAL_MINUTES로 통합)
- ENABLE_AUTO_SEEDING_AND_COLLECTION (삭제됨 - seed_data.py와 함께 제거)
- RETRY_DELAY_SECONDS (코드에서 사용되지 않음)
- SCHEDULE_INTERVAL_MINUTES (deprecated, DATA_COLLECTION_INTERVAL_MINUTES 사용)

개별 자산 설정으로 제어:
assets.collection_settings = {
  "collect_price": true,
  "collect_company_info": true,
  "collect_etf_info": true,
  "collect_onchain": false,
  "collect_technical_indicators": false
}
*/

-- =====================================================
-- 마이그레이션 완료 확인
-- =====================================================
-- SELECT COUNT(*) as total_configs FROM app_configurations;
-- SELECT category, COUNT(*) as count FROM app_configurations GROUP BY category;