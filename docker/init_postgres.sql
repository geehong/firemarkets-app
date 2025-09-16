-- PostgreSQL 초기화 스크립트
-- FireMarkets 프로젝트용 PostgreSQL 스키마

-- 기본 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- asset_types 테이블 생성
CREATE TABLE IF NOT EXISTS asset_types (
    asset_type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- asset_types 데이터 삽입
INSERT INTO asset_types (asset_type_id, type_name, description, created_at, updated_at) VALUES
(1, 'Indices', 'Statistical measures that track the performance of a group of assets, such as stocks or bonds, representing a particular market or sector. Key Features: Benchmarking, passive investment, examples include S&P 500, NASDAQ, KOSPI.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'Stocks', 'Shares of ownership in a company that represent a claim on part of the company''s assets and earnings. Key Features: Voting rights, dividend potential, capital appreciation, traded on stock exchanges.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'Commodities', 'Basic raw materials or primary agricultural products that can be bought and sold, such as gold, oil, wheat, and coffee. Key Features: Standardized quality, fungible (interchangeable), traded in large quantities, price volatility based on supply/demand.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'Currencies', 'Legal tender issued by governments that serves as a medium of exchange, store of value, and unit of account. Key Features: Exchange rates fluctuate, traded in pairs (EUR/USD), influenced by economic policies and market sentiment.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'ETFs', 'Investment funds that trade on stock exchanges like individual stocks but hold a diversified portfolio of assets. Key Features: Instant diversification, low fees, real-time trading, tracks indexes or specific sectors.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'Bonds', 'Debt securities where investors loan money to entities (governments or corporations) for a defined period at fixed interest rates. Key Features: Regular interest payments, principal repayment at maturity, generally lower risk than stocks.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, 'Funds', 'Investment vehicles that pool money from multiple investors to purchase a diversified portfolio of securities. Key Features: Professional management, diversification, various types (mutual funds, hedge funds), shared costs and risks.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(8, 'Crypto', 'Digital or virtual currencies secured by cryptography and typically based on blockchain technology. Key Features: Decentralized, high volatility, 24/7 trading, no central authority, examples include Bitcoin and Ethereum.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (asset_type_id) DO NOTHING;

-- assets 테이블 생성
CREATE TABLE IF NOT EXISTS assets (
    asset_id SERIAL PRIMARY KEY,
    ticker VARCHAR(50) NOT NULL,
    asset_type_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    exchange VARCHAR(100),
    currency VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_source VARCHAR(50) NOT NULL DEFAULT 'fmp',
    collection_settings JSONB,
    last_collections JSONB,
    CONSTRAINT fk_assets_asset_type FOREIGN KEY (asset_type_id) REFERENCES asset_types(asset_type_id) ON DELETE RESTRICT
);

-- assets 테이블에 UNIQUE 제약 조건 추가
ALTER TABLE assets ADD CONSTRAINT uq_assets_ticker UNIQUE (ticker);

-- assets 데이터 삽입 (일부 샘플 데이터)
INSERT INTO assets (asset_id, ticker, asset_type_id, name, exchange, currency, is_active, description, created_at, updated_at, data_source, collection_settings, last_collections) VALUES
(1, 'BTCUSDT', 8, 'Bitcoin', 'Binance', 'USDT', TRUE, 'The pioneering decentralized digital currency, operating on a peer-to-peer network.', '2025-06-25 02:21:21', '2025-09-05 08:32:18', 'binance', '{"data_source": "binance", "collect_price": true, "collect_onchain": true, "collect_estimates": false, "collect_financials": false, "collect_assets_info": false, "collect_crypto_data": true, "collect_technical_indicators": false}', '{"crypto_data": "2025-08-28T13:23:45.517925"}'),
(2, 'ETHUSDT', 8, 'Ethereum', 'Binance', 'USDT', TRUE, 'A decentralized open-source blockchain system that features its own cryptocurrency, Ether.', '2025-06-25 02:21:21', '2025-09-05 04:16:29', 'binance', '{"data_source": "binance", "collect_price": true, "collect_onchain": true, "collect_estimates": false, "collect_financials": false, "collect_assets_info": false, "collect_crypto_data": true, "collect_technical_indicators": false}', '{"crypto_data": "2025-08-29T14:11:14.196706"}'),
(3, 'GCUSD', 3, 'Gold Spot (USD)', 'COMEX', 'USD', TRUE, 'A precious metal, commonly used as an investment.', '2025-06-25 02:21:21', '2025-09-05 08:31:24', 'fmp', '{"data_source": "fmp", "collect_price": true, "collect_onchain": false, "collect_estimates": false, "collect_financials": false, "collect_assets_info": false, "collect_technical_indicators": false}', NULL),
(4, 'SPY', 5, 'SPDR S&P 500 ETF Trust', 'AMEX', 'USD', TRUE, 'An exchange-traded fund that tracks the S&P 500 Index.', '2025-06-25 02:21:21', '2025-09-07 01:30:26', 'alpha_vantage', '{"data_source": "tiingo", "collect_price": true, "collect_onchain": false, "collect_estimates": false, "collect_financials": false, "collect_assets_info": true, "collect_company_info": false, "collect_technical_indicators": false}', NULL),
(5, 'MSFT', 2, 'Microsoft Corporation', 'NASDAQ', 'USD', TRUE, 'Industry: Software - Infrastructure', '2025-06-25 02:21:21', '2025-09-05 04:15:45', 'tiingo', '{"data_source": "tiingo", "collect_price": true, "collect_onchain": false, "collect_estimates": true, "collect_financials": true, "collect_assets_info": true, "collect_company_info": false, "collect_technical_indicators": false}', NULL)
ON CONFLICT (asset_id) DO NOTHING;

-- OHLCV 데이터 테이블 생성
CREATE TABLE IF NOT EXISTS ohlcv_day_data (
    ohlcv_id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL,
    timestamp_utc TIMESTAMP NOT NULL,
    data_interval VARCHAR(10),
    open_price DECIMAL(24, 10) NOT NULL,
    high_price DECIMAL(24, 10) NOT NULL,
    low_price DECIMAL(24, 10) NOT NULL,
    close_price DECIMAL(24, 10) NOT NULL,
    volume BIGINT,
    adjusted_close DECIMAL(24, 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ohlcv_day_asset FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE
);

-- OHLCV 인트라데이 데이터 테이블 생성
CREATE TABLE IF NOT EXISTS ohlcv_intraday_data (
    ohlcv_id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL,
    timestamp_utc TIMESTAMP NOT NULL,
    data_interval VARCHAR(10),
    open_price DECIMAL(24, 10) NOT NULL,
    high_price DECIMAL(24, 10) NOT NULL,
    low_price DECIMAL(24, 10) NOT NULL,
    close_price DECIMAL(24, 10) NOT NULL,
    volume BIGINT,
    adjusted_close DECIMAL(24, 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ohlcv_intraday_asset FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE
);

-- UNIQUE 제약 조건 추가 (UPSERT를 위해 필수)
ALTER TABLE ohlcv_day_data ADD CONSTRAINT uq_ohlcv_day_data 
    UNIQUE (asset_id, timestamp_utc, data_interval);

ALTER TABLE ohlcv_intraday_data ADD CONSTRAINT uq_ohlcv_intraday_data 
    UNIQUE (asset_id, timestamp_utc, data_interval);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_ohlcv_day_asset ON ohlcv_day_data(asset_id);
CREATE INDEX IF NOT EXISTS idx_ohlcv_day_asset_date ON ohlcv_day_data(asset_id, timestamp_utc);
CREATE INDEX IF NOT EXISTS idx_ohlcv_day_timestamp ON ohlcv_day_data(timestamp_utc);

CREATE INDEX IF NOT EXISTS idx_ohlcv_intraday_asset ON ohlcv_intraday_data(asset_id);
CREATE INDEX IF NOT EXISTS idx_ohlcv_intraday_asset_date ON ohlcv_intraday_data(asset_id, timestamp_utc);
CREATE INDEX IF NOT EXISTS idx_ohlcv_intraday_timestamp ON ohlcv_intraday_data(timestamp_utc);

-- 업데이트 시간 자동 갱신을 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
DROP TRIGGER IF EXISTS update_ohlcv_day_data_updated_at ON ohlcv_day_data;
CREATE TRIGGER update_ohlcv_day_data_updated_at 
    BEFORE UPDATE ON ohlcv_day_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ohlcv_intraday_data_updated_at ON ohlcv_intraday_data;
CREATE TRIGGER update_ohlcv_intraday_data_updated_at 
    BEFORE UPDATE ON ohlcv_intraday_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL 초기화 완료: 테이블 생성 및 데이터 삽입 완료';
END $$;