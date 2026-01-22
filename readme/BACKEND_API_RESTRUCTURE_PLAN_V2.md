# Backend Assets API 재구조화 계획서 v2.0

> **작성일**: 2026-01-22  
> **상태**: 최종 승인 대기  
> **이전 버전**: BACKEND_API_RESTRUCTURE_PLAN.md + BACKEND_API_RESTRUCTURE_PLAN_REVIEW.md 통합

---

## 📋 개요

이 문서는 현재 거대한 단일 파일(`assets.py`, 112KB/2,312줄)과 여러 관련 파일에 분산된 자산(Assets) API를 **모듈화**하고 **테이블 기반 구조**로 재편성하기 위한 통합 계획서입니다.

### 현재 상태 분석

| 파일 | 크기 | 라인 수 | 역할 |
|:---|---:|---:|:---|
| `assets.py` | 112KB | 2,312 | 핵심 자산 API (거대 파일) |
| `asset_overviews.py` | 22KB | 518 | View 기반 개요 API |
| `crypto.py` | 35KB | ~800 | 암호화폐 전용 API |
| `realtime.py` | 54KB | ~1,200 | 실시간 데이터 API |

### 핵심 원칙

1. **Table-First Design**: API 엔드포인트 구조를 DB 스키마와 일치
2. **Functional Decoupling**: 기본 조회와 비즈니스 로직(분석, 가공) 분리
3. **Single Entry Point**: 통합된 인터페이스로 프론트엔드 개발 경험 향상
4. **Backward Compatibility**: v1 유지하며 v2로 점진적 이관

---

## 🗂️ 신규 디렉토리 구조

```
backend/app/api/v1/endpoints/assets/
├── __init__.py              # 라우터 통합 관리
├── core.py                  # Core Module (메타데이터, 목록)
├── market.py                # Market Module (OHLCV, 가격)
├── detail.py                # Detail Module (프로필, 재무, 타입별 상세)
├── analysis.py              # Analysis Module (기술지표, 예측, 트리맵)
├── overview.py              # Overview Module (View 기반 통합 조회)
├── widgets.py               # Widgets Module (대시보드 위젯용)
└── shared/                  # 공통 유틸리티
    ├── __init__.py
    ├── resolvers.py         # asset_identifier 해석 (ID/Ticker → asset_id)
    ├── validators.py        # 자산 타입별 검증
    ├── cache_keys.py        # 캐시 키 생성 규칙
    └── constants.py         # 상수 정의
```

---

## 🔧 모듈별 상세 설계

### A. Core Module (`/assets/core`)

**대상 테이블**: `assets`, `asset_types`

| 신규 엔드포인트 | 기존 엔드포인트 | 파라미터 | 설명 |
|:---|:---|:---|:---|
| `GET /` | `GET /assets/assets` | `type_name`, `has_ohlcv_data`, `limit`, `offset` | 자산 목록 조회 |
| `GET /types` | `GET /assets/asset-types` | `has_data`, `include_description` | 자산 타입 목록 |
| `GET /{id}/metadata` | `GET /assets/{id}` | - | 자산 메타데이터 (축소된 응답) |
| `GET /search` | (신규) | `query`, `type_name`, `limit` | 자산 검색 |

```python
# core.py 예시
router = APIRouter()

@router.get("/")
def get_assets_list(
    type_name: Optional[str] = Query(None),
    has_ohlcv_data: bool = Query(False),
    limit: int = Query(1000, ge=1),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_postgres_db)
):
    """자산 목록 조회"""
    pass
```

---

### B. Market Module (`/assets/market`)

**대상 테이블**: `ohlcv_day_data`, `ohlcv_intraday_data`, `realtime_quotes`

| 신규 엔드포인트 | 기존 엔드포인트 | 파라미터 | 설명 |
|:---|:---|:---|:---|
| `GET /{id}/ohlcv` | `GET /assets/ohlcv/{id}` | `data_interval`, `start_date`, `end_date`, `limit` | OHLCV 차트 데이터 |
| `GET /{id}/price` | `GET /assets/price/{id}` | `data_interval` | 현재가 및 변동률 |
| `GET /{id}/history` | (신규) | `period` (1d, 1w, 1m, 3m, 1y) | 빠른 기간별 조회 |

