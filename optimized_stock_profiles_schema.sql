-- Optimized Stock Profiles table schema
-- Integrates data from FMP, Finnhub, and Polygon APIs

-- Drop existing table if needed
-- DROP TABLE IF EXISTS stock_profiles CASCADE;

-- Create optimized stock_profiles table
CREATE TABLE stock_profiles (
    -- Primary identifiers
    profile_id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
    
    -- Basic company information (provided by all APIs)
    company_name VARCHAR(255) NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    description_en TEXT,  -- English description
    description_ko TEXT,  -- Korean description
    
    -- Classification information (provided by FMP, Finnhub, Polygon)
    sector VARCHAR(100),
    industry VARCHAR(100),
    country VARCHAR(50),
    
    -- Address information (provided by FMP, Polygon)
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    
    -- Contact information (provided by FMP, Finnhub, Polygon)
    phone VARCHAR(50),
    website VARCHAR(255),
    
    -- Executive information (provided by FMP)
    ceo VARCHAR(100),
    
    -- Employee count (provided by FMP, Polygon)
    employees_count INTEGER,
    
    -- Market information (provided by all APIs)
    market_cap BIGINT, -- Use BIGINT for large market cap values
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Listing information (provided by all APIs)
    ipo_date DATE,
    exchange VARCHAR(50),
    exchange_full_name VARCHAR(100),
    
    -- Identifier information (provided by FMP, Polygon)
    cik VARCHAR(20), -- SEC Central Index Key
    isin VARCHAR(20), -- International Securities Identification Number
    cusip VARCHAR(20), -- Committee on Uniform Securities Identification Procedures
    figi VARCHAR(50), -- Financial Instrument Global Identifier (Polygon)
    
    -- Visual elements (provided by FMP, Finnhub, Polygon)
    logo_image_url VARCHAR(500), -- Extended to 500 chars for long URLs
    
    -- Trading information (provided by FMP)
    beta DECIMAL(5,2), -- Beta value
    last_dividend DECIMAL(10,4), -- Last dividend
    price_range VARCHAR(50), -- Price range (e.g., "164.08-260.1")
    
    -- Additional metadata
    is_etf BOOLEAN DEFAULT FALSE,
    is_actively_trading BOOLEAN DEFAULT TRUE,
    is_adr BOOLEAN DEFAULT FALSE, -- American Depositary Receipt
    is_fund BOOLEAN DEFAULT FALSE,
    
    -- API source tracking (which API provided the data)
    data_source VARCHAR(50), -- 'fmp', 'finnhub', 'polygon'
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_asset_profile UNIQUE(asset_id)
);

-- Create indexes
CREATE INDEX idx_stock_profiles_asset_id ON stock_profiles(asset_id);
CREATE INDEX idx_stock_profiles_ticker ON stock_profiles(ticker);
CREATE INDEX idx_stock_profiles_sector ON stock_profiles(sector);
CREATE INDEX idx_stock_profiles_industry ON stock_profiles(industry);
CREATE INDEX idx_stock_profiles_country ON stock_profiles(country);
CREATE INDEX idx_stock_profiles_exchange ON stock_profiles(exchange);
CREATE INDEX idx_stock_profiles_data_source ON stock_profiles(data_source);
CREATE INDEX idx_stock_profiles_updated_at ON stock_profiles(updated_at);

-- Update trigger (auto-update updated_at)
CREATE OR REPLACE FUNCTION update_stock_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_profiles_updated_at
    BEFORE UPDATE ON stock_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_profiles_updated_at();

-- Create view for frequently used queries
CREATE VIEW stock_profiles_summary AS
SELECT 
    sp.profile_id,
    sp.asset_id,
    a.ticker,
    a.name as asset_name,
    sp.company_name,
    sp.sector,
    sp.industry,
    sp.country,
    sp.exchange,
    sp.market_cap,
    sp.currency,
    sp.employees_count,
    sp.ipo_date,
    sp.data_source,
    sp.updated_at
FROM stock_profiles sp
JOIN assets a ON sp.asset_id = a.asset_id
WHERE a.is_active = true;

-- Add comments
COMMENT ON TABLE stock_profiles IS 'Stock company profile information (integrated from FMP, Finnhub, Polygon APIs)';
COMMENT ON COLUMN stock_profiles.profile_id IS 'Profile unique ID';
COMMENT ON COLUMN stock_profiles.asset_id IS 'Asset ID (references assets table)';
COMMENT ON COLUMN stock_profiles.company_name IS 'Company name';
COMMENT ON COLUMN stock_profiles.ticker IS 'Ticker symbol';
COMMENT ON COLUMN stock_profiles.description_en IS 'Company description in English';
COMMENT ON COLUMN stock_profiles.description_ko IS 'Company description in Korean';
COMMENT ON COLUMN stock_profiles.sector IS 'Sector (Technology, Healthcare, etc.)';
COMMENT ON COLUMN stock_profiles.industry IS 'Industry (Consumer Electronics, etc.)';
COMMENT ON COLUMN stock_profiles.country IS 'Country code (US, KR, etc.)';
COMMENT ON COLUMN stock_profiles.address IS 'Company address';
COMMENT ON COLUMN stock_profiles.city IS 'City';
COMMENT ON COLUMN stock_profiles.state IS 'State/Province (CA, NY, etc.)';
COMMENT ON COLUMN stock_profiles.zip_code IS 'Postal code';
COMMENT ON COLUMN stock_profiles.phone IS 'Phone number';
COMMENT ON COLUMN stock_profiles.website IS 'Website URL';
COMMENT ON COLUMN stock_profiles.ceo IS 'CEO name';
COMMENT ON COLUMN stock_profiles.employees_count IS 'Number of employees';
COMMENT ON COLUMN stock_profiles.market_cap IS 'Market capitalization';
COMMENT ON COLUMN stock_profiles.currency IS 'Currency (USD, KRW, etc.)';
COMMENT ON COLUMN stock_profiles.ipo_date IS 'IPO date';
COMMENT ON COLUMN stock_profiles.exchange IS 'Exchange code (NASDAQ, NYSE, etc.)';
COMMENT ON COLUMN stock_profiles.exchange_full_name IS 'Full exchange name';
COMMENT ON COLUMN stock_profiles.cik IS 'SEC Central Index Key';
COMMENT ON COLUMN stock_profiles.isin IS 'International Securities Identification Number';
COMMENT ON COLUMN stock_profiles.cusip IS 'Committee on Uniform Securities Identification Procedures';
COMMENT ON COLUMN stock_profiles.figi IS 'Financial Instrument Global Identifier';
COMMENT ON COLUMN stock_profiles.logo_image_url IS 'Logo image URL';
COMMENT ON COLUMN stock_profiles.beta IS 'Beta value (volatility relative to market)';
COMMENT ON COLUMN stock_profiles.last_dividend IS 'Last dividend';
COMMENT ON COLUMN stock_profiles.price_range IS 'Price range';
COMMENT ON COLUMN stock_profiles.is_etf IS 'ETF flag';
COMMENT ON COLUMN stock_profiles.is_actively_trading IS 'Actively trading flag';
COMMENT ON COLUMN stock_profiles.is_adr IS 'American Depositary Receipt flag';
COMMENT ON COLUMN stock_profiles.is_fund IS 'Fund flag';
COMMENT ON COLUMN stock_profiles.data_source IS 'Data source (fmp, finnhub, polygon)';
COMMENT ON COLUMN stock_profiles.created_at IS 'Creation timestamp';
COMMENT ON COLUMN stock_profiles.updated_at IS 'Last update timestamp';
