#!/bin/bash

# Docker 서비스 재시작 스크립트
# 작성자: System Administrator
# 목적: scheduler와 websocket_broadcaster 서비스를 재시작

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="/var/log/docker_restart.log"

# 로그 함수
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | sudo tee -a "$LOG_FILE"
}

# Docker Compose 파일 확인
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
    log_message "ERROR: docker-compose.yml 파일을 찾을 수 없습니다: $COMPOSE_FILE"
    exit 1
fi

# Docker Compose가 실행 중인지 확인
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log_message "ERROR: docker-compose를 찾을 수 없습니다"
    exit 1
fi

# docker-compose 명령어 결정 (docker-compose 또는 docker compose)
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    DOCKER_COMPOSE_CMD="docker compose"
fi

# 서비스 재시작 함수
restart_services() {
    log_message "Docker 서비스 재시작을 시작합니다..."
    log_message "대상 서비스: scheduler, websocket_broadcaster"
    
    cd "$PROJECT_DIR" || {
        log_message "ERROR: 프로젝트 디렉토리로 이동할 수 없습니다: $PROJECT_DIR"
        exit 1
    }
    
    # scheduler 재시작
    log_message "scheduler 서비스를 재시작합니다..."
    if $DOCKER_COMPOSE_CMD --profile processing restart scheduler 2>&1 | tee -a <(sudo tee -a "$LOG_FILE"); then
        log_message "SUCCESS: scheduler 서비스가 재시작되었습니다"
    else
        log_message "ERROR: scheduler 서비스 재시작에 실패했습니다"
        return 1
    fi
    
    # websocket_broadcaster 재시작
    log_message "websocket_broadcaster 서비스를 재시작합니다..."
    if $DOCKER_COMPOSE_CMD --profile processing restart websocket_broadcaster 2>&1 | tee -a <(sudo tee -a "$LOG_FILE"); then
        log_message "SUCCESS: websocket_broadcaster 서비스가 재시작되었습니다"
    else
        log_message "ERROR: websocket_broadcaster 서비스 재시작에 실패했습니다"
        return 1
    fi
    
    log_message "모든 서비스 재시작이 완료되었습니다"
    return 0
}

# 메인 실행
main() {
    log_message "=== Docker 서비스 재시작 스크립트 시작 ==="
    restart_services
    local exit_code=$?
    log_message "=== Docker 서비스 재시작 스크립트 종료 (종료 코드: $exit_code) ==="
    exit $exit_code
}

# 스크립트 실행
main "$@"














