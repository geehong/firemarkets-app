#!/bin/sh
set -e

echo "=== privileged docker container 에서 USB 포맷 시작 ==="

# 1. 필요한 패키지 설치
apk add --no-cache parted util-linux e2fsprogs

# 2. 기존 마운트 해제
echo "기존 파티션 언마운트 중..."
umount /dev/sda1 2>/dev/null || true
umount /dev/sda2 2>/dev/null || true

# 3. 파티션 테이블 초기화 및 생성 (gpt)
echo "파티션 테이블 생성 (GPT)..."
parted -s /dev/sda mklabel gpt

# 4. 전체 공간을 차지하는 단일 ext4 파티션 생성
echo "단일 ext4 파티션 생성 중..."
parted -s /dev/sda mkpart primary ext4 0% 100%

# 5. 파티션 테이블 갱신을 위해 잠시 대기
sleep 2

# 6. ext4 포맷 진행
echo "ext4 포맷 중 (/dev/sda1)..."
mkfs.ext4 -F /dev/sda1

echo "=== USB 포맷 완료 ==="

# 7. 새로운 UUID 확인
blkid /dev/sda1
