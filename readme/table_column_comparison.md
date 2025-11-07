# 테이블 컬럼 비교 분석

## asset_id를 포함하는 테이블 목록

총 24개 테이블

- asset_basic_info
- assets
- company_financials
- crypto_data
- crypto_metrics
- data_collection_logs
- etf_info
- financial_metrics
- financial_statements
- index_infos
- macrotrends_financials
- ohlcv_day_data
- ohlcv_intraday_data
- posts
- realtime_quotes
- realtime_quotes_time_delay
- stock_analyst_estimates
- stock_estimates
- stock_financials
- stock_profiles
- technical_indicators
- treemap_live_view
- v_financials_unified
- world_assets_ranking

---

## 1. 동일한 컬럼 (이름, 타입, 제약조건 모두 동일)

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 | 포함된 테이블 |
|--------|------------|----------|----------|-------------|
| adjusted_close | numeric | - | YES | ohlcv_day_data, ohlcv_intraday_data |
| asset_id | integer | - | YES | asset_basic_info, data_collection_logs, posts, stock_estimates, treemap_live_view, v_financials_unified, world_assets_ranking |
| asset_id | integer | - | YES | assets, company_financials, crypto_data, crypto_metrics, etf_info, financial_metrics, financial_statements, index_infos, macrotrends_financials, ohlcv_day_data, ohlcv_intraday_data, realtime_quotes, realtime_quotes_time_delay, stock_analyst_estimates, stock_financials, stock_profiles, technical_indicators |
| asset_type_id | integer | - | NO | posts, world_assets_ranking |
| change_amount | numeric | - | YES | realtime_quotes, realtime_quotes_time_delay |
| change_percent | numeric | - | YES | ohlcv_day_data, ohlcv_intraday_data, realtime_quotes, realtime_quotes_time_delay |
| close_price | numeric | - | NO | ohlcv_day_data, ohlcv_intraday_data |
| created_at | timestamp without time zone | - | YES | asset_basic_info, assets, company_financials, financial_metrics, financial_statements, macrotrends_financials, ohlcv_day_data, ohlcv_intraday_data, posts |
| created_at | timestamp without time zone | - | YES | crypto_data, crypto_metrics, etf_info, technical_indicators |
| currency | character varying | 10 | YES | asset_basic_info, assets, macrotrends_financials, stock_financials |
| current_price | numeric | - | YES | crypto_data, treemap_live_view |
| data_interval | character varying | 10 | NO | ohlcv_day_data, realtime_quotes_time_delay, technical_indicators |
| data_source | character varying | 50 | NO | company_financials, financial_statements |
| data_source | character varying | 50 | NO | realtime_quotes, realtime_quotes_time_delay |
| description | text | - | YES | asset_basic_info, assets, crypto_data |
| dividend_yield | numeric | - | YES | etf_info, stock_financials |
| ebit_avg | bigint | - | YES | stock_analyst_estimates, stock_estimates |
| ebit_high | bigint | - | YES | stock_analyst_estimates, stock_estimates |
| ebit_low | bigint | - | YES | stock_analyst_estimates, stock_estimates |
| ebitda_avg | bigint | - | YES | stock_analyst_estimates, stock_estimates |
| ebitda_high | bigint | - | YES | stock_analyst_estimates, stock_estimates |
| ebitda_low | bigint | - | YES | stock_analyst_estimates, stock_estimates |
| eps_analysts_count | integer | - | YES | stock_analyst_estimates, stock_estimates |
| eps_avg | numeric | - | YES | stock_analyst_estimates, stock_estimates |
| eps_high | numeric | - | YES | stock_analyst_estimates, stock_estimates |
| eps_low | numeric | - | YES | stock_analyst_estimates, stock_estimates |
| exchange | character varying | 100 | YES | asset_basic_info, assets |
| high_price | numeric | - | NO | ohlcv_day_data, ohlcv_intraday_data |
| id | integer | - | NO | company_financials, crypto_data, data_collection_logs, financial_metrics, financial_statements, posts, realtime_quotes, realtime_quotes_time_delay, world_assets_ranking |
| is_active | boolean | - | YES | asset_basic_info, assets, crypto_data |
| last_updated | timestamp without time zone | - | YES | company_financials, world_assets_ranking |
| low_price | numeric | - | NO | ohlcv_day_data, ohlcv_intraday_data |
| market_cap | numeric | - | YES | crypto_data, treemap_live_view |
| market_cap | numeric | - | YES | stock_financials, stock_profiles |
| name | character varying | 255 | YES | asset_basic_info, stock_estimates, treemap_live_view |
| name | character varying | 255 | YES | assets, world_assets_ranking |
| net_income_avg | bigint | - | YES | stock_analyst_estimates, stock_estimates |
| net_income_high | bigint | - | YES | stock_analyst_estimates, stock_estimates |
| net_income_low | bigint | - | YES | stock_analyst_estimates, stock_estimates |
| ohlcv_id | integer | - | NO | ohlcv_day_data, ohlcv_intraday_data |
| open_price | numeric | - | NO | ohlcv_day_data, ohlcv_intraday_data |
| price | numeric | - | YES | crypto_data, index_infos |
| price | numeric | - | YES | realtime_quotes, realtime_quotes_time_delay |
| revenue_analysts_count | integer | - | YES | stock_analyst_estimates, stock_estimates |
| revenue_avg | bigint | - | YES | stock_analyst_estimates, stock_estimates |
| revenue_high | bigint | - | YES | stock_analyst_estimates, stock_estimates |
| revenue_low | bigint | - | YES | stock_analyst_estimates, stock_estimates |
| sga_expense_avg | bigint | - | YES | stock_analyst_estimates, stock_estimates |
| sga_expense_high | bigint | - | YES | stock_analyst_estimates, stock_estimates |
| sga_expense_low | bigint | - | YES | stock_analyst_estimates, stock_estimates |
| snapshot_date | date | - | NO | etf_info, index_infos, macrotrends_financials, stock_financials |
| ticker | character varying | 50 | YES | asset_basic_info, stock_estimates, treemap_live_view, v_financials_unified, world_assets_ranking |
| timestamp_utc | date | - | NO | ohlcv_day_data, ohlcv_intraday_data, realtime_quotes, realtime_quotes_time_delay, technical_indicators |
| updated_at | timestamp without time zone | - | YES | asset_basic_info, assets, company_financials, financial_metrics, financial_statements, macrotrends_financials, ohlcv_day_data, ohlcv_intraday_data, posts |
| updated_at | timestamp without time zone | - | YES | crypto_metrics, etf_info, realtime_quotes, realtime_quotes_time_delay, stock_analyst_estimates, stock_financials, stock_profiles, technical_indicators |
| volume | bigint | - | YES | index_infos, ohlcv_day_data, ohlcv_intraday_data, treemap_live_view |
| volume | bigint | - | YES | realtime_quotes, realtime_quotes_time_delay |

