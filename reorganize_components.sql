-- Components에 Forms, Pages, Tables, Charts, Widgets를 포함하도록 재구성
BEGIN;

-- 1. 기존 Forms, Pages, Tables, Charts, Widgets를 Components의 하위 메뉴로 이동

-- Forms를 Components 하위로 이동
UPDATE menus 
SET parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL LIMIT 1),
    "order" = 1
WHERE name = 'Forms' AND parent_id IS NULL;

-- Pages를 Components 하위로 이동
UPDATE menus 
SET parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL LIMIT 1),
    "order" = 2
WHERE name = 'Pages' AND parent_id IS NULL;

-- Tables를 Components 하위로 이동
UPDATE menus 
SET parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL LIMIT 1),
    "order" = 3
WHERE name = 'Tables' AND parent_id IS NULL;

-- Charts를 Components 하위로 이동
UPDATE menus 
SET parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL LIMIT 1),
    "order" = 4
WHERE name = 'Charts' AND parent_id IS NULL;

-- Widgets를 Components 하위로 이동
UPDATE menus 
SET parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL LIMIT 1),
    "order" = 5
WHERE name = 'Widgets' AND parent_id IS NULL;

-- 2. 기존 Components 하위 메뉴들의 order를 조정 (6부터 시작)
UPDATE menus 
SET "order" = "order" + 5
WHERE parent_id = (SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL LIMIT 1)
AND name IN ('Alerts', 'Avatar', 'Badge', 'Buttons', 'Images', 'Videos');

-- 3. Components 메뉴의 order를 조정 (더 높은 우선순위로)
UPDATE menus 
SET "order" = 5
WHERE name = 'Components' AND parent_id IS NULL;

COMMIT;
