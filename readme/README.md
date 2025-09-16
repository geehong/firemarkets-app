# SSH 키 권한 모니터링 시스템

## 개요
이 시스템은 SSH 키 파일들의 권한을 자동으로 모니터링하고 문제 발생 시 자동으로 복구하는 기능을 제공합니다.

## 문제 배경
- Docker FTP 컨테이너가 전체 `/home/geehong` 디렉토리를 마운트하여 SSH 키 파일들의 소유권이 변경됨
- SSH 키 접속이 일정 시간 후 초기화되는 문제 발생

## 해결 방법
1. **FTP 볼륨 마운트 수정**: 특정 디렉토리만 마운트하여 SSH 디렉토리 제외
2. **자동 모니터링 시스템**: SSH 키 권한을 10분마다 확인하고 자동 복구
3. **백업 시스템**: SSH 키 파일들을 정기적으로 백업

## 스크립트 설명

### 1. ssh_permission_monitor.sh
- **기능**: SSH 키 권한 모니터링 및 자동 복구
- **실행 주기**: 10분마다 (cron 작업)
- **로그**: `/var/log/ssh_permission_monitor.log`

### 2. backup_ssh_keys.sh
- **기능**: SSH 키 파일 백업 및 복원
- **백업 위치**: `/home/geehong/backups/ssh_keys/`
- **보관 기간**: 30일

### 3. setup_ssh_monitoring.sh
- **기능**: cron 작업 설정
- **실행**: 한 번만 실행하여 모니터링 설정

## 사용법

### 모니터링 시작
```bash
./scripts/setup_ssh_monitoring.sh
```

### 수동 권한 확인
```bash
./scripts/ssh_permission_monitor.sh
```

### SSH 키 백업
```bash
./scripts/backup_ssh_keys.sh backup
```

### SSH 키 복원
```bash
./scripts/backup_ssh_keys.sh restore <백업파일명>
```

## 로그 확인

### 모니터링 로그
```bash
sudo tail -f /var/log/ssh_permission_monitor.log
```

### 백업 로그
```bash
sudo tail -f /var/log/ssh_backup.log
```

## Cron 작업 확인
```bash
crontab -l
```

## 권한 설정
- SSH 디렉토리: 700 (drwx------)
- 개인키 파일: 600 (-rw-------)
- 공개키 파일: 644 (-rw-r--r--)

## 문제 해결

### 1. 권한 문제 발생 시
```bash
sudo chown -R geehong:geehong /home/geehong/.ssh/
sudo chmod 700 /home/geehong/.ssh/
sudo chmod 600 /home/geehong/.ssh/id_*
sudo chmod 644 /home/geehong/.ssh/*.pub
```

### 2. 모니터링 중단
```bash
crontab -l - grep -v "ssh_permission_monitor" - crontab -
```

### 3. 로그 파일 정리
```bash
sudo truncate -s 0 /var/log/ssh_permission_monitor.log
sudo truncate -s 0 /var/log/ssh_backup.log
```

## 보안 고려사항
- SSH 키 파일들은 매우 민감한 정보이므로 안전한 백업 위치 사용
- 로그 파일에 민감한 정보가 기록되지 않도록 주의
- 정기적인 백업 파일 검증 필요

## 자동화된 예방 조치
1. **10분마다 권한 확인**: cron 작업으로 자동 모니터링
2. **자동 권한 복구**: 문제 발견 시 즉시 복구
3. **정기 백업**: SSH 키 파일들의 안전한 백업
4. **로그 기록**: 모든 활동의 상세한 로그 기록 

Tables_in_markets 

- active_assets           
- api_call_logs           
- app_configurations      
- apscheduler_jobs        
- asset_type_stats        
- asset_types             
- assets                  
- audit_logs              
- bond_market_data        
- crypto_data             
- crypto_metrics          
- economic_indicators     
- etf_holdings            
- etf_info                
- etf_sector_exposure     
- index_infos             
- m2_data                 
- ohlcv_data              
- ohlcv_data_backup       
- onchain_metrics_info    
- realtime_quotes         
- scheduler_logs          
- scraping_logs           
- sparkline_data          
- stock_analyst_estimates 
- stock_financials        
- stock_profiles          
- technical_indicators    
- token_blacklist         
- user_sessions           
- users                   
- world_assets_ranking    
