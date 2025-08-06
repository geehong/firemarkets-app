-- =====================================================
-- 안전한 인덱스 생성 스크립트 (중복 방지)
-- =====================================================

-- 1. asset_types 테이블 인덱스
SELECT 'Creating asset_types indexes...' as message;

-- type_name 인덱스 (이미 존재하면 건너뛰기)
SELECT COUNT(*) INTO @index_exists 
FROM information_schema.statistics 
WHERE table_schema = 'firemarkets' 
AND table_name = 'asset_types' 
AND index_name = 'idx_asset_types_name';

SET @sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_asset_types_name ON asset_types(type_name)', 
    'SELECT "idx_asset_types_name already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- created_at 인덱스
SELECT COUNT(*) INTO @index_exists 
FROM information_schema.statistics 
WHERE table_schema = 'firemarkets' 
AND table_name = 'asset_types' 
AND index_name = 'idx_asset_types_created';

SET @sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_asset_types_created ON asset_types(created_at)', 
    'SELECT "idx_asset_types_created already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. assets 테이블 인덱스
SELECT 'Creating assets indexes...' as message;

-- asset_type_id, ticker 인덱스
SELECT COUNT(*) INTO @index_exists 
FROM information_schema.statistics 
WHERE table_schema = 'firemarkets' 
AND table_name = 'assets' 
AND index_name = 'idx_assets_type_ticker';

SET @sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_assets_type_ticker ON assets(asset_type_id, ticker)', 
    'SELECT "idx_assets_type_ticker already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- is_active, asset_type_id 인덱스
SELECT COUNT(*) INTO @index_exists 
FROM information_schema.statistics 
WHERE table_schema = 'firemarkets' 
AND table_name = 'assets' 
AND index_name = 'idx_assets_active_type';

SET @sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_assets_active_type ON assets(is_active, asset_type_id)', 
    'SELECT "idx_assets_active_type already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- exchange 인덱스
SELECT COUNT(*) INTO @index_exists 
FROM information_schema.statistics 
WHERE table_schema = 'firemarkets' 
AND table_name = 'assets' 
AND index_name = 'idx_assets_exchange';

SET @sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_assets_exchange ON assets(exchange)', 
    'SELECT "idx_assets_exchange already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ticker, is_active 인덱스
SELECT COUNT(*) INTO @index_exists 
FROM information_schema.statistics 
WHERE table_schema = 'firemarkets' 
AND table_name = 'assets' 
AND index_name = 'idx_assets_ticker_active';

SET @sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_assets_ticker_active ON assets(ticker, is_active)', 
    'SELECT "idx_assets_ticker_active already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. OHLCV 데이터 인덱스 (이미 존재하는 것 제외)
SELECT 'Creating OHLCV indexes...' as message;

-- asset_id, timestamp_utc 인덱스 (이미 존재함 - 건너뛰기)
SELECT 'idx_ohlcv_asset_date already exists - skipping' as message;

-- timestamp_utc, asset_id 인덱스
SELECT COUNT(*) INTO @index_exists 
FROM information_schema.statistics 
WHERE table_schema = 'firemarkets' 
AND table_name = 'ohlcv_data' 
AND index_name = 'idx_ohlcv_date_asset';

SET @sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_ohlcv_date_asset ON ohlcv_data(timestamp_utc, asset_id)', 
    'SELECT "idx_ohlcv_date_asset already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- data_interval, asset_id 인덱스
SELECT COUNT(*) INTO @index_exists 
FROM information_schema.statistics 
WHERE table_schema = 'firemarkets' 
AND table_name = 'ohlcv_data' 
AND index_name = 'idx_ohlcv_interval';

SET @sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_ohlcv_interval ON ohlcv_data(data_interval, asset_id)', 
    'SELECT "idx_ohlcv_interval already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- asset_id, data_interval, timestamp_utc 인덱스
SELECT COUNT(*) INTO @index_exists 
FROM information_schema.statistics 
WHERE table_schema = 'firemarkets' 
AND table_name = 'ohlcv_data' 
AND index_name = 'idx_ohlcv_asset_interval_date';

SET @sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_ohlcv_asset_interval_date ON ohlcv_data(asset_id, data_interval, timestamp_utc)', 
    'SELECT "idx_ohlcv_asset_interval_date already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. 기타 테이블 인덱스
SELECT 'Creating other table indexes...' as message;

-- stock_financials 인덱스
SELECT COUNT(*) INTO @index_exists 
FROM information_schema.statistics 
WHERE table_schema = 'firemarkets' 
AND table_name = 'stock_financials' 
AND index_name = 'idx_stock_financials_asset';

SET @sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_stock_financials_asset ON stock_financials(asset_id)', 
    'SELECT "idx_stock_financials_asset already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- crypto_data 인덱스
SELECT COUNT(*) INTO @index_exists 
FROM information_schema.statistics 
WHERE table_schema = 'firemarkets' 
AND table_name = 'crypto_data' 
AND index_name = 'idx_crypto_data_asset';

SET @sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_crypto_data_asset ON crypto_data(asset_id)', 
    'SELECT "idx_crypto_data_asset already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- etf_info 인덱스
SELECT COUNT(*) INTO @index_exists 
FROM information_schema.statistics 
WHERE table_schema = 'firemarkets' 
AND table_name = 'etf_info' 
AND index_name = 'idx_etf_info_asset';

SET @sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_etf_info_asset ON etf_info(asset_id)', 
    'SELECT "idx_etf_info_asset already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 완료 메시지
SELECT 'Safe index creation completed!' as message; 