---

## 2. 유사한 컬럼 (이름은 같지만 타입/제약조건이 다른 경우)

| 컬럼명 | 데이터 타입 | 포함된 테이블 |
|--------|------------|-------------|
| description | text | asset_basic_info, assets, crypto_data |
| description | json | posts |
| id | integer | company_financials, crypto_data, data_collection_logs, financial_metrics, financial_statements, posts, realtime_quotes, realtime_quotes_time_delay, world_assets_ranking |
| id | bigint | macrotrends_financials |
| market_cap | numeric | crypto_data, treemap_live_view |
| market_cap | bigint | stock_financials, stock_profiles |
| revenue_ttm | double precision | company_financials |
| revenue_ttm | bigint | stock_financials |
| timestamp_utc | date | crypto_metrics |
| timestamp_utc | timestamp without time zone | ohlcv_day_data, ohlcv_intraday_data, realtime_quotes, realtime_quotes_time_delay, technical_indicators |
| value | double precision | financial_statements |
| value | numeric | technical_indicators |
| volume | bigint | index_infos, ohlcv_day_data, ohlcv_intraday_data, treemap_live_view |
| volume | numeric | realtime_quotes, realtime_quotes_time_delay |

---

## 3. 의미적으로 유사한 컬럼 (다른 이름이지만 비슷한 목적)


### ASSET_TYPE

| 테이블 | 컬럼명 | 데이터 타입 | NULL 허용 |
|--------|--------|------------|----------|
| asset_basic_info | name | character varying | YES |
| asset_basic_info | type_name | character varying | YES |
| assets | asset_type_id | integer | NO |
| assets | name | character varying | NO |
| company_financials | id | integer | NO |
| crypto_data | id | integer | NO |
| crypto_data | name | character varying | NO |
| data_collection_logs | id | integer | NO |
| financial_metrics | id | integer | NO |
| financial_statements | id | integer | NO |
| macrotrends_financials | id | bigint | NO |
| posts | id | integer | NO |
| posts | asset_type_id | integer | YES |
| realtime_quotes | id | integer | NO |
| realtime_quotes_time_delay | id | integer | NO |
| stock_estimates | name | character varying | YES |
| treemap_live_view | name | character varying | YES |
| treemap_live_view | asset_type | character varying | YES |
| world_assets_ranking | id | integer | NO |
| world_assets_ranking | name | character varying | NO |
| world_assets_ranking | asset_type_id | integer | YES |

### CHANGE

| 테이블 | 컬럼명 | 데이터 타입 | NULL 허용 |
|--------|--------|------------|----------|
| crypto_data | percent_change_1h | numeric | YES |
| crypto_data | percent_change_24h | numeric | YES |
| crypto_data | percent_change_7d | numeric | YES |
| crypto_data | percent_change_30d | numeric | YES |
| crypto_data | price | numeric | YES |
| index_infos | price | numeric | YES |
| index_infos | change_percentage | numeric | YES |
| ohlcv_day_data | change_percent | numeric | YES |
| ohlcv_intraday_data | change_percent | numeric | YES |
| realtime_quotes | price | numeric | NO |
| realtime_quotes | change_amount | numeric | YES |
| realtime_quotes | change_percent | numeric | YES |
| realtime_quotes_time_delay | price | numeric | NO |
| realtime_quotes_time_delay | change_amount | numeric | YES |
| realtime_quotes_time_delay | change_percent | numeric | YES |
| treemap_live_view | price_change_percentage_24h | numeric | YES |
| world_assets_ranking | daily_change_percent | numeric | YES |

### CURRENCY

