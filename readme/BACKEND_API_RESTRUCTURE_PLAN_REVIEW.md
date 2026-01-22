67# Backend Assets API 재구조화 계획서 검토 및 개선안

## 📋 검토 개요

현재 코드베이스를 분석한 결과, 계획서의 전반적인 방향성은 타당하나 몇 가지 중요한 오류와 누락 사항이 발견되었습니다.

---

## ❌ 발견된 오류 및 문제점

### 1. **파일 크기 정보 오류**
- **계획서**: `assets.py` (112KB)
- **실제**: `assets.py` (2,312줄, 약 80-90KB 추정)
- **조치**: 정확한 파일 크기로 수정 필요

### 2. **기존 엔드포인트 경로 불일치**
- **계획서**: `/asset-overviews/common/{id}`, `/asset-overviews/stock/{id}` 등
- **실제**: `/api/v1/asset-overviews/common/{asset_identifier}`, `/api/v1/asset-overviews/stock/{asset_identifier}` 등
- **문제**: `asset_overviews.py`가 별도 라우터로 등록되어 있지 않음. 현재 `assets.py`에 통합되어 있는지 확인 필요
- **조치**: 실제 라우터 등록 상태 확인 및 경로 매핑 정확히 반영

### 3. **이미 삭제된 엔드포인트 언급**
- **계획서**: `/assets/ohlcv-pg/{id}`, `/assets/all-pg` 삭제 예정
- **실제**: 코드베이스에서 해당 엔드포인트를 찾을 수 없음 (이미 삭제된 것으로 보임)
- **조치**: 삭제 완료된 항목으로 표시하거나 제거

### 4. **누락된 중요한 엔드포인트**
- **`/assets/overview-bundle/{id}`**: 프론트엔드에서 실제 사용 중인 엔드포인트
- **`/assets/assets-lists`**: 별도로 존재하는 목록 엔드포인트
- **`/assets/widgets/ticker-summary`**: 위젯용 엔드포인트
- **조치**: 모든 실제 엔드포인트를 매핑 테이블에 포함

### 5. **SQL View 기반 구조 미반영**
- **실제 상황**: `stock_info_view`, `crypto_info_view`, `etf_info_view` 등 SQL View가 이미 구현되어 있음
- **계획서**: View 기반 조회에 대한 구체적인 전략 부재
- **조치**: View 기반 조회 전략을 명확히 정의

### 6. **라우터 등록 구조 불명확**
- **계획서**: `backend/app/api/v1/endpoints/assets/` 디렉토리 구조 제안
- **실제**: 현재는 `assets.py` 단일 파일로 관리
- **문제**: 서브 라우터 등록 방식(`prefix`, `tags` 등)이 명시되지 않음
- **조치**: 라우터 등록 구조를 구체적으로 명시

---

## ⚠️ 개선이 필요한 사항

### 1. **엔드포인트 경로 일관성**
- **문제**: Core 모듈의 `/list`, `/types`는 RESTful하지 않음
- **제안**: 
  - `GET /assets/core/list` → `GET /assets/core` (목록은 기본 경로)
  - `GET /assets/core/types` → `GET /assets/core/types` (유지, 또는 `/assets/types`로 단순화)
- **이유**: RESTful 원칙에 더 부합하고, 프론트엔드 사용 패턴과 일치

### 2. **Overview 엔드포인트 구조 혼란**
- **현재**: `/assets/overview/{id}`와 `/asset-overviews/{type}/{id}` 두 가지 패턴 혼재
- **제안**: 
  - 통합: `/assets/overview/{id}` (자동 타입 감지)
  - 타입별: `/assets/overview/{id}/stock`, `/assets/overview/{id}/crypto` (선택적)
- **이유**: 단일 진입점 원칙과 일치

### 3. **Detail 모듈의 자산 타입별 분리**
- **문제**: `GET /{id}/profile`, `GET /{id}/financials`가 모든 자산 타입에 적용 가능한지 불명확
- **제안**: 
  - 통합: `GET /assets/detail/{id}/profile` (자산 타입 자동 감지)
  - 타입별: `GET /assets/detail/{id}/stock-profile`, `/assets/detail/{id}/crypto-info` (명시적)
- **이유**: 타입별 스키마 차이를 명확히 표현

### 4. **Market 모듈의 실시간 데이터 처리**
- **문제**: `realtime_quotes` 테이블과 캐시 레이어 통합 전략 부재
- **제안**: 
  - `GET /assets/market/{id}/price`에서 실시간 캐시 우선 조회 후 DB 폴백
  - WebSocket 연결 상태에 따른 동적 라우팅
