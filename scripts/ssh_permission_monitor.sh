#!/bin/bash

# SSH 키 권한 모니터링 및 자동 복구 스크립트
# 작성자: System Administrator
# 목적: SSH 키 파일들의 권한을 모니터링하고 문제 발생 시 자동 복구

LOG_FILE="/var/log/ssh_permission_monitor.log"
SSH_DIR="/home/geehong/.ssh"
HOME_DIR="/home/geehong"
USER="geehong"
GROUP="geehong"

# 로그 함수
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | sudo tee -a "$LOG_FILE"
}

# 권한 확인 함수
check_ssh_permissions() {
    local issues_found=false
    
    # 홈 디렉토리 소유권 확인
    local home_owner=$(stat -c '%U:%G' "$HOME_DIR")
    if [ "$home_owner" != "$USER:$GROUP" ]; then
        log_message "WARNING: 홈 디렉토리 소유권이 잘못되었습니다: $home_owner (예상: $USER:$GROUP)"
        issues_found=true
    fi
    
    # SSH 디렉토리 존재 확인
    if [ ! -d "$SSH_DIR" ]; then
        log_message "ERROR: SSH 디렉토리가 존재하지 않습니다: $SSH_DIR"
        return 1
    fi
    
    # SSH 디렉토리 소유권 확인
    local dir_owner=$(stat -c '%U:%G' "$SSH_DIR")
    if [ "$dir_owner" != "$USER:$GROUP" ]; then
        log_message "WARNING: SSH 디렉토리 소유권이 잘못되었습니다: $dir_owner (예상: $USER:$GROUP)"
        issues_found=true
    fi
    
    # SSH 디렉토리 권한 확인 (700)
    local dir_perms=$(stat -c '%a' "$SSH_DIR")
    if [ "$dir_perms" != "700" ]; then
        log_message "WARNING: SSH 디렉토리 권한이 잘못되었습니다: $dir_perms (예상: 700)"
        issues_found=true
    fi
    
    # SSH 키 파일들 확인
    for key_file in "$SSH_DIR"/*; do
        if [ -f "$key_file" ]; then
            local file_owner=$(stat -c '%U:%G' "$key_file")
            local file_perms=$(stat -c '%a' "$key_file")
            
            # 소유권 확인
            if [ "$file_owner" != "$USER:$GROUP" ]; then
                log_message "WARNING: 파일 소유권이 잘못되었습니다: $key_file ($file_owner)"
                issues_found=true
            fi
            
            # 권한 확인 (600 for private keys, 644 for public keys)
            local filename=$(basename "$key_file")
            if [[ "$filename" == *.pub ]]; then
                # 공개키는 644 권한
                if [ "$file_perms" != "644" ]; then
                    log_message "WARNING: 공개키 권한이 잘못되었습니다: $key_file ($file_perms)"
                    issues_found=true
                fi
            else
                # 개인키는 600 권한
                if [ "$file_perms" != "600" ]; then
                    log_message "WARNING: 개인키 권한이 잘못되었습니다: $key_file ($file_perms)"
                    issues_found=true
                fi
            fi
        fi
    done
    
    if [ "$issues_found" = true ]; then
        return 1
    else
        return 0
    fi
}

# 권한 복구 함수
fix_ssh_permissions() {
    log_message "SSH 권한 복구를 시작합니다..."
    
    # 홈 디렉토리 소유권 수정
    sudo chown "$USER:$GROUP" "$HOME_DIR"
    log_message "홈 디렉토리 소유권을 $USER:$GROUP으로 수정했습니다"
    
    # SSH 디렉토리 소유권 수정
    sudo chown -R "$USER:$GROUP" "$SSH_DIR"
    log_message "SSH 디렉토리 소유권을 $USER:$GROUP으로 수정했습니다"
    
    # SSH 디렉토리 권한 수정 (700)
    sudo chmod 700 "$SSH_DIR"
    log_message "SSH 디렉토리 권한을 700으로 수정했습니다"
    
    # SSH 키 파일들 권한 수정
    for key_file in "$SSH_DIR"/*; do
        if [ -f "$key_file" ]; then
            local filename=$(basename "$key_file")
            if [[ "$filename" == *.pub ]]; then
                # 공개키는 644 권한
                sudo chmod 644 "$key_file"
                log_message "공개키 권한을 644로 수정했습니다: $key_file"
            else
                # 개인키는 600 권한
                sudo chmod 600 "$key_file"
                log_message "개인키 권한을 600으로 수정했습니다: $key_file"
            fi
        fi
    done
    
    log_message "SSH 권한 복구가 완료되었습니다"
}

# 메인 실행
main() {
    log_message "SSH 권한 모니터링을 시작합니다"
    
    if check_ssh_permissions; then
        log_message "SSH 권한이 정상입니다"
    else
        log_message "SSH 권한 문제가 발견되었습니다. 복구를 시작합니다..."
        fix_ssh_permissions
        
        # 복구 후 재확인
        if check_ssh_permissions; then
            log_message "SSH 권한 복구가 성공했습니다"
        else
            log_message "ERROR: SSH 권한 복구가 실패했습니다"
            exit 1
        fi
    fi
}

# 스크립트 실행
main "$@" 