| 테이블 | 컬럼명 | 데이터 타입 | NULL 허용 |
|--------|--------|------------|----------|
| asset_basic_info | currency | character varying | YES |
| assets | currency | character varying | YES |
| macrotrends_financials | currency | character varying | YES |
| stock_financials | currency | character varying | YES |

### DATA_SOURCE

| 테이블 | 컬럼명 | 데이터 타입 | NULL 허용 |
|--------|--------|------------|----------|
| assets | data_source | character varying | NO |
| company_financials | data_source | character varying | YES |
| financial_metrics | data_sources | json | YES |
| financial_statements | data_source | character varying | YES |
| realtime_quotes | data_source | character varying | NO |
| realtime_quotes_time_delay | data_source | character varying | NO |
| world_assets_ranking | data_source | character varying | YES |

### DATE

| 테이블 | 컬럼명 | 데이터 타입 | NULL 허용 |
|--------|--------|------------|----------|
| asset_basic_info | updated_at | timestamp without time zone | YES |
| assets | updated_at | timestamp without time zone | YES |
| company_financials | last_updated | timestamp without time zone | YES |
| company_financials | updated_at | timestamp without time zone | YES |
| crypto_data | date_added | date | YES |
| crypto_data | last_updated | timestamp without time zone | NO |
| crypto_metrics | updated_at | timestamp without time zone | NO |
| etf_info | snapshot_date | date | NO |
| etf_info | inception_date | date | YES |
| etf_info | updated_at | timestamp without time zone | NO |
| financial_metrics | period_end_date | timestamp without time zone | NO |
| financial_metrics | updated_at | timestamp without time zone | YES |
| financial_statements | end_date | timestamp without time zone | YES |
| financial_statements | start_date | timestamp without time zone | YES |
| financial_statements | filed_date | timestamp without time zone | YES |
| financial_statements | updated_at | timestamp without time zone | YES |
| index_infos | snapshot_date | date | NO |
| macrotrends_financials | snapshot_date | date | NO |
| macrotrends_financials | updated_at | timestamp without time zone | YES |
| ohlcv_day_data | updated_at | timestamp without time zone | YES |
| ohlcv_intraday_data | updated_at | timestamp without time zone | YES |
| posts | updated_at | timestamp without time zone | YES |
| realtime_quotes | updated_at | timestamp without time zone | NO |
| realtime_quotes_time_delay | updated_at | timestamp without time zone | NO |
| stock_analyst_estimates | fiscal_date | date | NO |
| stock_analyst_estimates | updated_at | timestamp without time zone | NO |
| stock_estimates | fiscal_date | date | YES |
| stock_financials | snapshot_date | date | NO |
| stock_financials | updated_at | timestamp without time zone | NO |
| stock_profiles | ipo_date | date | YES |
| stock_profiles | updated_at | timestamp without time zone | NO |
| technical_indicators | updated_at | timestamp without time zone | NO |
| treemap_live_view | realtime_updated_at | timestamp without time zone | YES |
| treemap_live_view | daily_data_updated_at | timestamp without time zone | YES |
| world_assets_ranking | rank | integer | NO |
| world_assets_ranking | ranking_date | date | NO |
| world_assets_ranking | last_updated | timestamp without time zone | YES |

### DESCRIPTION

| 테이블 | 컬럼명 | 데이터 타입 | NULL 허용 |
|--------|--------|------------|----------|
| asset_basic_info | description | text | YES |
| asset_basic_info | type_description | text | YES |
| assets | description | text | YES |
| crypto_data | description | text | YES |
| posts | description | json | NO |
| posts | excerpt | jsonb | YES |
| posts | meta_description | jsonb | YES |
| stock_profiles | description_en | text | YES |
| stock_profiles | description_ko | text | YES |

### EXCHANGE

| 테이블 | 컬럼명 | 데이터 타입 | NULL 허용 |
|--------|--------|------------|----------|
| asset_basic_info | name | character varying | YES |
| asset_basic_info | exchange | character varying | YES |
| assets | name | character varying | NO |
| assets | exchange | character varying | YES |
| crypto_data | name | character varying | NO |
| stock_estimates | name | character varying | YES |
| stock_profiles | exchange | character varying | YES |
| stock_profiles | exchange_full_name | character varying | YES |
| treemap_live_view | name | character varying | YES |
| world_assets_ranking | name | character varying | NO |

### ID

