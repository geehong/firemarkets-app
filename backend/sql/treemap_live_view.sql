-- Create or replace treemap_live_view
-- Updated: change_percent 계산 로직 변경 (current_price와 이전일 close_price 비교)
-- Updated: volume 컬럼 추가 (ohlcv_day_data.volume)
CREATE OR REPLACE VIEW treemap_live_view AS
SELECT
    a.asset_id,
    a.ticker,
    a.name,
    at.type_name AS asset_type,

    -- Market cap: use world_assets_ranking exclusively to avoid inconsistent units
    war.market_cap_usd AS market_cap,

    -- Logo URL (if available)
    COALESCE(sp.logo_image_url, cd.logo_url) AS logo_url,

    -- Current price: realtime -> world_assets_ranking -> latest daily close -> intraday
    current_price_val AS current_price,

    -- Price change percentage: world_assets_ranking의 daily_change_percent 우선 사용
    -- world_assets_ranking이 1시간 이내 업데이트되고 daily_change_percent가 있으면 사용
    -- 없으면 current_price와 이전일 close_price 비교
    CASE
        WHEN war.last_updated > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour' 
             AND war.daily_change_percent IS NOT NULL THEN
            war.daily_change_percent
        WHEN COALESCE(prev_daily.close_price, prev_intraday.close_price) IS NOT NULL 
             AND COALESCE(prev_daily.close_price, prev_intraday.close_price) > 0 
             AND current_price_val > 0 THEN
            ROUND(((current_price_val - COALESCE(prev_daily.close_price, prev_intraday.close_price)) / COALESCE(prev_daily.close_price, prev_intraday.close_price)) * 100, 4)
        ELSE NULL
    END AS price_change_percentage_24h,

    -- Market status
    CASE
        WHEN war.last_updated IS NOT NULL AND war.last_updated > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour' THEN 'WORLD_ASSETS'
        WHEN rq.timestamp_utc IS NOT NULL AND rq.timestamp_utc > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour' THEN 'REALTIME'
        WHEN ohlcv_daily.timestamp_utc IS NOT NULL AND ohlcv_daily.timestamp_utc > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour' THEN 'DAILY_DATA'
        WHEN ohlcv_intraday.timestamp_utc IS NOT NULL AND ohlcv_intraday.timestamp_utc > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour' THEN 'INTRADAY_DATA'
        WHEN at.type_name = 'Crypto' THEN 'STATIC_24H'
        ELSE 'STATIC_CLOSED'
    END AS market_status,

    rq.timestamp_utc AS realtime_updated_at,
    ohlcv_daily.timestamp_utc AS daily_data_updated_at,

    -- Volume: ohlcv_day_data.volume
    ohlcv_daily.volume AS volume

FROM assets a
JOIN asset_types at ON a.asset_type_id = at.asset_type_id

-- Latest realtime quote
LEFT JOIN LATERAL (
    SELECT r.timestamp_utc, r.price, r.change_percent
    FROM realtime_quotes r
    WHERE r.asset_id = a.asset_id
    ORDER BY r.timestamp_utc DESC
    LIMIT 1
) rq ON true

-- Latest world assets ranking per asset
LEFT JOIN LATERAL (
    SELECT w.market_cap_usd, w.price_usd, w.daily_change_percent, w.last_updated
    FROM world_assets_ranking w
    WHERE w.asset_id = a.asset_id
    ORDER BY w.ranking_date DESC, w.last_updated DESC NULLS LAST
    LIMIT 1
) war ON true

-- Latest daily OHLCV for asset
LEFT JOIN LATERAL (
    SELECT o.timestamp_utc, o.close_price, o.change_percent, o.volume
    FROM ohlcv_day_data o
    WHERE o.asset_id = a.asset_id
    ORDER BY o.timestamp_utc DESC
    LIMIT 1
) ohlcv_daily ON true

-- Latest intraday OHLCV for asset
LEFT JOIN LATERAL (
    SELECT o.timestamp_utc, o.close_price, o.change_percent
    FROM ohlcv_intraday_data o
    WHERE o.asset_id = a.asset_id
    ORDER BY o.timestamp_utc DESC
    LIMIT 1
) ohlcv_intraday ON true

LEFT JOIN stock_profiles sp ON sp.asset_id = a.asset_id
LEFT JOIN crypto_data cd ON cd.asset_id = a.asset_id

