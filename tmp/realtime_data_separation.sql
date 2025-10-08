-- =====================================================
-- 실시간 데이터 분리 설계
-- 실시간 가격 데이터는 별도 API로 처리
-- =====================================================

-- 1. 실시간 가격 데이터 뷰 (별도 API용)
CREATE OR REPLACE VIEW realtime_price_data AS
SELECT 
    a.asset_id,
    a.ticker,
    a.name,
    at.type_name,
    rq.price as current_price,
    rq.change_amount,
    rq.change_percent,
    rq.volume as realtime_volume,
    rq.timestamp_utc as price_timestamp,
    rq.data_source as price_source,
    -- OHLCV 최신 데이터
    ohlcv.open_price,
    ohlcv.high_price,
    ohlcv.low_price,
    ohlcv.close_price,
    ohlcv.volume as ohlcv_volume,
    ohlcv.timestamp_utc as ohlcv_timestamp,
    ohlcv.change_percent as ohlcv_change_percent
FROM assets a
LEFT JOIN asset_types at ON a.asset_type_id = at.asset_type_id
LEFT JOIN LATERAL (
    SELECT * FROM realtime_quotes rq1
    WHERE rq1.asset_id = a.asset_id
    ORDER BY rq1.timestamp_utc DESC
    LIMIT 1
) rq ON true
LEFT JOIN LATERAL (
    SELECT * FROM ohlcv_day_data ohlcv1
    WHERE ohlcv1.asset_id = a.asset_id
    ORDER BY ohlcv1.timestamp_utc DESC
    LIMIT 1
) ohlcv ON true
WHERE a.is_active = true;

-- 2. OHLCV 히스토리 데이터 뷰 (차트용)
CREATE OR REPLACE VIEW ohlcv_history_data AS
SELECT 
    a.asset_id,
    a.ticker,
    a.name,
    at.type_name,
    ohlcv.ohlcv_id,
    ohlcv.timestamp_utc,
    ohlcv.data_interval,
    ohlcv.open_price,
    ohlcv.high_price,
    ohlcv.low_price,
    ohlcv.close_price,
    ohlcv.volume,
    ohlcv.adjusted_close,
    ohlcv.change_percent,
    ohlcv.created_at,
    ohlcv.updated_at
FROM assets a
LEFT JOIN asset_types at ON a.asset_type_id = at.asset_type_id
LEFT JOIN ohlcv_day_data ohlcv ON a.asset_id = ohlcv.asset_id
WHERE a.is_active = true;

-- 3. 기술적 지표 뷰 (차트용)
CREATE OR REPLACE VIEW technical_indicators_data AS
SELECT 
    a.asset_id,
    a.ticker,
    a.name,
    at.type_name,
    ti.indicator_name,
    ti.indicator_value,
    ti.timestamp_utc,
    ti.parameters,
    ti.created_at
FROM assets a
LEFT JOIN asset_types at ON a.asset_type_id = at.asset_type_id
LEFT JOIN technical_indicators ti ON a.asset_id = ti.asset_id
WHERE a.is_active = true;

-- 인덱스 최적화
CREATE INDEX IF NOT EXISTS idx_realtime_price_ticker ON realtime_price_data(ticker);
CREATE INDEX IF NOT EXISTS idx_ohlcv_history_asset_timestamp ON ohlcv_history_data(asset_id, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_technical_indicators_asset ON technical_indicators_data(asset_id, indicator_name);

-- 뷰 코멘트
COMMENT ON VIEW realtime_price_data IS '실시간 가격 데이터 (별도 API용)';
COMMENT ON VIEW ohlcv_history_data IS 'OHLCV 히스토리 데이터 (차트용)';
COMMENT ON VIEW technical_indicators_data IS '기술적 지표 데이터 (차트용)';
