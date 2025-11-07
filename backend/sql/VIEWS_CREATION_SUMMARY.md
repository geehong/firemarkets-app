# Info Views 생성 완료 요약

## ✅ 생성된 뷰

### 1. stock_info_view
- **목적**: 주식 정보 통합 뷰
- **자산 타입**: Stocks (asset_type_id = 2)만 포함
- **통합 테이블**: 
  - `posts` (post_overview)
  - `stock_profiles` (post_overview)
  - `v_financials_unified` (numeric_overview)
  - `stock_estimates` (estimates_overview, 최신 fiscal_date 기준)
- **레코드 수**: 222개 (Stocks만)
- **주요 컬럼**:
  - Posts: post_id, title, slug, description, content, cover_image 등
  - Stock Profiles: company_name, sector, industry, ceo, logo_image_url 등
  - Financials: stock_financials_data, income_json, balance_json, cash_flow_json, ratios_json
  - Estimates: revenue_avg, eps_avg, ebitda_avg 등

### 2. crypto_info_view
- **목적**: 암호화폐 정보 통합 뷰
- **자산 타입**: Crypto (asset_type_id = 8)만 포함
- **통합 테이블**:
  - `posts` (post_overview)
  - `crypto_data` (post_overview + numeric_overview)
- **레코드 수**: 69개 (Crypto만)
- **주요 컬럼**:
  - Posts: post_id, title, slug, description, content, cover_image 등
  - Crypto Data (post_overview): logo_url, website_url, explorer, tags, cmc_rank, category, description
  - Crypto Data (numeric_overview): market_cap, circulating_supply, total_supply, max_supply, current_price, volume_24h, percent_change_1h, percent_change_24h, percent_change_7d, percent_change_30d

### 3. etf_info_view
- **목적**: ETF 정보 통합 뷰
- **자산 타입**: ETFs (asset_type_id = 5)와 Funds (asset_type_id = 7) 포함
- **통합 테이블**:
  - `posts` (post_overview)
  - `etf_info` (numeric_overview)
- **레코드 수**: 105개 (ETFs + Funds)
- **주요 컬럼**:
  - Posts: post_id, title, slug, description, content, cover_image 등
  - ETF Info: snapshot_date, net_assets, net_expense_ratio, portfolio_turnover, dividend_yield, inception_date, leveraged, sectors, holdings

## ✅ 생성된 인덱스

1. **idx_posts_asset_id_post_type** - posts 테이블
   - `(asset_id, post_type)` WHERE `asset_id IS NOT NULL AND post_type = 'assets'`

2. **idx_stock_profiles_asset_id** - stock_profiles 테이블
   - `(asset_id)`

3. **idx_crypto_data_asset_id** - crypto_data 테이블
   - `(asset_id)`

4. **idx_etf_info_asset_id** - etf_info 테이블
   - `(asset_id)`

5. **idx_assets_asset_type_id** - assets 테이블
   - `(asset_type_id)` - 자산 타입 필터링 최적화

## 📝 사용 방법

### 뷰 조회 예시

```sql
-- stock_info_view 조회
SELECT * FROM stock_info_view WHERE asset_id = 1;

-- crypto_info_view 조회
SELECT * FROM crypto_info_view WHERE asset_id = 2;

-- etf_info_view 조회
SELECT * FROM etf_info_view WHERE asset_id = 3;
```

### 백엔드에서 사용

```python
from sqlalchemy import text

# 뷰 조회
result = db.execute(
    text("SELECT * FROM stock_info_view WHERE asset_id = :asset_id"),
    {"asset_id": asset_id}
).fetchone()
```

## ⚠️ 주의사항

1. **자산 타입 필터링**: 각 뷰는 `assets` 테이블과 조인하여 `asset_type_id`로 필터링됩니다.
   - `stock_info_view`: asset_type_id = 2 (Stocks)
   - `crypto_info_view`: asset_type_id = 8 (Crypto)
   - `etf_info_view`: asset_type_id IN (5, 7) (ETFs, Funds)

2. **stock_estimates는 뷰**이므로 인덱스를 생성할 수 없습니다.
   - 대신 기본 테이블 `stock_analyst_estimates`에 인덱스가 있는지 확인하세요.

3. **v_financials_unified는 뷰**이므로 인덱스를 생성할 수 없습니다.
   - 대신 기본 테이블들에 인덱스가 있는지 확인하세요.

4. **LATERAL JOIN 사용**: `stock_info_view`에서 `stock_estimates`는 최신 `fiscal_date` 기준으로만 조인됩니다.

## 🔄 재생성 방법

뷰를 재생성하려면:

```bash
# SQL 직접 실행
cat backend/sql/create_info_views.sql | docker exec -i fire_markets_db_postgres psql -U geehong -d markets

# 또는 Python 스크립트 사용 (가상환경 필요)
cd backend
python3 scripts/create_info_views.py --force-recreate
```

## 📊 성능 최적화

- 모든 뷰는 `asset_id`로 필터링하여 사용하는 것을 권장합니다.
- 인덱스가 생성되어 있어 조인 성능이 최적화되어 있습니다.
- 뷰는 실시간으로 데이터를 조회하므로, 캐싱이 필요한 경우 백엔드 레벨에서 구현하세요.