| 테이블 | 컬럼명 | 데이터 타입 | NULL 허용 |
|--------|--------|------------|----------|
| asset_basic_info | asset_id | integer | YES |
| assets | asset_id | integer | NO |
| assets | asset_type_id | integer | NO |
| company_financials | id | integer | NO |
| company_financials | asset_id | integer | NO |
| crypto_data | id | integer | NO |
| crypto_data | asset_id | integer | NO |
| crypto_metrics | metric_id | bigint | NO |
| crypto_metrics | asset_id | integer | NO |
| data_collection_logs | id | integer | NO |
| data_collection_logs | asset_id | integer | YES |
| etf_info | etf_info_id | integer | NO |
| etf_info | asset_id | integer | NO |
| etf_info | dividend_yield | numeric | YES |
| financial_metrics | id | integer | NO |
| financial_metrics | asset_id | integer | NO |
| financial_statements | id | integer | NO |
| financial_statements | asset_id | integer | NO |
| index_infos | index_info_id | integer | NO |
| index_infos | asset_id | integer | NO |
| macrotrends_financials | id | bigint | NO |
| macrotrends_financials | asset_id | integer | NO |
| ohlcv_day_data | ohlcv_id | integer | NO |
| ohlcv_day_data | asset_id | integer | NO |
| ohlcv_intraday_data | ohlcv_id | integer | NO |
| ohlcv_intraday_data | asset_id | integer | NO |
| posts | id | integer | NO |
| posts | asset_id | integer | YES |
| posts | author_id | integer | YES |
| posts | category_id | integer | YES |
| posts | asset_type_id | integer | YES |
| realtime_quotes | id | integer | NO |
| realtime_quotes | asset_id | integer | NO |
| realtime_quotes_time_delay | id | integer | NO |
| realtime_quotes_time_delay | asset_id | integer | NO |
| stock_analyst_estimates | estimate_id | integer | NO |
| stock_analyst_estimates | asset_id | integer | NO |
| stock_estimates | asset_id | integer | YES |
| stock_financials | financial_id | integer | NO |
| stock_financials | asset_id | integer | NO |
| stock_financials | dividend_yield | numeric | YES |
| stock_financials | dividend_per_share | numeric | YES |
| stock_profiles | profile_id | integer | NO |
| stock_profiles | asset_id | integer | NO |
| technical_indicators | indicator_data_id | bigint | NO |
| technical_indicators | asset_id | integer | NO |
| treemap_live_view | asset_id | integer | YES |
| v_financials_unified | asset_id | integer | YES |
| world_assets_ranking | id | integer | NO |
| world_assets_ranking | asset_type_id | integer | YES |
| world_assets_ranking | asset_id | integer | YES |

### IS_ACTIVE

| 테이블 | 컬럼명 | 데이터 타입 | NULL 허용 |
|--------|--------|------------|----------|
| asset_basic_info | is_active | boolean | YES |
| assets | is_active | boolean | YES |
| crypto_data | is_active | boolean | YES |

### MARKET_CAP

| 테이블 | 컬럼명 | 데이터 타입 | NULL 허용 |
|--------|--------|------------|----------|
| crypto_data | market_cap | numeric | YES |
| stock_financials | market_cap | bigint | YES |
| stock_profiles | market_cap | bigint | YES |
| treemap_live_view | market_cap | numeric | YES |
| world_assets_ranking | market_cap_usd | numeric | YES |

### NAME

| 테이블 | 컬럼명 | 데이터 타입 | NULL 허용 |
|--------|--------|------------|----------|
| asset_basic_info | name | character varying | YES |
| asset_basic_info | type_name | character varying | YES |
| assets | name | character varying | NO |
| crypto_data | name | character varying | NO |
| data_collection_logs | collector_name | character varying | NO |
| financial_metrics | metric_name | character varying | NO |
| macrotrends_financials | field_name | character varying | NO |
| posts | title | json | NO |
| posts | meta_title | jsonb | YES |
| stock_estimates | name | character varying | YES |
| stock_profiles | company_name | character varying | NO |
| stock_profiles | exchange_full_name | character varying | YES |
| treemap_live_view | name | character varying | YES |
| world_assets_ranking | name | character varying | NO |

### PRICE

| 테이블 | 컬럼명 | 데이터 타입 | NULL 허용 |
|--------|--------|------------|----------|
| crypto_data | current_price | numeric | YES |
| crypto_data | price | numeric | YES |
| crypto_metrics | realized_price | numeric | YES |
| index_infos | price | numeric | YES |
| index_infos | price_avg_50 | numeric | YES |
| index_infos | price_avg_200 | numeric | YES |
| ohlcv_day_data | open_price | numeric | NO |
| ohlcv_day_data | high_price | numeric | NO |
| ohlcv_day_data | low_price | numeric | NO |
| ohlcv_day_data | close_price | numeric | NO |
| ohlcv_day_data | adjusted_close | numeric | YES |
| ohlcv_intraday_data | open_price | numeric | NO |
| ohlcv_intraday_data | high_price | numeric | NO |
| ohlcv_intraday_data | low_price | numeric | NO |
| ohlcv_intraday_data | close_price | numeric | NO |
| ohlcv_intraday_data | adjusted_close | numeric | YES |
| realtime_quotes | price | numeric | NO |
| realtime_quotes_time_delay | price | numeric | NO |
| stock_financials | price_to_book_ratio | numeric | YES |
| stock_financials | analyst_target_price | numeric | YES |
| stock_financials | price_to_sales_ratio_ttm | numeric | YES |
| treemap_live_view | current_price | numeric | YES |
| treemap_live_view | price_change_percentage_24h | numeric | YES |
| world_assets_ranking | price_usd | numeric | YES |

### TICKER

| 테이블 | 컬럼명 | 데이터 타입 | NULL 허용 |
|--------|--------|------------|----------|
| asset_basic_info | ticker | character varying | YES |
| assets | ticker | character varying | NO |
| crypto_data | symbol | character varying | NO |
| stock_estimates | ticker | character varying | YES |
| treemap_live_view | ticker | character varying | YES |
| v_financials_unified | ticker | character varying | YES |
| world_assets_ranking | ticker | character varying | YES |

### TIMESTAMP

