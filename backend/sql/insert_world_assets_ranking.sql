-- Insert sample data into world_assets_ranking table
-- This script inserts sample ranking data for various asset types

-- Insert sample stocks (asset_type_id = 2)
INSERT INTO world_assets_ranking (
    rank, name, ticker, market_cap_usd, price_usd, daily_change_percent, 
    asset_type_id, asset_id, country, ranking_date, data_source, last_updated
) VALUES
-- Top US Stocks
(1, 'Apple Inc', 'AAPL', 3000000000000, 195.50, 2.15, 2, NULL, 'US', CURDATE(), 'companiesmarketcap', NOW()),
(2, 'Microsoft Corporation', 'MSFT', 2800000000000, 375.20, 1.85, 2, NULL, 'US', CURDATE(), 'companiesmarketcap', NOW()),
(3, 'NVIDIA Corporation', 'NVDA', 2200000000000, 875.30, 3.45, 2, NULL, 'US', CURDATE(), 'companiesmarketcap', NOW()),
(4, 'Alphabet Inc Class A', 'GOOGL', 1800000000000, 145.80, 1.25, 2, NULL, 'US', CURDATE(), 'companiesmarketcap', NOW()),
(5, 'Amazon.com Inc', 'AMZN', 1500000000000, 155.40, 2.65, 2, NULL, 'US', CURDATE(), 'companiesmarketcap', NOW()),
(6, 'Tesla Inc', 'TSLA', 800000000000, 245.60, 4.20, 2, NULL, 'US', CURDATE(), 'companiesmarketcap', NOW()),
(7, 'Meta Platforms Inc', 'META', 750000000000, 485.20, 1.95, 2, NULL, 'US', CURDATE(), 'companiesmarketcap', NOW()),
(8, 'Berkshire Hathaway Inc Class B', 'BRK.B', 700000000000, 385.50, 0.85, 2, NULL, 'US', CURDATE(), 'companiesmarketcap', NOW()),
(9, 'Taiwan Semiconductor', 'TSM', 650000000000, 125.40, 2.10, 2, NULL, 'TW', CURDATE(), 'companiesmarketcap', NOW()),
(10, 'Broadcom Inc', 'AVGO', 600000000000, 1250.80, 1.45, 2, NULL, 'US', CURDATE(), 'companiesmarketcap', NOW()),

-- Insert sample ETFs (asset_type_id = 5)
(1, 'SPDR S&P 500 ETF Trust', 'SPY', 450000000000, 520.30, 1.25, 5, NULL, 'US', CURDATE(), '8marketcap_etfs', NOW()),
(2, 'iShares Core S&P 500 ETF', 'IVV', 380000000000, 520.15, 1.20, 5, NULL, 'US', CURDATE(), '8marketcap_etfs', NOW()),
(3, 'Vanguard Total Stock Market ETF', 'VTI', 350000000000, 264.80, 1.15, 5, NULL, 'US', CURDATE(), '8marketcap_etfs', NOW()),
(4, 'Invesco QQQ Trust', 'QQQ', 200000000000, 425.60, 2.35, 5, NULL, 'US', CURDATE(), '8marketcap_etfs', NOW()),
(5, 'Vanguard S&P 500 ETF', 'VOO', 180000000000, 480.20, 1.18, 5, NULL, 'US', CURDATE(), '8marketcap_etfs', NOW()),
(6, 'iShares Russell 2000 ETF', 'IWM', 65000000000, 195.40, 0.95, 5, NULL, 'US', CURDATE(), '8marketcap_etfs', NOW()),
(7, 'Vanguard Total International Stock ETF', 'VXUS', 45000000000, 55.80, 0.85, 5, NULL, 'Global', CURDATE(), '8marketcap_etfs', NOW()),
(8, 'iShares MSCI EAFE ETF', 'EFA', 40000000000, 75.20, 0.75, 5, NULL, 'Global', CURDATE(), '8marketcap_etfs', NOW()),
(9, 'Vanguard FTSE Developed Markets ETF', 'VEA', 35000000000, 45.60, 0.65, 5, NULL, 'Global', CURDATE(), '8marketcap_etfs', NOW()),
(10, 'SPDR Gold Trust', 'GLD', 30000000000, 185.40, 1.25, 5, NULL, 'US', CURDATE(), '8marketcap_etfs', NOW()),

