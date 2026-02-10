#!/bin/bash

# Fix USB Mount Script
# 이 스크립트는 USB 드라이브를 /etc/fstab에 등록하여 부팅 시 자동으로 마운트되도록 설정하고,
# 권한 문제를 해결합니다.

UUID="c25491da-c894-4a0a-a045-6fdf98d57030"
MOUNT_POINT="/home/geehong/firemarkets-app/usb-backup-drive"
USER="geehong"

echo "=== USB 마운트 설정 수정 시작 ==="

# 0. 기존 심볼릭 링크 또는 디렉토리 확인
if [ -L "$MOUNT_POINT" ]; then
    echo "기존 심볼릭 링크 삭제 중: $MOUNT_POINT"
    rm "$MOUNT_POINT"
fi

# 1. 마운트 포인트 생성
if [ ! -d "$MOUNT_POINT" ]; then
    echo "마운트 포인트 디렉토리 생성: $MOUNT_POINT"
    # 홈 디렉토리 내이므로 sudo 없이 생성 시도, 실패 시 sudo 사용
    mkdir -p "$MOUNT_POINT" || sudo mkdir -p "$MOUNT_POINT"
fi

# 2. /etc/fstab 등록 확인 및 추가
# 기존 /mnt/usb_backup 설정이 있다면 주석 처리하거나 무시해야 함.
# 여기서는 새로운 경로로 추가합니다.
if grep -q "$MOUNT_POINT" /etc/fstab; then
    echo "이미 /etc/fstab에 등록되어 있습니다."
else
    echo "/etc/fstab에 자동 마운트 설정 추가 중..."
    # nofail 옵션: USB가 없어도 부팅이 멈추지 않도록 함
    echo "UUID=$UUID $MOUNT_POINT ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab
    echo "추가 완료."
fi

# 3. 마운트 적용
echo "마운트 적용 중..."
sudo systemctl daemon-reload
sudo mount -a

# 4. 마운트 확인
if mountpoint -q "$MOUNT_POINT"; then
    echo "✓ 마운트 성공!"
    
    # 5. 권한 설정 (영구적)
    echo "권한 설정 중 ($USER)..."
    sudo chown -R $USER:$USER "$MOUNT_POINT"
    sudo chmod 755 "$MOUNT_POINT"
    
    echo "✓ 모든 설정이 완료되었습니다."
    echo "이제 재부팅 후에도 $MOUNT_POINT 경로에 자동으로 마운트됩니다."
else
    echo "✗ 마운트 실패. 장치 연결을 확인하거나 로그를 확인해주세요."
    exit 1
fi
