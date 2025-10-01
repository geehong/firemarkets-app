-- 동적 메뉴 순서 변경: Dashboard > Assets > OnChain > Map > 기타
-- 메뉴 순서를 재정렬합니다

-- 1. 기존 메뉴 순서 초기화
UPDATE menus SET "order" = 0 WHERE parent_id IS NULL;

-- 2. 메인 메뉴 순서 설정
UPDATE menus SET "order" = 10 WHERE name = 'Dashboard' AND parent_id IS NULL;
UPDATE menus SET "order" = 20 WHERE name = 'Assets' AND parent_id IS NULL;
UPDATE menus SET "order" = 30 WHERE name = 'OnChain' AND parent_id IS NULL;
UPDATE menus SET "order" = 40 WHERE name = 'Map' AND parent_id IS NULL;

-- 3. 기타 메뉴들은 100부터 시작
UPDATE menus SET "order" = 100 WHERE name = 'Theme' AND parent_id IS NULL;
UPDATE menus SET "order" = 110 WHERE name = 'Components' AND parent_id IS NULL;
UPDATE menus SET "order" = 120 WHERE name = 'Charts' AND parent_id IS NULL;
UPDATE menus SET "order" = 130 WHERE name = 'Icons' AND parent_id IS NULL;
UPDATE menus SET "order" = 140 WHERE name = 'Notifications' AND parent_id IS NULL;
UPDATE menus SET "order" = 150 WHERE name = 'Widgets' AND parent_id IS NULL;
UPDATE menus SET "order" = 160 WHERE name = '테스트' AND parent_id IS NULL;
UPDATE menus SET "order" = 170 WHERE name = 'Extras' AND parent_id IS NULL;
UPDATE menus SET "order" = 180 WHERE name = 'Pages' AND parent_id IS NULL;
UPDATE menus SET "order" = 190 WHERE name = 'Docs' AND parent_id IS NULL;

-- 4. Assets 하위 메뉴 순서 설정
UPDATE menus SET "order" = 10 WHERE name = 'Indices' AND parent_id = (SELECT id FROM menus WHERE name = 'Assets' AND parent_id IS NULL);
UPDATE menus SET "order" = 20 WHERE name = 'Stocks' AND parent_id = (SELECT id FROM menus WHERE name = 'Assets' AND parent_id IS NULL);
UPDATE menus SET "order" = 30 WHERE name = 'Commodities' AND parent_id = (SELECT id FROM menus WHERE name = 'Assets' AND parent_id IS NULL);
UPDATE menus SET "order" = 40 WHERE name = 'Currencies' AND parent_id = (SELECT id FROM menus WHERE name = 'Assets' AND parent_id IS NULL);
UPDATE menus SET "order" = 50 WHERE name = 'ETFs' AND parent_id = (SELECT id FROM menus WHERE name = 'Assets' AND parent_id IS NULL);
UPDATE menus SET "order" = 60 WHERE name = 'Bonds' AND parent_id = (SELECT id FROM menus WHERE name = 'Assets' AND parent_id IS NULL);
UPDATE menus SET "order" = 70 WHERE name = 'Funds' AND parent_id = (SELECT id FROM menus WHERE name = 'Assets' AND parent_id IS NULL);
UPDATE menus SET "order" = 80 WHERE name = 'Crypto' AND parent_id = (SELECT id FROM menus WHERE name = 'Assets' AND parent_id IS NULL);

-- 5. OnChain 하위 메뉴 순서 설정 (동적으로 생성된 메뉴들)
UPDATE menus SET "order" = 10 WHERE name LIKE '%MVRV%' AND parent_id = (SELECT id FROM menus WHERE name = 'OnChain' AND parent_id IS NULL);
UPDATE menus SET "order" = 20 WHERE name LIKE '%Realized Price%' AND parent_id = (SELECT id FROM menus WHERE name = 'OnChain' AND parent_id IS NULL);
UPDATE menus SET "order" = 30 WHERE name LIKE '%SOPR%' AND parent_id = (SELECT id FROM menus WHERE name = 'OnChain' AND parent_id IS NULL);
UPDATE menus SET "order" = 40 WHERE name LIKE '%NUPL%' AND parent_id = (SELECT id FROM menus WHERE name = 'OnChain' AND parent_id IS NULL);
UPDATE menus SET "order" = 50 WHERE name LIKE '%Hash Rate%' AND parent_id = (SELECT id FROM menus WHERE name = 'OnChain' AND parent_id IS NULL);
UPDATE menus SET "order" = 60 WHERE name LIKE '%Difficulty%' AND parent_id = (SELECT id FROM menus WHERE name = 'OnChain' AND parent_id IS NULL);
UPDATE menus SET "order" = 70 WHERE name LIKE '%ETF%' AND parent_id = (SELECT id FROM menus WHERE name = 'OnChain' AND parent_id IS NULL);

-- 6. Map 하위 메뉴 순서 설정
UPDATE menus SET "order" = 10 WHERE name = 'Performance Map' AND parent_id = (SELECT id FROM menus WHERE name = 'Map' AND parent_id IS NULL);
UPDATE menus SET "order" = 20 WHERE name = 'World Assets TreeMap' AND parent_id = (SELECT id FROM menus WHERE name = 'Map' AND parent_id IS NULL);

-- 7. 결과 확인
SELECT 
    name, 
    "order", 
    parent_id,
    CASE 
        WHEN parent_id IS NULL THEN 'Main Menu'
        ELSE 'Sub Menu'
    END as menu_type
FROM menus 
WHERE is_active = true 
ORDER BY 
    CASE WHEN parent_id IS NULL THEN "order" ELSE (SELECT "order" FROM menus m2 WHERE m2.id = menus.parent_id) END,
    CASE WHEN parent_id IS NULL THEN 0 ELSE "order" END;

DO $$
BEGIN
    RAISE NOTICE '메뉴 순서가 다음과 같이 변경되었습니다:';
    RAISE NOTICE '1. Dashboard (order: 10)';
    RAISE NOTICE '2. Assets (order: 20)';
    RAISE NOTICE '3. OnChain (order: 30)';
    RAISE NOTICE '4. Map (order: 40)';
    RAISE NOTICE '5. 기타 메뉴들 (order: 100+)';
END $$;
