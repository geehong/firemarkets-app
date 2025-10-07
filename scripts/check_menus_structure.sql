-- Check current menus table structure and data
SELECT id, name, path, parent_id, source_type, menu_metadata 
FROM menus 
WHERE source_type = 'dynamic' 
ORDER BY id;

-- Check specific onchain indicators
SELECT id, name, menu_metadata 
FROM menus 
WHERE name IN (
  'mvrv_z_score', 'nupl', 'realized_cap', 'thermo_cap', 'realized_price', 
  'true_market_mean', 'aviv', 'sopr', 'cdd_90dma', 'hodl_waves_supply', 
  'nrpl_btc', 'hashrate', 'difficulty', 'miner_reserves', 'open_interest_futures', 
  'etf_btc_total', 'etf_btc_flow', 'hodl_age_distribution'
)
ORDER BY name;