**캐시 전략**:
- `GET /{id}/price`: TTL 60초, Redis 캐시 우선 조회 후 DB 폴백
- `GET /{id}/ohlcv`: TTL 5분 (일봉), 1분 (분봉)

```python
# market.py 예시
CACHE_TTL = {
    "price": 60,        # 1분
    "ohlcv_1d": 300,    # 5분
    "ohlcv_1h": 60,     # 1분
}
```

---

### C. Detail Module (`/assets/detail`)

**대상 테이블**: `stock_profiles`, `stock_financials`, `etf_info`, `crypto_data`, `index_info`

| 신규 엔드포인트 | 기존 엔드포인트 | 대상 자산 타입 | 설명 |
|:---|:---|:---|:---|
| `GET /{id}/profile` | `GET /assets/stock-profile/asset/{id}` | Stocks | 기업 프로필 |
| `GET /{id}/financials` | `GET /assets/stock-financials/asset/{id}` | Stocks | 재무제표 |
| `GET /{id}/crypto-info` | `GET /crypto/{id}` | Crypto | 코인 상세 정보 |
| `GET /{id}/etf-info` | `GET /assets/etf-info/asset/{id}` | ETFs, Funds | ETF 정보 |
| `GET /{id}/index-info` | `GET /assets/index-info/asset/{id}` | Indices | 지수 정보 |

**타입 자동 감지**:
```python
# detail.py 예시
@router.get("/{asset_identifier}/profile")
def get_profile(asset_identifier: str, db: Session = Depends(get_postgres_db)):
    asset_id = resolve_asset_identifier(db, asset_identifier)
    asset_type = get_asset_type(db, asset_id)
    
    if asset_type == "Stocks":
        return get_stock_profile(db, asset_id)
    elif asset_type == "Crypto":
        return get_crypto_profile(db, asset_id)
    elif asset_type in ["ETFs", "Funds"]:
        return get_etf_profile(db, asset_id)
    else:
        raise HTTPException(400, f"Profile not available for {asset_type}")
```

---

### D. Analysis Module (`/assets/analysis`)

**대상 테이블**: `technical_indicators`, `crypto_metrics`, `stock_analyst_estimates`

| 신규 엔드포인트 | 기존 엔드포인트 | 파라미터 | 설명 |
|:---|:---|:---|:---|
| `GET /{id}/technicals` | `GET /assets/{id}/technical-indicators` | `indicator_type`, `data_interval`, `limit` | 기술적 지표 |
| `GET /{id}/estimates` | `GET /assets/stock-estimates/asset/{id}` | `limit` | 애널리스트 예측 |
| `GET /{id}/crypto-metrics` | `GET /assets/crypto-metrics/asset/{id}` | - | 코인 메트릭 |
| `GET /treemap` | `GET /assets/treemap/live` | `asset_type_id`, `type_name` | 트리맵 데이터 |

**계산 로직 구분**:
- **저장된 지표**: `GET /{id}/technicals` (DB 조회)
- **실시간 계산**: `GET /{id}/technicals/calculate?indicators=RSI,MA50` (주문형)

---

### E. Overview Module (`/assets/overview`)

**대상 View**: `stock_info_view`, `crypto_info_view`, `etf_info_view`

| 신규 엔드포인트 | 기존 엔드포인트 | 설명 |
|:---|:---|:---|
| `GET /{id}` | `GET /assets/overview/{id}` | 자산 타입 자동 감지 통합 개요 |
| `GET /{id}/bundle` | `GET /assets/overview-bundle/{id}` | 숫자 데이터 + 포스트 데이터 분리 |
| `GET /{id}/stock` | `GET /asset-overviews/stock/{id}` | 주식 전용 개요 |
| `GET /{id}/crypto` | `GET /asset-overviews/crypto/{id}` | 암호화폐 전용 개요 |
| `GET /{id}/etf` | `GET /asset-overviews/etf/{id}` | ETF 전용 개요 |
| `GET /{id}/common` | `GET /asset-overviews/common/{id}` | 공통 개요 (OHLCV 기반) |

