-- Drop old views if exist
DROP VIEW IF EXISTS assets_unified_view;
DROP VIEW IF EXISTS treemap_live_view;

-- Create treemap_live_view adapted to our schema
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

    -- Price change percentage priority: realtime -> latest daily OHLCV (change_percent) -> world_assets_ranking
    COALESCE(rq.change_percent,
             ohlcv_daily.change_percent,
             war.daily_change_percent) AS price_change_percentage_24h,

    -- Current price: realtime -> latest daily close -> world_assets_ranking price
    COALESCE(rq.price,
             ohlcv_daily.close_price,
             war.price_usd) AS current_price,

    CASE
        WHEN rq.timestamp_utc IS NOT NULL AND rq.timestamp_utc > (NOW() AT TIME ZONE 'UTC') - INTERVAL '5 minutes' THEN 'REALTIME'
        WHEN at.type_name = 'Crypto' THEN 'STATIC_24H'
        ELSE 'STATIC_CLOSED'
    END AS market_status,

    rq.timestamp_utc AS realtime_updated_at,
    ohlcv_daily.timestamp_utc AS daily_data_updated_at

FROM assets a
JOIN asset_types at ON a.asset_type_id = at.asset_type_id

-- Latest daily OHLCV for asset
JOIN LATERAL (
    SELECT o.timestamp_utc, o.close_price, o.change_percent
    FROM ohlcv_day_data o
    WHERE o.asset_id = a.asset_id
    ORDER BY o.timestamp_utc DESC
    LIMIT 1
) ohlcv_daily ON true

LEFT JOIN stock_profiles sp ON sp.asset_id = a.asset_id
LEFT JOIN crypto_data cd ON cd.asset_id = a.asset_id
-- Latest world assets ranking per asset
LEFT JOIN LATERAL (
    SELECT w.market_cap_usd, w.price_usd, w.daily_change_percent
    FROM world_assets_ranking w
    WHERE w.asset_id = a.asset_id
    ORDER BY w.ranking_date DESC, w.last_updated DESC NULLS LAST
    LIMIT 1
) war ON true

-- Latest realtime quote
LEFT JOIN LATERAL (
    SELECT r.timestamp_utc, r.price, r.change_percent
    FROM realtime_quotes r
    WHERE r.asset_id = a.asset_id
    ORDER BY r.timestamp_utc DESC
    LIMIT 1
) rq ON true

WHERE
    a.is_active = true
    AND war.market_cap_usd IS NOT NULL
    AND (
        ohlcv_daily.timestamp_utc >= date_trunc('day', (NOW() AT TIME ZONE 'UTC') - INTERVAL '3 days')
        OR war.market_cap_usd IS NOT NULL
    );


