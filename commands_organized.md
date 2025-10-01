# FireMarkets App - 체계화된 명령어 모음

## 📋 목차
1. [환경 설정](#환경-설정)
2. [Docker Compose 명령어](#docker-compose-명령어)
3. [데이터베이스 명령어](#데이터베이스-명령어)
4. [로그 모니터링](#로그-모니터링)
5. [Redis 명령어](#redis-명령어)
6. [API 테스트](#api-테스트)
7. [시스템 관리](#시스템-관리)
8. [Git 명령어](#git-명령어)
9. [백업 및 압축](#백업-및-압축)

---

## 🔧 환경 설정

### 환경 변수 확인
```bash
    cd /home/geehong/firemarkets-app && cat .env
    ```
    # .env
    #mysql settiing
    DB_HOSTNAME=db # Docker 네트워크 내에서 MySQL 서비스의 이름 (localhost가 아님)
    DB_DATABASE=markets
    DB_USERNAME=geehong
    DB_PASSWORD=Power6100
    DB_ROOT_PASSWORD=Power6740 # MySQL root 계정 비밀번호

    # PostgreSQL Settings
    DB_HOSTNAME_PG=db_postgres
    DB_PORT_PG=5432
    DB_DATABASE_PG=markets
    DB_USERNAME_PG=geehong
    DB_PASSWORD_PG=Power6100

    # Secret Key for Backend
    SECRET_KEY=f4b3e2a1d0c9b8a7968574635241f0e9d8c7b6a594837261e0f9d8c7b6a5

    EODHD_API_KEY=6851fda9861c01.75472022 # https://eodhd.com/api/fundamentals/AAPL.US?api_token=demo&fmt=json
    ALPHA_VANTAGE_API_KEY_1=MJ965EHM5S48YVCV
    ALPHA_VANTAGE_API_KEY_2=ZYIWDUTRJ5VDSMMF
    ALPHA_VANTAGE_API_KEY_3=4D6E0FWKL4IZ0UFV

    FMP_API_KEY=uwuvgPqE1bzAKJB1LAdkerZdp273Bvk1
    COIN_MARKET_API_KEY=e0d46b45-86dd-4756-81c6-a26391122391
    TOKEN_METRICS_API_KEY=tm-ca31b6c6-3eae-4929-837a-bec0fb1e664e
    COIN_GECKO_API_KEY=CG-aiuQjnSAoeVfuhbY1Q9uZysu
    #app.tokenmetrics.com
    # Crypto API Keys
    COINMARKETCAP_API_KEY=e0d46b45-86dd-4756-81c6-a26391122391
    BINANCE_API_KEY=your_binance_api_key_here
    BINANCE_SECRET_KEY=your_binance_secret_key_here
    COINBASE_API_KEY=your_coinbase_apiey_here
    COINBASE_SECRET_KEY=your_coinbase_secret_key_here
    TWELVEDATA_API_KEY=7d438a1ad6ed4ebfaea69eb965fe7e83 #https://twelvedata.com/
    TIINGO_API_KEY=6ad65759391ef22e0dccb8d2b171769c782c4853
    POLYGON_API_KEY=tUWX3e7_Z_ppi90QUsiogmxTbwuWnpa_

    ALPACA_API_KEY=PK6JPW2J1JY4GDVZ7HLD
    ALPACA_SECRET_KEY = OWLQA1QX7Wa79PhiDPTQdb0pHDbl0mUJOUT65QD7

    FINNHUB_API_KEY=d2t3t79r01qkuv3j6p30d2t3t79r01qkuv3j6p3g
    FINNHUB_SECRET_KEY = d2t3t79r01qkuv3j6p4g
    
### 컨테이너 상태 확인
```bash
docker-compose ps
    NAME                                  IMAGE                                                                     COMMAND                   SERVICE                  CREATED        STATUS                   PORTS
    fire_markets_backend                  sha256:98cf91082963461e68b82ab5231dbe11df5cb12cbb6b92e683813fd368411a73   "uvicorn app.admin_m…"   backend                  19 hours ago   Up 2 minutes (healthy)   0.0.0.0:8001->8000/tcp, [::]:8001->8000/tcp
    fire_markets_data_processor           sha256:c70c87b4858b505579fc1240bb4cb1a5c20ef76423063291c12eef1ba0a887a5   "python -m app.servi…"   data_processor           18 hours ago   Up 2 minutes             8000/tcp
    fire_markets_db                       mysql:8.0                                                                 "docker-entrypoint.s…"   db                       2 days ago     Up 2 minutes (healthy)   0.0.0.0:3306->3306/tcp, [::]:3306->3306/tcp, 33060/tcp
    fire_markets_db_postgres              postgres:15-alpine                                                        "docker-entrypoint.s…"   db_postgres              3 days ago     Up 2 minutes (healthy)   0.0.0.0:5433->5432/tcp, [::]:5433->5432/tcp
    fire_markets_dbeaver                  dbeaver/cloudbeaver:latest                                                "./launch-product.sh"     dbeaver                  20 hours ago   Up 2 minutes             8978/tcp
    fire_markets_frontend                 sha256:a484ce66d598f40568301ac97e02617ce235dd4ccf963687c4531c48a153c630   "docker-entrypoint.s…"   frontend                 5 days ago     Up 2 minutes             0.0.0.0:3000->80/tcp, [::]:3000->80/tcp
    fire_markets_redis                    redis:7-alpine                                                            "docker-entrypoint.s…"   redis                    5 days ago     Up 2 minutes (healthy)   6379/tcp
    fire_markets_scheduler                sha256:28a047062075203fa2002db83aec4654abbcd025190dcdf502d8127cb9b369fa   "python -m app.servi…"   scheduler                19 hours ago   Up 2 minutes             8000/tcp
    fire_markets_websocket_orchestrator   firemarkets-app-websocket_orchestrator                                    "python -m app.servi…"   websocket_orchestrator   5 days ago     Up 2 days                8000/tcp
    nginx-proxy-manager                   jc21/nginx-proxy-manager:latest                                           "/init"                   nginx-proxy-manager      5 days ago     Up 2 minutes             0.0.0.0:80-81->80-81/tcp, [::]:80-81->80-81/tcp, 0.0.0.0:443->443/tcp, [::]:443->443/tcp
    portainer                             portainer/portainer-ce:latest                                             "/portainer"              portainer                5 days ago     Up 2 minutes             0.0.0.0:8000->8000/tcp, [::]:8000->8000/tcp, 0.0.0.0:9443->9443/tcp, [::]:9443->9443/tcp, 9000/tcp
        
```

---

## 🐳 Docker Compose 명령어

### 초기화 및 전체 빌드
```bash
# WSL 환경
sudo service docker start && docker compose down --volumes && docker compose up --build -d
docker compose down && docker compose up --build -d

# Windows Terminal
docker-compose down pgadmin && docker compose up --build -d pgadmin
```

### 개별 서비스 빌드 및 실행
```bash
# 백엔드만 빌드
docker-compose build backend && docker-compose restart backend
docker-compose stop backend && docker-compose up -d backend
# 프론트엔드 빌드
docker-compose up -d --build frontend

# 스케줄러 빌드
docker-compose up -d --build scheduler

# 데이터 프로세서 빌드
docker-compose build data_processor && docker-compose restart data_processor
```

### 서비스 재시작
```bash
docker-compose restart scheduler
docker-compose restart backend_temp
docker-compose restart nginx-proxy-manager
```

### 복합 빌드 및 실행
```bash
# 백엔드 + 스케줄러 + 데이터 프로세서
docker-compose build backend scheduler data_processor | cat && docker-compose up -d --no-deps --force-recreate backend scheduler data_processor | cat && sleep 3 && docker-compose ps | cat

# 백엔드 + 데이터 프로세서
docker-compose build backend data_processor | cat && docker-compose up -d --no-deps --force-recreate backend data_processor | cat && sleep 3 && docker-compose ps | cat

# 웹소켓 오케스트레이터 + 데이터 프로세서
docker-compose build websocket_orchestrator data_processor | cat && docker-compose up -d --no-deps --force-recreate websocket_orchestrator data_processor | cat && sleep 3 && docker-compose ps | cat
```

### 프로파일 기반 실행
```bash
docker-compose --profile processing up -d data_processor scheduler
docker-compose --profile 8001 up -d websocket_orchestrator
```

### 서비스 중지 및 재시작
```bash
docker-compose down data_processor && docker-compose build data_processor && docker-compose up -d data_processor
docker-compose down data_processor && docker-compose build data_processor && docker-compose up -d data_processor

docker-compose down websocket_orchestrator && docker-compose build websocket_orchestrator && docker-compose up -d websocket_orchestrator
docker-compose --profile processing down
docker-compose --profile processing up -d --no-deps
```

---

## 🗄️ 데이터베이스 명령어

### MySQL 접속 및 테이블 확인
```bash
# 테이블 목록 조회
docker-compose exec db mysql -u geehong -pPower6100 markets -e "SHOW TABLES;"

# 인덱스 확인
docker-compose exec db mysql -u geehong -pPower6100 markets -e "SHOW INDEX FROM ohlcv_day_data;"

# 중복 데이터 확인
docker-compose exec db mysql -u geehong -pPower6100 markets -e "SELECT asset_id, timestamp_utc, COUNT(*) as count FROM ohlcv_day_data GROUP BY asset_id, timestamp_utc HAVING COUNT(*) > 1 LIMIT 10;"
# 컬럼 정보만 SQL로 확인
docker-compose exec db_postgres psql -U geehong -d markets -c "\d app_configurations"
```
## 📊 로그 모니터링

### 기본 로그 확인
```bash
# 스케줄러 + 백엔드 로그
docker-compose logs scheduler backend

# 실시간 로그 모니터링
docker-compose logs data_processor --tail 50 -f

timeout 300 docker-compose logs -f scheduler | grep -E "(crypto_clients|etf_clients|error|exception|failed|PostgreSQL|jsonb|operator does not exist)"
```

### 데이터 저장 관련 로그
```bash
# OHLCV 데이터 저장 로그
docker-compose logs data_processor --tail 50 -f | grep -Ei "OHLCV 데이터 저장 (시작|완료)"

# 저장 성공/실패 로그
docker-compose logs data_processor --tail 50 -f | grep -Ei "저장 (시작|완료|성공|실패|오류|error|success)"

# 자산 매칭 및 DB 저장 로그
docker-compose logs data_processor --tail 100 -f | grep -E "(자산 매칭 성공|DB 저장 성공|✅.*성공)"
```

### 웹소켓 오케스트레이터 로그
```bash
# Binance 관련 로그
docker-compose logs websocket_orchestrator --tail 50 -f | grep -Ei "binance"

# 연결 실패 로그
docker logs fire_markets_websocket_orchestrator --tail 20 | grep -A 5 -B 5 "connection failed"

# Finnhub 메시지 로그
docker-compose logs websocket_orchestrator --since 24h | grep -E "(finnhub.*received|finnhub.*message|finnhub.*📨)" | head -20
```
### 스케쥴 로그
```bash
 timeout 300 docker-compose logs -f scheduler | grep -E "(crypto_clients|etf_clients|error|exception|failed|PostgreSQL|jsonb|operator does not exist)"
 docker-compose exec scheduler cat /app/app/collectors/etf_collector.py | grep -A 10 -B 5 "collection_settings"

 ```
### 에러 및 예외 로그
```bash
# 모든 서비스 에러 로그
echo '--- Scheduler ---' && docker-compose logs scheduler --tail 2000 | grep -iE "error|오류|failed|exception" | grep -v "429" | cat && echo '--- Data Processor ---' && docker-compose logs data_processor --tail 2000 | grep -iE "error|오류|failed|exception" | grep -v "429" | cat && echo '--- Backend ---' && docker-compose logs backend --tail 2000 | grep -iE "error|오류|failed|exception|traceback" | grep -v "429" | cat

# 스케줄러 에러 로그
docker-compose logs scheduler --tail 200000 | grep -i -E "(error|ERROR)"

# PostgreSQL 저장 에러
docker-compose logs data_processor --tail 200000 | grep -i -E "(PostgreSQL 저장장|저장|실패패)"
```

### 특정 시간대 로그
```bash
# 특정 시간 범위 로그
docker logs fire_markets_scheduler --since="2025-09-20T06:00:00" --until="2025-09-20T06:05:00" | grep -E "(onchain|Onchain|collection|job|ERROR|WARNING|Exception|Traceback)"
```

---

## 🔴 Redis 명령어

### Redis 접속 및 키 확인
```bash
# Redis CLI 접속
docker-compose exec redis redis-cli

# Binance 관련 키 확인
KEYS *binance*

# 스트림 길이 확인
XLEN "binance:realtime"
```

---

## 🌐 API 테스트

### Finnhub API 테스트
```bash
curl -s "https://finnhub.io/api/v1/quote?symbol=AAPL&token=$(docker exec fire_markets_backend printenv FINNHUB_API_KEY)" | head -5
```

### 백엔드 API 테스트
```bash
curl -X GET "http://localhost:8001/api/v1/realtime/pg/quotes-price?asset_identifier=1" | jq
```

---

## 🖥️ 시스템 관리

### Docker 기본 명령어

#### 이미지 관리
```bash
# 이미지 검색 및 다운로드
docker search [이미지명]
docker pull [이미지명]
docker images  # 또는 docker image ls

# 이미지 빌드 및 관리
docker build -t [태그명] [경로]
docker rmi [이미지ID/이미지명]
docker image prune
```

#### 컨테이너 관리
```bash
# 컨테이너 실행
docker run [옵션] [이미지명]
docker start [컨테이너ID/이름]
docker stop [컨테이너ID/이름]
docker stop $(docker ps -q)  # 모든 컨테이너 중지
docker restart [컨테이너ID/이름]

# 컨테이너 조회 및 관리
docker ps
docker ps -a
docker rm [컨테이너ID/이름]
docker container prune
```

#### 컨테이너 상호작용
```bash
# 컨테이너 접근
docker exec -it [컨테이너ID/이름] /bin/bash
docker attach [컨테이너ID/이름]

# 로그 및 정보 확인
docker logs [컨테이너ID/이름]
docker inspect [컨테이너ID/이름]
docker stats
```

#### 유용한 run 옵션
```bash
-d    # 백그라운드 실행 (detached)
-it   # 인터랙티브 터미널 모드
-p [호스트포트]:[컨테이너포트]  # 포트 포워딩
-v [호스트경로]:[컨테이너경로]  # 볼륨 마운트
--name [이름]  # 컨테이너 이름 지정
--rm  # 컨테이너 종료 시 자동 삭제
```

#### 시스템 관리
```bash
docker system df
docker system prune
docker version
docker info
```

### 서버 공간 관리
```bash
# 디스크 사용량 확인
df -h

# Docker 시스템 정리 (한 달에 1번 정도)
docker system prune -a -f
docker system prune -a -f --volumes
```

---

## 📝 Git 명령어

### 커밋 및 푸시
```bash
git commit -m "Update admin features and UI components - Add scheduler controls - Update AppHeader with admin menu - Add user avatar - Update crypto endpoints and collectors - Improve admin management interface"

git push origin main
```

---

## 💾 백업 및 압축

### 프로젝트 압축
```bash
# node_modules, venv, .git 제외하고 압축
tar --exclude='node_modules' --exclude='venv' --exclude='.git' -czf firemarkets_app__2025_08_18_15_050.tar.gz .
```

---

## 🔑 API 키 설정

### 환경 변수 (.env)
```bash
# 데이터베이스
DB_HOSTNAME=db
DB_DATABASE=markets
DB_USERNAME=geehong
DB_PASSWORD=Power6100
DB_ROOT_PASSWORD=Power6740

# API 키들
EODHD_API_KEY=6851fda9861c01.75472022
ALPHA_VANTAGE_API_KEY_1=MJ965EHM5S48YVCV
ALPHA_VANTAGE_API_KEY_2=ZYIWDUTRJ5VDSMMF
ALPHA_VANTAGE_API_KEY_3=4D6E0FWKL4IZ0UFV
FMP_API_KEY=uwuvgPqE1bzAKJB1LAdkerZdp273Bvk1
COIN_MARKET_API_KEY=e0d46b45-86dd-4756-81c6-a26391122391
TOKEN_METRICS_API_KEY=tm-ca31b6c6-3eae-4929-837a-bec0fb1e664e
COIN_GECKO_API_KEY=CG-aiuQjnSAoeVfuhbY1Q9uZysu
COINMARKETCAP_API_KEY=e0d46b45-86dd-4756-81c6-a26391122391
```

---

## 🌐 웹 인터페이스

### 관리 도구 접속
```bash
# phpMyAdmin (WSL)
http://localhost:8080/index.php

# Portainer
http://localhost:8000

# Nginx Proxy Manager
http://localhost:81
```

---

## 📋 주요 테이블 목록

### 데이터베이스 테이블
- `active_assets` - 활성 자산
- `api_call_logs` - API 호출 로그
- `app_configurations` - 앱 설정
- `apscheduler_jobs` - 스케줄러 작업
- `asset_type_stats` - 자산 유형 통계
- `asset_types` - 자산 유형
- `assets` - 자산 정보
- `audit_logs` - 감사 로그
- `bond_market_data` - 채권 시장 데이터
- `crypto_data` - 암호화폐 데이터
- `crypto_metrics` - 암호화폐 지표
- `economic_indicators` - 경제 지표
- `etf_info` - ETF 정보
- `index_infos` - 지수 정보
- `m2_data` - M2 데이터
- `ohlcv_data_backup` - OHLCV 데이터 백업
- `ohlcv_day_data` - 일간 OHLCV 데이터
- `ohlcv_intraday_data` - 일중 OHLCV 데이터
- `onchain_metrics_info` - 온체인 지표 정보
- `realtime_quotes` - 실시간 시세
- `realtime_quotes_time_delay` - 실시간 시세 지연
- `scheduler_logs` - 스케줄러 로그
- `scraping_logs` - 스크래핑 로그
- `sparkline_data` - 스파크라인 데이터
- `stock_analyst_estimates` - 주식 애널리스트 추정
- `stock_financials` - 주식 재무 정보
- `stock_profiles` - 주식 프로필
- `technical_indicators` - 기술적 지표
- `token_blacklist` - 토큰 블랙리스트
- `user_sessions` - 사용자 세션
- `users` - 사용자 정보
- `websocket_orchestrator_logs` - 웹소켓 오케스트레이터 로그
- `world_assets_ranking` - 세계 자산 순위

---

*이 문서는 FireMarkets App의 모든 주요 명령어를 체계적으로 정리한 것입니다. 필요에 따라 해당 섹션을 참조하여 사용하세요.*
