-- =====================================================
-- Asset Overview 통합 뷰 생성
-- 모든 자산 유형(주식, ETF, 암호화폐, 상품)의 데이터를 통합
-- =====================================================

CREATE OR REPLACE VIEW asset_overview_unified AS
SELECT 
    -- 기본 자산 정보
    a.asset_id,
    a.ticker,
    a.name,
    a.exchange,
    a.currency,
    a.description as asset_description,
    a.logo_image_url,
    a.is_active,
    a.created_at as asset_created_at,
    a.updated_at as asset_updated_at,
    
    -- 자산 타입 정보
    at.type_name,
    at.description as type_description,
    
    -- 실시간 가격 데이터 (최신)
    rq.price as current_price,
    rq.change_amount,
    rq.change_percent,
    rq.volume as realtime_volume,
    rq.timestamp_utc as price_timestamp,
    rq.data_source as price_source,
    
    -- OHLCV 데이터 (최신)
    ohlcv.open_price,
    ohlcv.high_price,
    ohlcv.low_price,
    ohlcv.close_price,
    ohlcv.volume as ohlcv_volume,
    ohlcv.timestamp_utc as ohlcv_timestamp,
    ohlcv.change_percent as ohlcv_change_percent,
    
    -- 52주 고가/저가 (OHLCV에서 계산)
    ohlcv_52w.week_52_high,
    ohlcv_52w.week_52_low,
    
    -- 50일/200일 이동평균 (OHLCV에서 계산)
    ohlcv_ma.day_50_avg,
    ohlcv_ma.day_200_avg,
    
    -- 주식 프로필 정보
    sp.company_name,
    sp.sector,
    sp.industry,
    sp.country,
    sp.city,
    sp.address,
    sp.phone,
    sp.website,
    sp.ceo,
    sp.employees_count,
    sp.ipo_date,
    sp.state,
    sp.zip_code,
    sp.exchange_full_name,
    sp.cik,
    sp.isin,
    sp.cusip,
    sp.description_en,
    sp.description_ko,
    sp.market_cap as profile_market_cap,
    
    -- 주식 재무 정보
    sf.market_cap as financial_market_cap,
    sf.ebitda,
    sf.shares_outstanding,
    sf.pe_ratio,
    sf.peg_ratio,
    sf.beta,
    sf.eps,
    sf.dividend_yield,
    sf.dividend_per_share,
    sf.profit_margin_ttm,
    sf.return_on_equity_ttm,
    sf.revenue_ttm,
    sf.price_to_book_ratio,
    sf.book_value,
    sf.revenue_per_share_ttm,
    sf.operating_margin_ttm,
    sf.return_on_assets_ttm,
    sf.gross_profit_ttm,
    sf.quarterly_earnings_growth_yoy,
    sf.quarterly_revenue_growth_yoy,
    sf.analyst_target_price,
    sf.trailing_pe,
    sf.forward_pe,
    sf.price_to_sales_ratio_ttm,
    sf.ev_to_revenue,
    sf.ev_to_ebitda,
    
    -- 주식 애널리스트 추정치 (최신)
    sae.fiscal_date,
    sae.revenue_avg,
    sae.revenue_low,
    sae.revenue_high,
    sae.revenue_analysts_count,
    sae.eps_avg,
    sae.eps_low,
    sae.eps_high,
    sae.eps_analysts_count,
    sae.ebitda_avg,
    sae.ebitda_low,
    sae.ebitda_high,
    sae.ebit_avg,
    sae.ebit_low,
    sae.ebit_high,
    sae.net_income_avg,
    sae.net_income_low,
    sae.net_income_high,
    sae.sga_expense_avg,
    sae.sga_expense_low,
    sae.sga_expense_high,
    
    -- 암호화폐 데이터
    cd.symbol as crypto_symbol,
    cd.name as crypto_name,
    cd.market_cap as crypto_market_cap,
    cd.circulating_supply,
    cd.total_supply,
    cd.max_supply,
    cd.current_price as crypto_current_price,
    cd.volume_24h,
    cd.percent_change_1h,
    cd.percent_change_24h,
    cd.percent_change_7d,
    cd.percent_change_30d,
    cd.cmc_rank,
    cd.category,
    cd.description as crypto_description,
    cd.logo_url,
    cd.website_url,
    cd.slug,
    cd.date_added,
    cd.platform,
    cd.explorer,
    cd.source_code,
    cd.tags,
    cd.is_active as crypto_is_active,
    cd.last_updated as crypto_last_updated,
    
    -- ETF 정보
    ei.net_assets,
    ei.net_expense_ratio,
    ei.portfolio_turnover,
    ei.dividend_yield as etf_dividend_yield,
    ei.inception_date,
    ei.leveraged,
    ei.sectors,
    ei.holdings,
    
    -- 메타데이터
    CASE 
        WHEN at.type_name = 'Stocks' THEN 'stock'
        WHEN at.type_name = 'ETFs' THEN 'etf'
        WHEN at.type_name = 'Crypto' THEN 'crypto'
        WHEN at.type_name = 'Commodities' THEN 'commodity'
        ELSE 'unknown'
    END as asset_category

