-- 동적 메뉴 순서 변경: Dashboard > OnChain > Assets > Map > 기타
-- 기존 메뉴들의 링크도 함께 업데이트

-- 1. 메인 메뉴 순서 변경
UPDATE menus SET "order" = 10 WHERE name = 'Dashboard' AND parent_id IS NULL;
UPDATE menus SET "order" = 20 WHERE name = 'OnChain' AND parent_id IS NULL;
UPDATE menus SET "order" = 30 WHERE name = 'Assets' AND parent_id IS NULL;
UPDATE menus SET "order" = 40 WHERE name = 'Map' AND parent_id IS NULL;

-- 2. 기타 메뉴들은 100부터 시작
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

-- 3. 기존 메뉴들의 링크 업데이트
-- Theme 메뉴들
UPDATE menus SET path = '/theme/colors' WHERE name = 'Colors' AND parent_id = (SELECT id FROM menus WHERE name = 'Theme' AND parent_id IS NULL);
UPDATE menus SET path = '/theme/typography' WHERE name = 'Typography' AND parent_id = (SELECT id FROM menus WHERE name = 'Theme' AND parent_id IS NULL);

-- Components 메뉴들
UPDATE menus SET path = '/base' WHERE name = 'Base' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL);
UPDATE menus SET path = '/buttons' WHERE name = 'Buttons' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL);
UPDATE menus SET path = '/forms' WHERE name = 'Forms' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL);