| 테이블 | 컬럼명 | 데이터 타입 | NULL 허용 |
|--------|--------|------------|----------|
| asset_basic_info | created_at | timestamp without time zone | YES |
| asset_basic_info | updated_at | timestamp without time zone | YES |
| assets | created_at | timestamp without time zone | YES |
| assets | updated_at | timestamp without time zone | YES |
| company_financials | last_updated | timestamp without time zone | YES |
| company_financials | created_at | timestamp without time zone | YES |
| company_financials | updated_at | timestamp without time zone | YES |
| crypto_data | last_updated | timestamp without time zone | NO |
| crypto_data | created_at | timestamp without time zone | NO |
| crypto_metrics | timestamp_utc | date | NO |
| crypto_metrics | created_at | timestamp without time zone | NO |
| crypto_metrics | updated_at | timestamp without time zone | NO |
| data_collection_logs | timestamp | timestamp without time zone | YES |
| etf_info | created_at | timestamp without time zone | NO |
| etf_info | updated_at | timestamp without time zone | NO |
| financial_metrics | created_at | timestamp without time zone | YES |
| financial_metrics | updated_at | timestamp without time zone | YES |
| financial_statements | created_at | timestamp without time zone | YES |
| financial_statements | updated_at | timestamp without time zone | YES |
| macrotrends_financials | created_at | timestamp without time zone | YES |
| macrotrends_financials | updated_at | timestamp without time zone | YES |
| ohlcv_day_data | timestamp_utc | timestamp without time zone | NO |
| ohlcv_day_data | created_at | timestamp without time zone | YES |
| ohlcv_day_data | updated_at | timestamp without time zone | YES |
| ohlcv_intraday_data | timestamp_utc | timestamp without time zone | NO |
| ohlcv_intraday_data | created_at | timestamp without time zone | YES |
| ohlcv_intraday_data | updated_at | timestamp without time zone | YES |
| posts | created_at | timestamp without time zone | YES |
| posts | updated_at | timestamp without time zone | YES |
| posts | published_at | timestamp without time zone | YES |
| posts | scheduled_at | timestamp without time zone | YES |
| posts | last_sync_at | timestamp without time zone | YES |
| realtime_quotes | timestamp_utc | timestamp without time zone | NO |
| realtime_quotes | updated_at | timestamp without time zone | NO |
| realtime_quotes_time_delay | timestamp_utc | timestamp without time zone | NO |
| realtime_quotes_time_delay | updated_at | timestamp without time zone | NO |
| stock_analyst_estimates | updated_at | timestamp without time zone | NO |
| stock_financials | updated_at | timestamp without time zone | NO |
| stock_profiles | updated_at | timestamp without time zone | NO |
| technical_indicators | timestamp_utc | timestamp without time zone | NO |
| technical_indicators | created_at | timestamp without time zone | NO |
| technical_indicators | updated_at | timestamp without time zone | NO |
| treemap_live_view | realtime_updated_at | timestamp without time zone | YES |
| treemap_live_view | daily_data_updated_at | timestamp without time zone | YES |
| world_assets_ranking | last_updated | timestamp without time zone | YES |

### VOLUME

| 테이블 | 컬럼명 | 데이터 타입 | NULL 허용 |
|--------|--------|------------|----------|
| crypto_data | volume_24h | numeric | YES |
| index_infos | volume | bigint | YES |
| ohlcv_day_data | volume | bigint | YES |
| ohlcv_intraday_data | volume | bigint | YES |
| realtime_quotes | volume | numeric | YES |
| realtime_quotes_time_delay | volume | numeric | YES |
| treemap_live_view | volume | bigint | YES |

---

## 4. 전체 테이블별 컬럼 요약


### asset_basic_info

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_category | text | - | YES |
| asset_id | integer | - | YES |
| created_at | timestamp without time zone | - | YES |
| currency | character varying | 10 | YES |
| description | text | - | YES |
| exchange | character varying | 100 | YES |
| is_active | boolean | - | YES |
| name | character varying | 255 | YES |
| ticker | character varying | 50 | YES |
| type_description | text | - | YES |
| type_name | character varying | 100 | YES |
| updated_at | timestamp without time zone | - | YES |

### assets

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | NO |
| asset_type_id | integer | - | NO |
| collection_settings | jsonb | - | YES |
| created_at | timestamp without time zone | - | YES |
| currency | character varying | 10 | YES |
| data_source | character varying | 50 | NO |
| description | text | - | YES |
| exchange | character varying | 100 | YES |
| is_active | boolean | - | YES |
| last_collections | jsonb | - | YES |
| name | character varying | 255 | NO |
| ticker | character varying | 50 | NO |
| updated_at | timestamp without time zone | - | YES |

### company_financials

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | NO |
| created_at | timestamp without time zone | - | YES |
| data_source | character varying | 50 | YES |
| debt_to_equity_ratio | double precision | - | YES |
| id | integer | - | NO |
| last_updated | timestamp without time zone | - | YES |
| net_income_ttm | double precision | - | YES |
| profit_margin | double precision | - | YES |
| return_on_assets | double precision | - | YES |
| return_on_equity | double precision | - | YES |
| revenue_ttm | double precision | - | YES |
| shareholders_equity | double precision | - | YES |
| total_assets | double precision | - | YES |
| total_liabilities | double precision | - | YES |
| updated_at | timestamp without time zone | - | YES |

