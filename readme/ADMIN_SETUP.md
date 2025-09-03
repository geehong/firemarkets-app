# 🔐 MySQL JSON 권한 시스템 설정 가이드

## 📋 개요
FireMarkets 앱의 관리자 권한 시스템이 MySQL JSON을 사용하여 구현되었습니다.

## 🗄️ 데이터베이스 설정

### 1. MySQL 테이블 생성
```sql
-- 이미 docker/migration_user_tables.sql로 생성된 테이블 구조:
-- users, user_sessions, token_blacklist, audit_logs 테이블이 이미 존재합니다.

-- 테이블 구조 확인:
DESCRIBE users;
DESCRIBE user_sessions;
DESCRIBE token_blacklist;
DESCRIBE audit_logs;
```

### 2. 초기 관리자 계정 생성
```bash
# 1. 비밀번호 해시 생성 (실제 운영에서는 이 방법 사용)
cd backend
python generate_password_hash.py admin123

# 2. MySQL에 접속하여 스크립트 실행
mysql -u root -p firemarkets_db < backend/init_admin.sql

# 또는 직접 SQL 실행:
mysql -u root -p firemarkets_db
```

## 🔧 백엔드 설정

### 1. 의존성 설치
```bash
cd backend
pip install -r requirements.txt
```

### 2. 환경 변수 설정
```bash
# .env 파일 생성
cp .env.example .env

# 환경 변수 수정
DATABASE_URL=mysql+pymysql://username:password@localhost:3306/firemarkets_db
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production
```

### 3. 서버 실행
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 🖥️ 프론트엔드 설정

### 1. 의존성 설치 (필요시)
```bash
cd frontend
npm install
```

### 2. 환경 변수 설정
```bash
# .env 파일에 API URL 추가
REACT_APP_API_URL=http://localhost:8000
```

### 3. 개발 서버 실행
```bash
npm start
```

## 👤 기본 계정 정보

### Super Admin
- **사용자명**: `geehong`
- **비밀번호**: `Power@6100`
- **이메일**: `geecgpi1@gmail.com`
- **권한**: 모든 권한

### 일반 Admin (선택사항)
- **사용자명**: `geehong_operator`
- **비밀번호**: `Power@6100`
- **이메일**: `geecgpi1@gmail.com`
- **권한**: 제한된 권한

## 🔐 권한 시스템

### 역할 (Roles)
- `super_admin`: 모든 권한
- `admin`: 제한된 관리자 권한
- `operator`: 운영자 권한
- `user`: 일반 사용자 권한

### 권한 (Permissions)
```json
{
  "users.create": true,      // 사용자 생성
  "users.read": true,        // 사용자 조회
  "users.update": true,      // 사용자 수정
  "users.delete": true,      // 사용자 삭제
  "reports.view": true,      // 리포트 조회
  "reports.export": true,    // 리포트 내보내기
  "system.config": true,     // 시스템 설정
  "system.delete": true,     // 시스템 삭제
  "admin.dashboard": true,   // 관리자 대시보드
  "onchain.metrics": true,   // 온체인 메트릭스
  "scheduler.manage": true,  // 스케줄러 관리
  "ticker.manage": true      // 티커 관리
}
```

## 🛡️ 보안 기능

### 1. 계정 잠금
- 5회 로그인 실패 시 15분간 계정 잠금
- 자동 잠금 해제

### 2. 토큰 관리
- Access Token: 15분 유효
- Refresh Token: 7일 유효 (HTTPOnly 쿠키)
- 토큰 블랙리스트 지원

### 3. 감사 로그
- 모든 로그인/로그아웃 기록
- 권한 변경 기록
- IP 주소 및 사용자 에이전트 기록

## 🚀 사용 방법

### 1. 관리자 로그인
```
http://localhost:3000/admin/login
```

### 2. 관리자 페이지 접근
```
http://localhost:3000/admin/manage
```

### 3. 권한 확인
```javascript
// 컴포넌트에서 권한 확인
const { hasPermission } = useAuth();

if (hasPermission('reports.view')) {
  // 리포트 조회 기능 표시
}
```

## 🔧 API 엔드포인트

### 인증
- `POST /api/auth/admin/login` - 관리자 로그인
- `POST /api/auth/admin/logout` - 관리자 로그아웃
- `POST /api/auth/admin/refresh` - 토큰 갱신

### 사용자 관리
- `GET /api/admin/users` - 사용자 목록 조회
- `POST /api/admin/users` - 사용자 생성
- `PUT /api/admin/users/{id}` - 사용자 수정
- `DELETE /api/admin/users/{id}` - 사용자 삭제

## 🐛 문제 해결

### 1. 데이터베이스 연결 오류
```bash
# MySQL 서비스 상태 확인
sudo systemctl status mysql

# MySQL 재시작
sudo systemctl restart mysql
```

### 2. 권한 오류
```sql
-- MySQL 사용자 권한 확인
SHOW GRANTS FOR 'username'@'localhost';

-- 권한 부여
GRANT ALL PRIVILEGES ON firemarkets_db.* TO 'username'@'localhost';
FLUSH PRIVILEGES;
```

### 3. JWT 토큰 오류
```bash
# 환경 변수 확인
echo $JWT_SECRET_KEY

# 서버 재시작
pkill -f uvicorn
uvicorn app.main:app --reload
```

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. 데이터베이스 연결 상태
2. 환경 변수 설정
3. 로그 파일 확인
4. 네트워크 연결 상태 