- **이유**: 실시간 데이터의 특성상 캐시 전략이 필수

### 5. **Analysis 모듈의 계산 로직 위치**
- **문제**: `technical_indicators` 테이블에 저장된 값인지, 실시간 계산인지 불명확
- **제안**: 
  - 저장된 지표: `GET /assets/analysis/{id}/technicals` (DB 조회)
  - 실시간 계산: `GET /assets/analysis/{id}/technicals/calculate` (쿼리 파라미터로 구분)
- **이유**: 성능과 정확성의 트레이드오프를 명확히

---

## ✅ 추가 고려 사항

### 1. **에러 처리 및 검증**
- **추가 필요**: 
  - `asset_identifier` (ID vs Ticker) 해석 로직의 중앙화
  - 자산 타입별 유효성 검증 (예: 주식에만 `financials` 제공)
  - 404 vs 400 에러 구분 전략

### 2. **캐싱 전략 상세화**
- **현재**: Redis 캐싱 언급만 있음
- **추가 필요**:
  - 캐시 키 구조 (`asset:{id}:metadata`, `asset:{id}:price` 등)
  - TTL 전략 (메타데이터: 1시간, 가격: 1분, 재무: 24시간)
  - 캐시 무효화 트리거 (데이터 수집 완료 시)

### 3. **API 버전 관리 전략**
- **현재**: `/api/v2/assets/` 언급만 있음
- **추가 필요**:
  - v1과 v2의 병행 운영 기간
  - Deprecation 경고 헤더 (`X-API-Deprecated: true`)
  - 마이그레이션 가이드 문서

### 4. **성능 모니터링**
- **추가 필요**:
  - 각 모듈별 응답 시간 목표 (Core: <100ms, Market: <200ms, Detail: <500ms, Analysis: <300ms)
  - 데이터베이스 쿼리 최적화 체크리스트
  - N+1 쿼리 방지 전략

### 5. **프론트엔드 마이그레이션 전략**
- **추가 필요**:
  - 단계별 마이그레이션 계획 (우선순위: Overview → Market → Detail → Core)
  - Feature Flag를 통한 점진적 전환
  - 롤백 계획

### 6. **테스트 전략**
- **추가 필요**:
  - 각 모듈별 단위 테스트 범위
  - 통합 테스트 시나리오 (자산 타입별)
  - 성능 테스트 기준

---

## 📝 수정된 API 매핑 테이블

### Core Module (`/assets/core`)

| 기존 엔드포인트 | 신규 엔드포인트 | 상태 | 비고 |
|:---|:---|:---|:---|
| `GET /assets/asset-types` | `GET /assets/core/types` | ✅ 대체 | `has_data`, `include_description` 파라미터 유지 |
| `GET /assets/assets` | `GET /assets/core` | ✅ 대체 | `type_name`, `has_ohlcv_data`, `limit`, `offset` 파라미터 유지 |
| `GET /assets/assets-lists` | `GET /assets/core` (통합) | ⚠️ 통합 검토 | 기능 중복 확인 필요 |
| `GET /assets/{id}` | `GET /assets/core/{id}/metadata` | ✅ 수정 | 메타데이터 전용으로 축소 |

### Market Module (`/assets/market`)

| 기존 엔드포인트 | 신규 엔드포인트 | 상태 | 비고 |
|:---|:---|:---|:---|
| `GET /assets/ohlcv/{id}` | `GET /assets/market/{id}/ohlcv` | ✅ 대체 | `data_interval`, `limit`, `start_date` 파라미터 유지 |
| `GET /assets/price/{id}` | `GET /assets/market/{id}/price` | ✅ 대체 | 실시간 캐시 우선 조회 |

### Detail Module (`/assets/detail`)

| 기존 엔드포인트 | 신규 엔드포인트 | 상태 | 비고 |
|:---|:---|:---|:---|
| `GET /assets/stock-profile/asset/{id}` | `GET /assets/detail/{id}/profile` | ✅ 대체 | 자산 타입 자동 감지 또는 `/assets/detail/{id}/stock-profile` |
| `GET /assets/stock-financials/asset/{id}` | `GET /assets/detail/{id}/financials` | ✅ 대체 | 주식 전용 |
| `GET /crypto/{id}` | `GET /assets/detail/{id}/crypto-info` | ✅ 이동 | `crypto.py`에서 이동 |
| `GET /assets/etf-info/asset/{id}` | `GET /assets/detail/{id}/etf-info` | ✅ 이동 | ETF 전용 |
| `GET /assets/index-info/asset/{id}` | `GET /assets/detail/{id}/index-info` | ✅ 추가 | 인덱스 전용 |

