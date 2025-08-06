#!/bin/bash

# 파일 권한 실시간 모니터링 및 자동 복구 스크립트
echo "파일 권한 모니터링 시작..."

# 현재 사용자 ID 확인
USER_ID=$(id -u)
GROUP_ID=$(id -g)

echo "사용자 ID: $USER_ID, 그룹 ID: $GROUP_ID"
echo "프로젝트 디렉토리: /home/geehong/firemarkets-app"
echo "모니터링 중... (Ctrl+C로 종료)"

# 5초마다 권한 확인 및 복구
while true; do
    # 권한이 잘못된 파일 확인
    WRONG_PERMISSIONS=$(find /home/geehong/firemarkets-app/ -type f -not -user $USER_ID 2>/dev/null | head -5)
    
    if [ ! -z "$WRONG_PERMISSIONS" ]; then
        echo "잘못된 권한 발견: $(date)"
        echo "$WRONG_PERMISSIONS"
        
        # 권한 복구
        sudo chown -R $USER_ID:$GROUP_ID /home/geehong/firemarkets-app/
        sudo find /home/geehong/firemarkets-app/ -type f -exec chmod 644 {} \;
        sudo find /home/geehong/firemarkets-app/ -type d -exec chmod 755 {} \;
        sudo find /home/geehong/firemarkets-app/ -name "*.sh" -exec chmod 755 {} \;
        
        echo "권한 복구 완료: $(date)"
    fi
    
    sleep 5
done 