**View 기반 조회 전략**:
```python
# overview.py 예시
VIEW_MAP = {
    'Stocks': 'stock_info_view',
    'Crypto': 'crypto_info_view',
    'ETFs': 'etf_info_view',
    'Funds': 'etf_info_view',
    'Indices': None,  # 기본 쿼리 사용
}

@router.get("/{asset_identifier}")
def get_overview(asset_identifier: str, db: Session = Depends(get_postgres_db)):
    asset_id = resolve_asset_identifier(db, asset_identifier)
    asset_type = get_asset_type(db, asset_id)
    
    view_name = VIEW_MAP.get(asset_type)
    if view_name:
        return query_view(db, view_name, asset_id)
    else:
        return get_unified_overview_data(db, asset_id)
```

---

### F. Widgets Module (`/assets/widgets`)

**용도**: 대시보드 위젯용 경량 API

| 신규 엔드포인트 | 기존 엔드포인트 | 설명 |
|:---|:---|:---|
| `GET /ticker-summary` | `GET /assets/widgets/ticker-summary` | 다중 티커 요약 |
| `GET /market-movers` | (신규) | 상승/하락 상위 종목 |
| `GET /watchlist/{user_id}` | (신규) | 사용자 관심 목록 |

---

## 📊 API 매핑 테이블 (전체)

### 처리 상태 범례
- ✅ **대체**: 신규 엔드포인트로 완전 대체
- ⚠️ **통합**: 다른 엔드포인트와 병합
- 🔄 **이동**: 다른 모듈로 이동
- ❌ **삭제**: 제거 예정
- ➕ **신규**: 새로 추가

### Core Module

| 기존 | 신규 | 상태 | 비고 |
|:---|:---|:---:|:---|
| `GET /assets/assets` | `GET /assets/core` | ✅ | 목록 조회 |
| `GET /assets/asset-types` | `GET /assets/core/types` | ✅ | 타입 목록 |
| `GET /assets/{id}` | `GET /assets/core/{id}/metadata` | ✅ | 메타데이터 전용 |
| `GET /assets/all-pg` | - | ❌ | 이미 삭제됨 |

### Market Module

| 기존 | 신규 | 상태 | 비고 |
|:---|:---|:---:|:---|
| `GET /assets/ohlcv/{id}` | `GET /assets/market/{id}/ohlcv` | ✅ | 차트 데이터 |
| `GET /assets/price/{id}` | `GET /assets/market/{id}/price` | ✅ | 현재가 |
| `GET /assets/ohlcv-pg/{id}` | - | ❌ | 이미 삭제됨 |
| - | `GET /assets/market/{id}/history` | ➕ | 기간별 빠른 조회 |

### Detail Module

| 기존 | 신규 | 상태 | 비고 |
|:---|:---|:---:|:---|
| `GET /assets/stock-profile/asset/{id}` | `GET /assets/detail/{id}/profile` | ✅ | 기업 프로필 |
| `GET /assets/stock-financials/asset/{id}` | `GET /assets/detail/{id}/financials` | ✅ | 재무 정보 |
| `GET /crypto/{id}` | `GET /assets/detail/{id}/crypto-info` | 🔄 | crypto.py에서 이동 |
| `GET /assets/etf-info/asset/{id}` | `GET /assets/detail/{id}/etf-info` | ✅ | ETF 정보 |
| `GET /assets/index-info/asset/{id}` | `GET /assets/detail/{id}/index-info` | ✅ | 지수 정보 |

### Analysis Module

| 기존 | 신규 | 상태 | 비고 |
|:---|:---|:---:|:---|
| `GET /assets/{id}/technical-indicators` | `GET /assets/analysis/{id}/technicals` | ✅ | 기술 지표 |
| `GET /assets/stock-estimates/asset/{id}` | `GET /assets/analysis/{id}/estimates` | ✅ | 애널리스트 예측 |
| `GET /assets/crypto-metrics/asset/{id}` | `GET /assets/analysis/{id}/crypto-metrics` | ✅ | 코인 메트릭 |
| `GET /assets/treemap/live` | `GET /assets/analysis/treemap` | ✅ | 트리맵 |
| `GET /assets/market-caps` | `GET /assets/analysis/treemap` | ⚠️ | treemap으로 통합 |

### Overview Module

