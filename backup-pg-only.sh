#!/bin/bash

# PostgreSQL 전용 백업 스크립트
# PostgreSQL 볼륨과 SQL만 백업

# 환경변수 로드
source /home/geehong/firemarkets-app/.env

# 현재 시간을 포맷팅
BACKUP_TIME=$(date +"%Y_%m_%d_%H_%M")
BACKUP_DIR="/home/geehong/backup/pg_backup_${BACKUP_TIME}"

# 백업 디렉토리 생성
mkdir -p "$BACKUP_DIR"
cd "$BACKUP_DIR"

echo "=== PostgreSQL 전용 백업 시작: $(date) ==="
echo "백업 디렉토리: $BACKUP_DIR"

# 1. PostgreSQL SQL 백업
echo "1. PostgreSQL 데이터베이스 백업 중..."
PGPASSWORD=${DB_PASSWORD_PG} docker exec fire_markets_db_postgres pg_dump -U geehong -d markets > "markets_postgres_backup_${BACKUP_TIME}.sql"
if [ $? -eq 0 ]; then
    echo "✓ PostgreSQL 데이터베이스 백업 완료: markets_postgres_backup_${BACKUP_TIME}.sql"
else
    echo "✗ PostgreSQL 데이터베이스 백업 실패"
fi

# 2. PostgreSQL 볼륨 백업
echo "2. PostgreSQL 볼륨 백업 중..."
docker run --rm -v firemarkets-app_pg_data:/data -v "$(pwd)":/backup alpine tar czf "/backup/postgres_volume_backup_${BACKUP_TIME}.tar.gz" -C /data .
if [ $? -eq 0 ]; then
    echo "✓ PostgreSQL 볼륨 백업 완료: postgres_volume_backup_${BACKUP_TIME}.tar.gz"
else
    echo "✗ PostgreSQL 볼륨 백업 실패"
fi

# 3. 백업 완료 정보
echo ""
echo "=== PostgreSQL 백업 완료: $(date) ==="
echo "백업 위치: $BACKUP_DIR"
echo "백업 파일들:"
ls -la "$BACKUP_DIR"

echo "=== PostgreSQL 백업 스크립트 종료 ==="
