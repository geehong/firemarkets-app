# FireMarkets - Real-time Financial Data Platform

![FireMarkets Banner](./frontend/public/images/logo/firemarkets-logo2.svg)

FireMarkets는 실시간 금융 데이터를 제공하는 종합 금융 플랫폼입니다. 주식, 암호화폐, ETF, 채권, 원자재 등 다양한 자산의 실시간 데이터를 수집, 분석, 시각화하여 제공합니다.

## 🚀 주요 기능

### 📊 실시간 데이터 수집
- **주식 데이터**: 미국, 한국, 글로벌 주식 시장 실시간 데이터
- **암호화폐**: 바이낸스, 코인베이스 등 주요 거래소 실시간 가격
- **ETF & 채권**: 다양한 금융 상품 데이터
- **원자재**: 금, 은, 석유 등 원자재 가격 정보
- **경제 지표**: GDP, 인플레이션, 금리 등 경제 데이터

### 📈 데이터 시각화
- **실시간 차트**: OHLCV 캔들스틱 차트
- **인터랙티브 대시보드**: 드래그 앤 드롭 위젯
- **트리맵 시각화**: 자산별 성과 비교
- **스파크라인**: 간단한 가격 추이 표시

### 🔄 실시간 업데이트
- **WebSocket 연결**: 실시간 데이터 스트리밍
- **자동 스케줄링**: 정기적 데이터 수집
- **캐싱 시스템**: Redis 기반 고성능 캐싱

## 🏗️ 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│  (PostgreSQL)   │
│                 │    │                 │    │                 │
│ • React 19      │    │ • Python 3.11+  │    │ • Real-time     │
│ • TypeScript    │    │ • FastAPI       │    │   Data Storage  │
│ • Tailwind CSS  │    │ • WebSocket     │    │ • Historical    │
│ • ApexCharts    │    │ • APScheduler   │    │   Data Archive  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │   Redis Cache   │    │   Data Sources  │
│   Manager       │    │                 │    │                 │
│                 │    │ • Session Store │    │ • Alpha Vantage │
│ • SSL/TLS       │    │ • Data Cache    │    │ • Binance API   │
│ • Load Balance  │    │ • Pub/Sub       │    │ • Coinbase API  │
│ • CORS Handling │    │ • Rate Limiting │    │ • Finnhub API   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ 기술 스택

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Charts**: ApexCharts for React
- **State Management**: React Query + Zustand
- **UI Components**: Custom components with Tailwind

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Task Queue**: APScheduler
- **WebSocket**: Socket.IO
- **API Integration**: Multiple financial data providers

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx Proxy Manager
- **Monitoring**: Portainer
- **Database Admin**: Adminer

## 📦 설치 및 실행

### 사전 요구사항
- Docker & Docker Compose
- Git
- 최소 4GB RAM 권장

### 1. 저장소 클론
```bash
git clone https://github.com/geehong/firemarkets-app.git
cd firemarkets-app
```

### 2. 환경 변수 설정
```bash
# .env 파일 생성 및 설정
cp .env.example .env
# .env 파일을 편집하여 API 키 및 데이터베이스 설정
```

### 3. Docker 컨테이너 실행
```bash
# 기본 서비스 실행
docker-compose up -d

# 데이터 처리 서비스 포함 실행
docker-compose --profile processing up -d
```

### 4. 서비스 접속
- **Frontend**: http://localhost:3006
- **Backend API**: http://localhost:8001
- **Database Admin**: http://localhost:5054
- **Portainer**: http://localhost:9000
- **Nginx Proxy Manager**: http://localhost:81

## 🔧 개발 환경 설정

### Frontend 개발
```bash
cd frontend
npm install
npm run dev
```

### Backend 개발
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📊 데이터 소스

### API 제공업체
- **Alpha Vantage**: 주식, 외환, 암호화폐 데이터
- **Financial Modeling Prep**: 주식, ETF, 채권 데이터
- **Binance**: 암호화폐 실시간 데이터
- **Coinbase**: 암호화폐 시장 데이터
- **Finnhub**: 실시간 주식 데이터
- **Twelve Data**: 종합 금융 데이터

### 데이터 수집 주기
- **실시간 데이터**: WebSocket 연결로 즉시 업데이트
- **일간 데이터**: 매일 자정에 수집
- **주간 데이터**: 매주 일요일에 수집
- **월간 데이터**: 매월 1일에 수집

## 🗂️ 프로젝트 구조

```
firemarkets-app/
├── backend/                 # FastAPI 백엔드
│   ├── app/
│   │   ├── api/            # API 엔드포인트
│   │   ├── core/           # 핵심 설정
│   │   ├── models/         # 데이터베이스 모델
│   │   ├── services/       # 비즈니스 로직
│   │   └── utils/          # 유틸리티 함수
│   └── Dockerfile
├── frontend/               # Next.js 프론트엔드
│   ├── src/
│   │   ├── app/           # App Router 페이지
│   │   ├── components/    # React 컴포넌트
│   │   ├── hooks/         # Custom React Hooks
│   │   ├── services/      # API 서비스
│   │   └── utils/         # 유틸리티 함수
│   └── Dockerfile
├── docker/                # Docker 설정 파일
├── scripts/               # 유틸리티 스크립트
├── readme/                # 상세 문서
└── docker-compose.yml     # Docker Compose 설정
```

## 🔐 보안 및 인증

### API 키 관리
- 환경 변수를 통한 안전한 API 키 저장
- Docker Secrets를 통한 프로덕션 환경 보안
- API 키 로테이션 지원

### CORS 설정
- 특정 도메인만 허용하는 CORS 정책
- 개발/프로덕션 환경별 설정 분리

## 📈 성능 최적화

### 캐싱 전략
- **Redis**: 실시간 데이터 캐싱
- **Next.js**: 정적 자산 캐싱
- **Database**: 쿼리 결과 캐싱

### 데이터베이스 최적화
- 인덱스 최적화
- 파티셔닝을 통한 대용량 데이터 관리
- 연결 풀링

## 🚀 배포

### 프로덕션 배포
```bash
# 프로덕션 환경 변수 설정
export NODE_ENV=production

# 모든 서비스 실행
docker-compose --profile processing up -d

# 로그 확인
docker-compose logs -f
```

### 모니터링
- **Portainer**: 컨테이너 모니터링
- **Nginx Proxy Manager**: 트래픽 모니터링
- **PostgreSQL**: 데이터베이스 성능 모니터링

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 지원

- **이슈 리포트**: [GitHub Issues](https://github.com/geehong/firemarkets-app/issues)
- **문서**: [Wiki](https://github.com/geehong/firemarkets-app/wiki)
- **이메일**: support@firemarkets.net

## 🙏 감사의 말

이 프로젝트는 다음과 같은 오픈소스 프로젝트들을 기반으로 합니다:
- [Next.js](https://nextjs.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [ApexCharts](https://apexcharts.com/)
- [Docker](https://www.docker.com/)

---

**FireMarkets** - 실시간 금융 데이터의 새로운 기준 🚀