### Analysis Module (`/assets/analysis`)

| 기존 엔드포인트 | 신규 엔드포인트 | 상태 | 비고 |
|:---|:---|:---|:---|
| `GET /assets/technical-indicators/asset/{id}` | `GET /assets/analysis/{id}/technicals` | ✅ 대체 | `indicators`, `period` 파라미터 유지 |
| `GET /assets/stock-estimates/asset/{id}` | `GET /assets/analysis/{id}/estimates` | ✅ 대체 | 주식 전용 |
| `GET /assets/market-caps` | `GET /assets/analysis/treemap` | ✅ 대체 | `asset_type_id`, `limit` 파라미터 유지 |
| `GET /assets/crypto-metrics/asset/{id}` | `GET /assets/analysis/{id}/crypto-metrics` | ✅ 대체 | 코인 전용 |

### Overview Module (`/assets/overview`)

| 기존 엔드포인트 | 신규 엔드포인트 | 상태 | 비고 |
|:---|:---|:---|:---|
| `GET /assets/overview/{id}` | `GET /assets/overview/{id}` | ✅ 유지 | 자산 타입 자동 감지 |
| `GET /assets/overview-bundle/{id}` | `GET /assets/overview/{id}/bundle` | ⚠️ 경로 수정 | `lang` 파라미터 유지 |
| `GET /asset-overviews/common/{id}` | `GET /assets/overview/{id}/common` | ✅ 통합 | View 기반 조회 |
| `GET /asset-overviews/stock/{id}` | `GET /assets/overview/{id}/stock` | ✅ 통합 | `stock_info_view` 사용 |
| `GET /asset-overviews/crypto/{id}` | `GET /assets/overview/{id}/crypto` | ✅ 통합 | `crypto_info_view` 사용 |
| `GET /asset-overviews/etf/{id}` | `GET /assets/overview/{id}/etf` | ✅ 통합 | `etf_info_view` 사용 |

### 기타

| 기존 엔드포인트 | 신규 엔드포인트 | 상태 | 비고 |
|:---|:---|:---|:---|
| `GET /assets/widgets/ticker-summary` | `GET /assets/widgets/ticker-summary` | ✅ 유지 | 위젯 전용, 별도 모듈 고려 |
| `GET /assets/ohlcv-pg/{id}` | - | ✅ 삭제 완료 | 이미 제거됨 |
| `GET /assets/all-pg` | - | ✅ 삭제 완료 | 이미 제거됨 |

---

## 🔧 구체적인 개선 제안

### 1. 디렉토리 구조

```
backend/app/api/v1/endpoints/assets/
├── __init__.py              # 라우터 통합 관리
├── core.py                  # Core Module
├── market.py                 # Market Module
├── detail.py                 # Detail Module
├── analysis.py               # Analysis Module
├── overview.py               # Overview Module (View 기반)
└── shared/                   # 공통 유틸리티
    ├── __init__.py
    ├── resolvers.py          # asset_identifier 해석
    ├── validators.py          # 자산 타입별 검증
    └── cache_keys.py          # 캐시 키 생성
```

### 2. 라우터 등록 방식

```python
# backend/app/api/v1/endpoints/assets/__init__.py
from fastapi import APIRouter
from . import core, market, detail, analysis, overview

router = APIRouter()

router.include_router(core.router, prefix="/core", tags=["assets-core"])
router.include_router(market.router, prefix="/market", tags=["assets-market"])
router.include_router(detail.router, prefix="/detail", tags=["assets-detail"])
router.include_router(analysis.router, prefix="/analysis", tags=["assets-analysis"])
router.include_router(overview.router, prefix="/overview", tags=["assets-overview"])
```

### 3. 공통 유틸리티 중앙화

```python
# backend/app/api/v1/endpoints/assets/shared/resolvers.py
def resolve_asset_identifier(db: Session, asset_identifier: str) -> int:
    """Asset ID 또는 Ticker를 asset_id로 변환 (중앙화)"""
    # 기존 로직을 여기로 이동
    pass

def get_asset_type(db: Session, asset_id: int) -> str:
    """자산 타입 조회"""
    pass
```

