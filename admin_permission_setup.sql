-- Admin 메뉴 권한 설정 및 Components를 Admin 하위로 이동
BEGIN;

-- 1. Admin 메뉴에 super_admin 권한 추가
UPDATE menus 
SET menu_metadata = '{"description": {"en": "Admin Management", "ko": "관리자 관리"}, "permissions": ["super_admin"]}'::jsonb
WHERE name = 'Admin' AND parent_id IS NULL;

-- 2. Components를 Admin의 하위 메뉴로 이동
UPDATE menus 
SET parent_id = (SELECT id FROM menus WHERE name = 'Admin' AND parent_id IS NULL LIMIT 1),
    "order" = 3
WHERE name = 'Components' AND parent_id IS NULL;

-- 3. Admin의 기존 하위 메뉴들 order 조정
UPDATE menus 
SET "order" = "order" + 1
WHERE parent_id = (SELECT id FROM menus WHERE name = 'Admin' AND parent_id IS NULL LIMIT 1)
AND name IN ('Admin Login', 'Admin Manage');

-- 4. 결과 확인을 위한 쿼리
SELECT 
    m1.name as parent_name,
    m1.menu_metadata,
    m2.name as child_name,
    m2."order"
FROM menus m1
LEFT JOIN menus m2 ON m1.id = m2.parent_id
WHERE m1.name = 'Admin' AND m1.parent_id IS NULL
ORDER BY m2."order";

COMMIT;
