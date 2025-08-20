#!/bin/bash

# FireMarkets App Git Commit Script
# 실행: 24시간마다

echo "=== FireMarkets App Git 커밋 시작: $(date) ==="

# 프로젝트 디렉토리로 이동
cd /home/geehong/firemarkets-app

# Git 상태 확인
echo "1. Git 상태 확인 중..."
git status

# 변경사항이 있는지 확인
if git diff-index --quiet HEAD --; then
    echo "✓ 변경사항이 없습니다. 커밋을 건너뜁니다."
    exit 0
fi

# 현재 시간을 커밋 메시지에 포함
COMMIT_TIME=$(date +"%Y-%m-%d %H:%M:%S")
COMMIT_MESSAGE="Auto commit: $COMMIT_TIME - FireMarkets App daily update"

echo "2. 변경사항 스테이징 중..."
git add .

echo "3. 커밋 중..."
git commit -m "$COMMIT_MESSAGE"

echo "4. 원격 저장소에 푸시 중..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✓ Git 커밋 및 푸시 완료: $COMMIT_MESSAGE"
else
    echo "✗ Git 푸시 실패"
fi

echo "=== Git 커밋 스크립트 종료 ==="
