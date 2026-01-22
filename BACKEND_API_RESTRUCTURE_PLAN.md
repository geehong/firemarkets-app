# Backend Assets API Restructuring Plan

이 문서는 현재 여러 파일에 분산되어 있고 거대해진 자산(Assets) 관련 API를 데이터베이스 테이블 구조를 중심으로 재편성하여 유지보수성과 확장성을 높이기 위한 계획을 담고 있습니다.

## 1. 기본 원칙
1. **Table-First Design**: API 엔드포인트의 구조를 DB 스키마 레이어와 일치시켜 데이터 흐름을 명확히 합니다.
2. **Functional Decoupling**: 기본 테이블 조회와 비즈니스 로직(분석, 가공)을 분리합니다.
3. **Single Entry Point**: 프론트엔드에서 자산 정보를 찾을 때 여러 곳을 헤매지 않도록 통합된 인터페이스를 제공합니다.

---

## 2. 테이블 기반 API 구조 (Proposed)

자산 API를 다음 4가지 핵심 테이블 그룹으로 모듈화하여 분리합니다.

### A. Core Module (`/assets/core`)
**대상 테이블**: `assets`, `asset_types`
*   **역할**: 자산의 메타데이터 및 목록 관리.
*   **핵심 엔드포인트**:
    *   `GET /list`: 전체 자산 목록 (검색/필터 포함)
    *   `GET /types`: 자산 타입 목록
    *   `GET /{id}/metadata`: 특정 자산의 기본 정보 (이름, 티커, 거래소 등)

### B. Market Data Module (`/assets/market`)
**대상 테이블**: `ohlcv_day_data`, `ohlcv_intraday_data`, `realtime_quotes`
*   **역할**: 가격 정보 및 차트 데이터 제공.
*   **핵심 엔드포인트**:
    *   `GET /{id}/ohlcv`: 일봉/분봉 차트 데이터 (과거~현재 통합)
    *   `GET /{id}/price`: 현재 가격 및 변동률 (DB + 실시간 캐시)

### C. Detail/Financials Module (`/assets/detail`)
**대상 테이블**: `stock_profiles`, `stock_financials`, `etf_info`, `crypto_data`
*   **역할**: 자산의 심층 정보 제공. 자산 타입에 따라 엔드포인트를 구별하거나 통합 스키마 제공.
*   **핵심 엔드포인트**:
    *   `GET /{id}/profile`: 기업 개요, 로고, 웹사이트 등
    *   `GET /{id}/financials`: 재무제표 및 주요 지표 (PER, PBR, MarketCap)
    *   `GET /{id}/crypto-info`: 코인 공급량, 랭킹 등 전문 정보

### D. Analytics Module (`/assets/analysis`)
**대상 테이블**: `technical_indicators`, `crypto_metrics`, `stock_analyst_estimates`
*   **역할**: 계산된 지표 및 예측 데이터 제공.
*   **핵심 엔드포인트**:
    *   `GET /{id}/technicals`: 이평선(MA), RSI 등 기술적 지표
    *   `GET /{id}/estimates`: 애널리스트 목표주가 및 수익 예측
    *   `GET /treemap`: 시가총액 기반 트리맵 데이터 (가공된 데이터 전용)

---

## 3. 기능별 통합 상세 (View-based)

현재 `asset_overviews.py`에서 사용 중인 SQL View 기반의 고성능 조회를 최상위 엔드포인트로 유지합니다.

*   `GET /assets/{id}/overview`: 프론트엔드 상세 페이지 진입 시 필요한 **모든 데이터를 한 번에** 가져오는 엔드포인트 (Core + Market + Detail의 요약본).

---

## 4. 단계별 실행 계획

### Phase 1: 디렉토리 구조 생성
`backend/app/api/v1/endpoints/assets/` 디렉토리를 생성하고 `__init__.py`에서 라우터를 통합 관리합니다.

### Phase 2: 거대 파일 분할 (Table-based)
`assets.py` (112KB)에서 코드를 추출하여 위에서 정의한 `core.py`, `market.py`, `detail.py` 등으로 이동시킵니다.
## 6. API 비교 상세 (Existing vs. Restructured)