### crypto_data

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | NO |
| category | character varying | 50 | YES |
| circulating_supply | numeric | - | YES |
| cmc_rank | integer | - | YES |
| created_at | timestamp without time zone | - | NO |
| current_price | numeric | - | YES |
| date_added | date | - | YES |
| description | text | - | YES |
| explorer | json | - | YES |
| id | integer | - | NO |
| is_active | boolean | - | YES |
| last_updated | timestamp without time zone | - | NO |
| logo_url | character varying | 500 | YES |
| market_cap | numeric | - | YES |
| max_supply | numeric | - | YES |
| name | character varying | 100 | NO |
| percent_change_1h | numeric | - | YES |
| percent_change_24h | numeric | - | YES |
| percent_change_30d | numeric | - | YES |
| percent_change_7d | numeric | - | YES |
| platform | text | - | YES |
| price | numeric | - | YES |
| slug | character varying | 100 | YES |
| source_code | json | - | YES |
| symbol | character varying | 20 | NO |
| tags | json | - | YES |
| total_supply | numeric | - | YES |
| volume_24h | numeric | - | YES |
| website_url | character varying | 500 | YES |

### crypto_metrics

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | NO |
| aviv | numeric | - | YES |
| cdd_90dma | numeric | - | YES |
| created_at | timestamp without time zone | - | NO |
| difficulty | numeric | - | YES |
| etf_btc_flow | numeric | - | YES |
| etf_btc_total | numeric | - | YES |
| hashrate | numeric | - | YES |
| hodl_age_distribution | json | - | YES |
| hodl_waves_supply | numeric | - | YES |
| metric_id | bigint | - | NO |
| miner_reserves | numeric | - | YES |
| mvrv_z_score | numeric | - | YES |
| nrpl_btc | numeric | - | YES |
| nupl | numeric | - | YES |
| open_interest_futures | json | - | YES |
| realized_cap | numeric | - | YES |
| realized_price | numeric | - | YES |
| sopr | numeric | - | YES |
| thermo_cap | numeric | - | YES |
| timestamp_utc | date | - | NO |
| true_market_mean | numeric | - | YES |
| updated_at | timestamp without time zone | - | NO |

### data_collection_logs

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | YES |
| collection_metadata | json | - | YES |
| collector_name | character varying | 50 | NO |
| data_type | character varying | 50 | NO |
| error_message | text | - | YES |
| execution_time_seconds | double precision | - | YES |
| id | integer | - | NO |
| records_collected | integer | - | YES |
| records_saved | integer | - | YES |
| status | character varying | 20 | NO |
| timestamp | timestamp without time zone | - | YES |

### etf_info

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | NO |
| created_at | timestamp without time zone | - | NO |
| dividend_yield | numeric | - | YES |
| etf_info_id | integer | - | NO |
| holdings | json | - | YES |
| inception_date | date | - | YES |
| leveraged | boolean | - | YES |
| net_assets | numeric | - | YES |
| net_expense_ratio | numeric | - | YES |
| portfolio_turnover | numeric | - | YES |
| sectors | json | - | YES |
| snapshot_date | date | - | NO |
| updated_at | timestamp without time zone | - | NO |

### financial_metrics

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | NO |
| calculation_method | character varying | 100 | YES |
| created_at | timestamp without time zone | - | YES |
| data_sources | json | - | YES |
| id | integer | - | NO |
| metric_name | character varying | 100 | NO |
| metric_unit | character varying | 20 | YES |
| metric_value | double precision | - | NO |
| period_end_date | timestamp without time zone | - | NO |
| period_type | character varying | 20 | NO |
| updated_at | timestamp without time zone | - | YES |

### financial_statements

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | NO |
| concept | character varying | 100 | NO |
| created_at | timestamp without time zone | - | YES |
| data_source | character varying | 50 | YES |
| end_date | timestamp without time zone | - | YES |
| filed_date | timestamp without time zone | - | YES |
| form_type | character varying | 20 | YES |
| frame | character varying | 50 | YES |
| id | integer | - | NO |
| period | character varying | 20 | NO |
| raw_data | json | - | YES |
| start_date | timestamp without time zone | - | YES |
| statement_type | character varying | 50 | NO |
| unit | character varying | 10 | YES |
| updated_at | timestamp without time zone | - | YES |
| value | double precision | - | YES |

### index_infos

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | NO |
| change_percentage | numeric | - | YES |
| day_high | numeric | - | YES |
| day_low | numeric | - | YES |
| index_info_id | integer | - | NO |
| price | numeric | - | YES |
| price_avg_200 | numeric | - | YES |
| price_avg_50 | numeric | - | YES |
| snapshot_date | date | - | NO |
| volume | bigint | - | YES |
| year_high | numeric | - | YES |
| year_low | numeric | - | YES |

### macrotrends_financials

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | NO |
| created_at | timestamp without time zone | - | YES |
| currency | character varying | 10 | YES |
| field_name | character varying | 128 | NO |
| id | bigint | - | NO |
| section | character varying | 32 | NO |
| snapshot_date | date | - | NO |
| source_url | character varying | 512 | YES |
| unit | character varying | 32 | YES |
| updated_at | timestamp without time zone | - | YES |
| value_numeric | numeric | - | YES |
| value_text | character varying | 256 | YES |