FROM assets a
LEFT JOIN asset_types at ON a.asset_type_id = at.asset_type_id

-- 실시간 가격 데이터 (최신)
LEFT JOIN LATERAL (
    SELECT * FROM realtime_quotes rq1
    WHERE rq1.asset_id = a.asset_id
    ORDER BY rq1.timestamp_utc DESC
    LIMIT 1
) rq ON true

-- OHLCV 데이터 (최신)
LEFT JOIN LATERAL (
    SELECT * FROM ohlcv_day_data ohlcv1
    WHERE ohlcv1.asset_id = a.asset_id
    ORDER BY ohlcv1.timestamp_utc DESC
    LIMIT 1
) ohlcv ON true

-- 52주 고가/저가 계산
LEFT JOIN LATERAL (
    SELECT 
        MAX(high_price) as week_52_high,
        MIN(low_price) as week_52_low
    FROM ohlcv_day_data ohlcv52
    WHERE ohlcv52.asset_id = a.asset_id
    AND ohlcv52.timestamp_utc >= CURRENT_DATE - INTERVAL '365 days'
) ohlcv_52w ON true

-- 50일/200일 이동평균 계산
LEFT JOIN LATERAL (
    SELECT 
        AVG(close_price) as day_50_avg
    FROM (
        SELECT close_price
        FROM ohlcv_day_data ohlcv50
        WHERE ohlcv50.asset_id = a.asset_id
        ORDER BY ohlcv50.timestamp_utc DESC
        LIMIT 50
    ) recent_50
) ohlcv_ma ON true

LEFT JOIN LATERAL (
    SELECT 
        AVG(close_price) as day_200_avg
    FROM (
        SELECT close_price
        FROM ohlcv_day_data ohlcv200
        WHERE ohlcv200.asset_id = a.asset_id
        ORDER BY ohlcv200.timestamp_utc DESC
        LIMIT 200
    ) recent_200
) ohlcv_ma2 ON true

-- 주식 프로필
LEFT JOIN stock_profiles sp ON a.asset_id = sp.asset_id

-- 주식 재무 정보
LEFT JOIN stock_financials sf ON a.asset_id = sf.asset_id

-- 주식 애널리스트 추정치 (최신)
LEFT JOIN LATERAL (
    SELECT * FROM stock_analyst_estimates sae1
    WHERE sae1.asset_id = a.asset_id
    ORDER BY sae1.fiscal_date DESC
    LIMIT 1
) sae ON true

-- 암호화폐 데이터
LEFT JOIN crypto_data cd ON a.asset_id = cd.asset_id

-- ETF 정보
LEFT JOIN etf_info ei ON a.asset_id = ei.asset_id

WHERE a.is_active = true;

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_asset_overview_ticker ON assets(ticker);
CREATE INDEX IF NOT EXISTS idx_asset_overview_type ON assets(asset_type_id);
CREATE INDEX IF NOT EXISTS idx_realtime_quotes_asset_timestamp ON realtime_quotes(asset_id, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_ohlcv_day_asset_timestamp ON ohlcv_day_data(asset_id, timestamp_utc DESC);

-- 뷰에 대한 코멘트
COMMENT ON VIEW asset_overview_unified IS '모든 자산 유형의 통합 개요 데이터를 제공하는 뷰';