| 기존 | 신규 | 상태 | 비고 |
|:---|:---|:---:|:---|
| `GET /assets/overview/{id}` | `GET /assets/overview/{id}` | ✅ | 통합 개요 |
| `GET /assets/overview-bundle/{id}` | `GET /assets/overview/{id}/bundle` | ✅ | 번들 조회 |
| `GET /asset-overviews/stock/{id}` | `GET /assets/overview/{id}/stock` | ⚠️ | overview.py 통합 |
| `GET /asset-overviews/crypto/{id}` | `GET /assets/overview/{id}/crypto` | ⚠️ | overview.py 통합 |
| `GET /asset-overviews/etf/{id}` | `GET /assets/overview/{id}/etf` | ⚠️ | overview.py 통합 |
| `GET /asset-overviews/common/{id}` | `GET /assets/overview/{id}/common` | ⚠️ | overview.py 통합 |

### Widgets Module

| 기존 | 신규 | 상태 | 비고 |
|:---|:---|:---:|:---|
| `GET /assets/widgets/ticker-summary` | `GET /assets/widgets/ticker-summary` | ✅ | 유지 |
| - | `GET /assets/widgets/market-movers` | ➕ | 신규 |

---

## 🔌 라우터 등록 방식

### `assets/__init__.py`

```python
from fastapi import APIRouter
from . import core, market, detail, analysis, overview, widgets

router = APIRouter(prefix="/assets")

# 모듈별 라우터 등록
router.include_router(core.router, prefix="/core", tags=["assets-core"])
router.include_router(market.router, prefix="/market", tags=["assets-market"])
router.include_router(detail.router, prefix="/detail", tags=["assets-detail"])
router.include_router(analysis.router, prefix="/analysis", tags=["assets-analysis"])
router.include_router(overview.router, prefix="/overview", tags=["assets-overview"])
router.include_router(widgets.router, prefix="/widgets", tags=["assets-widgets"])
```

### `api/v1/api.py` 수정

```python
# 기존
# api_router.include_router(assets.router, tags=["assets"])

# 변경
from .endpoints.assets import router as assets_router
api_router.include_router(assets_router, tags=["assets"])
```

---

## 🛠️ 공통 유틸리티 (shared/)

### `resolvers.py`

```python
from sqlalchemy.orm import Session
from ....models.assets_pg import Asset

def resolve_asset_identifier(db: Session, asset_identifier: str) -> int:
    """
    Asset ID 또는 Ticker를 asset_id로 변환 (중앙화)
    
    Args:
        asset_identifier: ID (숫자) 또는 Ticker (문자열)
    
    Returns:
        asset_id (int)
    
    Raises:
        HTTPException(404): 자산을 찾을 수 없는 경우
    """
    if asset_identifier.isdigit():
        asset_id = int(asset_identifier)
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
    else:
        asset = db.query(Asset).filter(Asset.ticker == asset_identifier.upper()).first()
        asset_id = asset.id if asset else None
    
    if not asset:
        raise HTTPException(404, f"Asset not found: {asset_identifier}")
    
    return asset_id

def get_asset_type(db: Session, asset_id: int) -> str:
    """자산 타입명 조회"""
    result = db.execute(text("""
        SELECT at.type_name 
        FROM assets a 
        JOIN asset_types at ON a.asset_type_id = at.id 
        WHERE a.id = :id
    """), {"id": asset_id})
    row = result.fetchone()
    return row[0] if row else "Unknown"
```

### `validators.py`

```python
from fastapi import HTTPException

VALID_TYPES_FOR_ENDPOINT = {
    "financials": ["Stocks"],
    "crypto-info": ["Crypto"],
    "etf-info": ["ETFs", "Funds"],
    "index-info": ["Indices"],
    "estimates": ["Stocks"],
}

def validate_asset_type_for_endpoint(endpoint: str, asset_type: str):
    """자산 타입이 해당 엔드포인트에서 유효한지 검증"""
    valid_types = VALID_TYPES_FOR_ENDPOINT.get(endpoint, [])
    if valid_types and asset_type not in valid_types:
        raise HTTPException(
            400, 
            f"Endpoint '{endpoint}' is not available for asset type '{asset_type}'. "
            f"Valid types: {valid_types}"
        )
```

### `cache_keys.py`

```python
def make_cache_key(module: str, asset_id: int, endpoint: str, **params) -> str:
    """캐시 키 생성"""
    param_str = ":".join(f"{k}={v}" for k, v in sorted(params.items()))
    return f"asset:{asset_id}:{module}:{endpoint}:{param_str}"

# 사용 예시
# make_cache_key("market", 123, "price", interval="1d")
# -> "asset:123:market:price:interval=1d"
```

