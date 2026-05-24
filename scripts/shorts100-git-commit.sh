#!/bin/bash

# Shorts100 Git Commit Script
# 실행: 12시간마다 (00:00, 12:00)

LOG_DIR="/home/geehong/backup/logs"
LOG_FILE="$LOG_DIR/shorts100-git-$(date +%Y-%m-%d).log"

mkdir -p "$LOG_DIR"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_message "=== Shorts100 Git 커밋 시작 ==="

cd /home/geehong/shorts100.com || {
    log_message "✗ 프로젝트 디렉토리로 이동 실패"
    exit 1
}

log_message "1. Git 상태 확인 중..."
git status --short >> "$LOG_FILE" 2>&1

STATUS_OUTPUT=$(git status --porcelain)

if [[ -z "$STATUS_OUTPUT" ]]; then
    log_message "✓ 변경사항 없음. 커밋 건너뜀."
    log_message "=== 종료 ==="
    exit 0
fi

COMMIT_TIME=$(date +"%Y-%m-%d %H:%M:%S")
COMMIT_MESSAGE="Auto commit: $COMMIT_TIME - Shorts100 daily update"

log_message "2. 스테이징 중..."
if ! git add . >> "$LOG_FILE" 2>&1; then
    log_message "✗ Git 스테이징 실패"
    exit 1
fi

log_message "3. 커밋 중..."
if ! git commit -m "$COMMIT_MESSAGE" >> "$LOG_FILE" 2>&1; then
    log_message "✗ Git 커밋 실패"
    exit 1
fi

log_message "4. 푸시 중..."
CURRENT_BRANCH=$(git branch --show-current)
if git push origin "$CURRENT_BRANCH" >> "$LOG_FILE" 2>&1; then
    log_message "✓ 완료: $COMMIT_MESSAGE (브랜치: $CURRENT_BRANCH)"
else
    log_message "✗ 푸시 실패"
    exit 1
fi

log_message "=== 종료 ==="
