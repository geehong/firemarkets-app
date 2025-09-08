# WebSocket 오케스트레이터 마이그레이션 계획

## 🎯 목표
기존의 개별 WebSocket Consumer들을 중앙 집중식 오케스트레이터로 통합

## 📋 마이그레이션 단계

### Phase 1: 기반 구조 구축 ✅
- [x] BaseWSConsumer 추상 클래스 생성
- [x] WebSocketConfig 설정 관리
- [x] AssetManager 자산 관리자
- [x] WebSocketOrchestrator 핵심 로직

### Phase 2: Consumer 구현 🔄
- [ ] FinnhubWSConsumer 구현 (완료)
- [ ] TiingoWSConsumer 구현 (진행 중)
- [ ] AlpacaWSConsumer 구현 (진행 중)

### Phase 3: 테스트 및 검증 🔄
- [ ] 단위 테스트 작성
- [ ] 통합 테스트 실행
- [ ] 성능 테스트

### Phase 4: 점진적 배포 🔄
- [ ] 기존 Consumer와 병렬 운영
- [ ] 트래픽 점진적 이전
- [ ] 모니터링 및 검증

### Phase 5: 완전 전환 🔄
- [ ] 기존 Consumer 서비스 제거
- [ ] 오케스트레이터 단독 운영
- [ ] 최적화 및 튜닝

## 🚀 실행 명령어

### 개발 환경 테스트
```bash
# 오케스트레이터 단독 실행
cd backend
python run_websocket_orchestrator.py

# Docker로 실행
docker-compose --profile processing up websocket_orchestrator
```

### 프로덕션 배포
```bash
# 기존 Consumer 중지
docker-compose --profile processing stop tiingo_ws_consumer alpaca_ws_consumer finnhub_ws_consumer

# 오케스트레이터 시작
docker-compose --profile processing up -d websocket_orchestrator

# 상태 확인
docker logs fire_markets_websocket_orchestrator
```

## 📊 예상 효과

### Before (현재)
- 3개 독립적인 Consumer 서비스
- 하드코딩된 심볼 목록
- 수동 장애 대응
- API 제약 조건 미반영

### After (오케스트레이터)
- 1개 통합 오케스트레이터 서비스
- 동적 자산 할당
- 자동 장애 대응 및 재조정
- API 제약 조건 기반 최적 할당

## 🔍 모니터링 지표

- **연결 상태**: 각 Consumer의 연결 상태
- **구독 수**: 할당된 티커 수
- **데이터 수신량**: 초당 메시지 수
- **에러율**: 연결/구독 실패율
- **재조정 횟수**: 자동 재할당 횟수

## ⚠️ 주의사항

1. **API 키 관리**: 모든 API 키가 환경변수에 설정되어 있는지 확인
2. **데이터베이스 연결**: MySQL 연결 풀 설정 확인
3. **Redis 연결**: Redis 스트림 키 충돌 방지
4. **로그 관리**: 오케스트레이터 로그 파일 크기 관리
5. **리소스 사용량**: 메모리 및 CPU 사용량 모니터링

