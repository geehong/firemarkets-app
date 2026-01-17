#!/bin/bash

# 파일 권한 자동 복구 스크립트
echo "파일 권한을 복구하는 중..."

# 현재 사용자 ID 확인
USER_ID=$(id -u)
GROUP_ID=$(id -g)

echo "사용자 ID: $USER_ID, 그룹 ID: $GROUP_ID"

# 프로젝트 디렉토리의 모든 파일과 폴더 권한 수정
sudo chown -R $USER_ID:$GROUP_ID /home/geehong/firemarkets-app/

# 파일 권한 설정 (644)
sudo find /home/geehong/firemarkets-app/ -type f -exec chmod 644 {} \;

# 디렉토리 권한 설정 (755)
sudo find /home/geehong/firemarkets-app/ -type d -exec chmod 755 {} \;

# 실행 파일 권한 설정 (755)
sudo find /home/geehong/firemarkets-app/ -name "*.sh" -exec chmod 755 {} \;

echo "권한 복구 완료!" 