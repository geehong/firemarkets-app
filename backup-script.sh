#!/bin/bash

# FireMarkets App Backup Script
# 실행: 6시간마다

# 현재 시간을 포맷팅 (날짜별로 폴더 생성)
BACKUP_DATE=$(date +"%Y_%m_%d")
BACKUP_TIME=$(date +"%Y_%m_%d_%H_%M")
BACKUP_DIR="/home/geehong/backup/${BACKUP_DATE}"

# 백업 디렉토리 생성
mkdir -p "$BACKUP_DIR"
cd "$BACKUP_DIR"

echo "=== FireMarkets App 백업 시작: $(date) ==="
echo "백업 디렉토리: $BACKUP_DIR"

# 1. 데이터베이스 백업
echo "1. 데이터베이스 백업 중..."
docker exec fire_markets_db mysqldump -u geehong -pPower6100 --single-transaction --routines --triggers --no-tablespaces markets > "markets_backup_${BACKUP_TIME}.sql"
if [ $? -eq 0 ]; then
    echo "✓ 데이터베이스 백업 완료: markets_backup_${BACKUP_TIME}.sql"
else
    echo "✗ 데이터베이스 백업 실패"
fi

# 2. Docker 볼륨 백업
echo "2. Docker 볼륨 백업 중..."

# 데이터베이스 볼륨 백업
docker run --rm -v firemarkets-app_db_data:/data -v "$(pwd)":/backup alpine tar czf "/backup/db_volume_backup_${BACKUP_TIME}.tar.gz" -C /data .
if [ $? -eq 0 ]; then
    echo "✓ DB 볼륨 백업 완료: db_volume_backup_${BACKUP_TIME}.tar.gz"
else
    echo "✗ DB 볼륨 백업 실패"
fi

# nginx-proxy-manager 설정 백업
docker run --rm -v firemarkets-app_npm_data:/data -v "$(pwd)":/backup alpine tar czf "/backup/npm_data_backup_${BACKUP_TIME}.tar.gz" -C /data .
if [ $? -eq 0 ]; then
    echo "✓ NPM 데이터 백업 완료: npm_data_backup_${BACKUP_TIME}.tar.gz"
else
    echo "✗ NPM 데이터 백업 실패"
fi

# portainer 데이터 백업
docker run --rm -v firemarkets-app_portainer_data:/data -v "$(pwd)":/backup alpine tar czf "/backup/portainer_data_backup_${BACKUP_TIME}.tar.gz" -C /data .
if [ $? -eq 0 ]; then
    echo "✓ Portainer 데이터 백업 완료: portainer_data_backup_${BACKUP_TIME}.tar.gz"
else
    echo "✗ Portainer 데이터 백업 실패"
fi

# 3. 프로젝트 파일 백업
echo "3. 프로젝트 파일 백업 중..."
cd /home/geehong/firemarkets-app
tar --exclude='node_modules' --exclude='venv' --exclude='.git' --exclude='backup' -czf "${BACKUP_DIR}/firemarkets_app_backup_${BACKUP_TIME}.tar.gz" .
if [ $? -eq 0 ]; then
    echo "✓ 프로젝트 파일 백업 완료: firemarkets_app_backup_${BACKUP_TIME}.tar.gz"
else
    echo "✗ 프로젝트 파일 백업 실패"
fi

# 4. 백업 완료 정보
echo ""
echo "=== 백업 완료: $(date) ==="
echo "백업 위치: $BACKUP_DIR"
echo "백업 파일들:"
ls -la "$BACKUP_DIR"

# 5. 오래된 백업 정리 (30일 이상 된 백업 삭제)
echo "5. 오래된 백업 정리 중..."
find /home/geehong/backup -name "2025_*" -type d -mtime +30 -exec rm -rf {} \;
echo "✓ 30일 이상 된 백업 정리 완료"

echo "=== 백업 스크립트 종료 ===" 