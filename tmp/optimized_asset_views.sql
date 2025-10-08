-- =====================================================
-- 최적화된 자산 타입별 개별 뷰 생성
-- 성능과 유지보수성을 고려한 설계
-- =====================================================

-- 1. 기본 자산 정보 뷰 (모든 자산 공통)
CREATE OR REPLACE VIEW asset_basic_info AS
SELECT 
    a.asset_id,
    a.ticker,
    a.name,
    a.exchange,
    a.currency,
    a.description,
    a.is_active,
    a.created_at,
    a.updated_at,
    at.type_name,
    at.description as type_description,
    CASE 
        WHEN at.type_name = 'Stocks' THEN 'stock'
        WHEN at.type_name = 'ETFs' THEN 'etf'
        WHEN at.type_name = 'Crypto' THEN 'crypto'
        WHEN at.type_name = 'Commodities' THEN 'commodity'
        ELSE 'unknown'
    END as asset_category
FROM assets a
LEFT JOIN asset_types at ON a.asset_type_id = at.asset_type_id
WHERE a.is_active = true;

-- 2. 주식 전용 뷰
CREATE OR REPLACE VIEW stock_overview AS
SELECT 
    abi.*,
    -- 주식 프로필
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
    sp.logo_image_url,
    
    -- 주식 재무 정보
    sf.market_cap,
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
    
    -- 52주 고가/저가
    ohlcv_52w.week_52_high,
    ohlcv_52w.week_52_low,
    
    -- 이동평균
    ohlcv_ma.day_50_avg,
    ohlcv_ma2.day_200_avg
    
FROM asset_basic_info abi
LEFT JOIN stock_profiles sp ON abi.asset_id = sp.asset_id
LEFT JOIN stock_financials sf ON abi.asset_id = sf.asset_id
LEFT JOIN LATERAL (
    SELECT 
        MAX(high_price) as week_52_high,
        MIN(low_price) as week_52_low
    FROM ohlcv_day_data ohlcv52
    WHERE ohlcv52.asset_id = abi.asset_id
    AND ohlcv52.timestamp_utc >= CURRENT_DATE - INTERVAL '365 days'
) ohlcv_52w ON true
LEFT JOIN LATERAL (
    SELECT 
        AVG(close_price) as day_50_avg
    FROM (
        SELECT close_price
        FROM ohlcv_day_data ohlcv50
        WHERE ohlcv50.asset_id = abi.asset_id
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
        WHERE ohlcv200.asset_id = abi.asset_id
        ORDER BY ohlcv200.timestamp_utc DESC
        LIMIT 200
    ) recent_200
) ohlcv_ma2 ON true
WHERE abi.type_name = 'Stocks';

-- 3. 암호화폐 전용 뷰
CREATE OR REPLACE VIEW crypto_overview AS
SELECT 
    abi.*,
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
    cd.last_updated as crypto_last_updated
FROM asset_basic_info abi
LEFT JOIN crypto_data cd ON abi.asset_id = cd.asset_id
WHERE abi.type_name = 'Crypto';

-- 4. ETF 전용 뷰
CREATE OR REPLACE VIEW etf_overview AS
SELECT 
    abi.*,
    ei.net_assets,
    ei.net_expense_ratio,
    ei.portfolio_turnover,
    ei.dividend_yield as etf_dividend_yield,
    ei.inception_date,
    ei.leveraged,
    ei.sectors,
    ei.holdings
FROM asset_basic_info abi
LEFT JOIN etf_info ei ON abi.asset_id = ei.asset_id
WHERE abi.type_name = 'ETFs';

-- 5. 애널리스트 추정치 뷰 (주식 전용)
CREATE OR REPLACE VIEW stock_estimates AS
SELECT 
    abi.asset_id,
    abi.ticker,
    abi.name,
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
    sae.sga_expense_high
FROM asset_basic_info abi
LEFT JOIN stock_analyst_estimates sae ON abi.asset_id = sae.asset_id
WHERE abi.type_name = 'Stocks';

-- 인덱스 최적화
CREATE INDEX IF NOT EXISTS idx_asset_basic_ticker ON assets(ticker) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_asset_basic_type ON assets(asset_type_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_stock_profiles_asset ON stock_profiles(asset_id);
CREATE INDEX IF NOT EXISTS idx_stock_financials_asset ON stock_financials(asset_id);
CREATE INDEX IF NOT EXISTS idx_crypto_data_asset ON crypto_data(asset_id);
CREATE INDEX IF NOT EXISTS idx_etf_info_asset ON etf_info(asset_id);

-- 뷰 코멘트
COMMENT ON VIEW asset_basic_info IS '모든 자산의 기본 정보';
COMMENT ON VIEW stock_overview IS '주식 전용 개요 정보';
COMMENT ON VIEW crypto_overview IS '암호화폐 전용 개요 정보';
COMMENT ON VIEW etf_overview IS 'ETF 전용 개요 정보';
COMMENT ON VIEW stock_estimates IS '주식 애널리스트 추정치';
