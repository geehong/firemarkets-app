# Halving 메뉴 구조 생성 가이드

## 개요
이 스크립트들은 OnChain > Halving 메뉴 구조를 생성하고 관련 컴포넌트들을 설정합니다.

## 파일 구조

### SQL 스크립트
- `create_halving_menus.sql` - 기본 메뉴 생성 스크립트
- `execute_halving_menus.sql` - 안전한 실행 스크립트 (중복 방지)

### 프론트엔드 컴포넌트
- `OnchainDataOverviews.js` - Halving Bull Chart 메인 컴포넌트
- `HalvingChart.js` - 반감기 차트 컴포넌트
- `HalvingSpiral.js` - 예비: 스파이럴 분석 컴포넌트
- `HalvingProgress.js` - 예비: 진행률 추적 컴포넌트
- `HalvingSeasons.js` - 예비: 계절성 분석 컴포넌트

## 메뉴 구조

```
OnChain (ID: 3)
└── Halving
    ├── Halving Bull Chart (/onchain/halving/bull-chart) - ✅ 구현됨
    ├── Halving Spiral (/onchain/halving/spiral) - 🚧 예비
    ├── Halving Progress (/onchain/halving/progress) - 🚧 예비
    └── Halving Seasons (/onchain/halving/seasons) - 🚧 예비
```

## 실행 방법

### 1. 데이터베이스에 메뉴 생성
```sql
-- 안전한 실행 (중복 방지)
\i scripts/execute_halving_menus.sql
```

### 2. 프론트엔드 컨테이너 재빌드
```bash
cd /home/geehong/firemarkets-app
docker-compose down frontend
docker-compose up frontend --build -d
```

## 기능 설명

### Halving Bull Chart
- **경로**: `/onchain/halving/bull-chart`
- **컴포넌트**: `OnchainDataOverviews.js` + `HalvingChart.js`
- **기능**: 
  - 비트코인 반감기별 가격 비교 분석
  - 정규화된 가격 차트
  - 이동평균선 표시
  - 로그 스케일 지원

### 예비 컴포넌트들
- **Halving Spiral**: 스파이럴 분석 (개발 예정)
- **Halving Progress**: 진행률 추적 (개발 예정)  
- **Halving Seasons**: 계절성 분석 (개발 예정)

## 메뉴 메타데이터

각 메뉴는 다음 정보를 포함합니다:
- `description`: 다국어 설명 (영어/한국어)
- `permissions`: 접근 권한 (user, admin)
- `component`: 사용할 React 컴포넌트
- `status`: 개발 상태 (planned, implemented)
- `route_path`: 프론트엔드 라우트 경로

## 주의사항

1. **OnChain 메뉴 존재 확인**: 스크립트 실행 전 OnChain 메뉴가 존재하는지 확인
2. **중복 방지**: `execute_halving_menus.sql`은 중복 생성을 방지합니다
3. **컴포넌트 경로**: 모든 컴포넌트는 올바른 경로에 있어야 합니다
4. **라우트 설정**: `routes.js`에 모든 라우트가 등록되어야 합니다

## 문제 해결

### 메뉴가 보이지 않는 경우
1. 데이터베이스에서 메뉴 생성 확인
2. 프론트엔드 컨테이너 재시작
3. 브라우저 캐시 클리어

### 컴포넌트 에러가 발생하는 경우
1. 파일 경로 확인
2. import 경로 확인
3. 컴포넌트 export 확인
