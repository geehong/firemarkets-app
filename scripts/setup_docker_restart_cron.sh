#!/bin/bash

# Docker 서비스 재시작 Cron 작업 설정 스크립트
# 작성자: System Administrator
# 목적: 매일 한국시간 18:00에 scheduler와 websocket_broadcaster를 재시작하는 cron 작업 설정

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESTART_SCRIPT="$SCRIPT_DIR/restart_docker_services.sh"

echo "Docker 서비스 재시작 Cron 작업을 설정합니다..."
echo "실행 시간: 매일 한국시간 18:00"
echo ""

# 스크립트 존재 확인
if [ ! -f "$RESTART_SCRIPT" ]; then
    echo "ERROR: 재시작 스크립트를 찾을 수 없습니다: $RESTART_SCRIPT"
    exit 1
fi

# 스크립트 실행 권한 확인 및 설정
if [ ! -x "$RESTART_SCRIPT" ]; then
    echo "재시작 스크립트에 실행 권한을 부여합니다..."
    chmod +x "$RESTART_SCRIPT"
fi

# 시스템 타임존 확인
CURRENT_TZ=$(timedatectl show -p Timezone --value 2>/dev/null || echo "Asia/Seoul")
echo "현재 시스템 타임존: $CURRENT_TZ"

# 한국시간(KST)으로 cron 작업 설정
# cron은 시스템 타임존을 사용하므로, 시스템이 KST로 설정되어 있다면 18:00으로 설정
# 만약 UTC라면 09:00 (18:00 - 9시간)으로 설정해야 함
CRON_HOUR=18
CRON_MINUTE=0

if [ "$CURRENT_TZ" != "Asia/Seoul" ]; then
    echo "WARNING: 시스템 타임존이 Asia/Seoul이 아닙니다."
    echo "cron은 시스템 타임존을 사용하므로, 한국시간 18:00에 맞게 조정이 필요할 수 있습니다."
    echo ""
    read -p "계속하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "작업이 취소되었습니다."
        exit 1
    fi
fi

# cron 작업 문자열 생성
# 매일 18:00에 실행 (한국시간 기준)
CRON_JOB="$CRON_MINUTE $CRON_HOUR * * * $RESTART_SCRIPT"

echo "설정할 cron 작업: $CRON_JOB"
echo ""

# 현재 cron 작업 확인
if crontab -l 2>/dev/null | grep -q "$RESTART_SCRIPT"; then
    echo "WARNING: 이미 cron 작업이 설정되어 있습니다."
    echo "기존 작업을 제거하고 새로 설정합니다..."
    crontab -l 2>/dev/null | grep -v "$RESTART_SCRIPT" | crontab -
fi

# 새로운 cron 작업 추가
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

if [ $? -eq 0 ]; then
    echo "SUCCESS: Docker 서비스 재시작 cron 작업이 설정되었습니다."
    echo "설정된 작업: $CRON_JOB"
    echo ""
    echo "현재 cron 작업 목록:"
    crontab -l
    echo ""
    echo "재시작 로그는 /var/log/docker_restart.log 에 저장됩니다."
    echo "수동으로 스크립트를 실행하려면: $RESTART_SCRIPT"
else
    echo "ERROR: cron 작업 설정에 실패했습니다."
    exit 1
fi