-- Base 하위 메뉴들
UPDATE menus SET path = '/base/accordion' WHERE name = 'Accordion' AND parent_id = (SELECT id FROM menus WHERE name = 'Base' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/base/breadcrumbs' WHERE name = 'Breadcrumb' AND parent_id = (SELECT id FROM menus WHERE name = 'Base' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/base/cards' WHERE name = 'Cards' AND parent_id = (SELECT id FROM menus WHERE name = 'Base' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/base/carousels' WHERE name = 'Carousel' AND parent_id = (SELECT id FROM menus WHERE name = 'Base' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/base/collapses' WHERE name = 'Collapse' AND parent_id = (SELECT id FROM menus WHERE name = 'Base' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/base/list-groups' WHERE name = 'List group' AND parent_id = (SELECT id FROM menus WHERE name = 'Base' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/base/navs' WHERE name = 'Navs & Tabs' AND parent_id = (SELECT id FROM menus WHERE name = 'Base' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/base/paginations' WHERE name = 'Pagination' AND parent_id = (SELECT id FROM menus WHERE name = 'Base' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/base/placeholders' WHERE name = 'Placeholders' AND parent_id = (SELECT id FROM menus WHERE name = 'Base' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/base/popovers' WHERE name = 'Popovers' AND parent_id = (SELECT id FROM menus WHERE name = 'Base' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/base/progress' WHERE name = 'Progress' AND parent_id = (SELECT id FROM menus WHERE name = 'Base' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/base/spinners' WHERE name = 'Spinners' AND parent_id = (SELECT id FROM menus WHERE name = 'Base' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/base/tables' WHERE name = 'Tables' AND parent_id = (SELECT id FROM menus WHERE name = 'Base' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/base/tabs' WHERE name = 'Tabs' AND parent_id = (SELECT id FROM menus WHERE name = 'Base' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/base/tooltips' WHERE name = 'Tooltips' AND parent_id = (SELECT id FROM menus WHERE name = 'Base' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));

-- Buttons 하위 메뉴들
UPDATE menus SET path = '/buttons/buttons' WHERE name = 'Buttons' AND parent_id = (SELECT id FROM menus WHERE name = 'Buttons' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/buttons/button-groups' WHERE name = 'Buttons groups' AND parent_id = (SELECT id FROM menus WHERE name = 'Buttons' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/buttons/dropdowns' WHERE name = 'Dropdowns' AND parent_id = (SELECT id FROM menus WHERE name = 'Buttons' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));

-- Forms 하위 메뉴들
UPDATE menus SET path = '/forms/checks-radios' WHERE name = 'Checks & Radios' AND parent_id = (SELECT id FROM menus WHERE name = 'Forms' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/forms/floating-labels' WHERE name = 'Floating Labels' AND parent_id = (SELECT id FROM menus WHERE name = 'Forms' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/forms/form-control' WHERE name = 'Form Control' AND parent_id = (SELECT id FROM menus WHERE name = 'Forms' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/forms/input-group' WHERE name = 'Input Group' AND parent_id = (SELECT id FROM menus WHERE name = 'Forms' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/forms/range' WHERE name = 'Range' AND parent_id = (SELECT id FROM menus WHERE name = 'Forms' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/forms/select' WHERE name = 'Select' AND parent_id = (SELECT id FROM menus WHERE name = 'Forms' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/forms/layout' WHERE name = 'Layout' AND parent_id = (SELECT id FROM menus WHERE name = 'Forms' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));
UPDATE menus SET path = '/forms/validation' WHERE name = 'Validation' AND parent_id = (SELECT id FROM menus WHERE name = 'Forms' AND parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL));

-- Charts 메뉴
UPDATE menus SET path = '/charts' WHERE name = 'Charts' AND parent_id IS NULL;

-- Icons 하위 메뉴들
UPDATE menus SET path = '/icons/coreui-icons' WHERE name = 'CoreUI Free' AND parent_id = (SELECT id FROM menus WHERE name = 'Icons' AND parent_id IS NULL);
UPDATE menus SET path = '/icons/flags' WHERE name = 'CoreUI Flags' AND parent_id = (SELECT id FROM menus WHERE name = 'Icons' AND parent_id IS NULL);
UPDATE menus SET path = '/icons/brands' WHERE name = 'CoreUI Brands' AND parent_id = (SELECT id FROM menus WHERE name = 'Icons' AND parent_id IS NULL);

-- Notifications 하위 메뉴들
UPDATE menus SET path = '/notifications/alerts' WHERE name = 'Alerts' AND parent_id = (SELECT id FROM menus WHERE name = 'Notifications' AND parent_id IS NULL);
UPDATE menus SET path = '/notifications/badges' WHERE name = 'Badges' AND parent_id = (SELECT id FROM menus WHERE name = 'Notifications' AND parent_id IS NULL);
UPDATE menus SET path = '/notifications/modals' WHERE name = 'Modal' AND parent_id = (SELECT id FROM menus WHERE name = 'Notifications' AND parent_id IS NULL);
UPDATE menus SET path = '/notifications/toasts' WHERE name = 'Toasts' AND parent_id = (SELECT id FROM menus WHERE name = 'Notifications' AND parent_id IS NULL);

-- Widgets 메뉴
UPDATE menus SET path = '/widgets' WHERE name = 'Widgets' AND parent_id IS NULL;

-- 테스트 하위 메뉴들
UPDATE menus SET path = '/test/test01' WHERE name = 'Test01 - WebSocket 실시간 데이터' AND parent_id = (SELECT id FROM menus WHERE name = '테스트' AND parent_id IS NULL);

-- Pages 하위 메뉴들
UPDATE menus SET path = '/login' WHERE name = 'Login' AND parent_id = (SELECT id FROM menus WHERE name = 'Pages' AND parent_id IS NULL);
UPDATE menus SET path = '/register' WHERE name = 'Register' AND parent_id = (SELECT id FROM menus WHERE name = 'Pages' AND parent_id IS NULL);
UPDATE menus SET path = '/404' WHERE name = 'Error 404' AND parent_id = (SELECT id FROM menus WHERE name = 'Pages' AND parent_id IS NULL);
UPDATE menus SET path = '/500' WHERE name = 'Error 500' AND parent_id = (SELECT id FROM menus WHERE name = 'Pages' AND parent_id IS NULL);

-- Docs 메뉴 (외부 링크)
UPDATE menus SET path = 'https://coreui.io/react/docs/templates/installation/' WHERE name = 'Docs' AND parent_id IS NULL;

-- 4. 결과 확인
SELECT 
    name, 
    "order", 
    path,
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
    RAISE NOTICE '2. OnChain (order: 20)';
    RAISE NOTICE '3. Assets (order: 30)';
    RAISE NOTICE '4. Map (order: 40)';
    RAISE NOTICE '5. 기타 메뉴들 (order: 100+)';
    RAISE NOTICE '기존 메뉴들의 링크도 함께 업데이트되었습니다.';
END $$;
