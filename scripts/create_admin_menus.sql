-- Create Admin menus: root, login, manage

-- 1) Admin root under top-level (parent may vary; use NULL or a known parent)
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata, path)
SELECT 'Admin', 'cibShieldAlt', NULL, 99, 'dynamic', '{"description": {"en": "Administration", "ko": "관리"}}'::jsonb, NULL
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Admin');

-- 2) Admin Login
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata, path)
SELECT 'Admin Login', 'cibShieldAlt', (SELECT id FROM menus WHERE name = 'Admin' LIMIT 1), 1, 'dynamic', '{"component": "Login"}'::jsonb, '/admin/login'
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Admin Login');

-- 3) Admin Manage
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata, path)
SELECT 'Admin Manage', 'cibShieldAlt', (SELECT id FROM menus WHERE name = 'Admin' LIMIT 1), 2, 'dynamic', '{"component": "AdminManage"}'::jsonb, '/admin/manage'
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Admin Manage');

-- Verify
SELECT id, name, path, parent_id FROM menus WHERE name IN ('Admin','Admin Login','Admin Manage') ORDER BY parent_id, "order";