---

## 🗓️ 단계별 실행 계획

### Phase 0: 사전 조사 및 준비 (1주)

- [ ] **현재 엔드포인트 전체 목록화**
  - assets.py 내 모든 `@router` 데코레이터 추출
  - asset_overviews.py, crypto.py 포함
- [ ] **프론트엔드 사용 패턴 분석**
  - `frontend/src/lib/api.ts` 내 assets 관련 메서드 목록화
  - 실제 호출 빈도 및 의존성 파악
- [ ] **데이터베이스 View 스키마 문서화**
  - `stock_info_view`, `crypto_info_view`, `etf_info_view` 컬럼 목록
- [ ] **Redis 캐시 인프라 상태 확인**

**산출물**: `API_CURRENT_STATE.md`

---

### Phase 1: 공통 유틸리티 구축 (1주)

- [ ] `backend/app/api/v1/endpoints/assets/` 디렉토리 생성
- [ ] `shared/` 하위 모듈 구현
  - `resolvers.py`: `resolve_asset_identifier`, `get_asset_type`
  - `validators.py`: 타입별 검증
  - `cache_keys.py`: 캐시 키 규칙
- [ ] 단위 테스트 작성 (`tests/api/assets/test_shared.py`)

**산출물**: 공통 유틸리티 코드 + 테스트

---

### Phase 2: Core Module 분리 (1주)

- [ ] `core.py` 생성
- [ ] 기존 `assets.py`에서 이동:
  - `get_asset_types`
  - `get_all_assets`
  - `get_all_assets_pg` (deprecated 처리)
  - `get_asset_detail` (메타데이터 전용으로 축소)
- [ ] 라우터 등록 (`__init__.py`)
- [ ] 프론트엔드 Feature Flag 준비

**롤백 계획**: 기존 엔드포인트 유지, 신규 엔드포인트 병행 운영

---

### Phase 3: Market Module 분리 (1주)

- [ ] `market.py` 생성
- [ ] 기존 `assets.py`에서 이동:
  - `get_ohlcv_data` (가장 복잡, 300+ 라인)
  - `get_price_data`
- [ ] 실시간 캐시 통합 (Redis)
- [ ] 성능 테스트 (응답 시간 목표: <200ms)

**주의사항**: `get_ohlcv_data` 내부의 중복 클래스 정의(`_Candle`) 정리

---

### Phase 4: Detail Module 분리 (1-2주)

- [ ] `detail.py` 생성
- [ ] 기존 `assets.py`에서 이동:
  - `get_stock_profile_for_asset`
  - `get_stock_financials_for_asset`
  - `get_etf_info_for_asset`, `get_etf_sector_exposure`, `get_etf_holdings`
  - `get_index_info_for_asset`
- [ ] `crypto.py`에서 이동:
  - 암호화폐 상세 조회 로직
- [ ] 자산 타입별 분기 로직 구현
- [ ] 통합 테스트

---

### Phase 5: Analysis Module 분리 (1주)

- [ ] `analysis.py` 생성
- [ ] 기존 `assets.py`에서 이동:
  - `get_technical_indicators_for_asset`
  - `get_crypto_metrics_for_asset`
  - `get_assets_market_caps` → `treemap`으로 변경
  - `get_treemap_live`
- [ ] `get_stock_estimates_for_asset` 이동

---

### Phase 6: Overview Module 통합 (1주)

- [ ] `overview.py` 생성
- [ ] 기존 `asset_overviews.py` 전체 통합:
  - `get_stock_info`, `get_crypto_info`, `get_etf_info`, `get_asset_info`
- [ ] 기존 `assets.py`에서 이동:
  - `get_asset_overview`, `get_asset_overview_bundle`
  - 관련 helper 함수들
- [ ] View 기반 조회 전략 적용
- [ ] `asset_overviews.py` deprecated 처리

---

### Phase 7: 프론트엔드 마이그레이션 (2주)

- [ ] `frontend/src/lib/api.ts` 리팩토링
  - 신규 엔드포인트 메서드 추가
  - Feature Flag로 점진적 전환
- [ ] 컴포넌트별 API 호출 업데이트
  - `AssetDetailedView.tsx`
  - `FireMarketsAnalysis.tsx`
  - `useAssetOverviews.ts`, `useAssetOverviewBundle.ts`
