-- 모든 정적 메뉴들을 데이터베이스에 추가
BEGIN;

-- 1. Calendar 메뉴 추가
INSERT INTO menus (name, path, icon, parent_id, "order", is_active, source_type, menu_metadata)
SELECT 'Calendar', '/calendar', 'CalenderIcon', NULL, 3, TRUE, 'dynamic', '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM menus WHERE name = 'Calendar' AND parent_id IS NULL
);

-- 2. User Profile 메뉴 추가
INSERT INTO menus (name, path, icon, parent_id, "order", is_active, source_type, menu_metadata)
SELECT 'User Profile', '/profile', 'UserCircleIcon', NULL, 4, TRUE, 'dynamic', '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM menus WHERE name = 'User Profile' AND parent_id IS NULL
);

-- 3. Forms 부모 메뉴 추가
INSERT INTO menus (name, path, icon, parent_id, "order", is_active, source_type, menu_metadata)
SELECT 'Forms', NULL, 'ListIcon', NULL, 5, TRUE, 'dynamic', '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM menus WHERE name = 'Forms' AND parent_id IS NULL
);

-- Forms 하위 메뉴 추가
WITH forms_parent AS (
  SELECT id FROM menus WHERE name = 'Forms' AND parent_id IS NULL LIMIT 1
)
INSERT INTO menus (name, path, icon, parent_id, "order", is_active, source_type, menu_metadata)
SELECT 
  'Form Elements', 
  '/form-elements', 
  NULL, 
  (SELECT id FROM forms_parent), 
  1, 
  TRUE, 
  'dynamic', 
  '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM menus m 
  WHERE m.name = 'Form Elements' 
  AND m.parent_id = (SELECT id FROM forms_parent)
);

-- 4. Pages 부모 메뉴 추가
INSERT INTO menus (name, path, icon, parent_id, "order", is_active, source_type, menu_metadata)
SELECT 'Pages', NULL, 'PageIcon', NULL, 6, TRUE, 'dynamic', '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM menus WHERE name = 'Pages' AND parent_id IS NULL
);

-- Pages 하위 메뉴들 추가
WITH pages_parent AS (
  SELECT id FROM menus WHERE name = 'Pages' AND parent_id IS NULL LIMIT 1
)
INSERT INTO menus (name, path, icon, parent_id, "order", is_active, source_type, menu_metadata)
SELECT 
  v.name, 
  v.path, 
  NULL, 
  (SELECT id FROM pages_parent), 
  v.ord, 
  TRUE, 
  'dynamic', 
  '{}'::jsonb
FROM (VALUES
  ('Blank Page', '/blank', 1),
  ('404 Error', '/error-404', 2)
) AS v(name, path, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM menus m 
  WHERE m.name = v.name 
  AND m.parent_id = (SELECT id FROM pages_parent)
);

-- 5. Components 부모 메뉴 추가
INSERT INTO menus (name, path, icon, parent_id, "order", is_active, source_type, menu_metadata)
SELECT 'Components', NULL, 'BoxCubeIcon', NULL, 7, TRUE, 'dynamic', '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM menus WHERE name = 'Components' AND parent_id IS NULL
);

-- Components 하위 메뉴들 추가
WITH components_parent AS (
  SELECT id FROM menus WHERE name = 'Components' AND parent_id IS NULL LIMIT 1
)
INSERT INTO menus (name, path, icon, parent_id, "order", is_active, source_type, menu_metadata)
SELECT 
  v.name, 
  v.path, 
  NULL, 
  (SELECT id FROM components_parent), 
  v.ord, 
  TRUE, 
  'dynamic', 
  '{}'::jsonb
FROM (VALUES
  ('Alerts', '/alerts', 1),
  ('Avatar', '/avatars', 2),
  ('Badge', '/badge', 3),
  ('Buttons', '/buttons', 4),
  ('Images', '/images', 5),
  ('Videos', '/videos', 6)
) AS v(name, path, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM menus m 
  WHERE m.name = v.name 
  AND m.parent_id = (SELECT id FROM components_parent)
);

COMMIT;
