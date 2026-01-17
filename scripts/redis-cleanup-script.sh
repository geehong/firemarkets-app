#!/bin/bash

# FireMarkets App Redis Stream Cleanup Script
# 실행: 12시간마다 (매일 00:00, 12:00)
# 목적: Redis Stream 메모리 사용량 제한 및 정리

# 환경변수 로드
source /home/geehong/firemarkets-app/.env

# 로그 파일 설정
LOG_DIR="/home/geehong/firemarkets-app/logs"
LOG_FILE="${LOG_DIR}/redis-cleanup-$(date +%Y%m%d).log"

# 로그 디렉토리 생성
mkdir -p "$LOG_DIR"

# 로그 함수
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_message "=== Redis Stream 정리 시작 ==="

# Redis 컨테이너 상태 확인
if ! docker ps | grep -q fire_markets_redis; then
    log_message "❌ Redis 컨테이너가 실행 중이 아닙니다"
    exit 1
fi

log_message "✅ Redis 컨테이너 실행 중 확인"

# 정리 전 메모리 사용량 확인
BEFORE_MEMORY=$(docker exec fire_markets_redis redis-cli INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
log_message "📊 정리 전 Redis 메모리 사용량: $BEFORE_MEMORY"

# Stream별 정리 실행
STREAMS=("binance:realtime" "coinbase:realtime" "swissquote:realtime" "fmp:realtime" "finnhub:realtime" "twelvedata:realtime")

for stream in "${STREAMS[@]}"; do
    log_message "🧹 Stream 정리 시작: $stream"
    
    # Stream 존재 여부 확인
    STREAM_EXISTS=$(docker exec fire_markets_redis redis-cli EXISTS "$stream")
    if [ "$STREAM_EXISTS" = "0" ]; then
        log_message "ℹ️ Stream $stream이 존재하지 않음, 건너뜀"
        continue
    fi
    
    # 현재 Stream 길이 확인
    CURRENT_LENGTH=$(docker exec fire_markets_redis redis-cli XLEN "$stream")
    log_message "📏 $stream 현재 길이: $CURRENT_LENGTH"
    
    # 1000개 초과 시에만 정리
    if [ "$CURRENT_LENGTH" -gt 1000 ]; then
        # Stream 정리 실행
        TRIMMED_COUNT=$(docker exec fire_markets_redis redis-cli XTRIM "$stream" MAXLEN 1000)
        log_message "✅ $stream 정리 완료: $TRIMMED_COUNT개 메시지 제거"
    else
        log_message "ℹ️ $stream은 이미 적절한 크기 (1000개 이하)"
    fi
done

# 정리 후 메모리 사용량 확인
AFTER_MEMORY=$(docker exec fire_markets_redis redis-cli INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
log_message "📊 정리 후 Redis 메모리 사용량: $AFTER_MEMORY"

# Stream별 최종 상태 확인
log_message "📋 Stream별 최종 상태:"
for stream in "${STREAMS[@]}"; do
    STREAM_EXISTS=$(docker exec fire_markets_redis redis-cli EXISTS "$stream")
    if [ "$STREAM_EXISTS" = "1" ]; then
        FINAL_LENGTH=$(docker exec fire_markets_redis redis-cli XLEN "$stream")
        log_message "  - $stream: $FINAL_LENGTH개 메시지"
    else
        log_message "  - $stream: 존재하지 않음"
    fi
done

# Redis 메모리 정보 상세 확인
log_message "🔍 Redis 메모리 상세 정보:"
docker exec fire_markets_redis redis-cli INFO memory | grep -E "(used_memory|maxmemory|mem_fragmentation)" | while read line; do
    log_message "  $line"
done

log_message "=== Redis Stream 정리 완료 ==="
log_message ""

# 로그 파일 크기 확인 (10MB 초과 시 압축)
LOG_SIZE=$(stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)
if [ "$LOG_SIZE" -gt 10485760 ]; then  # 10MB
    log_message "📦 로그 파일 압축 중..."
    gzip "$LOG_FILE"
    log_message "✅ 로그 파일 압축 완료: ${LOG_FILE}.gz"
fi

# 오래된 로그 파일 정리 (30일 이상)
log_message "🗑️ 오래된 로그 파일 정리 중..."
find "$LOG_DIR" -name "redis-cleanup-*.log*" -mtime +30 -delete
log_message "✅ 30일 이상 된 로그 파일 정리 완료"

log_message "=== 스크립트 종료 ==="

