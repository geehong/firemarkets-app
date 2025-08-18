-- MySQL 관리자 권한 시스템 초기화 스크립트

-- 1. 초기 super_admin 계정 생성
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

-- 2. 일반 관리자 계정 생성 (선택사항)
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

-- 3. 권한 확인 함수 생성 (기존 함수가 있다면 삭제 후 재생성)
DROP FUNCTION IF EXISTS check_permission;

DELIMITER $$

CREATE FUNCTION check_permission(
    user_id INT,
    permission_name VARCHAR(100)
) RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE user_role VARCHAR(30);
    DECLARE user_permissions JSON;
    DECLARE has_permission BOOLEAN;
    
    -- 사용자 정보 조회
    SELECT role, permissions INTO user_role, user_permissions
    FROM users 
    WHERE id = user_id AND is_active = 1 AND deleted_at IS NULL;
    
    -- 사용자가 존재하지 않으면 false
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- super_admin은 모든 권한 허용
    IF user_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;
    
    -- 특정 권한 확인
    SET has_permission = JSON_EXTRACT(user_permissions, CONCAT('$.', permission_name));
    
    RETURN COALESCE(has_permission, FALSE);
END$$

DELIMITER ;

-- 4. 권한 확인 테스트
SELECT 
    username,
    role,
    permissions,
    check_permission(id, 'reports.view') as can_view_reports,
    check_permission(id, 'users.create') as can_create_users,
    check_permission(id, 'system.delete') as can_delete_system
FROM users 
WHERE is_active = 1;

-- 5. JSON 함수 직접 사용 테스트
SELECT 
    username,
    JSON_EXTRACT(permissions, '$.reports.view') as can_view_reports,
    JSON_EXTRACT(permissions, '$.users.create') as can_create_users
FROM users 
WHERE is_active = 1; 