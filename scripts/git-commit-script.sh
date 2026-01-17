#!/bin/bash

# FireMarkets App Git Commit Script
# 실행: 24시간마다 (매일 00:00)
# 백업 시스템과 연동

# 로그 파일 설정
LOG_DIR="/home/geehong/backup/logs"
LOG_FILE="$LOG_DIR/git-commit-$(date +%Y-%m-%d).log"

# 로그 디렉토리 생성
mkdir -p "$LOG_DIR"

# 로그 함수
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_message "=== FireMarkets App Git 커밋 시작 ==="

# 프로젝트 디렉토리로 이동
cd /home/geehong/firemarkets-app || {
    log_message "✗ 프로젝트 디렉토리로 이동 실패"
    exit 1
}

# Git 상태 확인
log_message "1. Git 상태 확인 중..."
git status >> "$LOG_FILE" 2>&1

# 변경사항이 있는지 확인
if git diff-index --quiet HEAD --; then
    log_message "✓ 변경사항이 없습니다. 커밋을 건너뜁니다."
    log_message "=== Git 커밋 스크립트 종료 ==="
    exit 0
fi

# 현재 시간을 커밋 메시지에 포함
COMMIT_TIME=$(date +"%Y-%m-%d %H:%M:%S")
COMMIT_MESSAGE="Auto commit: $COMMIT_TIME - FireMarkets App daily update"

log_message "2. 변경사항 스테이징 중..."
if ! git add . >> "$LOG_FILE" 2>&1; then
    log_message "✗ Git 스테이징 실패"
    exit 1
fi

log_message "3. 커밋 중..."
if ! git commit -m "$COMMIT_MESSAGE" >> "$LOG_FILE" 2>&1; then
    log_message "✗ Git 커밋 실패"
    exit 1
fi

log_message "4. 원격 저장소에 푸시 중..."
# 현재 브랜치 이름 가져오기
CURRENT_BRANCH=$(git branch --show-current)
log_message "현재 브랜치: $CURRENT_BRANCH"

if git push origin $CURRENT_BRANCH >> "$LOG_FILE" 2>&1; then
    log_message "✓ Git 커밋 및 푸시 완료: $COMMIT_MESSAGE (브랜치: $CURRENT_BRANCH)"
else
    log_message "✗ Git 푸시 실패 (로그 파일 확인 필요)"
    # 푸시 실패 시 마지막 몇 줄의 에러 메시지를 로그에 직접 기록
    tail -n 10 "$LOG_FILE" | grep -i "error" >> "$LOG_FILE"
    exit 1
fi

log_message "=== Git 커밋 스크립트 종료 ==="