### ohlcv_day_data

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| adjusted_close | numeric | - | YES |
| asset_id | integer | - | NO |
| change_percent | numeric | - | YES |
| close_price | numeric | - | NO |
| created_at | timestamp without time zone | - | YES |
| data_interval | character varying | 10 | NO |
| high_price | numeric | - | NO |
| low_price | numeric | - | NO |
| ohlcv_id | integer | - | NO |
| open_price | numeric | - | NO |
| timestamp_utc | timestamp without time zone | - | NO |
| updated_at | timestamp without time zone | - | YES |
| volume | bigint | - | YES |

### ohlcv_intraday_data

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| adjusted_close | numeric | - | YES |
| asset_id | integer | - | NO |
| change_percent | numeric | - | YES |
| close_price | numeric | - | NO |
| created_at | timestamp without time zone | - | YES |
| data_interval | character varying | 10 | YES |
| high_price | numeric | - | NO |
| low_price | numeric | - | NO |
| ohlcv_id | integer | - | NO |
| open_price | numeric | - | NO |
| timestamp_utc | timestamp without time zone | - | NO |
| updated_at | timestamp without time zone | - | YES |
| volume | bigint | - | YES |

### posts

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | YES |
| asset_type_id | integer | - | YES |
| author_id | integer | - | YES |
| auto_sync_content | boolean | - | YES |
| canonical_url | character varying | 500 | YES |
| category_id | integer | - | YES |
| comment_count | integer | - | NO |
| content | text | - | YES |
| content_ko | text | - | YES |
| cover_image | character varying | 500 | YES |
| cover_image_alt | text | - | YES |
| created_at | timestamp without time zone | - | YES |
| description | json | - | NO |
| excerpt | jsonb | - | YES |
| featured | boolean | - | YES |
| id | integer | - | NO |
| keywords | jsonb | - | YES |
| last_sync_at | timestamp without time zone | - | YES |
| menu_order | integer | - | NO |
| meta_description | jsonb | - | YES |
| meta_title | jsonb | - | YES |
| permissions | jsonb | - | YES |
| ping_status | character varying | 20 | NO |
| post_info | jsonb | - | YES |
| post_parent | integer | - | YES |
| post_password | character varying | 255 | YES |
| post_type | character varying | 20 | NO |
| published_at | timestamp without time zone | - | YES |
| read_time_minutes | integer | - | YES |
| scheduled_at | timestamp without time zone | - | YES |
| shared_with | jsonb | - | YES |
| slug | character varying | 200 | NO |
| status | character varying | 20 | YES |
| sync_status | character varying | 20 | YES |
| sync_with_asset | boolean | - | YES |
| title | json | - | NO |
| updated_at | timestamp without time zone | - | YES |
| view_count | integer | - | YES |
| visibility | character varying | 20 | YES |

### realtime_quotes

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | NO |
| change_amount | numeric | - | YES |
| change_percent | numeric | - | YES |
| data_source | character varying | 32 | NO |
| id | integer | - | NO |
| price | numeric | - | NO |
| timestamp_utc | timestamp without time zone | - | NO |
| updated_at | timestamp without time zone | - | NO |
| volume | numeric | - | YES |

### realtime_quotes_time_delay

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | NO |
| change_amount | numeric | - | YES |
| change_percent | numeric | - | YES |
| data_interval | character varying | 10 | NO |
| data_source | character varying | 32 | NO |
| id | integer | - | NO |
| price | numeric | - | NO |
| timestamp_utc | timestamp without time zone | - | NO |
| updated_at | timestamp without time zone | - | NO |
| volume | numeric | - | YES |

### stock_analyst_estimates

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | NO |
| ebit_avg | bigint | - | YES |
| ebit_high | bigint | - | YES |
| ebit_low | bigint | - | YES |
| ebitda_avg | bigint | - | YES |
| ebitda_high | bigint | - | YES |
| ebitda_low | bigint | - | YES |
| eps_analysts_count | integer | - | YES |
| eps_avg | numeric | - | YES |
| eps_high | numeric | - | YES |
| eps_low | numeric | - | YES |
| estimate_id | integer | - | NO |
| fiscal_date | date | - | NO |
| net_income_avg | bigint | - | YES |
| net_income_high | bigint | - | YES |
| net_income_low | bigint | - | YES |
| revenue_analysts_count | integer | - | YES |
| revenue_avg | bigint | - | YES |
| revenue_high | bigint | - | YES |
| revenue_low | bigint | - | YES |
| sga_expense_avg | bigint | - | YES |
| sga_expense_high | bigint | - | YES |
| sga_expense_low | bigint | - | YES |
| updated_at | timestamp without time zone | - | NO |