### 4. View 기반 조회 전략

```python
# backend/app/api/v1/endpoints/assets/overview.py
VIEW_MAP = {
    'Stocks': 'stock_info_view',
    'Crypto': 'crypto_info_view',
    'ETFs': 'etf_info_view',
    'Funds': 'etf_info_view',
}

@router.get("/{asset_identifier}")
def get_overview(asset_identifier: str, db: Session = Depends(get_postgres_db)):
    asset_id = resolve_asset_identifier(db, asset_identifier)
    asset_type = get_asset_type(db, asset_id)
    
    view_name = VIEW_MAP.get(asset_type)
    if not view_name:
        # 기본 뷰 또는 통합 쿼리 사용
        pass
    
    # View 기반 조회
    result = db.execute(text(f"SELECT * FROM {view_name} WHERE asset_id = :id"), {"id": asset_id})
    return result.fetchone()
```

---

## 📊 우선순위별 실행 계획 수정안

### Phase 0: 사전 조사 및 준비 (1주)
- [ ] 현재 모든 엔드포인트 목록 정리
- [ ] 프론트엔드 사용 패턴 분석
- [ ] 데이터베이스 View 구조 확인
- [ ] 캐시 전략 수립

### Phase 1: 공통 유틸리티 구축 (1주)
- [ ] `shared/` 디렉토리 생성
- [ ] `resolvers.py`, `validators.py` 구현
- [ ] 단위 테스트 작성

### Phase 2: Core Module 분리 (1주)
- [ ] `core.py` 생성 및 엔드포인트 이동
- [ ] 라우터 등록 및 테스트
- [ ] 프론트엔드 일부 전환 (Feature Flag)

### Phase 3: Market Module 분리 (1주)
- [ ] `market.py` 생성 및 엔드포인트 이동
- [ ] 실시간 캐시 통합
- [ ] 성능 테스트

### Phase 4: Detail Module 분리 (1-2주)
- [ ] `detail.py` 생성 및 엔드포인트 이동
- [ ] 자산 타입별 분기 로직 구현
- [ ] 통합 테스트

### Phase 5: Analysis Module 분리 (1주)
- [ ] `analysis.py` 생성 및 엔드포인트 이동
- [ ] 계산 로직 정리

### Phase 6: Overview Module 정리 (1주)
- [ ] `overview.py` 생성 및 View 기반 조회 통합
- [ ] 기존 `asset_overviews.py`와 통합

### Phase 7: 프론트엔드 마이그레이션 (2주)
- [ ] `ApiClient` 리팩토링
- [ ] 단계별 전환 (Feature Flag)
- [ ] 모니터링 및 버그 수정

### Phase 8: 정리 및 문서화 (1주)
- [ ] 기존 엔드포인트 Deprecation 처리
- [ ] API 문서 업데이트
- [ ] 마이그레이션 가이드 작성

---

## 🎯 최종 권장사항

1. **점진적 마이그레이션**: 한 번에 모든 것을 바꾸지 말고 모듈별로 단계적 전환
2. **하위 호환성 유지**: v1 엔드포인트를 v2로 리다이렉션하거나 병행 운영
3. **테스트 우선**: 각 모듈 분리 시 단위 테스트와 통합 테스트 필수
4. **모니터링 강화**: 각 단계마다 성능 지표 수집 및 분석
5. **문서화**: 변경 사항을 실시간으로 문서화하여 팀 내 공유

---

## 📌 체크리스트

### 계획서 수정 필요 항목
- [ ] 파일 크기 정보 수정 (112KB → 실제 크기)
- [ ] 실제 엔드포인트 경로 반영
- [ ] 이미 삭제된 엔드포인트 제거 또는 표시
- [ ] 누락된 엔드포인트 추가 (`overview-bundle`, `widgets` 등)
- [ ] SQL View 기반 전략 추가
- [ ] 라우터 등록 구조 명시
- [ ] 에러 처리 전략 추가
- [ ] 캐싱 전략 상세화
- [ ] 프론트엔드 마이그레이션 계획 추가
- [ ] 테스트 전략 추가

### 실행 전 확인 사항
- [ ] 현재 `asset_overviews.py`의 라우터 등록 상태 확인
- [ ] 프론트엔드에서 사용 중인 모든 엔드포인트 목록 확보
- [ ] 데이터베이스 View 스키마 확인
- [ ] 캐시 인프라 상태 확인
- [ ] 모니터링 도구 설정 확인
