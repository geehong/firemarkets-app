-- Assets 메뉴 존재 확인
SELECT id, name, parent_id, source_type FROM menus WHERE name = 'Assets';

-- Assets 메뉴가 없으면 생성
INSERT INTO menus (name, icon, "order", source_type, menu_metadata) 
SELECT 'Assets', 'cibGoldenline', 20, 'static', 
       '{"description": {"en": "Asset analysis and management tools", "ko": "자산 분석 및 관리 도구"}, "permissions": ["user", "admin"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Assets' AND parent_id IS NULL);