- [ ] 모니터링 및 버그 수정

**마이그레이션 우선순위**:
1. Overview (가장 많이 사용)
2. Market (차트 데이터)
3. Detail (상세 페이지)
4. Core (목록)
5. Analysis (분석 도구)

---

### Phase 8: 정리 및 문서화 (1주)

- [ ] 기존 엔드포인트 Deprecation 경고 추가
  ```python
  @router.get("/old-endpoint", deprecated=True)
  def old_endpoint():
      response.headers["X-API-Deprecated"] = "true"
      response.headers["X-API-Successor"] = "/assets/core/..."
  ```
- [ ] Swagger 문서 한글화/구체화
- [ ] 마이그레이션 가이드 작성
- [ ] 거대 `assets.py` 파일 제거 (또는 최소화)

---

## 📈 성능 목표

| 모듈 | 응답 시간 목표 | 캐시 TTL |
|:---|:---:|:---|
| Core | <100ms | 5분 |
| Market (price) | <200ms | 1분 |
| Market (ohlcv) | <500ms | 5분 (일봉) / 1분 (분봉) |
| Detail | <500ms | 1시간 |
| Analysis | <300ms | 5분 |
| Overview | <400ms | 5분 |

---

## ⚠️ 에러 처리 전략

### HTTP 상태 코드 사용 규칙

| 상황 | 상태 코드 | 예시 |
|:---|:---:|:---|
| 자산을 찾을 수 없음 | 404 | `Asset not found: XYZ` |
| 잘못된 파라미터 | 400 | `Invalid data_interval: 2h` |
| 타입 불일치 | 400 | `Endpoint not available for Crypto` |
| 서버 오류 | 500 | DB 연결 실패 |

### 응답 포맷

```python
{
    "detail": "Asset not found: XYZ",
    "error_code": "ASSET_NOT_FOUND",
    "suggested_action": "Check the ticker or asset ID"
}
```

---

## ✅ 테스트 전략

### 단위 테스트

```
tests/api/assets/
├── test_core.py
├── test_market.py
├── test_detail.py
├── test_analysis.py
├── test_overview.py
└── test_shared/
    ├── test_resolvers.py
    └── test_validators.py
```

### 통합 테스트 시나리오

1. **주식 자산 플로우**: Core → Detail → Overview → Analysis
2. **암호화폐 플로우**: Core → Detail → Overview → Analysis
3. **ETF 플로우**: Core → Detail → Overview
4. **차트 데이터 플로우**: Market (OHLCV) → Analysis (Technicals)

---

## 🎯 기대 효과

| 항목 | 현재 | 개선 후 |
|:---|:---|:---|
| 코드 구조 | 단일 파일 112KB | 모듈별 10-20KB |
| 유지보수 | 특정 기능 수정 시 전체 파일 검토 | 해당 모듈만 수정 |
| 테스트 | 테스트 커버리지 낮음 | 모듈별 단위 테스트 용이 |
| 성능 | 불필요한 데이터 로딩 | 필요한 데이터만 조회 |
| 문서화 | 혼재된 엔드포인트 | Swagger 태그별 명확한 분류 |

---

## 📋 체크리스트

### 실행 전 필수 확인

- [ ] 전체 엔드포인트 목록 확보 완료
- [ ] 프론트엔드 의존성 분석 완료
- [ ] Redis 캐시 인프라 준비
- [ ] 테스트 환경 구축
- [ ] 롤백 계획 수립

### 각 Phase 완료 조건

- [ ] 단위 테스트 통과
- [ ] 통합 테스트 통과
- [ ] 성능 목표 달성
- [ ] 프론트엔드 정상 동작 확인
- [ ] 문서 업데이트

---

## 📝 변경 이력

| 버전 | 날짜 | 변경 내용 |
|:---|:---|:---|
| v1.0 | 2026-01-21 | 초안 작성 |
| v2.0 | 2026-01-22 | 리뷰 피드백 반영, 전체 재작성 |

---

## 🔗 관련 문서

- [원본 계획서](./BACKEND_API_RESTRUCTURE_PLAN.md)
- [리뷰 의견서](./BACKEND_API_RESTRUCTURE_PLAN_REVIEW.md)
