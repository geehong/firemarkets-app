#!/bin/bash

echo "=========================================="
echo "🔍 시스템 CPU 로그 확인"
echo "=========================================="
echo ""

# 현재 CPU 상태 확인
echo "📊 현재 시스템 CPU 사용량:"
echo "----------------------------------------"
if command -v top &> /dev/null; then
    top -bn1 | head -5
else
    echo "top 명령을 사용할 수 없습니다."
fi
echo ""

# Docker 컨테이너 CPU 사용량
echo "🐳 Docker 컨테이너 CPU/메모리 사용량:"
echo "----------------------------------------"
if command -v docker &> /dev/null; then
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null || echo "Docker 명령 실행 실패"
else
    echo "Docker가 설치되어 있지 않습니다."
fi
echo ""

# 주요 프로세스 CPU 사용량
echo "🔧 주요 프로세스 CPU 사용량 (상위 10개):"
echo "----------------------------------------"
ps aux --sort=-%cpu | head -11 | awk '{printf "%-10s %6s%% %6s%% %8s %s\n", $1, $3, $4, $2, $11}'
echo ""

# dockerd 프로세스 상세
echo "💾 Docker 데몬 (dockerd) 상태:"
echo "----------------------------------------"
ps aux | grep dockerd | grep -v grep | awk '{printf "PID: %s, CPU: %s%%, MEM: %s%%, CMD: %s\n", $2, $3, $4, $11}'
echo ""

# Python 프로세스들
echo "🐍 Python 프로세스 CPU 사용량:"
echo "----------------------------------------"
ps aux | grep python | grep -v grep | head -10 | awk '{printf "PID: %s, CPU: %s%%, MEM: %s%%, CMD: %s\n", $2, $3, $4, $11}'
echo ""

# Node/Next.js 프로세스들
echo "📦 Node/Next.js 프로세스 CPU 사용량:"
echo "----------------------------------------"
ps aux | grep -E "node|next" | grep -v grep | head -10 | awk '{printf "PID: %s, CPU: %s%%, MEM: %s%%, CMD: %s\n", $2, $3, $4, $11}'
echo ""

# 시스템 로그에서 CPU/성능 관련 로그 확인 (최근 1시간)
echo "📋 시스템 로그에서 CPU/성능 관련 항목 (최근 1시간):"
echo "----------------------------------------"
if command -v journalctl &> /dev/null; then
    sudo journalctl --since "1 hour ago" | grep -iE "cpu|performance|load|memory|slow" | tail -20 || echo "관련 로그가 없습니다."
else
    echo "journalctl을 사용할 수 없습니다."
fi
echo ""

# Docker 로그 확인
echo "🐳 Docker 데몬 로그 (최근 20줄):"
echo "----------------------------------------"
if command -v journalctl &> /dev/null; then
    sudo journalctl -u docker.service -n 20 --no-pager 2>/dev/null || echo "Docker 서비스 로그를 가져올 수 없습니다."
else
    echo "journalctl을 사용할 수 없습니다."
fi
echo ""

echo "=========================================="
echo "💡 참고:"
echo "  - 시스템 로그는 /api/v1/logs/system 엔드포인트로도 조회 가능"
echo "  - 실시간 모니터링: watch -n 2 './check_cpu_status.sh'"
echo "=========================================="