-- Insert sample cryptocurrencies (asset_type_id = 1)
(1, 'Bitcoin', 'BTC', 1200000000000, 65000.50, 2.85, 1, NULL, 'Global', CURDATE(), '8marketcap_cryptos', NOW()),
(2, 'Ethereum', 'ETH', 400000000000, 3200.80, 3.25, 1, NULL, 'Global', CURDATE(), '8marketcap_cryptos', NOW()),
(3, 'Tether', 'USDT', 120000000000, 1.00, 0.01, 1, NULL, 'Global', CURDATE(), '8marketcap_cryptos', NOW()),
(4, 'BNB', 'BNB', 95000000000, 580.20, 1.95, 1, NULL, 'Global', CURDATE(), '8marketcap_cryptos', NOW()),
(5, 'Solana', 'SOL', 85000000000, 185.60, 4.15, 1, NULL, 'Global', CURDATE(), '8marketcap_cryptos', NOW()),
(6, 'XRP', 'XRP', 65000000000, 1.15, 2.45, 1, NULL, 'Global', CURDATE(), '8marketcap_cryptos', NOW()),
(7, 'USDC', 'USDC', 60000000000, 1.00, 0.00, 1, NULL, 'Global', CURDATE(), '8marketcap_cryptos', NOW()),
(8, 'Cardano', 'ADA', 45000000000, 0.65, 1.85, 1, NULL, 'Global', CURDATE(), '8marketcap_cryptos', NOW()),
(9, 'Dogecoin', 'DOGE', 35000000000, 0.25, 3.75, 1, NULL, 'Global', CURDATE(), '8marketcap_cryptos', NOW()),
(10, 'Avalanche', 'AVAX', 30000000000, 35.80, 2.65, 1, NULL, 'Global', CURDATE(), '8marketcap_cryptos', NOW()),

-- Insert sample metals (asset_type_id = 3)
(1, 'Gold', 'GOLD', 15000000000000, 2050.50, 1.25, 3, NULL, 'Global', CURDATE(), '8marketcap_metals', NOW()),
(2, 'Silver', 'SILVER', 1800000000000, 28.50, 2.15, 3, NULL, 'Global', CURDATE(), '8marketcap_metals', NOW()),
(3, 'Platinum', 'PLATINUM', 800000000000, 950.20, 0.85, 3, NULL, 'Global', CURDATE(), '8marketcap_metals', NOW()),
(4, 'Palladium', 'PALLADIUM', 200000000000, 1200.80, 1.45, 3, NULL, 'Global', CURDATE(), '8marketcap_metals', NOW()),
(5, 'Copper', 'COPPER', 150000000000, 4.25, 0.95, 3, NULL, 'Global', CURDATE(), '8marketcap_metals', NOW()),
(6, 'Aluminum', 'ALUMINUM', 80000000000, 2.15, 0.65, 3, NULL, 'Global', CURDATE(), '8marketcap_metals', NOW()),
(7, 'Zinc', 'ZINC', 45000000000, 2.85, 1.25, 3, NULL, 'Global', CURDATE(), '8marketcap_metals', NOW()),
(8, 'Nickel', 'NICKEL', 35000000000, 18.50, 2.35, 3, NULL, 'Global', CURDATE(), '8marketcap_metals', NOW()),
(9, 'Lead', 'LEAD', 25000000000, 2.05, 0.75, 3, NULL, 'Global', CURDATE(), '8marketcap_metals', NOW()),
(10, 'Tin', 'TIN', 15000000000, 28.50, 1.85, 3, NULL, 'Global', CURDATE(), '8marketcap_metals', NOW());

-- Show summary of inserted data
SELECT 
    'Insert Summary' as info,
    COUNT(*) as total_records,
    SUM(CASE WHEN asset_type_id = 1 THEN 1 ELSE 0 END) as crypto_records,
    SUM(CASE WHEN asset_type_id = 2 THEN 1 ELSE 0 END) as stock_records,
    SUM(CASE WHEN asset_type_id = 3 THEN 1 ELSE 0 END) as metal_records,
    SUM(CASE WHEN asset_type_id = 5 THEN 1 ELSE 0 END) as etf_records
FROM world_assets_ranking 
WHERE ranking_date = CURDATE();

-- Show sample of inserted data
SELECT 
    rank,
    name,
    ticker,
    market_cap_usd,
    price_usd,
    daily_change_percent,
    asset_type_id,
    country,
    data_source
FROM world_assets_ranking 
WHERE ranking_date = CURDATE()
ORDER BY asset_type_id, rank
LIMIT 20;
