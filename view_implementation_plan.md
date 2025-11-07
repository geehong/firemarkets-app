# 뷰 구현 계획서: stock_info_view, crypto_info_view, etf_info_view, asset_info_view

## 📋 요구사항 요약

### 1. stock_info_view
- **post_overview**: `posts` + `stock_profiles` 조인
- **numeric_overview**: `v_financials_unified` (이미 뷰 존재)
- **estimates_overview**: `stock_estimates`

### 2. crypto_info_view
- **post_overview**: `posts` + `crypto_data` (logo_url, website_url, explorer, tags, cmc_rank, category, description)
- **numeric_overview**: `crypto_data` (market_cap, circulating_supply, total_supply, max_supply, current_price, volume_24h, percent_change_1h, percent_change_24h, percent_change_7d, percent_change_30d)

### 3. etf_info_view (Fund 포함)
- **post_overview**: `posts`
- **numeric_overview**: `etf_info`

### 4. asset_info_view (공통사항, ohlcv_day_data 활용)
- **계산 필드**: prev_close, 52wk_range (week_52_high, week_52_low), volume, average_vol_3m, market_cap, day_50_moving_avg, day_200_moving_avg
- **참고**: stock_info_view, crypto_info_view와 중복되어도 ohlcv_day_data로 계산

---

## 🔍 현재 시스템 분석

### 기존 패턴
1. **DB 뷰 사용 사례**: `treemap_live_view`, `v_financials_unified`
   - SQL로 직접 조회 (`db.execute(text("SELECT * FROM treemap_live_view"))`)
   - 성능 최적화에 유리
   - 뷰 업데이트 시 마이그레이션 필요

2. **백엔드 서비스 레이어 패턴**: `AssetsTableService`
   - 여러 엔드포인트 조합
   - 비즈니스 로직 처리 용이
   - 캐싱/변환 로직 추가 가능

3. **통합 엔드포인트**: `/overview-bundle/{asset_identifier}`
   - 여러 데이터 소스 병합
   - Python에서 데이터 가공 가능

---

## ⚖️ 옵션 비교: DB 뷰 vs 백엔드 엔드포인트

### 옵션 1: DB 뷰 생성

#### ✅ 장점
1. **성능 최적화**
   - DB 레벨에서 조인/집계 최적화
   - 인덱스 활용 가능
   - 네트워크 왕복 감소

2. **일관성**
   - 여러 엔드포인트에서 동일한 뷰 재사용
   - 데이터 일관성 보장

3. **단순한 쿼리**
   - 백엔드 코드 단순화
   - `SELECT * FROM stock_info_view WHERE asset_id = ?`

4. **기존 패턴과 일치**
   - `treemap_live_view`, `v_financials_unified`와 동일한 패턴

#### ❌ 단점
1. **복잡한 계산 로직**
   - `asset_info_view`의 이동평균, 52주 범위 계산이 복잡
   - PostgreSQL 윈도우 함수/서브쿼리 필요

2. **유지보수**
   - 뷰 변경 시 마이그레이션 필요
   - 디버깅 어려움 (SQL 직접 작성)

3. **동적 로직 제한**
   - 조건부 로직 구현 어려움
   - 캐싱 전략 제한적

4. **테스트 복잡도**
   - DB 뷰 테스트가 어려움

---

### 옵션 2: 백엔드 엔드포인트 조합

#### ✅ 장점
1. **유연한 로직**
   - Python으로 복잡한 계산 구현
   - 조건부 처리 용이
   - 에러 핸들링 세밀하게 제어

2. **캐싱 전략**
   - Redis 등으로 캐싱 가능
   - 부분 캐싱 가능

3. **유지보수**
   - 코드 리뷰/테스트 용이
   - 버전 관리 쉬움

4. **확장성**
   - 외부 API 통합 용이
   - 비즈니스 로직 추가 용이

#### ❌ 단점
1. **성능 오버헤드**
   - 여러 쿼리 실행
   - 네트워크 왕복 증가
   - Python 레벨 처리 오버헤드

2. **복잡도 증가**
   - 여러 엔드포인트 조합 로직 필요
   - 트랜잭션 관리 복잡

3. **일관성 관리**
   - 여러 소스 병합 시 일관성 보장 어려움

---

## 🎯 권장 방안: 하이브리드 접근

