CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'user', -- 'super_admin','admin','operator','user' 등
    permissions JSON NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    full_name VARCHAR(100),
    phone_number VARCHAR(20),
    address TEXT,
    avatar_url VARCHAR(255),
    login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP NULL,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE user_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_id CHAR(36) NOT NULL UNIQUE, -- UUID는 CHAR(36) 사용
    refresh_token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45), -- INET 대신 VARCHAR 사용
    user_agent TEXT,
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);

CREATE TABLE token_blacklist (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    user_id INT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_blacklist_tokenhash ON token_blacklist(token_hash);
CREATE INDEX idx_blacklist_expires ON token_blacklist(expires_at);

CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    actor_id INT NULL, -- 관리자가 다른 유저를 조작했을 때
    event_type VARCHAR(100) NOT NULL, -- 'login.success','login.failed','token.revoke' 등
    event_data JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_user ON audit_logs(user_id);