-- Current price 계산 (최신 timestamp 데이터 우선)
-- 우선순위: 가장 최신 timestamp를 가진 데이터 선택
LEFT JOIN LATERAL (
    SELECT 
        CASE
            -- 1순위: realtime_quotes가 1시간 이내이고 가장 최신이면
            WHEN rq.timestamp_utc > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour'
                 AND rq.timestamp_utc >= COALESCE(war.last_updated, '1970-01-01'::timestamp)
                 AND rq.timestamp_utc >= COALESCE(ohlcv_intraday.timestamp_utc, '1970-01-01'::timestamp)
                 AND rq.timestamp_utc >= COALESCE(ohlcv_daily.timestamp_utc, '1970-01-01'::timestamp)
                 AND rq.price IS NOT NULL THEN rq.price
            -- 2순위: world_assets_ranking이 1시간 이내이고 가장 최신이면
            -- 단, 다른 소스와 가격 차이가 20% 이상이면 더 최신 데이터 우선
            WHEN war.last_updated > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour'
                 AND war.last_updated >= COALESCE(rq.timestamp_utc, '1970-01-01'::timestamp)
                 AND war.last_updated >= COALESCE(ohlcv_intraday.timestamp_utc, '1970-01-01'::timestamp)
                 AND war.last_updated >= COALESCE(ohlcv_daily.timestamp_utc, '1970-01-01'::timestamp)
                 AND war.price_usd IS NOT NULL
                 -- 가격 차이가 20% 이하일 때만 사용
                 AND (rq.price IS NULL 
                      OR ABS(war.price_usd - rq.price) / NULLIF(war.price_usd, 0) <= 0.2)
                 AND (ohlcv_intraday.close_price IS NULL 
                      OR ABS(war.price_usd - ohlcv_intraday.close_price) / NULLIF(war.price_usd, 0) <= 0.2)
                 THEN war.price_usd
            -- 3순위: world_assets가 1시간 이내이지만 가격 차이가 20% 이상이면, 더 최신 데이터 우선
            -- intraday가 realtime보다 최신이면
            WHEN ohlcv_intraday.timestamp_utc IS NOT NULL 
                 AND ohlcv_intraday.close_price IS NOT NULL
                 AND ohlcv_intraday.timestamp_utc >= COALESCE(rq.timestamp_utc, '1970-01-01'::timestamp)
                 AND ohlcv_intraday.timestamp_utc >= COALESCE(ohlcv_daily.timestamp_utc, '1970-01-01'::timestamp)
                 -- world_assets가 있으면 가격 차이 확인
                 AND (war.price_usd IS NULL 
                      OR war.last_updated <= (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour'
                      OR ABS(war.price_usd - ohlcv_intraday.close_price) / NULLIF(war.price_usd, 0) > 0.2)
                 THEN ohlcv_intraday.close_price
            -- 4순위: daily가 가장 최신이면
            WHEN ohlcv_daily.timestamp_utc IS NOT NULL 
                 AND ohlcv_daily.close_price IS NOT NULL
                 AND ohlcv_daily.timestamp_utc >= COALESCE(rq.timestamp_utc, '1970-01-01'::timestamp)
                 AND ohlcv_daily.timestamp_utc >= COALESCE(war.last_updated, '1970-01-01'::timestamp)
                 -- world_assets가 있으면 가격 차이 확인
                 AND (war.price_usd IS NULL 
                      OR war.last_updated <= (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour'
                      OR ABS(war.price_usd - ohlcv_daily.close_price) / NULLIF(war.price_usd, 0) > 0.2)
                 THEN ohlcv_daily.close_price
            -- 6순위: 1시간 이내 realtime_quotes (fallback)
            WHEN rq.timestamp_utc > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour' 
                 AND rq.price IS NOT NULL 
                 -- world_assets가 있으면 가격 차이 확인
                 AND (war.price_usd IS NULL 
                      OR war.last_updated <= (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour'
                      OR ABS(war.price_usd - rq.price) / NULLIF(war.price_usd, 0) > 0.2)
                 THEN rq.price
            -- 6순위: 1시간 이내 world_assets_ranking (fallback)
            -- 단, 다른 소스와 가격 차이가 20% 이하일 때만 사용
            WHEN war.last_updated > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour' 
                 AND war.price_usd IS NOT NULL
                 AND (rq.price IS NULL 
                      OR ABS(war.price_usd - rq.price) / NULLIF(war.price_usd, 0) <= 0.2)
                 AND (ohlcv_intraday.close_price IS NULL 
                      OR ABS(war.price_usd - ohlcv_intraday.close_price) / NULLIF(war.price_usd, 0) <= 0.2)
                 THEN war.price_usd
            -- 7순위: rq가 war보다 최신이면
            WHEN rq.timestamp_utc IS NOT NULL 
                 AND rq.price IS NOT NULL
                 AND rq.timestamp_utc >= COALESCE(war.last_updated, '1970-01-01'::timestamp)
                 THEN rq.price
            -- 8순위: war.price_usd (fallback)
            WHEN war.price_usd IS NOT NULL THEN war.price_usd
            -- 9순위: 나머지 순서대로
            ELSE COALESCE(rq.price, ohlcv_daily.close_price, ohlcv_intraday.close_price)
        END AS current_price_val
) current_price_calc ON true

-- 이전일 데이터 조회 (current_price 계산용)
-- 최근 7일 이내 데이터만 사용 (오래된 데이터와의 비교 방지)
-- 우선순위: ohlcv_day_data (1순위) -> ohlcv_intraday_data (2순위)
LEFT JOIN LATERAL (
    SELECT o.close_price
    FROM ohlcv_day_data o
    WHERE o.asset_id = a.asset_id
    AND o.timestamp_utc < COALESCE(
        CASE WHEN rq.timestamp_utc > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour' THEN rq.timestamp_utc END,
        CASE WHEN ohlcv_daily.timestamp_utc IS NOT NULL THEN ohlcv_daily.timestamp_utc END,
        CASE WHEN ohlcv_intraday.timestamp_utc IS NOT NULL THEN ohlcv_intraday.timestamp_utc END,
        NOW() AT TIME ZONE 'UTC'
    )
    -- 최근 7일 이내 데이터만 사용
    AND o.timestamp_utc > (NOW() AT TIME ZONE 'UTC') - INTERVAL '7 days'
    ORDER BY o.timestamp_utc DESC
    LIMIT 1
) prev_daily ON true
LEFT JOIN LATERAL (
    SELECT o.close_price
    FROM ohlcv_intraday_data o
    WHERE o.asset_id = a.asset_id
    AND o.timestamp_utc < COALESCE(
        CASE WHEN rq.timestamp_utc > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour' THEN rq.timestamp_utc END,
        CASE WHEN ohlcv_daily.timestamp_utc IS NOT NULL THEN ohlcv_daily.timestamp_utc END,
        CASE WHEN ohlcv_intraday.timestamp_utc IS NOT NULL THEN ohlcv_intraday.timestamp_utc END,
        NOW() AT TIME ZONE 'UTC'
    )
    -- 최근 7일 이내 데이터만 사용
    AND o.timestamp_utc > (NOW() AT TIME ZONE 'UTC') - INTERVAL '7 days'
    AND NOT EXISTS (
        SELECT 1 FROM ohlcv_day_data o2 
        WHERE o2.asset_id = a.asset_id 
        AND o2.timestamp_utc < COALESCE(
            CASE WHEN rq.timestamp_utc > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour' THEN rq.timestamp_utc END,
            CASE WHEN ohlcv_daily.timestamp_utc IS NOT NULL THEN ohlcv_daily.timestamp_utc END,
            CASE WHEN ohlcv_intraday.timestamp_utc IS NOT NULL THEN ohlcv_intraday.timestamp_utc END,
            NOW() AT TIME ZONE 'UTC'
        )
        -- 최근 7일 이내 데이터만 사용
        AND o2.timestamp_utc > (NOW() AT TIME ZONE 'UTC') - INTERVAL '7 days'
        LIMIT 1
    )
    ORDER BY o.timestamp_utc DESC
    LIMIT 1
) prev_intraday ON true

WHERE
    a.is_active = true
    AND (war.market_cap_usd IS NOT NULL 
         OR ohlcv_daily.close_price IS NOT NULL 
         OR ohlcv_intraday.close_price IS NOT NULL 
         OR rq.price IS NOT NULL);