### 전략: 뷰 타입별 최적화

#### 1. **단순 조인 뷰 → DB 뷰**
- `stock_info_view`, `crypto_info_view`, `etf_info_view`의 **post_overview**, **numeric_overview**
- 이유: 단순 조인/선택이므로 DB 뷰가 효율적

#### 2. **복잡한 계산 → 백엔드 서비스**
- `asset_info_view`의 이동평균, 52주 범위 계산
- 이유: 복잡한 집계/윈도우 함수는 백엔드에서 처리

#### 3. **구조**
```
DB Views:
  - stock_info_post_view (posts + stock_profiles)
  - stock_info_numeric_view (v_financials_unified 기반)
  - crypto_info_post_view (posts + crypto_data)
  - crypto_info_numeric_view (crypto_data)
  - etf_info_post_view (posts)
  - etf_info_numeric_view (etf_info)

Backend Services:
  - AssetInfoService (ohlcv_day_data 기반 계산)
    - calculate_52wk_range()
    - calculate_moving_averages()
    - calculate_volume_stats()
```

---

## 📐 상세 구현 계획

### Phase 1: DB 뷰 생성 (단순 조인)

#### 1.1 stock_info_post_view
```sql
CREATE OR REPLACE VIEW stock_info_post_view AS
SELECT 
    p.id as post_id,
    p.asset_id,
    p.title,
    p.slug,
    p.description,
    p.excerpt,
    p.content,
    p.content_ko,
    p.cover_image,
    p.status,
    p.published_at,
    p.updated_at,
    sp.profile_id,
    sp.company_name,
    sp.sector,
    sp.industry,
    sp.country,
    sp.ceo,
    sp.employees_count,
    sp.ipo_date,
    sp.logo_image_url,
    sp.description_en,
    sp.description_ko,
    sp.website,
    sp.exchange,
    sp.exchange_full_name
FROM posts p
LEFT JOIN stock_profiles sp ON p.asset_id = sp.asset_id
WHERE p.post_type = 'assets'
  AND p.asset_id IS NOT NULL;
```

#### 1.2 stock_info_numeric_view
```sql
-- v_financials_unified를 기반으로 추가 필드 포함
CREATE OR REPLACE VIEW stock_info_numeric_view AS
SELECT 
    vfu.asset_id,
    vfu.ticker,
    vfu.stock_financials_data,
    vfu.income_json,
    vfu.balance_json,
    vfu.cash_flow_json,
    vfu.ratios_json
FROM v_financials_unified vfu;
```

#### 1.3 crypto_info_post_view
```sql
CREATE OR REPLACE VIEW crypto_info_post_view AS
SELECT 
    p.id as post_id,
    p.asset_id,
    p.title,
    p.slug,
    p.description,
    p.excerpt,
    p.content,
    p.content_ko,
    p.cover_image,
    p.status,
    p.published_at,
    p.updated_at,
    cd.logo_url,
    cd.website_url,
    cd.explorer,
    cd.tags,
    cd.cmc_rank,
    cd.category,
    cd.description as crypto_description
FROM posts p
LEFT JOIN crypto_data cd ON p.asset_id = cd.asset_id
WHERE p.post_type = 'assets'
  AND p.asset_id IS NOT NULL;
```

#### 1.4 crypto_info_numeric_view
```sql
CREATE OR REPLACE VIEW crypto_info_numeric_view AS
SELECT 
    asset_id,
    market_cap,
    circulating_supply,
    total_supply,
    max_supply,
    current_price,
    volume_24h,
    percent_change_1h,
    percent_change_24h,
    percent_change_7d,
    percent_change_30d,
    last_updated
FROM crypto_data;
```

#### 1.5 etf_info_post_view
```sql
CREATE OR REPLACE VIEW etf_info_post_view AS
SELECT 
    p.id as post_id,
    p.asset_id,
    p.title,
    p.slug,
    p.description,
    p.excerpt,
    p.content,
    p.content_ko,
    p.cover_image,
    p.status,
    p.published_at,
    p.updated_at
FROM posts p
WHERE p.post_type = 'assets'
  AND p.asset_id IS NOT NULL;
```

