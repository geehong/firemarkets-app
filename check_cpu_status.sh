#!/bin/bash

echo "=========================================="
echo "🔍 시스템 CPU 상태 확인"
echo "=========================================="
echo ""

echo "📊 전체 CPU 사용량:"
top -bn1 | head -5
echo ""

echo "🐳 Docker 컨테이너 CPU/메모리 사용량:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" 2>/dev/null || echo "Docker 명령 실행 실패"
echo ""

echo "🔧 주요 프로세스 CPU 사용량:"
ps aux | grep -E "dockerd|python|node|next-server|uvicorn" | grep -v grep | head -10 | awk '{printf "%-10s %6s%% %6s%% %8s %s\n", $1, $3, $4, $2, $11}'
echo ""

echo "📦 실행 중인 컨테이너:"
docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "Docker 명령 실행 실패"
echo ""

echo "💾 Docker 데몬 상태:"
ps aux | grep dockerd | grep -v grep | awk '{printf "dockerd PID: %s, CPU: %s%%, MEM: %s%%\n", $2, $3, $4}'
echo ""

echo "=========================================="
echo "✅ 정상 범위:"
echo "  - dockerd CPU: 0-20% (정상), 20-50% (주의), 50%+ (문제)"
echo "  - 전체 CPU idle: 70%+ (정상)"
echo "=========================================="



