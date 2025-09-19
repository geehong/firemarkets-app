-- Insert assets from world_assets_ranking where asset_id is NULL
-- This script inserts all assets that exist in world_assets_ranking but have NULL asset_id

-- Insert missing stocks (asset_type_id = 2)
INSERT INTO assets (ticker, name, asset_type_id, created_at, updated_at)
SELECT DISTINCT 
    war.ticker,
    war.name,
    2 as asset_type_id,
    NOW() as created_at,
    NOW() as updated_at
FROM world_assets_ranking war
LEFT JOIN assets a ON war.ticker = a.ticker AND a.asset_type_id = 2
WHERE war.asset_id IS NULL 
  AND a.asset_id IS NULL
  AND war.ticker IS NOT NULL 
  AND war.ticker != ''
  AND war.asset_type_id = 2
ON CONFLICT (ticker, asset_type_id) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- Insert missing ETFs (asset_type_id = 5)
INSERT INTO assets (ticker, name, asset_type_id, created_at, updated_at)
SELECT DISTINCT 
    war.ticker,
    war.name,
    5 as asset_type_id,
    NOW() as created_at,
    NOW() as updated_at
FROM world_assets_ranking war
LEFT JOIN assets a ON war.ticker = a.ticker AND a.asset_type_id = 5
WHERE war.asset_id IS NULL 
  AND a.asset_id IS NULL
  AND war.ticker IS NOT NULL 
  AND war.ticker != ''
  AND war.asset_type_id = 5
ON CONFLICT (ticker, asset_type_id) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- Insert missing cryptocurrencies (asset_type_id = 1)
INSERT INTO assets (ticker, name, asset_type_id, created_at, updated_at)
SELECT DISTINCT 
    war.ticker,
    war.name,
    1 as asset_type_id,
    NOW() as created_at,
    NOW() as updated_at
FROM world_assets_ranking war
LEFT JOIN assets a ON war.ticker = a.ticker AND a.asset_type_id = 1
WHERE war.asset_id IS NULL 
  AND a.asset_id IS NULL
  AND war.ticker IS NOT NULL 
  AND war.ticker != ''
  AND war.asset_type_id = 1
ON CONFLICT (ticker, asset_type_id) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- Insert missing metals (asset_type_id = 3)
INSERT INTO assets (ticker, name, asset_type_id, created_at, updated_at)
SELECT DISTINCT 
    war.ticker,
    war.name,
    3 as asset_type_id,
    NOW() as created_at,
    NOW() as updated_at
FROM world_assets_ranking war
LEFT JOIN assets a ON war.ticker = a.ticker AND a.asset_type_id = 3
WHERE war.asset_id IS NULL 
  AND a.asset_id IS NULL
  AND war.ticker IS NOT NULL 
  AND war.ticker != ''
  AND war.asset_type_id = 3
ON CONFLICT (ticker, asset_type_id) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- Show summary of inserted assets
SELECT 
    'Inserted Assets Summary' as info,
    COUNT(*) as total_inserted,
    SUM(CASE WHEN asset_type_id = 1 THEN 1 ELSE 0 END) as crypto_inserted,
    SUM(CASE WHEN asset_type_id = 2 THEN 1 ELSE 0 END) as stocks_inserted,
    SUM(CASE WHEN asset_type_id = 3 THEN 1 ELSE 0 END) as metals_inserted,
    SUM(CASE WHEN asset_type_id = 5 THEN 1 ELSE 0 END) as etfs_inserted
FROM assets 
WHERE created_at >= CURRENT_DATE;

-- Show recently inserted assets
SELECT 
    asset_id,
    ticker,
    name,
    asset_type_id,
    created_at
FROM assets 
WHERE created_at >= CURRENT_DATE
ORDER BY asset_type_id, ticker
LIMIT 20;
