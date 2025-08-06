-- =====================================================
-- FireMarkets Database Optimization Script (MySQL Version)
-- =====================================================

-- 1. 기존 인덱스 확인 및 제거 (필요시)
-- DROP INDEX IF EXISTS idx_assets_type ON assets;
-- DROP INDEX IF EXISTS idx_ohlcv_asset ON ohlcv_data;
-- DROP INDEX IF EXISTS idx_ohlcv_asset_date ON ohlcv_data;

-- =====================================================
-- 2. 복합 인덱스 추가 (성능 최적화)
-- =====================================================

-- asset_types 테이블 최적화

-- assets 테이블 최적화 (가장 중요한 인덱스)
CREATE INDEX idx_assets_type_ticker ON assets(asset_type_id, ticker);
CREATE INDEX idx_assets_active_type ON assets(is_active, asset_type_id);
CREATE INDEX idx_assets_exchange ON assets(exchange);
CREATE INDEX idx_assets_ticker_active ON assets(ticker, is_active);

-- OHLCV 데이터 최적화 (대용량 데이터)
CREATE INDEX idx_ohlcv_date_asset ON ohlcv_data(timestamp_utc, asset_id);
CREATE INDEX idx_ohlcv_interval ON ohlcv_data(data_interval, asset_id);
CREATE INDEX idx_ohlcv_asset_interval_date ON ohlcv_data(asset_id, data_interval, timestamp_utc);

-- 기타 테이블 최적화
CREATE INDEX idx_stock_financials_asset ON stock_financials(asset_id);
CREATE INDEX idx_crypto_data_asset ON crypto_data(asset_id);
CREATE INDEX idx_etf_info_asset ON etf_info(asset_id);

-- =====================================================
-- 3. 뷰 생성 (자주 사용되는 복잡한 쿼리)
-- =====================================================

-- 자산 타입별 통계 뷰
CREATE OR REPLACE VIEW asset_type_stats AS
SELECT 
    at.asset_type_id,
    at.type_name,
    at.description,
    COUNT(a.asset_id) as total_assets,
    COUNT(CASE WHEN a.is_active = true THEN 1 END) as active_assets,
    COUNT(CASE WHEN o.asset_id IS NOT NULL THEN 1 END) as assets_with_data,
    MAX(o.timestamp_utc) as latest_data_date
FROM asset_types at
LEFT JOIN assets a ON at.asset_type_id = a.asset_type_id
LEFT JOIN (
    SELECT DISTINCT asset_id, MAX(timestamp_utc) as timestamp_utc
    FROM ohlcv_data 
    WHERE timestamp_utc > DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY asset_id
) o ON a.asset_id = o.asset_id
GROUP BY at.asset_type_id, at.type_name, at.description;

-- 최신 OHLCV 데이터 뷰
CREATE OR REPLACE VIEW latest_ohlcv AS
SELECT 
    o1.asset_id,
    o1.timestamp_utc,
    o1.open_price,
    o1.high_price,
    o1.low_price,
    o1.close_price,
    o1.volume,
    o1.data_interval,
    o1.change_percent
FROM ohlcv_data o1
INNER JOIN (
    SELECT asset_id, data_interval, MAX(timestamp_utc) as max_timestamp
    FROM ohlcv_data
    GROUP BY asset_id, data_interval
) o2 ON o1.asset_id = o2.asset_id 
    AND o1.data_interval = o2.data_interval
    AND o1.timestamp_utc = o2.max_timestamp;

-- 활성 자산 목록 뷰
CREATE OR REPLACE VIEW active_assets AS
SELECT 
    a.asset_id,
    a.ticker,
    a.name,
    a.asset_type_id,
    at.type_name,
    a.exchange,
    a.currency,
    a.is_active,
    a.description,
    a.data_source,
    a.created_at,
    a.updated_at
FROM assets a
JOIN asset_types at ON a.asset_type_id = at.asset_type_id
WHERE a.is_active = true;

-- =====================================================
-- 4. 저장 프로시저 생성 (복잡한 쿼리 최적화)
-- =====================================================

DELIMITER //

-- 자산 타입별 자산 목록 조회 (캐싱 대체)
CREATE PROCEDURE GetAssetsByType(
    IN p_type_name VARCHAR(50),
    IN p_has_ohlcv_data BOOLEAN,
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    IF p_has_ohlcv_data THEN
        SELECT 
            a.asset_id,
            a.ticker,
            a.name,
            a.asset_type_id,
            at.type_name,
            a.exchange,
            a.currency,
            a.is_active,
            a.description,
            a.data_source,
            a.created_at,
            a.updated_at
        FROM assets a
        JOIN asset_types at ON a.asset_type_id = at.asset_type_id
        WHERE at.type_name = p_type_name
        AND a.is_active = true
        AND EXISTS (
            SELECT 1 FROM ohlcv_data o 
            WHERE o.asset_id = a.asset_id
        )
        ORDER BY a.ticker
        LIMIT p_limit OFFSET p_offset;
    ELSE
        SELECT 
            a.asset_id,
            a.ticker,
            a.name,
            a.asset_type_id,
            at.type_name,
            a.exchange,
            a.currency,
            a.is_active,
            a.description,
            a.data_source,
            a.created_at,
            a.updated_at
        FROM assets a
        JOIN asset_types at ON a.asset_type_id = at.asset_type_id
        WHERE at.type_name = p_type_name
        AND a.is_active = true
        ORDER BY a.ticker
        LIMIT p_limit OFFSET p_offset;
    END IF;
END //

-- OHLCV 데이터 조회 (최적화된 버전)
CREATE PROCEDURE GetOHLCVData(
    IN p_asset_id INT,
    IN p_data_interval VARCHAR(10),
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_limit INT
)
BEGIN
    SELECT 
        ohlcv_id,
        asset_id,
        timestamp_utc,
        open_price,
        high_price,
        low_price,
        close_price,
        volume,
        data_interval,
        change_percent
    FROM ohlcv_data
    WHERE asset_id = p_asset_id
    AND data_interval = p_data_interval
    AND (p_start_date IS NULL OR timestamp_utc >= p_start_date)
    AND (p_end_date IS NULL OR timestamp_utc <= p_end_date)
    ORDER BY timestamp_utc DESC
    LIMIT p_limit;
END //

DELIMITER ;

-- =====================================================
-- 5. 통계 정보 업데이트
-- =====================================================

-- 테이블 통계 업데이트
ANALYZE TABLE asset_types, assets, ohlcv_data, stock_financials, crypto_data, etf_info;

-- =====================================================
-- 6. 성능 모니터링 쿼리
-- =====================================================

-- 인덱스 사용률 확인
SELECT 
    table_name,
    index_name,
    cardinality,
    sub_part,
    packed,
    null,
    index_type,
    comment
FROM information_schema.statistics
WHERE table_schema = 'firemarkets'
ORDER BY table_name, index_name;

-- 테이블 크기 확인
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)',
    table_rows
FROM information_schema.tables
WHERE table_schema = 'firemarkets'
ORDER BY (data_length + index_length) DESC;

-- =====================================================
-- 7. 최적화 결과 확인
-- =====================================================

-- 자산 타입별 통계 확인
SELECT * FROM asset_type_stats;

-- 최신 OHLCV 데이터 확인
SELECT COUNT(*) as latest_ohlcv_count FROM latest_ohlcv;

-- 활성 자산 수 확인
SELECT COUNT(*) as active_assets_count FROM active_assets;

-- 인덱스 생성 완료 메시지
SELECT 'Database optimization completed successfully!' as status; 