#!/bin/bash

# FireMarkets App Backup Script
# 실행: 12시간마다

# 환경변수 로드
if [ -f /home/geehong/firemarkets-app/.env ]; then
    # .env 파일 로드 시 발생하는 일부 쉘 에러 무시
    set -a
    source /home/geehong/firemarkets-app/.env 2>/dev/null
    set +a
fi

# 현재 시간을 포맷팅 (날짜별로 폴더 생성)
BACKUP_DATE=$(date +"%Y_%m_%d")
BACKUP_TIME=$(date +"%Y_%m_%d_%H_%M")

# USB 드라이브 설정 (UUID를 사용하여 장치 이름이 sda/sdb로 바뀌어도 대응 가능하도록 함)
USB_DEV="/dev/disk/by-uuid/c25491da-c894-4a0a-a045-6fdf98d57030"
MOUNT_POINT="/home/geehong/firemarkets-app/usb-backup-drive"

# 0. USB 포맷 (FORMAT_USB=true 일 때만 실행)
# 주의: 이 옵션은 USB의 모든 데이터를 삭제합니다.
if [ "$FORMAT_USB" = "true" ]; then
    echo "!!! 경고: $USB_DEV 를 포맷합니다. 5초 뒤 시작..."
    sleep 5
    
    # 마운트 해제 시도 (모든 마운트 포인트 확인)
    echo "USB 마운트 해제 중..."
    # findmnt 결과를 한 줄씩 읽어 공백이 포함된 경로 처리
    findmnt -n -o TARGET -S "$USB_DEV" | while read -r path; do
        if [ -n "$path" ]; then
            echo "Unmounting $path..."
            # 일반 언마운트 시도 후 실패 시 lazy 언마운트 시도
            sudo umount "$path" 2>/dev/null || sudo umount -l "$path"
        fi
    done
    
    # 강제 언마운트 및 지연
    sudo umount -f "$USB_DEV" 2>/dev/null || true
    sleep 3
    
    # 마지막 확인: 아직 마운트되어 있는지 체크
    if findmnt -S "$USB_DEV" >/dev/null; then
        echo "✗ 장치가 아직 사용 중입니다. 다른 프로그램이 사용 중인지 확인해주세요."
        exit 1
    fi
    
    # 포맷 실행
    echo "포맷 시작 ($USB_DEV)..."
    if sudo mkfs.ext4 -F "$USB_DEV"; then
        echo "✓ USB 포맷 완료"
    else
        echo "✗ USB 포맷 실패. 장치가 사용 중이거나 권한이 없습니다."
        exit 1
    fi
fi

# 마운트 확인 및 수행
# 기존에 마운트된 곳이 있는지 확인 (공백 처리 포함)
findmnt -n -o TARGET -S "$USB_DEV" | while read -r path; do
    if [ -n "$path" ] && [ "$path" != "$MOUNT_POINT" ]; then
        echo "USB가 다른 경로에 마운트되어 있습니다: $path"
        echo "해당 경로를 언마운트합니다."
        sudo umount "$path"
    fi
done

if ! mountpoint -q "$MOUNT_POINT"; then
    echo "USB 마운트 시도: $USB_DEV -> $MOUNT_POINT"
    sudo mkdir -p "$MOUNT_POINT"
    
    # 마운트 실행
    if sudo mount "$USB_DEV" "$MOUNT_POINT"; then
        echo "✓ USB 마운트 성공"
    else
        echo "✗ USB 마운트 실패. 장치를 확인해주세요."
        exit 1
    fi
    
    # 권한 설정 (현재 사용자가 쓰기 가능하도록)
    echo "권한 설정 중..."
    sudo chown -R $(whoami):$(whoami) "$MOUNT_POINT"
    sudo chmod 755 "$MOUNT_POINT"
fi

# 백업 경로 설정 (/backup/firemarkets)
BACKUP_ROOT="${MOUNT_POINT}/backup/firemarkets"
BACKUP_DIR="${BACKUP_ROOT}/${BACKUP_DATE}"

# 백업 디렉토리 생성 및 확인
echo "백업 디렉토리 생성 중: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
if [ ! -d "$BACKUP_DIR" ]; then
    echo "✗ 백업 디렉토리 생성 실패: $BACKUP_DIR"
    exit 1
fi
echo "✓ 백업 디렉토리 생성 완료: $BACKUP_DIR"

# 백업 디렉토리로 이동
cd "$BACKUP_DIR" || {
    echo "✗ 백업 디렉토리로 이동 실패: $BACKUP_DIR"
    exit 1
}
echo "현재 작업 디렉토리: $(pwd)"

echo "=== FireMarkets App 백업 시작: $(date) ==="
echo "백업 디렉토리: $BACKUP_DIR"

# 1. 데이터베이스 백업
echo "1. PostgreSQL 데이터베이스 백업 중..."
PGPASSWORD=${DB_PASSWORD_PG} docker exec fire_markets_db_postgres pg_dump -U geehong -d markets | gzip > "markets_postgres_backup_${BACKUP_TIME}.sql.gz"
if [ $? -eq 0 ]; then
    echo "✓ PostgreSQL 데이터베이스 백업 완료: markets_postgres_backup_${BACKUP_TIME}.sql.gz"
else
    echo "✗ PostgreSQL 데이터베이스 백업 실패"
fi

# 2. Docker 볼륨 백업
echo "2. Docker 볼륨 백업 중..."

# PostgreSQL 데이터베이스 볼륨 백업
docker run --rm -v firemarkets-app_pg_data:/data -v "$(pwd)":/backup alpine tar czf "/backup/postgres_volume_backup_${BACKUP_TIME}.tar.gz" -C /data .
if [ $? -eq 0 ]; then
    echo "✓ PostgreSQL 볼륨 백업 완료: postgres_volume_backup_${BACKUP_TIME}.tar.gz"
else
    echo "✗ PostgreSQL 볼륨 백업 실패"
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
echo "백업 디렉토리 존재 확인: $(test -d "$BACKUP_DIR" && echo "존재함" || echo "존재하지 않음")"
echo "백업 파일들:"
if [ -d "$BACKUP_DIR" ]; then
    ls -la "$BACKUP_DIR"
    echo "백업 파일 개수: $(ls -1 "$BACKUP_DIR" | wc -l)"
else
    echo "✗ 백업 디렉토리가 존재하지 않습니다: $BACKUP_DIR"
fi

# 5. 오래된 백업 정리 (30일 이상 된 백업 삭제)
echo "5. 오래된 백업 정리 중..."
find "$BACKUP_ROOT" -name "20*_*" -type d -mtime +30 -exec rm -rf {} \;
echo "✓ 30일 이상 된 백업 정리 완료"

echo "=== 백업 스크립트 종료 ===" 