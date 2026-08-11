#!/bin/bash

# Fix USB Mount Script
# 이 스크립트는 USB 드라이브를 /etc/fstab에 등록하여 부팅 시 자동으로 마운트되도록 설정하고,
# 권한 문제를 해결합니다.

UUID="cd498e87-5f0b-4b13-a8f6-0e78d1817614"
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

# 2. /etc/fstab 등록 확인 및 업데이트
# 기존에 $MOUNT_POINT에 대한 설정이 있다면 모두 삭제하고 새로 등록합니다.
echo "/etc/fstab에서 기존 마운트 설정 제거 중..."
sudo sed -i "\| $MOUNT_POINT |d" /etc/fstab

echo "/etc/fstab에 자동 마운트 설정 추가 중..."
# ext4 형식에 맞게 설정 추가 (nofail 포함)
echo "UUID=$UUID $MOUNT_POINT ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab
echo "추가 완료."

# 3. 마운트 적용
echo "마운트 적용 중..."
# 이미 마운트되어 있다면 언마운트 후 재설정
sudo umount /dev/disk/by-uuid/$UUID 2>/dev/null || true
sudo umount $MOUNT_POINT 2>/dev/null || true
sudo systemctl daemon-reload
sudo mount -a

# 4. 마운트 확인
if mountpoint -q "$MOUNT_POINT"; then
    echo "✓ 마운트 성공!"
    
    # 5. 권한 설정
    echo "권한 설정 중 ($USER)..."
    sudo chown -R $USER:$USER "$MOUNT_POINT" || true
    sudo chmod 755 "$MOUNT_POINT" || true
    
    echo "✓ 모든 설정이 완료되었습니다."
    echo "이제 재부팅 후에도 $MOUNT_POINT 경로에 자동으로 마운트됩니다."
else
    echo "✗ 마운트 실패. 장치 연결을 확인하거나 로그를 확인해주세요."
    exit 1
fi
