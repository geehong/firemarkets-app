-- Insert missing assets from world_assets_ranking into assets table
-- Simple INSERT statements for assets that don't exist in assets table

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
WHERE a.asset_id IS NULL 
  AND war.ticker IS NOT NULL 
  AND war.asset_type_id = 2
  AND war.ranking_date = CURDATE()
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
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
WHERE a.asset_id IS NULL 
  AND war.ticker IS NOT NULL 
  AND war.asset_type_id = 5
  AND war.ranking_date = CURDATE()
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
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
WHERE a.asset_id IS NULL 
  AND war.ticker IS NOT NULL 
  AND war.asset_type_id = 1
  AND war.ranking_date = CURDATE()
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
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
WHERE a.asset_id IS NULL 
  AND war.ticker IS NOT NULL 
  AND war.asset_type_id = 3
  AND war.ranking_date = CURDATE()
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    updated_at = NOW();

-- Show inserted count
SELECT 
    'Inserted Assets' as info,
    COUNT(*) as total_inserted
FROM assets 
WHERE created_at >= CURDATE();