| 기존 엔드포인트 (v1) | 신규/수정 엔드포인트 | 주요 필터/파라미터 | 주요 기능 | 처리 방식 |
| :--- | :--- | :--- | :--- | :--- |
| `/assets/` | `/assets/core/list` | `type_name`, `search`, `limit` | 기본 자산 목록 및 검색 | **대체** (Core 모듈화) |
| `/assets/asset-types` | `/assets/core/types` | `has_data` | 자산 카테고리 정보 조회 | **대체** |
| `/assets/ohlcv/{id}` | `/assets/market/ohlcv/{id}` | `data_interval`, `limit`, `start_date` | 차트용 과거 OHLCV 데이터 | **대체** (Market 모듈화) |
| `/assets/price/{id}` | `/assets/market/price/{id}` | `data_interval` | 현재가 및 최근 변동률 | **대체** |
| `/assets/{id}` (detail) | `/assets/core/{id}/metadata` | - | DB의 Assets 테이블 로우 조회 | **수정** (메타데이터 전용) |
| `/asset-overviews/common/{id}` | `/assets/overview/{id}/common` | - | 폐장 시 종가 및 기본 분석 통합 | **통합** |
| `/asset-overviews/stock/{id}` | `/assets/overview/{id}/stock` | - | 주식 재무 + 프로필 + 예측 통합 | **통합** |
| `/asset-overviews/crypto/{id}` | `/assets/overview/{id}/crypto` | - | 코인 공급량 + 포스트 + 지표 통합 | **통합** |
| `/assets/market-caps` | `/assets/analysis/treemap` | `asset_type_id`, `limit` | 트리맵용 시총 순위 데이터 | **대체** (Analysis 모듈화) |
| `/assets/technical-indicators`| `/assets/analysis/technicals`| `indicators`, `period` | RSI, MA 등 계산된 기술 지표 | **대체** |
| `/assets/ohlcv-pg/{id}` | - | - | Postgres 전용 구버전 OHLCV | **삭제** (ohlcv 모듈로 통합) |
| `/assets/all-pg` | - | - | Postgres 전용 구버전 목록 | **삭제** (list 모듈로 통합) |
| `/crypto/{id}` | `/assets/detail/crypto/{id}` | - | `crypto_data` 테이블 상세 조회 | **이동** (Detail 모듈화) |
| `/etf/{id}` | `/assets/detail/etf/{id}` | - | `etf_info` 테이블 상세 조회 | **이동** |
| `/assets/overview/{id}` | `/assets/overview/{id}/legacy` | - | 기존 방식의 통합 개요 | **삭제 예정** (신규 통합 API로 점진 이관) |

---

## 7. 향후 추가 고려 사항
*   **Version Control**: `/api/v2/assets/` 기반으로 점진적 이관을 진행하여 프론트엔드 중단을 방지함.
*   **Response Cache**: 분석 및 재무 데이터처럼 변경이 잦지 않은 데이터는 Redis 캐싱 계층 강화.
*   **Auto-Documentation**: 구조 변경과 동시에 Fast API의 Swagger를 통해 파라미터 설명을 한글화/구체화함.

### Phase 3: 중복 코드 제거
`asset_overviews.py`, `crypto.py`, `etf.py` 등에 흩어져 있던 비슷한 성격의 엔드포인트를 정리하고 새로운 구조로 리다이렉션 또는 통합합니다.

### Phase 4: 프론트엔드 동기화
`frontend/src/lib/api.ts`의 `ApiClient`를 새로운 엔드포인트 구조에 맞춰 리팩토링합니다.

---

## 5. 기대 효과
*   **유지보수 용이**: 특정 테이블 스키마 변경 시 수정해야 할 파일이 명확해짐.
*   **성능 최적화**: 단순히 목록만 필요한 경우와 무거운 재무 데이터가 필요한 경우를 엔드포인트 레벨에서 분리하여 서버 부하 감소.
*   **코드 가독성**: 거대 파일(112KB)이 없어지고 모듈별로 명확한 범위를 가짐.
