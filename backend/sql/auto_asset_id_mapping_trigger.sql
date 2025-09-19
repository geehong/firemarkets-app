-- PostgreSQL Trigger for automatic asset_id mapping in world_assets_ranking
-- This trigger automatically sets asset_id when inserting or updating world_assets_ranking

-- Function to automatically map asset_id
CREATE OR REPLACE FUNCTION auto_map_asset_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If asset_id is NULL and we have ticker and asset_type_id, try to find it
    IF NEW.asset_id IS NULL AND NEW.ticker IS NOT NULL AND NEW.asset_type_id IS NOT NULL THEN
        SELECT asset_id INTO NEW.asset_id
        FROM assets 
        WHERE ticker = NEW.ticker 
        AND asset_type_id = NEW.asset_type_id
        LIMIT 1;
        
        -- Log the mapping if found
        IF NEW.asset_id IS NOT NULL THEN
            RAISE NOTICE 'Auto-mapped asset_id % for ticker % (type %)', NEW.asset_id, NEW.ticker, NEW.asset_type_id;
        END IF;
    END IF;
    
    -- If asset_type_id is NULL but we have ticker, try to find it
    IF NEW.asset_type_id IS NULL AND NEW.ticker IS NOT NULL THEN
        SELECT asset_type_id INTO NEW.asset_type_id
        FROM assets 
        WHERE ticker = NEW.ticker
        LIMIT 1;
        
        -- If we found asset_type_id, also try to find asset_id
        IF NEW.asset_type_id IS NOT NULL AND NEW.asset_id IS NULL THEN
            SELECT asset_id INTO NEW.asset_id
            FROM assets 
            WHERE ticker = NEW.ticker 
            AND asset_type_id = NEW.asset_type_id
            LIMIT 1;
            
            IF NEW.asset_id IS NOT NULL THEN
                RAISE NOTICE 'Auto-mapped asset_type_id % and asset_id % for ticker %', NEW.asset_type_id, NEW.asset_id, NEW.ticker;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS trigger_auto_map_asset_id_insert ON world_assets_ranking;
CREATE TRIGGER trigger_auto_map_asset_id_insert
    BEFORE INSERT ON world_assets_ranking
    FOR EACH ROW
    EXECUTE FUNCTION auto_map_asset_id();

-- Create trigger for UPDATE
DROP TRIGGER IF EXISTS trigger_auto_map_asset_id_update ON world_assets_ranking;
CREATE TRIGGER trigger_auto_map_asset_id_update
    BEFORE UPDATE ON world_assets_ranking
    FOR EACH ROW
    EXECUTE FUNCTION auto_map_asset_id();

-- Test the trigger with existing NULL data
UPDATE world_assets_ranking 
SET asset_id = NULL, asset_type_id = NULL 
WHERE ranking_date = CURRENT_DATE 
LIMIT 5;

-- Show results
SELECT 
    'Trigger Test Results' as info,
    COUNT(*) as total_records,
    COUNT(CASE WHEN asset_id IS NULL THEN 1 END) as null_asset_id,
    COUNT(CASE WHEN asset_type_id IS NULL THEN 1 END) as null_asset_type_id
FROM world_assets_ranking 
WHERE ranking_date = CURRENT_DATE;

