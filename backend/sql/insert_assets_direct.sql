-- Direct INSERT statements for assets table
-- Insert assets with specific asset_id, ticker, asset_type_id, name

-- Insert cryptocurrencies (asset_type_id = 1)
INSERT INTO assets (asset_id, ticker, asset_type_id, name, created_at, updated_at) VALUES
(1001, 'BTC', 1, 'Bitcoin', NOW(), NOW()),
(1002, 'ETH', 1, 'Ethereum', NOW(), NOW()),
(1003, 'USDT', 1, 'Tether', NOW(), NOW()),
(1004, 'BNB', 1, 'BNB', NOW(), NOW()),
(1005, 'SOL', 1, 'Solana', NOW(), NOW()),
(1006, 'XRP', 1, 'XRP', NOW(), NOW()),
(1007, 'USDC', 1, 'USD Coin', NOW(), NOW()),
(1008, 'ADA', 1, 'Cardano', NOW(), NOW()),
(1009, 'DOGE', 1, 'Dogecoin', NOW(), NOW()),
(1010, 'AVAX', 1, 'Avalanche', NOW(), NOW());

-- Insert stocks (asset_type_id = 2)
INSERT INTO assets (asset_id, ticker, asset_type_id, name, created_at, updated_at) VALUES
(2001, 'AAPL', 2, 'Apple Inc', NOW(), NOW()),
(2002, 'MSFT', 2, 'Microsoft Corporation', NOW(), NOW()),
(2003, 'NVDA', 2, 'NVIDIA Corporation', NOW(), NOW()),
(2004, 'GOOGL', 2, 'Alphabet Inc Class A', NOW(), NOW()),
(2005, 'AMZN', 2, 'Amazon.com Inc', NOW(), NOW()),
(2006, 'TSLA', 2, 'Tesla Inc', NOW(), NOW()),
(2007, 'META', 2, 'Meta Platforms Inc', NOW(), NOW()),
(2008, 'BRK.B', 2, 'Berkshire Hathaway Inc Class B', NOW(), NOW()),
(2009, 'TSM', 2, 'Taiwan Semiconductor', NOW(), NOW()),
(2010, 'AVGO', 2, 'Broadcom Inc', NOW(), NOW());

-- Insert metals (asset_type_id = 3)
INSERT INTO assets (asset_id, ticker, asset_type_id, name, created_at, updated_at) VALUES
(3001, 'GOLD', 3, 'Gold', NOW(), NOW()),
(3002, 'SILVER', 3, 'Silver', NOW(), NOW()),
(3003, 'PLATINUM', 3, 'Platinum', NOW(), NOW()),
(3004, 'PALLADIUM', 3, 'Palladium', NOW(), NOW()),
(3005, 'COPPER', 3, 'Copper', NOW(), NOW()),
(3006, 'ALUMINUM', 3, 'Aluminum', NOW(), NOW()),
(3007, 'ZINC', 3, 'Zinc', NOW(), NOW()),
(3008, 'NICKEL', 3, 'Nickel', NOW(), NOW()),
(3009, 'LEAD', 3, 'Lead', NOW(), NOW()),
(3010, 'TIN', 3, 'Tin', NOW(), NOW());

-- Insert ETFs (asset_type_id = 5)
INSERT INTO assets (asset_id, ticker, asset_type_id, name, created_at, updated_at) VALUES
(5001, 'SPY', 5, 'SPDR S&P 500 ETF Trust', NOW(), NOW()),
(5002, 'IVV', 5, 'iShares Core S&P 500 ETF', NOW(), NOW()),
(5003, 'VTI', 5, 'Vanguard Total Stock Market ETF', NOW(), NOW()),
(5004, 'QQQ', 5, 'Invesco QQQ Trust', NOW(), NOW()),
(5005, 'VOO', 5, 'Vanguard S&P 500 ETF', NOW(), NOW()),
(5006, 'IWM', 5, 'iShares Russell 2000 ETF', NOW(), NOW()),
(5007, 'VXUS', 5, 'Vanguard Total International Stock ETF', NOW(), NOW()),
(5008, 'EFA', 5, 'iShares MSCI EAFE ETF', NOW(), NOW()),
(5009, 'VEA', 5, 'Vanguard FTSE Developed Markets ETF', NOW(), NOW()),
(5010, 'GLD', 5, 'SPDR Gold Trust', NOW(), NOW());

-- Show inserted assets
SELECT 
    asset_id,
    ticker,
    asset_type_id,
    name,
    created_at
FROM assets 
WHERE asset_id >= 1001
ORDER BY asset_type_id, asset_id;

