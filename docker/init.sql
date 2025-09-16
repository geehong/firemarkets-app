-- db/init.sql
-- Create database `markets` (skip if already exists)
CREATE DATABASE IF NOT EXISTS `markets` DEFAULT CHARACTER
SET
  utf8mb4 COLLATE utf8mb4_general_ci;

USE `markets`;

-- Table structure for `asset_types`
CREATE TABLE
  `asset_types` (
    `asset_type_id` INT NOT NULL AUTO_INCREMENT,
    `type_name` VARCHAR(100) NOT NULL COMMENT 'e.g., Crypto, Stock, Forex, Bond, Commodity',
    `description` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
    PRIMARY KEY (`asset_type_id`),
    UNIQUE KEY `type_name` (`type_name`)
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'Asset Type Master Table';

-- Dump data for `asset_types`
INSERT INTO
  `asset_types` (
    `asset_type_id`,
    `type_name`,
    `description`,
    `created_at`,
    `updated_at`
  )
VALUES
  (
    1,
    'Indices',
    'Statistical measures that track the performance of a group of assets, such as stocks or bonds, representing a particular market or sector. Key Features: Benchmarking, passive investment, examples include S&P 500, NASDAQ, KOSPI.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    2,
    'Stocks',
    'Shares of ownership in a company that represent a claim on part of the company''s assets and earnings. Key Features: Voting rights, dividend potential, capital appreciation, traded on stock exchanges.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    3,
    'Commodities',
    'Basic raw materials or primary agricultural products that can be bought and sold, such as gold, oil, wheat, and coffee. Key Features: Standardized quality, fungible (interchangeable), traded in large quantities, price volatility based on supply/demand.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    4,
    'Currencies',
    'Legal tender issued by governments that serves as a medium of exchange, store of value, and unit of account. Key Features: Exchange rates fluctuate, traded in pairs (EUR/USD), influenced by economic policies and market sentiment.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    5,
    'ETFs',
    'Investment funds that trade on stock exchanges like individual stocks but hold a diversified portfolio of assets. Key Features: Instant diversification, low fees, real-time trading, tracks indexes or specific sectors.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    6,
    'Bonds',
    'Debt securities where investors loan money to entities (governments or corporations) for a defined period at fixed interest rates. Key Features: Regular interest payments, principal repayment at maturity, generally lower risk than stocks.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    7,
    'Funds',
    'Investment vehicles that pool money from multiple investors to purchase a diversified portfolio of securities. Key Features: Professional management, diversification, various types (mutual funds, hedge funds), shared costs and risks.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    8,
    'Crypto',
    'Digital or virtual currencies secured by cryptography and typically based on blockchain technology. Key Features: Decentralized, high volatility, 24/7 trading, no central authority, examples include Bitcoin and Ethereum.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- Table structure for `assets`
CREATE TABLE
  `assets` (
    `asset_id` INT NOT NULL AUTO_INCREMENT,
    `ticker` VARCHAR(50) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Unique symbol/ticker of the asset (e.g., BTCUSDT, AAPL, EURUSD)',
    `asset_type_id` INT NOT NULL COMMENT 'Reference ID in asset_types table',
    `name` VARCHAR(255) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Name of the asset (e.g., Bitcoin, Apple Inc.)',
    `exchange` VARCHAR(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Exchange (e.g., Binance, NASDAQ, NYSE)',
    `currency` VARCHAR(10) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Base currency (e.g., USD, KRW)',
    `is_active` TINYINT (1) DEFAULT '1',
    `description` TEXT COLLATE utf8mb4_general_ci,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `data_source` VARCHAR(50) NOT NULL DEFAULT 'fmp' COMMENT '데이터 수집 소스 (예: alpha_vantage, fmp)',
    `collection_settings` JSON DEFAULT NULL,
    `last_collections` JSON DEFAULT NULL,
    PRIMARY KEY (`asset_id`),
    UNIQUE KEY `ticker` (`ticker`),
    FOREIGN KEY (`asset_type_id`) REFERENCES `asset_types` (`asset_type_id`) ON DELETE RESTRICT
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'Individual Asset Master Table';

-- Table structure for `ohlcv_data` (with partitioning)
CREATE TABLE
  `ohlcv_data` (
    `ohlcv_id` BIGINT NOT NULL AUTO_INCREMENT,
    `asset_id` INT NOT NULL COMMENT 'Reference ID in assets table',
    `timestamp_utc` DATETIME NOT NULL COMMENT 'Timestamp of the data (UTC)',
    `data_interval` VARCHAR(10) NOT NULL DEFAULT '1d' COMMENT 'Data interval (e.g., 1m, 5m, 1h, 1d, 1w, 1M)',
    `open_price` DECIMAL(24, 10) NOT NULL,
    `high_price` DECIMAL(24, 10) NOT NULL,
    `low_price` DECIMAL(24, 10) NOT NULL,
    `close_price` DECIMAL(24, 10) NOT NULL,
    `volume` DECIMAL(30, 10) NOT NULL,
    `change_percent` DECIMAL(10, 4) DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`ohlcv_id`, `timestamp_utc`), -- PK includes partitioning key (required)
    UNIQUE KEY `asset_interval_timestamp` (`asset_id`, `data_interval`, `timestamp_utc`)
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'OHLCV Time Series Data'
PARTITION BY
  RANGE (YEAR (timestamp_utc)) ( -- Partitioning by year
    PARTITION p2010
    VALUES
      LESS THAN (2011),
      PARTITION p2011
    VALUES
      LESS THAN (2012),
      PARTITION p2012
    VALUES
      LESS THAN (2013),
      PARTITION p2013
    VALUES
      LESS THAN (2014),
      PARTITION p2014
    VALUES
      LESS THAN (2015),
      PARTITION p2015
    VALUES
      LESS THAN (2016),
      PARTITION p2016
    VALUES
      LESS THAN (2017),
      PARTITION p2017
    VALUES
      LESS THAN (2018),
      PARTITION p2018
    VALUES
      LESS THAN (2019),
      PARTITION p2019
    VALUES
      LESS THAN (2020),
      PARTITION p2020
    VALUES
      LESS THAN (2021),
      PARTITION p2021
    VALUES
      LESS THAN (2022),
      PARTITION p2022
    VALUES
      LESS THAN (2023),
      PARTITION p2023
    VALUES
      LESS THAN (2024),
      PARTITION p2024
    VALUES
      LESS THAN (2025),
      PARTITION p2025
    VALUES
      LESS THAN (2026), -- Current year + next year
      PARTITION p2026
    VALUES
      LESS THAN (2027),
      PARTITION pmax
    VALUES
      LESS THAN MAXVALUE -- For future data (always at the end)
  );

-- Dump data for `ohlcv_data` (existing dummy data removed, to be collected by the app)
-- All existing INSERT statements are removed.
-- Table structure for `crypto_metrics`
CREATE TABLE
  `crypto_metrics` (
    `metric_id` BIGINT NOT NULL AUTO_INCREMENT,
    `asset_id` INT NOT NULL COMMENT 'Reference ID in assets table (cryptocurrency assets only)',
    `timestamp_utc` DATE NOT NULL COMMENT 'Metric date (assuming daily data)',
    `mvrv_z_score` DECIMAL(18, 10) DEFAULT NULL,
    `realized_price` DECIMAL(24, 10) DEFAULT NULL,
    `hashrate` DECIMAL(30, 10) DEFAULT NULL,
    `difficulty` DECIMAL(30, 10) DEFAULT NULL,
    `miner_reserves` DECIMAL(24, 10) DEFAULT NULL,
    `etf_btc_total` DECIMAL(24, 10) DEFAULT NULL,
    `sopr` DECIMAL(18, 10) DEFAULT NULL,
    `nupl` DECIMAL(18, 10) DEFAULT NULL,
    `open_interest_futures` DECIMAL(24, 10) DEFAULT NULL,
    `realized_cap` DECIMAL(30, 2) DEFAULT NULL,
    -- Onchaindata API 추가 필드들
    `cdd_90dma` DECIMAL(18, 10) DEFAULT NULL COMMENT 'Coins Days Destroyed 90dma',
    `true_market_mean` DECIMAL(24, 10) DEFAULT NULL COMMENT 'Bitcoin True Market Mean Price',
    `nrpl_btc` DECIMAL(24, 10) DEFAULT NULL COMMENT 'Bitcoin NRPL (Net Realized Profit Loss)',
    `aviv` DECIMAL(18, 10) DEFAULT NULL COMMENT 'Active Value to Investor Value',
    `thermo_cap` DECIMAL(30, 2) DEFAULT NULL COMMENT 'Thermo Cap - cumulative revenue earned by Bitcoin miners',
    `hodl_waves_supply` DECIMAL(18, 10) DEFAULT NULL COMMENT 'HODL waves supply',
    `etf_btc_flow` DECIMAL(24, 10) DEFAULT NULL COMMENT 'ETF BTC daily flows',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
    PRIMARY KEY (`metric_id`),
    UNIQUE KEY `asset_id_timestamp` (`asset_id`, `timestamp_utc`),
    FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'Crypto-specific Daily Metrics';

-- Dump data for `crypto_metrics` (existing dummy data removed, to be collected by the app)
-- All existing INSERT statements are removed.
-- Table structure for `crypto_data` (CoinMarketCap API data)
CREATE TABLE
  `crypto_data` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `asset_id` INT NOT NULL COMMENT 'Reference ID in assets table',
    `symbol` VARCHAR(20) NOT NULL COMMENT 'Crypto symbol (e.g., BTC, ETH)',
    `name` VARCHAR(100) NOT NULL COMMENT 'Crypto name',
    -- Market cap and supply data
    `market_cap` DECIMAL(30, 2) DEFAULT NULL COMMENT 'Market capitalization in USD',
    `circulating_supply` DECIMAL(30, 10) DEFAULT NULL COMMENT 'Circulating supply',
    `total_supply` DECIMAL(30, 10) DEFAULT NULL COMMENT 'Total supply',
    `max_supply` DECIMAL(30, 10) DEFAULT NULL COMMENT 'Maximum supply',
    -- Price and volume data
    `current_price` DECIMAL(24, 10) DEFAULT NULL COMMENT 'Current price in USD',
    `volume_24h` DECIMAL(30, 10) DEFAULT NULL COMMENT '24-hour trading volume',
    -- Price change percentages
    `percent_change_1h` DECIMAL(10, 4) DEFAULT NULL COMMENT '1-hour price change percentage',
    `percent_change_24h` DECIMAL(10, 4) DEFAULT NULL COMMENT '24-hour price change percentage',
    `percent_change_7d` DECIMAL(10, 4) DEFAULT NULL COMMENT '7-day price change percentage',
    `percent_change_30d` DECIMAL(10, 4) DEFAULT NULL COMMENT '30-day price change percentage',
    -- Metadata
    `cmc_rank` INT DEFAULT NULL COMMENT 'CoinMarketCap rank',
    `category` VARCHAR(50) DEFAULT NULL COMMENT 'Crypto category',
    `description` TEXT DEFAULT NULL COMMENT 'Crypto description',
    `logo_url` VARCHAR(500) DEFAULT NULL COMMENT 'Logo URL',
    `website_url` VARCHAR(500) DEFAULT NULL COMMENT 'Website URL',
    -- Additional fields for CoinMarketCap API
    `price` DECIMAL(24, 10) DEFAULT NULL COMMENT 'Current price (alternative field)',
    `slug` VARCHAR(100) DEFAULT NULL COMMENT 'CoinMarketCap slug',
    `date_added` DATE DEFAULT NULL COMMENT 'Date added to CoinMarketCap',
    `platform` VARCHAR(100) DEFAULT NULL COMMENT 'Platform information',
    `explorer` JSON DEFAULT NULL COMMENT 'Blockchain explorer URLs',
    `source_code` JSON DEFAULT NULL COMMENT 'Source code URLs',
    -- Tags and status
    `tags` JSON DEFAULT NULL COMMENT 'Crypto tags',
    `is_active` BOOLEAN DEFAULT TRUE COMMENT 'Active status',
    `last_updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `asset_id` (`asset_id`),
    INDEX `idx_symbol` (`symbol`),
    INDEX `idx_cmc_rank` (`cmc_rank`),
    INDEX `idx_market_cap` (`market_cap`),
    FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'Crypto data from CoinMarketCap API';

-- New table: stock_fundamentals (Stock Company Information)
CREATE TABLE
  `index_infos` (
    `index_info_id` INT NOT NULL AUTO_INCREMENT,
    `asset_id` INT NOT NULL COMMENT 'assets 테이블의 FK',
    `snapshot_date` DATE NOT NULL COMMENT '데이터 스냅샷 날짜',
    `price` DECIMAL(20, 4) NULL,
    `change_percentage` DECIMAL(10, 4) NULL,
    `volume` BIGINT NULL,
    `day_low` DECIMAL(20, 4) NULL,
    `day_high` DECIMAL(20, 4) NULL,
    `year_low` DECIMAL(20, 4) NULL,
    `year_high` DECIMAL(20, 4) NULL,
    `price_avg_50` DECIMAL(20, 4) NULL,
    `price_avg_200` DECIMAL(20, 4) NULL,
    PRIMARY KEY (`index_info_id`),
    UNIQUE KEY `asset_id_snapshot_date` (`asset_id`, `snapshot_date`),
    FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE CASCADE
  );

-- 하나의 API에만 의존하지 않는 것입니다. 각 데이터 필드마다 주(Primary) 데이터 소스와 보조(Fallback) 데이터 소스를 정하고, 계층적으로 데이터를 수집하여 하나의 통일된 데이터 모델을 완성하는 방식
-- 1. stock_profiles: 거의 변하지 않는 기업 개요 정보
CREATE TABLE
  `stock_profiles` (
    `profile_id` INT NOT NULL AUTO_INCREMENT,
    `asset_id` INT NOT NULL UNIQUE,
    `company_name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `sector` VARCHAR(100),
    `industry` VARCHAR(100),
    `country` VARCHAR(50),
    `city` VARCHAR(100),
    `address` VARCHAR(255),
    `phone` VARCHAR(50),
    `website` VARCHAR(255),
    `ceo` VARCHAR(100),
    `employees_count` INT,
    `ipo_date` DATE,
    `logo_image_url` VARCHAR(255),
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`profile_id`),
    FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB COMMENT = '기업의 정적 프로필 정보';

-- 2. stock_financials: 주기적으로 업데이트되는 재무/시세 데이터
CREATE TABLE
  `stock_financials` (
    `financial_id` INT NOT NULL AUTO_INCREMENT,
    `asset_id` INT NOT NULL,
    `snapshot_date` DATE NOT NULL COMMENT '데이터 기준일',
    `currency` VARCHAR(10),
    `market_cap` BIGINT,
    `ebitda` BIGINT,
    `shares_outstanding` BIGINT,
    `pe_ratio` DECIMAL(10, 4),
    `peg_ratio` DECIMAL(10, 4),
    `beta` DECIMAL(10, 4),
    `eps` DECIMAL(10, 4),
    `dividend_yield` DECIMAL(10, 4),
    `dividend_per_share` DECIMAL(10, 4),
    `profit_margin_ttm` DECIMAL(10, 4),
    `return_on_equity_ttm` DECIMAL(10, 4),
    `revenue_ttm` BIGINT,
    `price_to_book_ratio` DECIMAL(10, 4),
    `_52_week_high` DECIMAL(18, 4),
    `_52_week_low` DECIMAL(18, 4),
    `_50_day_moving_avg` DECIMAL(18, 4),
    `_200_day_moving_avg` DECIMAL(18, 4),
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`financial_id`),
    UNIQUE KEY `asset_id_snapshot_date` (`asset_id`, `snapshot_date`),
    FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB COMMENT = '기업의 재무 및 주요 시세 지표';

-- 3. stock_analyst_estimates: 분석가 추정치 데이터
CREATE TABLE
  `stock_analyst_estimates` (
    `estimate_id` INT NOT NULL AUTO_INCREMENT,
    `asset_id` INT NOT NULL,
    `fiscal_date` DATE NOT NULL COMMENT '추정치 대상 회계일',
    `revenue_avg` BIGINT,
    `revenue_low` BIGINT,
    `revenue_high` BIGINT,
    `revenue_analysts_count` INT,
    `eps_avg` DECIMAL(10, 4),
    `eps_low` DECIMAL(10, 4),
    `eps_high` DECIMAL(10, 4),
    `eps_analysts_count` INT,
    `ebitda_avg` BIGINT,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`estimate_id`),
    UNIQUE KEY `asset_id_fiscal_date` (`asset_id`, `fiscal_date`),
    FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB COMMENT = '분석가들의 기업 실적 추정치';

-- New table: etf_info (ETF Basic Information)
CREATE TABLE
  `etf_info` (
    `etf_info_id` INT NOT NULL AUTO_INCREMENT,
    `asset_id` INT NOT NULL COMMENT 'Reference ID in assets table (ETF assets only)',
    `snapshot_date` DATE NOT NULL COMMENT 'Information reference date (stores the latest information)',
    `net_assets` DECIMAL(22, 0) DEFAULT NULL COMMENT 'Net Assets', -- BIGINT -> DECIMAL(22,0)
    `net_expense_ratio` DECIMAL(10, 4) DEFAULT NULL COMMENT 'Net Expense Ratio',
    `portfolio_turnover` DECIMAL(10, 4) DEFAULT NULL COMMENT 'Portfolio Turnover Rate',
    `dividend_yield` DECIMAL(10, 4) DEFAULT NULL COMMENT 'Dividend Yield',
    `inception_date` DATE DEFAULT NULL COMMENT 'Inception Date',
    `leveraged` BOOLEAN DEFAULT NULL COMMENT 'Leveraged status',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`etf_info_id`),
    UNIQUE KEY `asset_id_snapshot_date` (`asset_id`, `snapshot_date`),
    FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'Basic and Summary Information on ETF Assets';

-- New table: etf_sector_exposure (ETF Sector Exposure)
CREATE TABLE
  `etf_sector_exposure` (
    `sector_exposure_id` INT NOT NULL AUTO_INCREMENT,
    `etf_info_id` INT NOT NULL COMMENT 'Reference ID in etf_info table',
    `sector_name` VARCHAR(100) NOT NULL COMMENT 'Sector Name',
    `weight` DECIMAL(10, 4) NOT NULL COMMENT 'Weight of the sector',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`sector_exposure_id`),
    UNIQUE KEY `etf_info_id_sector` (`etf_info_id`, `sector_name`),
    FOREIGN KEY (`etf_info_id`) REFERENCES `etf_info` (`etf_info_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'Sector-wise Weight of ETFs';

-- New table: etf_holdings (ETF Holdings Composition)
CREATE TABLE
  `etf_holdings` (
    `holding_id` INT NOT NULL AUTO_INCREMENT,
    `etf_info_id` INT NOT NULL COMMENT 'Reference ID in etf_info table',
    `holding_symbol` VARCHAR(50) NOT NULL COMMENT 'Ticker of the constituent stock',
    `description` VARCHAR(255) DEFAULT NULL COMMENT 'Description of the constituent stock',
    `weight` DECIMAL(10, 4) NOT NULL COMMENT 'Weight of the constituent stock',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`holding_id`),
    UNIQUE KEY `etf_info_id_holding_symbol` (`etf_info_id`, `holding_symbol`),
    FOREIGN KEY (`etf_info_id`) REFERENCES `etf_info` (`etf_info_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'Constituent Stocks and Weights of ETFs';

-- New table: economic_indicators (Macroeconomic Indicators)
CREATE TABLE
  `economic_indicators` (
    `indicator_id` INT NOT NULL AUTO_INCREMENT,
    `indicator_name` VARCHAR(100) NOT NULL COMMENT 'Indicator name (e.g., Real_GDP, CPI_Inflation_Rate)',
    `indicator_code` VARCHAR(50) UNIQUE NOT NULL COMMENT 'Unique code used in API',
    `timestamp` DATE NOT NULL COMMENT 'Indicator announcement or reference date',
    `value` DECIMAL(20, 10) NOT NULL COMMENT 'Indicator value',
    `unit` VARCHAR(20) DEFAULT NULL COMMENT 'Unit (e.g., %, USD Billions)',
    `description` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`indicator_id`),
    UNIQUE KEY `indicator_name_timestamp` (`indicator_name`, `timestamp`)
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'Macroeconomic Indicator Data';

-- New table: technical_indicators (Technical Indicators)
CREATE TABLE
  `technical_indicators` (
    `indicator_data_id` BIGINT NOT NULL AUTO_INCREMENT,
    `asset_id` INT NOT NULL COMMENT 'Reference ID in assets table',
    `data_interval` VARCHAR(10) NOT NULL DEFAULT '1d' COMMENT 'Data interval (e.g., 1m, 5m, 1h, 1d, 1w, 1M)',
    `indicator_type` VARCHAR(50) NOT NULL COMMENT 'Indicator type (e.g., SMA, EMA, RSI, MACD)',
    `indicator_period` INT DEFAULT NULL COMMENT 'Indicator period (e.g., 20-day SMA)',
    `timestamp_utc` DATETIME NOT NULL COMMENT 'Timestamp for indicator calculation',
    `value` DECIMAL(24, 10) NOT NULL,
    `value_2` DECIMAL(24, 10) DEFAULT NULL,
    `value_3` DECIMAL(24, 10) DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`indicator_data_id`),
    UNIQUE KEY `asset_interval_type_period_timestamp` (
      `asset_id`,
      `data_interval`,
      `indicator_type`,
      `indicator_period`,
      `timestamp_utc`
    ),
    FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'Asset-specific Technical Indicator Data';

-- Table structure for `m2_data`
CREATE TABLE
  `m2_data` (
    `m2_data_id` BIGINT NOT NULL AUTO_INCREMENT,
    `timestamp_utc` DATE NOT NULL COMMENT 'Date of the M2 data',
    `m2_supply` DECIMAL(30, 2) DEFAULT NULL COMMENT 'M2 Money Supply (in billions, adjust precision as needed)',
    `m2_growth_yoy` DECIMAL(14, 6) DEFAULT NULL COMMENT 'Year-over-Year growth rate of M2 (%)',
    `source` VARCHAR(100) DEFAULT NULL COMMENT 'Data source (e.g., FRED, ECB)',
    `notes` VARCHAR(255) DEFAULT NULL COMMENT 'Additional notes or context',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`m2_data_id`),
    UNIQUE KEY `timestamp_utc` (`timestamp_utc`) -- Assuming one M2 data entry per date
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'M2 Money Supply and Growth Data (typically monthly)';

-- New table: app_configurations (Application configuration values)
CREATE TABLE
  `app_configurations` (
    `config_id` INT NOT NULL AUTO_INCREMENT,
    `config_key` VARCHAR(100) NOT NULL COMMENT 'Unique key for configuration item',
    `config_value` TEXT DEFAULT NULL COMMENT 'Configuration value',
    `data_type` VARCHAR(20) DEFAULT 'string' COMMENT 'Data type (string, int, float, boolean, json)',
    `description` TEXT DEFAULT NULL COMMENT 'Description of the configuration',
    `is_sensitive` BOOLEAN DEFAULT FALSE COMMENT 'Whether this is sensitive information (API keys, passwords)',
    `is_active` BOOLEAN DEFAULT TRUE COMMENT 'Configuration activation status',
    `category` VARCHAR(50) DEFAULT 'general' COMMENT 'Configuration category (api_keys, scheduler, features, limits, database, logging)',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`config_id`),
    UNIQUE KEY `config_key` (`config_key`),
    INDEX `idx_category` (`category`),
    INDEX `idx_is_active` (`is_active`)
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'Application configuration information';

-- Initial dump data for app_configurations table
INSERT INTO
  `app_configurations` (
    `config_key`,
    `config_value`,
    `data_type`,
    `description`,
    `is_sensitive`,
    `is_active`,
    `category`
  )
VALUES
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
    'TOKEN_METRICS_API_KEY',
    '',
    'string',
    'TokenMetrics API Key',
    TRUE,
    TRUE,
    'api_keys'
  ),
  (
    'EODHD_API_KEY',
    '',
    'string',
    'EODHD API Key',
    TRUE,
    TRUE,
    'api_keys'
  ),
  (
    'BINANCE_API_KEY',
    '',
    'string',
    'Binance API Key (for authenticated requests)',
    TRUE,
    TRUE,
    'api_keys'
  ),
  (
    'BINANCE_SECRET_KEY',
    '',
    'string',
    'Binance Secret Key (for authenticated requests)',
    TRUE,
    TRUE,
    'api_keys'
  ),
  (
    'COINBASE_API_KEY',
    '',
    'string',
    'Coinbase API Key (for authenticated requests)',
    TRUE,
    TRUE,
    'api_keys'
  ),
  (
    'COINBASE_SECRET_KEY',
    '',
    'string',
    'Coinbase Secret Key (for authenticated requests)',
    TRUE,
    TRUE,
    'api_keys'
  ),
  (
    'DATA_COLLECTION_INTERVAL_MINUTES',
    '60',
    'int',
    'Data collection scheduler execution interval (minutes)',
    FALSE,
    TRUE,
    'scheduler'
  ),
  (
    'SCHEDULE_INTERVAL_MINUTES',
    '60',
    'int',
    'Scheduler execution interval (minutes) - deprecated, use DATA_COLLECTION_INTERVAL_MINUTES',
    FALSE,
    TRUE,
    'scheduler'
  ),
  (
    'ENABLE_AUTO_SEEDING_AND_COLLECTION',
    'false',
    'boolean',
    'Enable automatic data seeding and collection',
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
    'RETRY_DELAY_SECONDS',
    '60',
    'int',
    'Retry interval (seconds)',
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
    'ENABLE_STOCK_FUNDAMENTALS_COLLECTION',
    'true',
    'boolean',
    'Stock company overview data collection',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'ENABLE_DAILY_OHLCV_COLLECTION',
    'true',
    'boolean',
    'Daily OHLCV data collection',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'ENABLE_ETF_DATA_COLLECTION',
    'true',
    'boolean',
    'ETF data collection',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'ENABLE_CRYPTO_METRICS_COLLECTION',
    'true',
    'boolean',
    'Crypto metrics collection',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'ENABLE_CRYPTO_DATA_COLLECTION',
    'true',
    'boolean',
    'Crypto detailed data collection (CoinMarketCap)',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'COINMARKETCAP_API_ENABLED',
    'true',
    'boolean',
    'CoinMarketCap API Enable/Disable',
    FALSE,
    TRUE,
    'api'
  ),
  (
    'COINMARKETCAP_API_RATE_LIMIT_PER_MINUTE',
    '30',
    'int',
    'CoinMarketCap API Rate Limit Per Minute',
    FALSE,
    TRUE,
    'api'
  ),
  (
    'COINMARKETCAP_API_REQUEST_TIMEOUT',
    '30',
    'int',
    'CoinMarketCap API Request Timeout (seconds)',
    FALSE,
    TRUE,
    'api'
  ),
  (
    'ENABLE_ECONOMIC_INDICATORS_COLLECTION',
    'true',
    'boolean',
    'Economic indicators collection',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'ENABLE_TECHNICAL_INDICATORS_CALCULATION',
    'true',
    'boolean',
    'Technical indicators calculation',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'ENABLE_HISTORICAL_DATA_BACKFILL',
    'true',
    'boolean',
    'Enable historical data backfill',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'TOP_ASSETS_TO_MANAGE',
    '100',
    'int',
    'Number of top assets to manage',
    FALSE,
    TRUE,
    'limits'
  ),
  (
    'ALPHA_VANTAGE_DAILY_LIMIT',
    '500',
    'int',
    'Daily OHLCV data collection limit (Alpha Vantage)',
    FALSE,
    TRUE,
    'limits'
  ),
  (
    'HISTORICAL_DATA_DAYS_PER_RUN',
    '30',
    'int',
    'Number of historical data days to fetch per run',
    FALSE,
    TRUE,
    'limits'
  ),
  (
    'MAX_HISTORICAL_DAYS',
    '10950',
    'int',
    'Maximum historical data days (30 years)',
    FALSE,
    TRUE,
    'limits'
  ),
  (
    'BINANCE_KLINES_LIMIT',
    '1000',
    'int',
    'Binance API klines request limit',
    FALSE,
    TRUE,
    'limits'
  ),
  (
    'FMP_HISTORICAL_LIMIT',
    '1000',
    'int',
    'FMP API historical data request limit',
    FALSE,
    TRUE,
    'limits'
  ),
  (
    'EODHD_HISTORICAL_LIMIT',
    '1000',
    'int',
    'EODHD API historical data request limit',
    FALSE,
    TRUE,
    'limits'
  ),
  (
    'DB_POOL_SIZE',
    '10',
    'int',
    'Database connection pool size',
    FALSE,
    TRUE,
    'database'
  ),
  (
    'DB_MAX_OVERFLOW',
    '20',
    'int',
    'Database connection pool maximum overflow',
    FALSE,
    TRUE,
    'database'
  ),
  (
    'DB_PRE_PING',
    'true',
    'boolean',
    'Database connection pre-validation',
    FALSE,
    TRUE,
    'database'
  ),
  (
    'LOG_LEVEL',
    'INFO',
    'string',
    'Log level (DEBUG, INFO, WARNING, ERROR)',
    FALSE,
    TRUE,
    'logging'
  ),
  (
    'ENABLE_SQL_LOGGING',
    'false',
    'boolean',
    'Enable SQL query logging',
    FALSE,
    TRUE,
    'logging'
  ),
  -- Onchaindata API settings
  (
    'BGEO_API_BASE_URL',
    'https://bitcoin-data.com',
    'string',
    'Onchaindata API Base URL',
    FALSE,
    TRUE,
    'api'
  ),
  (
    'BGEO_API_ENABLED',
    'true',
    'boolean',
    'Onchaindata API Enable/Disable',
    FALSE,
    TRUE,
    'api'
  ),
  (
    'BGEO_API_RATE_LIMIT_PER_HOUR',
    '30',
    'int',
    'Onchaindata API Rate Limit Per Hour',
    FALSE,
    TRUE,
    'api'
  ),
  (
    'BGEO_API_REQUEST_TIMEOUT',
    '30',
    'int',
    'Onchaindata API Request Timeout (seconds)',
    FALSE,
    TRUE,
    'api'
  ),
  (
    'BGEO_API_RETRY_ATTEMPTS',
    '3',
    'int',
    'Onchaindata API Retry Attempts',
    FALSE,
    TRUE,
    'api'
  ),
  (
    'BGEO_API_RETRY_DELAY',
    '60',
    'int',
    'Onchaindata API Retry Delay (seconds)',
    FALSE,
    TRUE,
    'api'
  ),
  (
    'BGEO_COLLECT_HASHRATE',
    'true',
    'boolean',
    'Collect Hashrate Data',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'BGEO_COLLECT_SOPR',
    'true',
    'boolean',
    'Collect SOPR (Spent Output Profit Ratio) Data',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'BGEO_COLLECT_NUPL',
    'true',
    'boolean',
    'Collect NUPL (Net Unrealized Profit/Loss) Data',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'BGEO_COLLECT_MVRV',
    'true',
    'boolean',
    'Collect MVRV Z-Score Data',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'BGEO_COLLECT_REALIZED_PRICE',
    'true',
    'boolean',
    'Collect Realized Price Data',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'BGEO_COLLECT_ETF_FLOWS',
    'true',
    'boolean',
    'Collect ETF BTC Flows Data',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'BGEO_COLLECT_OPEN_INTEREST',
    'true',
    'boolean',
    'Collect Open Interest Futures Data',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'BGEO_COLLECT_CDD_90DMA',
    'true',
    'boolean',
    'Collect CDD 90dma Data',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'BGEO_COLLECT_TRUE_MARKET_MEAN',
    'true',
    'boolean',
    'Collect True Market Mean Data',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'BGEO_COLLECT_NRPL_BTC',
    'true',
    'boolean',
    'Collect NRPL BTC Data',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'BGEO_COLLECT_AVIV',
    'true',
    'boolean',
    'Collect AVIV Data',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'BGEO_COLLECT_THERMO_CAP',
    'true',
    'boolean',
    'Collect Thermo Cap Data',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'BGEO_COLLECT_HODL_WAVES',
    'true',
    'boolean',
    'Collect HODL Waves Supply Data',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'BGEO_COLLECT_REALIZED_CAP',
    'true',
    'boolean',
    'Collect Realized Cap Data',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'BGEO_COLLECT_MINER_RESERVES',
    'true',
    'boolean',
    'Collect Miner Reserves Data',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'BGEO_COLLECT_DIFFICULTY',
    'true',
    'boolean',
    'Collect Difficulty Data',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'BGEO_BACKFILL_DAYS',
    '365',
    'int',
    'Onchaindata data backfill period (days)',
    FALSE,
    TRUE,
    'limits'
  ),
  (
    'BGEO_UPDATE_INTERVAL_HOURS',
    '24',
    'int',
    'Onchaindata data update interval (hours)',
    FALSE,
    TRUE,
    'scheduler'
  ),
  (
    'BINANCE_API_ENABLED',
    'true',
    'boolean',
    'Binance API Enable/Disable',
    FALSE,
    TRUE,
    'api'
  ),
  (
    'BINANCE_API_RATE_LIMIT_PER_MINUTE',
    '1200',
    'int',
    'Binance API Rate Limit Per Minute',
    FALSE,
    TRUE,
    'api'
  ),
  (
    'BINANCE_API_REQUEST_TIMEOUT',
    '30',
    'int',
    'Binance API Request Timeout (seconds)',
    FALSE,
    TRUE,
    'api'
  ),
  (
    'COINBASE_API_ENABLED',
    'true',
    'boolean',
    'Coinbase API Enable/Disable',
    FALSE,
    TRUE,
    'api'
  ),
  (
    'COINBASE_API_RATE_LIMIT_PER_MINUTE',
    '30',
    'int',
    'Coinbase API Rate Limit Per Minute',
    FALSE,
    TRUE,
    'api'
  ),
  (
    'COINBASE_API_REQUEST_TIMEOUT',
    '30',
    'int',
    'Coinbase API Request Timeout (seconds)',
    FALSE,
    TRUE,
    'api'
  ),
  -- World Assets Collection settings
  (
    'WORLD_ASSETS_COLLECTION_ENABLED',
    'true',
    'boolean',
    'World Assets Ranking Collection Enable/Disable',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'WORLD_ASSETS_COLLECTION_INTERVAL_HOURS',
    '6',
    'int',
    'World Assets Collection Interval (hours)',
    FALSE,
    TRUE,
    'scheduler'
  ),
  (
    'WORLD_ASSETS_COLLECTION_SOURCE',
    'companiesmarketcap',
    'string',
    'World Assets Data Source (companiesmarketcap, yahoo_finance, etc.)',
    FALSE,
    TRUE,
    'api'
  ),
  (
    'WORLD_ASSETS_COLLECTION_LIMIT',
    '1000',
    'int',
    'World Assets Collection Limit (number of assets)',
    FALSE,
    TRUE,
    'limits'
  ),
  (
    'WORLD_ASSETS_AUTO_MATCHING',
    'true',
    'boolean',
    'Enable automatic matching of scraped assets to existing assets',
    FALSE,
    TRUE,
    'features'
  ),
  (
    'WORLD_ASSETS_SAVE_UNMATCHED',
    'true',
    'boolean',
    'Save unmatched assets for manual review',
    FALSE,
    TRUE,
    'features'
  );

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
  'TOKEN_METRICS_API_KEY',
  '',
  'string',
  'TokenMetrics API Key',
  TRUE,
  TRUE,
  'api_keys'
),
(
  'EODHD_API_KEY',
  '',
  'string',
  'EODHD API Key',
  TRUE,
  TRUE,
  'api_keys'
),
(
  'BINANCE_API_KEY',
  '',
  'string',
  'Binance API Key (for authenticated requests)',
  TRUE,
  TRUE,
  'api_keys'
),
(
  'BINANCE_SECRET_KEY',
  '',
  'string',
  'Binance Secret Key (for authenticated requests)',
  TRUE,
  TRUE,
  'api_keys'
),
(
  'COINBASE_API_KEY',
  '',
  'string',
  'Coinbase API Key (for authenticated requests)',
  TRUE,
  TRUE,
  'api_keys'
),
(
  'COINBASE_SECRET_KEY',
  '',
  'string',
  'Coinbase Secret Key (for authenticated requests)',
  TRUE,
  TRUE,
  'api_keys'
),
(
  'DATA_COLLECTION_INTERVAL_MINUTES',
  '60',
  'int',
  'Data collection scheduler execution interval (minutes)',
  FALSE,
  TRUE,
  'scheduler'
),
(
  'SCHEDULE_INTERVAL_MINUTES',
  '60',
  'int',
  'Scheduler execution interval (minutes) - deprecated, use DATA_COLLECTION_INTERVAL_MINUTES',
  FALSE,
  TRUE,
  'scheduler'
),
(
  'ENABLE_AUTO_SEEDING_AND_COLLECTION',
  'false',
  'boolean',
  'Enable automatic data seeding and collection',
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
  'RETRY_DELAY_SECONDS',
  '60',
  'int',
  'Retry interval (seconds)',
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
  'ENABLE_STOCK_FUNDAMENTALS_COLLECTION',
  'true',
  'boolean',
  'Stock company overview data collection',
  FALSE,
  TRUE,
  'features'
),
(
  'ENABLE_DAILY_OHLCV_COLLECTION',
  'true',
  'boolean',
  'Daily OHLCV data collection',
  FALSE,
  TRUE,
  'features'
),
(
  'ENABLE_ETF_DATA_COLLECTION',
  'true',
  'boolean',
  'ETF data collection',
  FALSE,
  TRUE,
  'features'
),
(
  'ENABLE_CRYPTO_METRICS_COLLECTION',
  'true',
  'boolean',
  'Crypto metrics collection',
  FALSE,
  TRUE,
  'features'
),
(
  'ENABLE_CRYPTO_DATA_COLLECTION',
  'true',
  'boolean',
  'Crypto detailed data collection (CoinMarketCap)',
  FALSE,
  TRUE,
  'features'
),
(
  'COINMARKETCAP_API_ENABLED',
  'true',
  'boolean',
  'CoinMarketCap API Enable/Disable',
  FALSE,
  TRUE,
  'api'
),
(
  'COINMARKETCAP_API_RATE_LIMIT_PER_MINUTE',
  '30',
  'int',
  'CoinMarketCap API Rate Limit Per Minute',
  FALSE,
  TRUE,
  'api'
),
(
  'COINMARKETCAP_API_REQUEST_TIMEOUT',
  '30',
  'int',
  'CoinMarketCap API Request Timeout (seconds)',
  FALSE,
  TRUE,
  'api'
),
(
  'ENABLE_ECONOMIC_INDICATORS_COLLECTION',
  'true',
  'boolean',
  'Economic indicators collection',
  FALSE,
  TRUE,
  'features'
),
(
  'ENABLE_TECHNICAL_INDICATORS_CALCULATION',
  'true',
  'boolean',
  'Technical indicators calculation',
  FALSE,
  TRUE,
  'features'
),
(
  'ENABLE_HISTORICAL_DATA_BACKFILL',
  'true',
  'boolean',
  'Enable historical data backfill',
  FALSE,
  TRUE,
  'features'
),
(
  'TOP_ASSETS_TO_MANAGE',
  '100',
  'int',
  'Number of top assets to manage',
  FALSE,
  TRUE,
  'limits'
),
(
  'ALPHA_VANTAGE_DAILY_LIMIT',
  '500',
  'int',
  'Daily OHLCV data collection limit (Alpha Vantage)',
  FALSE,
  TRUE,
  'limits'
),
(
  'HISTORICAL_DATA_DAYS_PER_RUN',
  '30',
  'int',
  'Number of historical data days to fetch per run',
  FALSE,
  TRUE,
  'limits'
),
(
  'MAX_HISTORICAL_DAYS',
  '10950',
  'int',
  'Maximum historical data days (30 years)',
  FALSE,
  TRUE,
  'limits'
),
(
  'BINANCE_KLINES_LIMIT',
  '1000',
  'int',
  'Binance API klines request limit',
  FALSE,
  TRUE,
  'limits'
),
(
  'FMP_HISTORICAL_LIMIT',
  '1000',
  'int',
  'FMP API historical data request limit',
  FALSE,
  TRUE,
  'limits'
),
(
  'EODHD_HISTORICAL_LIMIT',
  '1000',
  'int',
  'EODHD API historical data request limit',
  FALSE,
  TRUE,
  'limits'
),
(
  'DB_POOL_SIZE',
  '10',
  'int',
  'Database connection pool size',
  FALSE,
  TRUE,
  'database'
),
(
  'DB_MAX_OVERFLOW',
  '20',
  'int',
  'Database connection pool maximum overflow',
  FALSE,
  TRUE,
  'database'
),
(
  'DB_PRE_PING',
  'true',
  'boolean',
  'Database connection pre-validation',
  FALSE,
  TRUE,
  'database'
),
(
  'LOG_LEVEL',
  'INFO',
  'string',
  'Log level (DEBUG, INFO, WARNING, ERROR)',
  FALSE,
  TRUE,
  'logging'
),
(
  'ENABLE_SQL_LOGGING',
  'false',
  'boolean',
  'Enable SQL query logging',
  FALSE,
  TRUE,
  'logging'
),
-- Onchaindata API settings
(
  'BGEO_API_BASE_URL',
  'https://bitcoin-data.com',
  'string',
  'Onchaindata API Base URL',
  FALSE,
  TRUE,
  'api'
),
(
  'BGEO_API_ENABLED',
  'true',
  'boolean',
  'Onchaindata API Enable/Disable',
  FALSE,
  TRUE,
  'api'
),
(
  'BGEO_API_RATE_LIMIT_PER_HOUR',
  '30',
  'int',
  'Onchaindata API Rate Limit Per Hour',
  FALSE,
  TRUE,
  'api'
),
(
  'BGEO_API_REQUEST_TIMEOUT',
  '30',
  'int',
  'Onchaindata API Request Timeout (seconds)',
  FALSE,
  TRUE,
  'api'
),
(
  'BGEO_API_RETRY_ATTEMPTS',
  '3',
  'int',
  'Onchaindata API Retry Attempts',
  FALSE,
  TRUE,
  'api'
),
(
  'BGEO_API_RETRY_DELAY',
  '60',
  'int',
  'Onchaindata API Retry Delay (seconds)',
  FALSE,
  TRUE,
  'api'
),
(
  'BGEO_COLLECT_HASHRATE',
  'true',
  'boolean',
  'Collect Hashrate Data',
  FALSE,
  TRUE,
  'features'
),
(
  'BGEO_COLLECT_SOPR',
  'true',
  'boolean',
  'Collect SOPR (Spent Output Profit Ratio) Data',
  FALSE,
  TRUE,
  'features'
),
(
  'BGEO_COLLECT_NUPL',
  'true',
  'boolean',
  'Collect NUPL (Net Unrealized Profit/Loss) Data',
  FALSE,
  TRUE,
  'features'
),
(
  'BGEO_COLLECT_MVRV',
  'true',
  'boolean',
  'Collect MVRV Z-Score Data',
  FALSE,
  TRUE,
  'features'
),
(
  'BGEO_COLLECT_REALIZED_PRICE',
  'true',
  'boolean',
  'Collect Realized Price Data',
  FALSE,
  TRUE,
  'features'
),
(
  'BGEO_COLLECT_ETF_FLOWS',
  'true',
  'boolean',
  'Collect ETF BTC Flows Data',
  FALSE,
  TRUE,
  'features'
),
(
  'BGEO_COLLECT_OPEN_INTEREST',
  'true',
  'boolean',
  'Collect Open Interest Futures Data',
  FALSE,
  TRUE,
  'features'
),
(
  'BGEO_COLLECT_CDD_90DMA',
  'true',
  'boolean',
  'Collect CDD 90dma Data',
  FALSE,
  TRUE,
  'features'
),
(
  'BGEO_COLLECT_TRUE_MARKET_MEAN',
  'true',
  'boolean',
  'Collect True Market Mean Data',
  FALSE,
  TRUE,
  'features'
),
(
  'BGEO_COLLECT_NRPL_BTC',
  'true',
  'boolean',
  'Collect NRPL BTC Data',
  FALSE,
  TRUE,
  'features'
),
(
  'BGEO_COLLECT_AVIV',
  'true',
  'boolean',
  'Collect AVIV Data',
  FALSE,
  TRUE,
  'features'
),
(
  'BGEO_COLLECT_THERMO_CAP',
  'true',
  'boolean',
  'Collect Thermo Cap Data',
  FALSE,
  TRUE,
  'features'
),
(
  'BGEO_COLLECT_HODL_WAVES',
  'true',
  'boolean',
  'Collect HODL Waves Supply Data',
  FALSE,
  TRUE,
  'features'
),
(
  'BGEO_COLLECT_REALIZED_CAP',
  'true',
  'boolean',
  'Collect Realized Cap Data',
  FALSE,
  TRUE,
  'features'
),
(
  'BGEO_COLLECT_MINER_RESERVES',
  'true',
  'boolean',
  'Collect Miner Reserves Data',
  FALSE,
  TRUE,
  'features'
),
(
  'BGEO_COLLECT_DIFFICULTY',
  'true',
  'boolean',
  'Collect Difficulty Data',
  FALSE,
  TRUE,
  'features'
),
(
  'BGEO_BACKFILL_DAYS',
  '365',
  'int',
  'Onchaindata data backfill period (days)',
  FALSE,
  TRUE,
  'limits'
),
(
  'BGEO_UPDATE_INTERVAL_HOURS',
  '24',
  'int',
  'Onchaindata data update interval (hours)',
  FALSE,
  TRUE,
  'scheduler'
),
(
  'BINANCE_API_ENABLED',
  'true',
  'boolean',
  'Binance API Enable/Disable',
  FALSE,
  TRUE,
  'api'
),
(
  'BINANCE_API_RATE_LIMIT_PER_MINUTE',
  '1200',
  'int',
  'Binance API Rate Limit Per Minute',
  FALSE,
  TRUE,
  'api'
),
(
  'BINANCE_API_REQUEST_TIMEOUT',
  '30',
  'int',
  'Binance API Request Timeout (seconds)',
  FALSE,
  TRUE,
  'api'
),
(
  'COINBASE_API_ENABLED',
  'true',
  'boolean',
  'Coinbase API Enable/Disable',
  FALSE,
  TRUE,
  'api'
),
(
  'COINBASE_API_RATE_LIMIT_PER_MINUTE',
  '30',
  'int',
  'Coinbase API Rate Limit Per Minute',
  FALSE,
  TRUE,
  'api'
),
(
  'COINBASE_API_REQUEST_TIMEOUT',
  '30',
  'int',
  'Coinbase API Request Timeout (seconds)',
  FALSE,
  TRUE,
  'api'
);

INSERT INTO
  app_configurations (
    config_key,
    config_value,
    data_type,
    description,
    is_sensitive,
    is_active,
    category
  )
VALUES
  (
    'ONCHAIN_COLLECT_MVRV_ZSCORE',
    'true',
    'boolean',
    'MVRV Z-Score 온체인 데이터 수집 활성화',
    0,
    1,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_SOPR',
    'true',
    'boolean',
    'SOPR 온체인 데이터 수집 활성화',
    0,
    1,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_NUPL',
    'true',
    'boolean',
    'NUPL 온체인 데이터 수집 활성화',
    0,
    1,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_REALIZED_PRICE',
    'true',
    'boolean',
    'Realized Price 온체인 데이터 수집 활성화',
    0,
    1,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_HASHRATE',
    'true',
    'boolean',
    'Hashrate 온체인 데이터 수집 활성화',
    0,
    1,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_DIFFICULTY_BTC',
    'true',
    'boolean',
    'Difficulty (BTC) 온체인 데이터 수집 활성화',
    0,
    1,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_MINER_RESERVES',
    'true',
    'boolean',
    'Miner Reserves 온체인 데이터 수집 활성화',
    0,
    1,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_ETF_BTC_TOTAL',
    'true',
    'boolean',
    'ETF BTC Total 온체인 데이터 수집 활성화',
    0,
    1,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_OPEN_INTEREST_FUTURES',
    'true',
    'boolean',
    'Open Interest Futures 온체인 데이터 수집 활성화',
    0,
    1,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_CAP_REAL_USD',
    'true',
    'boolean',
    'Realized Cap (USD) 온체인 데이터 수집 활성화',
    0,
    1,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_CDD_90DMA',
    'true',
    'boolean',
    'CDD 90dma 온체인 데이터 수집 활성화',
    0,
    1,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_TRUE_MARKET_MEAN',
    'true',
    'boolean',
    'True Market Mean 온체인 데이터 수집 활성화',
    0,
    1,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_NRPL_BTC',
    'true',
    'boolean',
    'NRPL (BTC) 온체인 데이터 수집 활성화',
    0,
    1,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_AVIV',
    'true',
    'boolean',
    'AVIV 온체인 데이터 수집 활성화',
    0,
    1,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_THERMO_CAP',
    'true',
    'boolean',
    'Thermo Cap 온체인 데이터 수집 활성화',
    0,
    1,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_HODL_WAVES_SUPPLY',
    'true',
    'boolean',
    'HODL Waves Supply 온체인 데이터 수집 활성화',
    0,
    1,
    'onchain_metrics'
  ),
  (
    'ONCHAIN_COLLECT_ETF_BTC_FLOW',
    'true',
    'boolean',
    'ETF BTC Flow 온체인 데이터 수집 활성화',
    0,
    1,
    'onchain_metrics'
  );

-- New table: api_call_logs (API call logs)
CREATE TABLE
  `api_call_logs` (
    `log_id` BIGINT NOT NULL AUTO_INCREMENT,
    `api_name` VARCHAR(50) NOT NULL COMMENT 'API name (Alpha Vantage, FMP, Binance, etc.)',
    `endpoint` VARCHAR(255) NOT NULL COMMENT 'Called endpoint (including function name)',
    `asset_ticker` VARCHAR(20) DEFAULT NULL COMMENT 'Related asset ticker',
    `status_code` INT DEFAULT NULL COMMENT 'HTTP status code',
    `response_time_ms` INT DEFAULT NULL COMMENT 'Response time (milliseconds)',
    `success` BOOLEAN DEFAULT FALSE COMMENT 'Success status',
    `error_message` TEXT DEFAULT NULL COMMENT 'Error message',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`log_id`),
    INDEX `idx_api_name` (`api_name`),
    INDEX `idx_asset_ticker` (`asset_ticker`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_success` (`success`)
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'API call logs';

-- New table: scheduler_logs (Scheduler execution logs)
CREATE TABLE
  `scheduler_logs` (
    `log_id` BIGINT NOT NULL AUTO_INCREMENT,
    `job_name` VARCHAR(100) NOT NULL COMMENT 'Job name (e.g., periodic_data_fetch)',
    `start_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `end_time` TIMESTAMP NULL DEFAULT NULL,
    `duration_seconds` INT DEFAULT NULL COMMENT 'Execution time (seconds)',
    `status` VARCHAR(50) DEFAULT 'running' COMMENT 'e.g., running, completed, failed',
    `assets_processed` INT DEFAULT 0 COMMENT 'Number of assets processed',
    `data_points_added` INT DEFAULT 0 COMMENT 'Number of data points added',
    `error_message` TEXT DEFAULT NULL COMMENT 'Error message',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Log creation time
    PRIMARY KEY (`log_id`),
    INDEX `idx_job_name` (`job_name`),
    INDEX `idx_start_time` (`start_time`),
    INDEX `idx_status` (`status`)
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'Scheduler execution logs';

-- 세계 자산 순위 테이블 (히스토리 포함)
CREATE TABLE
  `world_assets_ranking` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `rank` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `ticker` VARCHAR(50),
    `market_cap_usd` DECIMAL(20, 2),
    `price_usd` DECIMAL(10, 2),
    `daily_change_percent` DECIMAL(5, 2),
    `asset_type_id` INT,
    `asset_id` INT,
    `country` VARCHAR(100),
    `ranking_date` DATE NOT NULL DEFAULT (CURRENT_DATE),
    `data_source` VARCHAR(100),
    `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_rank` (`rank`),
    INDEX `idx_ranking_date` (`ranking_date`),
    INDEX `idx_ticker` (`ticker`),
    INDEX `idx_asset_type_id` (`asset_type_id`),
    INDEX `idx_asset_id` (`asset_id`),
    FOREIGN KEY (`asset_type_id`) REFERENCES `asset_types` (`asset_type_id`) ON DELETE SET NULL,
    FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE SET NULL
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '세계 자산 순위 데이터 (히스토리 포함)';

-- 채권 시장 규모 테이블 (히스토리 포함)
CREATE TABLE
  `bond_market_data` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `category` VARCHAR(50) NOT NULL,
    `market_size_usd` DECIMAL(20, 2),
    `quarter` VARCHAR(10),
    `data_source` VARCHAR(100) DEFAULT 'BIS',
    `collection_date` DATE NOT NULL DEFAULT (CURRENT_DATE),
    `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_quarter` (`quarter`)
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '글로벌 채권 시장 규모 데이터';

-- 크롤링 로그 테이블 (모니터링용)
CREATE TABLE
  `scraping_logs` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `source` VARCHAR(100) NOT NULL,
    `status` VARCHAR(20) NOT NULL COMMENT 'success, failed, partial',
    `records_processed` INT DEFAULT 0,
    `records_successful` INT DEFAULT 0,
    `error_message` TEXT,
    `execution_time_seconds` DECIMAL(10, 2),
    `started_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `completed_at` TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_source` (`source`),
    INDEX `idx_status` (`status`),
    INDEX `idx_started_at` (`started_at`)
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '데이터 수집 로그 (모니터링용)';

-- APScheduler 작업 저장 테이블
CREATE TABLE
  `apscheduler_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `next_run_time` DOUBLE PRECISION,
    `job_state` BLOB NOT NULL,
    PRIMARY KEY (`id`)
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'APScheduler 작업 정보 저장';

-- 샘플 데이터 삽입 (테스트용)
INSERT INTO
  `world_assets_ranking` (
    `rank`,
    `name`,
    `ticker`,
    `market_cap_usd`,
    `price_usd`,
    `daily_change_percent`,
    `country`,
    `asset_type_id`
  )
VALUES
  (
    1,
    'Apple Inc.',
    'AAPL',
    3000000000000,
    150.00,
    2.5,
    'United States',
    2
  ),
  (
    2,
    'Microsoft Corporation',
    'MSFT',
    2800000000000,
    280.00,
    1.8,
    'United States',
    2
  ),
  (
    3,
    'Alphabet Inc.',
    'GOOGL',
    1800000000000,
    140.00,
    -0.5,
    'United States',
    2
  ),
  (
    4,
    'Amazon.com Inc.',
    'AMZN',
    1600000000000,
    130.00,
    3.2,
    'United States',
    2
  ),
  (
    5,
    'NVIDIA Corporation',
    'NVDA',
    1200000000000,
    480.00,
    5.1,
    'United States',
    2
  );

INSERT INTO
  `bond_market_data` (
    `category`,
    `market_size_usd`,
    `quarter`,
    `data_source`
  )
VALUES
  (
    'Global Bond Market',
    130000000000000,
    '2024-Q1',
    'BIS'
  ),
  (
    'Government Bonds',
    70000000000000,
    '2024-Q1',
    'BIS'
  ),
  (
    'Corporate Bonds',
    60000000000000,
    '2024-Q1',
    'BIS'
  );