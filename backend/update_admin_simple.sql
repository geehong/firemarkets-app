-- 기존 관리자 계정 업데이트 스크립트 (간단 버전)

-- 1. 기존 geehong 계정 업데이트
UPDATE users SET 
    password_hash = '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Power@6100
    role = 'super_admin',
    permissions = JSON_OBJECT(
        'users.create', true,
        'users.read', true,
        'users.update', true,
        'users.delete', true,
        'reports.view', true,
        'reports.export', true,
        'system.config', true,
        'system.delete', true,
        'admin.dashboard', true,
        'onchain.metrics', true,
        'scheduler.manage', true,
        'ticker.manage', true
    ),
    is_active = 1,
    full_name = 'Geehong Administrator',
    updated_at = NOW()
WHERE username = 'geehong';

-- 2. geehong_operator 계정이 없으면 생성
INSERT IGNORE INTO users (
    username, 
    email, 
    password_hash, 
    role, 
    permissions,
    is_active,
    full_name,
    created_at,
    updated_at
) VALUES (
    'geehong_operator',
    'geecgpi1@gmail.com',
    '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Power@6100
    'admin',
    JSON_OBJECT(
        'users.read', true,
        'reports.view', true,
        'reports.export', false,
        'admin.dashboard', true,
        'onchain.metrics', true,
        'scheduler.manage', true,
        'ticker.manage', true
    ),
    1,
    'Geehong Operator',
    NOW(),
    NOW()
);

-- 3. 업데이트 결과 확인
SELECT 
    id,
    username,
    email,
    role,
    full_name,
    is_active,
    JSON_EXTRACT(permissions, '$.reports.view') as can_view_reports,
    JSON_EXTRACT(permissions, '$.users.create') as can_create_users
FROM users 
WHERE username IN ('geehong', 'geehong_operator') AND is_active = 1; 