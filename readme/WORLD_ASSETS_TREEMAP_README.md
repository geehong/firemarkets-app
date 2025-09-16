# 🌍 World Assets TreeMap 프로젝트

이 프로젝트는 세계 자산 시장을 TreeMap으로 시각화하는 웹 애플리케이션입니다. Highcharts를 사용하여 인터랙티브한 TreeMap 차트를 제공하며, 실시간 데이터 수집 및 시각화 기능을 포함합니다.

## 📋 프로젝트 구조

```
financeWebApp02/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   ├── world_assets.py          # World Assets 모델
│   │   │   └── __init__.py
│   │   ├── services/
│   │   │   └── world_assets_service.py  # 데이터 수집 서비스
│   │   ├── routers/
│   │   │   └── world_assets.py          # API 라우터
│   │   └── core.py                      # 스케줄러 설정
│   └── create_world_assets_tables.sql   # DB 테이블 생성 스크립트
├── frontend/
│   └── src/
│       ├── views/
│       │   └── treemap/
│       │       └── TreeMapPage.js       # 메인 TreeMap 페이지
│       ├── components/
│       │   └── charts/
│       │       ├── TreeMapChart.js      # Highcharts TreeMap 컴포넌트
│       │       ├── TreeMapControls.js   # 필터/설정 컨트롤
│       │       └── TreeMapLegend.js     # 범례 컴포넌트
│       └── hooks/
│           └── useTreeMapData.js        # TreeMap 데이터 관리 훅
```

## 🚀 설치 및 실행

### 1. 백엔드 설정

```bash
cd backend

# 의존성 설치
pip install -r requirements.txt

# 데이터베이스 테이블 생성
psql -U your_username -d your_database -f create_world_assets_tables.sql

# 또는 Python 스크립트로 테이블 생성
python create_tables.py

# 백엔드 서버 실행
python run.py
```

### 2. 프론트엔드 설정

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm start
```

## 📊 주요 기능

### 1. 데이터 수집

- **companiesmarketcap.com**에서 실시간 자산 순위 데이터 수집
- **BIS (Bank for International Settlements)**에서 글로벌 채권 시장 데이터 수집
- 자동 스케줄링 (6시간마다 데이터 업데이트)

### 2. TreeMap 시각화

- **카테고리별**: Stocks, Crypto, ETF, Bonds 등
- **국가별**: 미국, 중국, 일본, 영국 등
- **섹터별**: Technology, Financial, Healthcare 등
- **성능 색상**: 빨강(손실) ~ 초록(이익)

### 3. 인터랙티브 기능

- 드릴다운: 그룹 클릭 시 상세 보기
- 필터링: 카테고리, 국가, 섹터별 필터
- 검색: 자산명 또는 티커로 검색
- 실시간 데이터 새로고침

## 🔧 API 엔드포인트

### 자산 데이터

- `GET /api/world-assets/ranking` - 자산 순위 데이터
- `GET /api/world-assets/treemap` - TreeMap 형식 데이터
- `GET /api/world-assets/bond-market` - 채권 시장 데이터
- `GET /api/world-assets/stats` - 통계 정보

### 데이터 수집

- `POST /api/world-assets/collect-data` - 수동 데이터 수집
- `GET /api/world-assets/collect-status` - 수집 상태 확인
- `GET /api/world-assets/scraping-logs` - 수집 로그

## 🎨 TreeMap 차트 특징

### Highcharts 설정

- **다크 테마**: `#252931` 배경색
- **색상 축**: 빨강(-10%) ~ 회색(0%) ~ 초록(+10%)
- **레이블**: 자산명과 성능 표시
- **툴팁**: 시가총액, 가격, 변동률 정보

### 데이터 구조

```javascript
{
  id: "category_name",
  name: "Category Name",
  value: total_market_cap,
  children: [
    {
      id: "asset_ticker",
      name: "Asset Name",
      value: market_cap,
      colorValue: daily_change_percent,
      custom: {
        ticker: "TICKER",
        price: 150.00,
        change: 2.5,
        country: "United States",
        sector: "Technology"
      }
    }
  ]
}
```

## 📈 데이터베이스 스키마

### world_assets_ranking

- `rank`: 순위
- `name`: 자산명
- `ticker`: 티커
- `market_cap_usd`: 시가총액 (USD)
- `price_usd`: 가격 (USD)
- `daily_change_percent`: 일일 변동률
- `category`: 카테고리
- `country`: 국가
- `sector`: 섹터
- `ranking_date`: 순위 날짜

### bond_market_data

- `category`: 채권 카테고리
- `market_size_usd`: 시장 규모 (USD)
- `quarter`: 분기
- `data_source`: 데이터 소스

### scraping_logs

- `source`: 데이터 소스
- `status`: 수집 상태
- `records_processed`: 처리된 레코드 수
- `records_successful`: 성공한 레코드 수
- `execution_time_seconds`: 실행 시간

## 🔄 자동화

### 스케줄러 설정

- **World Assets 수집**: 6시간마다
- **OHLCV 데이터**: 60분마다
- **온체인 데이터**: 24시간마다
- **회사 정보**: 7일마다
- **ETF 정보**: 7일마다
- **기술적 지표**: 1일마다

### 모니터링

- 수집 로그 자동 기록
- 실패 시 오류 메시지 저장
- 실행 시간 측정
- 성공/실패 통계

## 🎯 사용법

1. **데이터 수집 시작**

   - 백엔드 서버 실행
   - `/api/world-assets/collect-data` 호출하여 초기 데이터 수집

2. **TreeMap 접근**

   - 프론트엔드에서 `/world-assets-treemap` 경로 접근
   - 자동으로 최신 데이터 로드

3. **필터링 및 탐색**
   - View Type: 카테고리/국가/섹터별 보기
   - 필터: 특정 카테고리, 국가, 섹터 선택
   - 검색: 자산명 또는 티커로 검색
   - 드릴다운: 그룹 클릭하여 상세 보기

## 🛠️ 기술 스택

### 백엔드

- **FastAPI**: REST API 프레임워크
- **SQLAlchemy**: ORM
- **PostgreSQL**: 데이터베이스
- **BeautifulSoup**: 웹 스크래핑
- **APScheduler**: 작업 스케줄링

### 프론트엔드

- **React**: UI 프레임워크
- **Highcharts**: TreeMap 차트
- **CoreUI**: UI 컴포넌트
- **Axios**: HTTP 클라이언트

## 📝 개발 노트

### 주요 개선사항

1. **ECharts → Highcharts**: 더 나은 TreeMap 지원
2. **모듈화**: 컴포넌트별 분리
3. **자동화**: 스케줄러 통합
4. **모니터링**: 로깅 시스템 구축

### 향후 계획

- [ ] 실시간 데이터 업데이트 (WebSocket)
- [ ] 더 많은 데이터 소스 추가
- [ ] 고급 필터링 옵션
- [ ] 데이터 내보내기 기능
- [ ] 모바일 최적화

## 🐛 문제 해결

### 일반적인 문제

1. **데이터가 로드되지 않음**

   - 백엔드 서버 상태 확인
   - 데이터베이스 연결 확인
   - API 엔드포인트 테스트

2. **차트가 표시되지 않음**

   - Highcharts 라이브러리 로드 확인
   - 브라우저 콘솔 오류 확인
   - 데이터 형식 검증

3. **스케줄러가 작동하지 않음**
   - 스케줄러 상태 확인
   - 로그 파일 확인
   - 수동 데이터 수집 테스트

## 📞 지원

문제가 발생하거나 질문이 있으시면 이슈를 생성해 주세요.
