-- Assets 메뉴 수동 생성
INSERT INTO menus (name, icon, "order", source_type, menu_metadata) 
VALUES ('Assets', 'cibGoldenline', 20, 'static', 
        '{"description": {"en": "Asset analysis and management tools", "ko": "자산 분석 및 관리 도구"}, "permissions": ["user", "admin"]}'::jsonb) 
RETURNING id;

-- 생성된 ID를 확인한 후, All Assets 메뉴 추가
-- (위 쿼리 결과의 ID를 사용하여 아래 쿼리 실행)

-- All Assets 메뉴 추가 (위에서 얻은 assets_menu_id 사용)
INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
VALUES (
    'All Assets',
    '/assets',
    (SELECT id FROM menus WHERE name = 'Assets' AND parent_id IS NULL),
    5,
    'dynamic',
    '{"description": {"en": "View all assets", "ko": "전체 자산 보기"}, "permissions": ["user", "admin"]}'::jsonb
);
