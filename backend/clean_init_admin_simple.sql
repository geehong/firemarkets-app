-- MySQL 관리자 권한 시스템 초기화 스크립트 (간단 버전)

-- 1. 기존 관리자 계정 삭제
DELETE FROM users WHERE username IN ('geehong', 'geehong_operator', 'admin', 'operator');

-- 2. 초기 super_admin 계정 생성
-- 비밀번호: Power@6100
INSERT INTO users (
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
    'geehong',
    'geecgpi1@gmail.com',
    '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Power@6100
    'super_admin',
    JSON_OBJECT(
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
    1,
    'Geehong Administrator',
    NOW(),
    NOW()
);

-- 3. 일반 관리자 계정 생성 (선택사항)
-- 비밀번호: Power@6100
INSERT INTO users (
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
    'operator.geecgpi1@gmail.com',
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

-- 4. 생성 결과 확인
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