#### 1.6 etf_info_numeric_view
```sql
CREATE OR REPLACE VIEW etf_info_numeric_view AS
SELECT 
    asset_id,
    snapshot_date,
    net_assets,
    net_expense_ratio,
    portfolio_turnover,
    dividend_yield,
    inception_date,
    leveraged,
    sectors,
    holdings,
    updated_at
FROM etf_info;
```

---

### Phase 2: 백엔드 서비스 구현 (복잡한 계산)

#### 2.1 AssetInfoService 생성
```python
# backend/app/services/asset_info_service.py
class AssetInfoService:
    @staticmethod
    def get_asset_info(asset_id: int, db: Session) -> Dict[str, Any]:
        """ohlcv_day_data 기반으로 asset_info 계산"""
        # 1. 최신 종가 (prev_close)
        # 2. 52주 범위 (week_52_high, week_52_low)
        # 3. 거래량 통계 (volume, average_vol_3m)
        # 4. 이동평균 (day_50_moving_avg, day_200_moving_avg)
        # 5. market_cap (stock_financials 또는 crypto_data에서)
        pass
```

#### 2.2 계산 로직
- **prev_close**: 최근 거래일의 close_price
- **52wk_range**: 최근 52주(약 252 거래일)의 high/low
- **average_vol_3m**: 최근 3개월 평균 거래량
- **day_50_moving_avg**: 최근 50일 종가 평균
- **day_200_moving_avg**: 최근 200일 종가 평균

---

### Phase 3: 통합 엔드포인트

#### 3.1 엔드포인트 구조
```
GET /api/v1/assets/info/{asset_identifier}
  - stock_info_view: /api/v1/assets/info/stock/{asset_identifier}
  - crypto_info_view: /api/v1/assets/info/crypto/{asset_identifier}
  - etf_info_view: /api/v1/assets/info/etf/{asset_identifier}
  - asset_info_view: /api/v1/assets/info/common/{asset_identifier}
```

#### 3.2 응답 구조
```json
{
  "post_overview": { ... },
  "numeric_overview": { ... },
  "estimates_overview": { ... },  // stock만
  "asset_info": {                  // 공통
    "prev_close": ...,
    "52wk_range": { ... },
    "volume": ...,
    "average_vol_3m": ...,
    "day_50_moving_avg": ...,
    "day_200_moving_avg": ...
  }
}
```

---

## 📊 성능 고려사항

### 인덱스 최적화
```sql
-- posts 테이블
CREATE INDEX IF NOT EXISTS idx_posts_asset_id_post_type 
ON posts(asset_id, post_type) 
WHERE asset_id IS NOT NULL;

-- ohlcv_day_data 테이블
CREATE INDEX IF NOT EXISTS idx_ohlcv_asset_timestamp 
ON ohlcv_day_data(asset_id, timestamp_utc DESC);
```

### 캐싱 전략
- **post_overview**: 1시간 캐시 (콘텐츠 변경 빈도 낮음)
- **numeric_overview**: 5분 캐시 (금융 데이터)
- **asset_info**: 1분 캐시 (실시간성 중요)

---

## 🚀 구현 순서

1. **DB 뷰 생성** (마이그레이션)
   - 단순 조인 뷰 6개 생성
   - 인덱스 추가

2. **AssetInfoService 구현**
   - ohlcv_day_data 기반 계산 로직
   - 단위 테스트 작성

3. **엔드포인트 구현**
   - 각 뷰별 엔드포인트
   - 통합 응답 구조

4. **스키마 정의**
   - Pydantic 모델 생성
   - 응답 검증

5. **테스트 및 최적화**
   - 성능 테스트
   - 캐싱 적용

---

## ✅ 최종 권장사항

**하이브리드 접근법 채택**

1. **단순 조인 → DB 뷰**: 성능 최적화, 코드 단순화
2. **복잡한 계산 → 백엔드 서비스**: 유연성, 유지보수성
3. **기존 패턴 준수**: `treemap_live_view`와 동일한 방식

이 방식으로 **성능과 유지보수성의 균형**을 달성할 수 있습니다.

---

## 📝 다음 단계

승인 후 다음 작업을 진행하겠습니다:

1. ✅ DB 뷰 생성 SQL 스크립트 작성
2. ✅ AssetInfoService 구현
3. ✅ 엔드포인트 구현
4. ✅ 스키마 정의
5. ✅ 테스트 코드 작성

**승인 여부를 알려주시면 구현을 시작하겠습니다.**

