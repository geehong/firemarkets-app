#!/bin/bash

# SSH 키 백업 스크립트
# 작성자: System Administrator
# 목적: SSH 키 파일들을 안전한 위치에 백업

SSH_DIR="/home/geehong/.ssh"
BACKUP_DIR="/home/geehong/backups/ssh_keys"
DATE=$(date '+%Y%m%d_%H%M%S')
BACKUP_NAME="ssh_keys_backup_$DATE.tar.gz"
LOG_FILE="/var/log/ssh_backup.log"

# 로그 함수
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | sudo tee -a "$LOG_FILE"
}

# 백업 디렉토리 생성
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log_message "백업 디렉토리를 생성했습니다: $BACKUP_DIR"
    fi
}

# SSH 키 백업
backup_ssh_keys() {
    log_message "SSH 키 백업을 시작합니다..."
    
    # SSH 디렉토리 존재 확인
    if [ ! -d "$SSH_DIR" ]; then
        log_message "ERROR: SSH 디렉토리가 존재하지 않습니다: $SSH_DIR"
        return 1
    fi
    
    # 백업 디렉토리 생성
    create_backup_dir
    
    # 백업 파일 생성
    cd "$SSH_DIR"
    tar -czf "$BACKUP_DIR/$BACKUP_NAME" . 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log_message "SUCCESS: SSH 키 백업이 완료되었습니다: $BACKUP_DIR/$BACKUP_NAME"
        
        # 백업 파일 크기 확인
        local size=$(du -h "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)
        log_message "백업 파일 크기: $size"
        
        # 오래된 백업 파일 정리 (30일 이상)
        find "$BACKUP_DIR" -name "ssh_keys_backup_*.tar.gz" -mtime +30 -delete
        log_message "30일 이상 된 백업 파일을 정리했습니다"
        
        return 0
    else
        log_message "ERROR: SSH 키 백업에 실패했습니다"
        return 1
    fi
}

# 백업 복원 함수
restore_ssh_keys() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        echo "사용법: $0 restore <백업파일명>"
        echo "사용 가능한 백업 파일:"
        ls -la "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "백업 파일이 없습니다"
        return 1
    fi
    
    if [ ! -f "$BACKUP_DIR/$backup_file" ]; then
        log_message "ERROR: 백업 파일을 찾을 수 없습니다: $BACKUP_DIR/$backup_file"
        return 1
    fi
    
    log_message "SSH 키 복원을 시작합니다: $backup_file"
    
    # 기존 SSH 디렉토리 백업
    if [ -d "$SSH_DIR" ]; then
        local current_backup="$BACKUP_DIR/current_ssh_$(date '+%Y%m%d_%H%M%S').tar.gz"
        tar -czf "$current_backup" -C "$SSH_DIR" .
        log_message "현재 SSH 키를 백업했습니다: $current_backup"
    fi
    
    # 백업에서 복원
    tar -xzf "$BACKUP_DIR/$backup_file" -C "$SSH_DIR"
    
    if [ $? -eq 0 ]; then
        log_message "SUCCESS: SSH 키 복원이 완료되었습니다"
        
        # 권한 수정
        chmod 700 "$SSH_DIR"
        find "$SSH_DIR" -name "*.pub" -exec chmod 644 {} \;
        find "$SSH_DIR" -name "id_*" ! -name "*.pub" -exec chmod 600 {} \;
        chown -R geehong:geehong "$SSH_DIR"
        
        log_message "SSH 키 권한을 수정했습니다"
        return 0
    else
        log_message "ERROR: SSH 키 복원에 실패했습니다"
        return 1
    fi
}

# 메인 실행
main() {
    case "$1" in
        "backup")
            backup_ssh_keys
            ;;
        "restore")
            restore_ssh_keys "$2"
            ;;
        *)
            echo "사용법: $0 {backup|restore [백업파일명]}"
            echo ""
            echo "예시:"
            echo "  $0 backup                    # SSH 키 백업"
            echo "  $0 restore backup_file.tar.gz # SSH 키 복원"
            ;;
    esac
}

# 스크립트 실행
main "$@" 