### stock_estimates

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | YES |
| ebit_avg | bigint | - | YES |
| ebit_high | bigint | - | YES |
| ebit_low | bigint | - | YES |
| ebitda_avg | bigint | - | YES |
| ebitda_high | bigint | - | YES |
| ebitda_low | bigint | - | YES |
| eps_analysts_count | integer | - | YES |
| eps_avg | numeric | - | YES |
| eps_high | numeric | - | YES |
| eps_low | numeric | - | YES |
| fiscal_date | date | - | YES |
| name | character varying | 255 | YES |
| net_income_avg | bigint | - | YES |
| net_income_high | bigint | - | YES |
| net_income_low | bigint | - | YES |
| revenue_analysts_count | integer | - | YES |
| revenue_avg | bigint | - | YES |
| revenue_high | bigint | - | YES |
| revenue_low | bigint | - | YES |
| sga_expense_avg | bigint | - | YES |
| sga_expense_high | bigint | - | YES |
| sga_expense_low | bigint | - | YES |
| ticker | character varying | 50 | YES |

### stock_financials

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| analyst_target_price | numeric | - | YES |
| asset_id | integer | - | NO |
| beta | numeric | - | YES |
| book_value | numeric | - | YES |
| currency | character varying | 10 | YES |
| day_200_moving_avg | numeric | - | YES |
| day_50_moving_avg | numeric | - | YES |
| dividend_per_share | numeric | - | YES |
| dividend_yield | numeric | - | YES |
| ebitda | bigint | - | YES |
| eps | numeric | - | YES |
| ev_to_ebitda | numeric | - | YES |
| ev_to_revenue | numeric | - | YES |
| financial_id | integer | - | NO |
| forward_pe | numeric | - | YES |
| gross_profit_ttm | bigint | - | YES |
| market_cap | bigint | - | YES |
| operating_margin_ttm | numeric | - | YES |
| pe_ratio | numeric | - | YES |
| peg_ratio | numeric | - | YES |
| price_to_book_ratio | numeric | - | YES |
| price_to_sales_ratio_ttm | numeric | - | YES |
| profit_margin_ttm | numeric | - | YES |
| quarterly_earnings_growth_yoy | numeric | - | YES |
| quarterly_revenue_growth_yoy | numeric | - | YES |
| return_on_assets_ttm | numeric | - | YES |
| return_on_equity_ttm | numeric | - | YES |
| revenue_per_share_ttm | numeric | - | YES |
| revenue_ttm | bigint | - | YES |
| shares_outstanding | bigint | - | YES |
| snapshot_date | date | - | NO |
| trailing_pe | numeric | - | YES |
| updated_at | timestamp without time zone | - | NO |
| week_52_high | numeric | - | YES |
| week_52_low | numeric | - | YES |

### stock_profiles

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| address | character varying | 255 | YES |
| asset_id | integer | - | NO |
| ceo | character varying | 100 | YES |
| cik | character varying | 20 | YES |
| city | character varying | 100 | YES |
| company_name | character varying | 255 | NO |
| country | character varying | 50 | YES |
| cusip | character varying | 20 | YES |
| description_en | text | - | YES |
| description_ko | text | - | YES |
| employees_count | integer | - | YES |
| exchange | character varying | 50 | YES |
| exchange_full_name | character varying | 100 | YES |
| industry | character varying | 100 | YES |
| ipo_date | date | - | YES |
| isin | character varying | 20 | YES |
| logo_image_url | character varying | 255 | YES |
| market_cap | bigint | - | YES |
| phone | character varying | 50 | YES |
| profile_id | integer | - | NO |
| sector | character varying | 100 | YES |
| state | character varying | 50 | YES |
| updated_at | timestamp without time zone | - | NO |
| website | character varying | 255 | YES |
| zip_code | character varying | 20 | YES |

### technical_indicators

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | NO |
| created_at | timestamp without time zone | - | NO |
| data_interval | character varying | 10 | NO |
| indicator_data_id | bigint | - | NO |
| indicator_period | integer | - | YES |
| indicator_type | character varying | 50 | NO |
| timestamp_utc | timestamp without time zone | - | NO |
| updated_at | timestamp without time zone | - | NO |
| value | numeric | - | NO |
| value_2 | numeric | - | YES |
| value_3 | numeric | - | YES |

### treemap_live_view

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | YES |
| asset_type | character varying | 100 | YES |
| current_price | numeric | - | YES |
| daily_data_updated_at | timestamp without time zone | - | YES |
| logo_url | character varying | - | YES |
| market_cap | numeric | - | YES |
| market_status | text | - | YES |
| name | character varying | 255 | YES |
| price_change_percentage_24h | numeric | - | YES |
| realtime_updated_at | timestamp without time zone | - | YES |
| ticker | character varying | 50 | YES |
| volume | bigint | - | YES |

### v_financials_unified

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | YES |
| balance_json | jsonb | - | YES |
| cash_flow_json | jsonb | - | YES |
| income_json | jsonb | - | YES |
| ratios_json | jsonb | - | YES |
| stock_financials_data | jsonb | - | YES |
| ticker | character varying | 50 | YES |

### world_assets_ranking

| 컬럼명 | 데이터 타입 | 최대 길이 | NULL 허용 |
|--------|------------|----------|----------|
| asset_id | integer | - | YES |
| asset_type_id | integer | - | YES |
| country | character varying | 100 | YES |
| daily_change_percent | numeric | - | YES |
| data_source | character varying | 100 | YES |
| id | integer | - | NO |
| last_updated | timestamp without time zone | - | YES |
| market_cap_usd | numeric | - | YES |
| name | character varying | 255 | NO |
| price_usd | numeric | - | YES |
| rank | integer | - | NO |
| ranking_date | date | - | NO |
| ticker | character varying | 50 | YES |