#!/bin/bash

# SSH 권한 모니터링 Cron 작업 설정 스크립트
# 작성자: System Administrator
# 목적: SSH 키 권한 모니터링을 위한 cron 작업을 설정

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITOR_SCRIPT="$SCRIPT_DIR/ssh_permission_monitor.sh"
CRON_JOB="*/10 * * * * $MONITOR_SCRIPT"

echo "SSH 권한 모니터링 Cron 작업을 설정합니다..."

# 스크립트 존재 확인
if [ ! -f "$MONITOR_SCRIPT" ]; then
    echo "ERROR: 모니터링 스크립트를 찾을 수 없습니다: $MONITOR_SCRIPT"
    exit 1
fi

# 스크립트 실행 권한 확인
if [ ! -x "$MONITOR_SCRIPT" ]; then
    echo "ERROR: 모니터링 스크립트에 실행 권한이 없습니다: $MONITOR_SCRIPT"
    exit 1
fi

# 현재 cron 작업 확인
if crontab -l 2>/dev/null | grep -q "$MONITOR_SCRIPT"; then
    echo "WARNING: 이미 cron 작업이 설정되어 있습니다."
    echo "기존 작업을 제거하고 새로 설정합니다..."
    crontab -l 2>/dev/null | grep -v "$MONITOR_SCRIPT" | crontab -
fi

# 새로운 cron 작업 추가
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

if [ $? -eq 0 ]; then
    echo "SUCCESS: SSH 권한 모니터링 cron 작업이 설정되었습니다."
    echo "설정된 작업: $CRON_JOB"
    echo ""
    echo "현재 cron 작업 목록:"
    crontab -l
else
    echo "ERROR: cron 작업 설정에 실패했습니다."
    exit 1
fi

echo ""
echo "모니터링 로그는 /var/log/ssh_permission_monitor.log 에 저장됩니다."
echo "수동으로 스크립트를 실행하려면: $MONITOR_SCRIPT" 