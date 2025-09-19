-- Improved PostgreSQL Trigger for automatic asset_id mapping
-- This trigger handles multiple scenarios for asset mapping

CREATE OR REPLACE FUNCTION auto_map_asset_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If asset_type_id is NULL but we have ticker, try to find it
    IF NEW.asset_type_id IS NULL AND NEW.ticker IS NOT NULL THEN
        SELECT asset_type_id INTO NEW.asset_type_id
        FROM assets 
        WHERE ticker = NEW.ticker
        LIMIT 1;
        
        IF NEW.asset_type_id IS NOT NULL THEN
            RAISE NOTICE 'Auto-mapped asset_type_id % for ticker %', NEW.asset_type_id, NEW.ticker;
        END IF;
    END IF;
    
    -- If asset_id is NULL and we have ticker and asset_type_id, try to find it
    IF NEW.asset_id IS NULL AND NEW.ticker IS NOT NULL AND NEW.asset_type_id IS NOT NULL THEN
        SELECT asset_id INTO NEW.asset_id
        FROM assets 
        WHERE ticker = NEW.ticker 
        AND asset_type_id = NEW.asset_type_id
        LIMIT 1;
        
        IF NEW.asset_id IS NOT NULL THEN
            RAISE NOTICE 'Auto-mapped asset_id % for ticker % (type %)', NEW.asset_id, NEW.ticker, NEW.asset_type_id;
        END IF;
    END IF;
    
    -- If still no asset_id found, try to find any asset with this ticker (fallback)
    IF NEW.asset_id IS NULL AND NEW.ticker IS NOT NULL THEN
        SELECT asset_id, asset_type_id INTO NEW.asset_id, NEW.asset_type_id
        FROM assets 
        WHERE ticker = NEW.ticker
        LIMIT 1;
        
        IF NEW.asset_id IS NOT NULL THEN
            RAISE NOTICE 'Fallback mapped asset_id % and asset_type_id % for ticker %', NEW.asset_id, NEW.asset_type_id, NEW.ticker;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Test the improved trigger
UPDATE world_assets_ranking 
SET asset_id = NULL, asset_type_id = NULL 
WHERE ranking_date = CURRENT_DATE 
AND ticker = '9984.T';

-- Show results
SELECT 
    'Improved Trigger Test Results' as info,
    COUNT(*) as total_records,
    COUNT(CASE WHEN asset_id IS NULL THEN 1 END) as null_asset_id,
    COUNT(CASE WHEN asset_type_id IS NULL THEN 1 END) as null_asset_type_id
FROM world_assets_ranking 
WHERE ranking_date = CURRENT_DATE;

