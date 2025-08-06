#!/bin/bash

# nginx-proxy-manager 설정 백업 스크립트
BACKUP_DIR="/home/geehong/firemarkets-app/backups/npm"
DATE=$(date +%Y%m%d_%H%M%S)

echo "=== nginx-proxy-manager 설정 백업 시작 ==="

# 백업 디렉토리 생성
mkdir -p $BACKUP_DIR

# nginx-proxy-manager 데이터 백업
echo "데이터 백업 중..."
docker run --rm -v firemarkets-app_npm_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/npm_data_$DATE.tar.gz -C /data .

# SSL 인증서 백업
echo "SSL 인증서 백업 중..."
docker run --rm -v firemarkets-app_npm_letsencrypt:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/npm_letsencrypt_$DATE.tar.gz -C /data .

echo "백업 완료: $BACKUP_DIR"
echo "백업 파일:"
ls -la $BACKUP_DIR/*$DATE*

echo "=== 백업 완료 ===" 