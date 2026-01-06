# CPU 사용량 진단 및 해결 방안

## 🔍 현재 상황 분석

### ⚠️ 중요: dockerd는 컨테이너가 아닙니다!
**dockerd**는 Docker 데몬(Docker Engine)의 메인 프로세스입니다. 이것은:
- 모든 Docker 컨테이너를 관리하는 핵심 프로세스
- 컨테이너 자체가 아니라 컨테이너를 실행/관리하는 시스템 서비스
- PID 3800459는 Docker 엔진 자체의 프로세스

### 문제점
- **dockerd (PID 3800459)**: 109.6% CPU 사용 - 비정상적으로 높음
  - 이는 Docker 데몬이 과도한 작업을 처리하고 있다는 의미
  - 가능한 원인:
    1. 너무 많은 컨테이너가 동시에 실행 중
    2. 컨테이너들이 과도한 로그를 생성
    3. Docker 네트워크/볼륨 작업이 과도함
    4. 컨테이너 간 통신이 과도함
- **Python 프로세스들**: 총 ~31% CPU 사용
  - PID 631267: 13.0% CPU
  - PID 609612: 9.6% CPU
  - PID 3374440: 7.3% CPU
  - PID 523385: 1.7% CPU
- **next-server**: 7.3% CPU
- **node**: 4.0% CPU

### 실행 중인 컨테이너 (11개)
1. **fire_markets_adminer** - PostgreSQL 관리 도구
2. **fire_markets_backend** - 백엔드 API 서버
3. **fire_markets_data_processor** - 데이터 처리 서비스
4. **fire_markets_db_postgres** - PostgreSQL 데이터베이스
5. **fire_markets_frontend** - 프론트엔드 (Next.js)
6. **fire_markets_redis** - Redis 캐시/메시지 큐
7. **fire_markets_scheduler** - 스케줄러 서비스
8. **fire_markets_websocket_broadcaster** - WebSocket 브로드캐스터
9. **fire_markets_websocket_orchestrator** - WebSocket 오케스트레이터
10. **nginx-proxy-manager** - 리버스 프록시
11. **portainer** - Docker 관리 UI

**참고**: `dockerd`는 이 모든 컨테이너를 관리하는 Docker 엔진입니다.

---

## ✅ 빠른 상태 확인

### 상태 확인 스크립트 실행
```bash
cd /home/geehong/firemarkets-app
./check_cpu_status.sh
```

이 스크립트는 다음을 확인합니다:
- 전체 시스템 CPU 사용량
- Docker 컨테이너별 CPU/메모리 사용량
- 주요 프로세스 CPU 사용량
- 실행 중인 컨테이너 상태
- dockerd 프로세스 상태

---

## 🔧 진단 명령어

### 1. Docker 컨테이너별 CPU 사용량 확인
```bash
# 모든 컨테이너의 CPU/메모리 사용량 확인
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# 특정 컨테이너만 확인
docker stats fire_markets_backend fire_markets_scheduler fire_markets_data_processor --no-stream
```

### 1-1. dockerd 프로세스 상세 정보 확인
```bash
# dockerd 프로세스의 자식 프로세스 확인
ps auxf | grep -A 10 dockerd

# Docker 데몬이 어떤 작업을 하는지 확인
sudo strace -p 3800459 -c -e trace=all 2>&1 | head -50
```

### 2. Docker 데몬 로그 확인
```bash
sudo journalctl -u docker.service -n 100 --no-pager
```

### 3. 특정 컨테이너의 상세 정보 확인
```bash
docker inspect <container_name> | grep -A 10 "Resources"
```

### 4. Docker 시스템 리소스 사용량
```bash
docker system df
docker system events --since 10m
```

### 5. 컨테이너 로그 크기 확인 (로그가 과도하게 쌓였을 수 있음)
```bash
docker ps -q | xargs docker inspect --format='{{.Name}} {{.HostConfig.LogConfig}}'
```

---

## 💡 해결 방안

### 즉시 조치 (우선순위 높음)

#### 1. Docker 데몬 재시작
```bash
sudo systemctl restart docker
```

#### 2. 로그 로테이션 설정 확인 및 적용
```bash
# Docker 로그 설정 확인
cat /etc/docker/daemon.json

# 로그 로테이션 설정 추가 (없는 경우)
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker
```

#### 3. 불필요한 컨테이너 중지
```bash
# 사용하지 않는 컨테이너 확인 후 중지
docker ps --format "table {{.Names}}\t{{.Status}}"
docker stop <unused_container>
```

### 중기 조치

#### 4. 컨테이너에 CPU 제한 설정
`docker-compose.yml` 파일에 다음 설정 추가:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
  
  scheduler:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
  
  data_processor:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

#### 5. 로그 정리
```bash
# 오래된 로그 정리
docker system prune -f
docker volume prune -f

# 특정 컨테이너 로그 크기 제한
docker-compose down
# docker-compose.yml에 logging 설정 추가 후
docker-compose up -d
```

#### 6. Python 프로세스 최적화
- 스케줄러와 데이터 프로세서의 작업 빈도 조정
- 불필요한 API 호출 감소
- 배치 처리 최적화

### 장기 조치

#### 7. 모니터링 도구 설치
```bash
# cAdvisor 설치 (컨테이너 모니터링)
docker run -d \
  --name=cadvisor \
  --restart=always \
  -p 8080:8080 \
  -v /:/rootfs:ro \
  -v /var/run:/var/run:ro \
  -v /sys:/sys:ro \
  -v /var/lib/docker/:/var/lib/docker:ro \
  google/cadvisor:latest
```

#### 8. Docker Compose 최적화
- 불필요한 서비스 제거
- 서비스 그룹화 및 프로파일 활용
- 헬스체크 최적화

---

## 📊 모니터링 스크립트

### 실시간 CPU 모니터링
```bash
watch -n 2 'echo "=== Docker 컨테이너 CPU 사용량 ===" && docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" && echo -e "\n=== 시스템 CPU ===" && top -bn1 | head -5'
```

### 특정 프로세스 추적
```bash
# dockerd 프로세스 추적
strace -p 3800459 -c -e trace=all 2>&1 | head -50

# Python 프로세스 추적
py-spy top --pid 631267
```

---

## 🚨 긴급 조치 (CPU 사용량이 계속 높을 경우)

```bash
# 1. 모든 컨테이너 일시 중지
docker stop $(docker ps -q)

# 2. Docker 데몬 재시작
sudo systemctl restart docker

# 3. 필수 컨테이너만 재시작
cd /home/geehong/firemarkets-app
docker-compose up -d backend db_postgres redis

# 4. 점진적으로 다른 서비스 시작
docker-compose up -d scheduler
docker-compose up -d data_processor
```

---

## 📝 체크리스트

- [ ] Docker 데몬 재시작
- [ ] 로그 로테이션 설정 확인
- [ ] 컨테이너별 CPU 사용량 확인
- [ ] 불필요한 컨테이너 중지
- [ ] docker-compose.yml에 리소스 제한 추가
- [ ] 오래된 로그 정리
- [ ] Python 프로세스 최적화 검토
- [ ] 모니터링 도구 설치 고려

---

## 🔗 참고 자료

- Docker 리소스 제한: https://docs.docker.com/config/containers/resource_constraints/
- Docker 로그 관리: https://docs.docker.com/config/containers/logging/
- Docker 성능 튜닝: https://docs.docker.com/config/daemon/













