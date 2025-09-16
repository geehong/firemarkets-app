-- PostgreSQL CREATE TABLE statements
-- Generated from MySQL dump

CREATE TABLE "api_call_logs" (
"log_id" bigint NOT NULL,
"api_name" VARCHAR(50) NOT NULL,
"endpoint" VARCHAR(255) NOT NULL,
"asset_ticker" VARCHAR(20) DEFAULT NULL,
"status_code" int DEFAULT NULL,
"response_time_ms" int DEFAULT NULL,
"success" BOOLEAN DEFAULT FALSE,
"error_message" TEXT,
"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "app_configurations" (
"config_id" int NOT NULL,
"config_key" VARCHAR(100) NOT NULL,
"config_value" TEXT,
"data_type" VARCHAR(20) DEFAULT 'string',
"description" TEXT,
"is_sensitive" BOOLEAN DEFAULT FALSE,
"is_active" BOOLEAN DEFAULT TRUE,
"category" VARCHAR(50) DEFAULT 'general',
"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "apscheduler_jobs" (
"id" varchar(191) NOT NULL,
"next_run_time" double precision precision DEFAULT NULL,
"job_state" bytea NOT NULL
);

CREATE TABLE "audit_logs" (
"id" bigint NOT NULL,
"user_id" int DEFAULT NULL,
"actor_id" int DEFAULT NULL,
"event_type" varchar(100) NOT NULL,
"event_data" json DEFAULT NULL,
"ip_address" varchar(45) DEFAULT NULL,
"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "bond_market_data" (
"id" int NOT NULL,
"name" VARCHAR(50) DEFAULT NULL,
"asset_type_id" int DEFAULT '6',
"market_size_usd" decimal(20,2) DEFAULT NULL,
"quarter" VARCHAR(10) DEFAULT NULL,
"data_source" VARCHAR(100) DEFAULT 'BIS',
"collection_date" date NOT NULL DEFAULT (CURRENT_DATE),
"last_updated" timestamp NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "crypto_data" (
"id" int NOT NULL,
"asset_id" int NOT NULL,
"symbol" VARCHAR(20) NOT NULL,
"name" VARCHAR(100) NOT NULL,
"market_cap" decimal(30,2) DEFAULT NULL,
"circulating_supply" decimal(30,10) DEFAULT NULL,
"total_supply" decimal(30,10) DEFAULT NULL,
"max_supply" decimal(30,10) DEFAULT NULL,
"current_price" decimal(24,10) DEFAULT NULL,
"volume_24h" decimal(30,10) DEFAULT NULL,
"percent_change_1h" decimal(10,4) DEFAULT NULL,
"percent_change_24h" decimal(10,4) DEFAULT NULL,
"percent_change_7d" decimal(10,4) DEFAULT NULL,
"percent_change_30d" decimal(10,4) DEFAULT NULL,
"cmc_rank" int DEFAULT NULL,
"category" VARCHAR(50) DEFAULT NULL,
"description" TEXT,
"logo_url" VARCHAR(500) DEFAULT NULL,
"website_url" VARCHAR(500) DEFAULT NULL,
"price" decimal(24,10) DEFAULT NULL,
"slug" VARCHAR(100) DEFAULT NULL,
"date_added" date DEFAULT NULL,
"platform" TEXT,
"explorer" json DEFAULT NULL,
"source_code" json DEFAULT NULL,
"tags" json DEFAULT NULL,
"is_active" BOOLEAN DEFAULT TRUE,
"last_updated" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "crypto_metrics" (
"metric_id" bigint NOT NULL,
"asset_id" int NOT NULL,
"timestamp_utc" date NOT NULL,
"mvrv_z_score" decimal(18,10) DEFAULT NULL,
"realized_price" decimal(24,10) DEFAULT NULL,
"hashrate" decimal(30,10) DEFAULT NULL,
"difficulty" decimal(30,10) DEFAULT NULL,
"miner_reserves" decimal(24,10) DEFAULT NULL,
"etf_btc_total" decimal(24,10) DEFAULT NULL,
"sopr" decimal(18,10) DEFAULT NULL,
"nupl" decimal(18,10) DEFAULT NULL,
"open_interest_futures" json DEFAULT NULL,
"realized_cap" decimal(30,2) DEFAULT NULL,
"cdd_90dma" decimal(18,10) DEFAULT NULL,
"true_market_mean" decimal(24,10) DEFAULT NULL,
"nrpl_btc" decimal(24,10) DEFAULT NULL,
"aviv" decimal(18,10) DEFAULT NULL,
"thermo_cap" decimal(30,2) DEFAULT NULL,
"hodl_waves_supply" decimal(18,10) DEFAULT NULL,
"etf_btc_flow" decimal(24,10) DEFAULT NULL,
"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
"hodl_age_0d_1d" decimal(18,10) DEFAULT NULL,
"hodl_age_1d_1w" decimal(18,10) DEFAULT NULL,
"hodl_age_1w_1m" decimal(18,10) DEFAULT NULL,
"hodl_age_1m_3m" decimal(18,10) DEFAULT NULL,
"hodl_age_3m_6m" decimal(18,10) DEFAULT NULL,
"hodl_age_6m_1y" decimal(18,10) DEFAULT NULL,
"hodl_age_1y_2y" decimal(18,10) DEFAULT NULL,
"hodl_age_2y_3y" decimal(18,10) DEFAULT NULL,
"hodl_age_3y_4y" decimal(18,10) DEFAULT NULL,
"hodl_age_4y_5y" decimal(18,10) DEFAULT NULL,
"hodl_age_5y_7y" decimal(18,10) DEFAULT NULL,
"hodl_age_7y_10y" decimal(18,10) DEFAULT NULL,
"hodl_age_10y" decimal(18,10) DEFAULT NULL
);

CREATE TABLE "economic_indicators" (
"indicator_id" int NOT NULL,
"indicator_name" VARCHAR(100) NOT NULL,
"indicator_code" VARCHAR(50) NOT NULL,
"timestamp" date NOT NULL,
"value" decimal(20,10) NOT NULL,
"unit" VARCHAR(20) DEFAULT NULL,
"description" TEXT,
"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "etf_info" (
"etf_info_id" int NOT NULL,
"asset_id" int NOT NULL,
"snapshot_date" date NOT NULL,
"net_assets" decimal(22,0) DEFAULT NULL,
"net_expense_ratio" decimal(10,4) DEFAULT NULL,
"portfolio_turnover" decimal(10,4) DEFAULT NULL,
"dividend_yield" decimal(10,4) DEFAULT NULL,
"inception_date" date DEFAULT NULL,
"leveraged" BOOLEAN DEFAULT NULL,
"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
"sectors" json DEFAULT NULL,
"holdings" json DEFAULT NULL
);

CREATE TABLE "index_infos" (
"index_info_id" int NOT NULL,
"asset_id" int NOT NULL,
"snapshot_date" date NOT NULL,
"price" decimal(20,4) DEFAULT NULL,
"change_percentage" decimal(10,4) DEFAULT NULL,
"volume" bigint DEFAULT NULL,
"day_low" decimal(20,4) DEFAULT NULL,
"day_high" decimal(20,4) DEFAULT NULL,
"year_low" decimal(20,4) DEFAULT NULL,
"year_high" decimal(20,4) DEFAULT NULL,
"price_avg_50" decimal(20,4) DEFAULT NULL,
"price_avg_200" decimal(20,4) DEFAULT NULL
);

CREATE TABLE "m2_data" (
"m2_data_id" bigint NOT NULL,
"timestamp_utc" date NOT NULL,
"m2_supply" decimal(30,2) DEFAULT NULL,
"m2_growth_yoy" decimal(14,6) DEFAULT NULL,
"source" VARCHAR(100) DEFAULT NULL,
"notes" VARCHAR(255) DEFAULT NULL,
"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "onchain_metrics_info" (
"metric_id" varchar(50) NOT NULL,
"name" varchar(100) NOT NULL,
"description" text,
"category" varchar(50) NOT NULL,
"interpretations" json DEFAULT NULL,
"chart_title" varchar(200) DEFAULT NULL,
"loading_text" varchar(100) DEFAULT NULL,
"status" varchar(20) NOT NULL DEFAULT 'active',
"data_count" int DEFAULT '0',
"current_range" varchar(100) DEFAULT NULL,
"last_update" TIMESTAMP DEFAULT NULL,
"is_enabled" BOOLEAN NOT NULL DEFAULT '1',
"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "realtime_quotes" (
"id" int NOT NULL,
"asset_id" int NOT NULL,
"timestamp_utc" TIMESTAMP(6) NOT NULL,
"price" decimal(18,8) NOT NULL,
"volume" decimal(18,8) DEFAULT NULL,
"change_amount" decimal(18,8) DEFAULT NULL,
"change_percent" decimal(9,4) DEFAULT NULL,
"data_source" varchar(32) NOT NULL,
"updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "realtime_quotes_time_delay" (
"id" int NOT NULL,
"asset_id" int NOT NULL,
"timestamp_utc" TIMESTAMP(6) NOT NULL,
"price" decimal(18,8) NOT NULL,
"volume" decimal(18,8) DEFAULT NULL,
"change_amount" decimal(18,8) DEFAULT NULL,
"change_percent" decimal(9,4) DEFAULT NULL,
"data_source" varchar(32) NOT NULL,
"data_interval" varchar(10) NOT NULL DEFAULT '15m',
"updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "scheduler_logs" (
"log_id" bigint NOT NULL,
"job_name" VARCHAR(100) NOT NULL,
"start_time" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
"end_time" timestamp NULL DEFAULT NULL,
"duration_seconds" int DEFAULT NULL,
"status" VARCHAR(50) NOT NULL DEFAULT 'pending',
"current_task" VARCHAR(255) DEFAULT NULL,
"strategy_used" VARCHAR(100) DEFAULT NULL,
"checkpoint_data" json DEFAULT NULL,
"retry_count" int DEFAULT '0',
"assets_processed" int DEFAULT '0',
"data_points_added" int DEFAULT '0',
"error_message" TEXT,
"details" json DEFAULT NULL,
"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "scraping_logs" (
"id" int NOT NULL,
"source" VARCHAR(100) NOT NULL,
"status" VARCHAR(20) NOT NULL,
"records_processed" int DEFAULT '0',
"records_successful" int DEFAULT '0',
"error_message" TEXT,
"execution_time_seconds" decimal(10,2) DEFAULT NULL,
"started_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
"completed_at" timestamp NULL DEFAULT NULL
);

CREATE TABLE "sparkline_data" (
"id" int NOT NULL,
"ticker" varchar(20) NOT NULL,
"asset_type" varchar(20) NOT NULL,
"price_data" text NOT NULL,
"data_source" varchar(50) NOT NULL,
"currency" varchar(10) DEFAULT 'USD',
"fetched_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
"created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "stock_analyst_estimates" (
"estimate_id" int NOT NULL,
"asset_id" int NOT NULL,
"fiscal_date" date NOT NULL,
"revenue_avg" bigint DEFAULT NULL,
"revenue_low" bigint DEFAULT NULL,
"revenue_high" bigint DEFAULT NULL,
"revenue_analysts_count" int DEFAULT NULL,
"eps_avg" decimal(10,4) DEFAULT NULL,
"eps_low" decimal(10,4) DEFAULT NULL,
"eps_high" decimal(10,4) DEFAULT NULL,
"eps_analysts_count" int DEFAULT NULL,
"ebitda_avg" bigint DEFAULT NULL,
"updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
"ebitda_low" bigint DEFAULT NULL,
"ebitda_high" bigint DEFAULT NULL,
"ebit_avg" bigint DEFAULT NULL,
"ebit_low" bigint DEFAULT NULL,
"ebit_high" bigint DEFAULT NULL,
"net_income_avg" bigint DEFAULT NULL,
"net_income_low" bigint DEFAULT NULL,
"net_income_high" bigint DEFAULT NULL,
"sga_expense_avg" bigint DEFAULT NULL,
"sga_expense_low" bigint DEFAULT NULL,
"sga_expense_high" bigint DEFAULT NULL
);

CREATE TABLE "stock_financials" (
"financial_id" int NOT NULL,
"asset_id" int NOT NULL,
"snapshot_date" date NOT NULL,
"currency" varchar(10) DEFAULT NULL,
"market_cap" bigint DEFAULT NULL,
"ebitda" bigint DEFAULT NULL,
"shares_outstanding" bigint DEFAULT NULL,
"pe_ratio" decimal(10,4) DEFAULT NULL,
"peg_ratio" decimal(10,4) DEFAULT NULL,
"beta" decimal(10,4) DEFAULT NULL,
"eps" decimal(10,4) DEFAULT NULL,
"dividend_yield" decimal(10,4) DEFAULT NULL,
"dividend_per_share" decimal(10,4) DEFAULT NULL,
"profit_margin_ttm" decimal(10,4) DEFAULT NULL,
"return_on_equity_ttm" decimal(10,4) DEFAULT NULL,
"revenue_ttm" bigint DEFAULT NULL,
"price_to_book_ratio" decimal(10,4) DEFAULT NULL,
"week_52_high" decimal(18,4) DEFAULT NULL,
"week_52_low" decimal(18,4) DEFAULT NULL,
"day_50_moving_avg" decimal(18,4) DEFAULT NULL,
"day_200_moving_avg" decimal(18,4) DEFAULT NULL,
"updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
"book_value" decimal(20,4) DEFAULT NULL,
"revenue_per_share_ttm" decimal(20,4) DEFAULT NULL,
"operating_margin_ttm" decimal(10,6) DEFAULT NULL,
"return_on_assets_ttm" decimal(10,6) DEFAULT NULL,
"gross_profit_ttm" bigint DEFAULT NULL,
"quarterly_earnings_growth_yoy" decimal(10,6) DEFAULT NULL,
"quarterly_revenue_growth_yoy" decimal(10,6) DEFAULT NULL,
"analyst_target_price" decimal(20,4) DEFAULT NULL,
"trailing_pe" decimal(20,4) DEFAULT NULL,
"forward_pe" decimal(20,4) DEFAULT NULL,
"price_to_sales_ratio_ttm" decimal(20,4) DEFAULT NULL,
"ev_to_revenue" decimal(20,4) DEFAULT NULL,
"ev_to_ebitda" decimal(20,4) DEFAULT NULL
);

CREATE TABLE "stock_profiles" (
"profile_id" int NOT NULL,
"asset_id" int NOT NULL,
"company_name" varchar(255) NOT NULL,
"description" text,
"sector" varchar(100) DEFAULT NULL,
"industry" varchar(100) DEFAULT NULL,
"country" varchar(50) DEFAULT NULL,
"city" varchar(100) DEFAULT NULL,
"address" varchar(255) DEFAULT NULL,
"phone" varchar(50) DEFAULT NULL,
"website" varchar(255) DEFAULT NULL,
"ceo" varchar(100) DEFAULT NULL,
"employees_count" int DEFAULT NULL,
"ipo_date" date DEFAULT NULL,
"logo_image_url" varchar(255) DEFAULT NULL,
"updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
"state" varchar(50) DEFAULT NULL,
"zip_code" varchar(20) DEFAULT NULL,
"exchange" varchar(50) DEFAULT NULL,
"exchange_full_name" varchar(100) DEFAULT NULL,
"cik" varchar(20) DEFAULT NULL,
"isin" varchar(20) DEFAULT NULL,
"cusip" varchar(20) DEFAULT NULL
);

CREATE TABLE "technical_indicators" (
"indicator_data_id" bigint NOT NULL,
"asset_id" int NOT NULL,
"data_interval" VARCHAR(10) NOT NULL DEFAULT '1d',
"indicator_type" VARCHAR(50) NOT NULL,
"indicator_period" int DEFAULT NULL,
"timestamp_utc" TIMESTAMP NOT NULL,
"value" decimal(24,10) NOT NULL,
"value_2" decimal(24,10) DEFAULT NULL,
"value_3" decimal(24,10) DEFAULT NULL,
"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "token_blacklist" (
"id" bigint NOT NULL,
"token_hash" varchar(255) NOT NULL,
"user_id" int DEFAULT NULL,
"expires_at" timestamp NOT NULL,
"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "users" (
"id" int NOT NULL,
"username" varchar(50) NOT NULL,
"email" varchar(255) NOT NULL,
"password_hash" varchar(255) NOT NULL,
"role" varchar(30) NOT NULL DEFAULT 'user',
"permissions" json NOT NULL,
"is_active" BOOLEAN NOT NULL DEFAULT '1',
"full_name" varchar(100) DEFAULT NULL,
"phone_number" varchar(20) DEFAULT NULL,
"address" text,
"avatar_url" varchar(255) DEFAULT NULL,
"login_attempts" int NOT NULL DEFAULT '0',
"locked_until" timestamp NULL DEFAULT NULL,
"last_login" timestamp NULL DEFAULT NULL,
"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
"deleted_at" timestamp NULL DEFAULT NULL
);

CREATE TABLE "user_sessions" (
"id" bigint NOT NULL,
"user_id" int NOT NULL,
"session_id" char(36) NOT NULL,
"refresh_token_hash" varchar(255) NOT NULL,
"ip_address" varchar(45) DEFAULT NULL,
"user_agent" text,
"issued_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
"expires_at" timestamp NOT NULL,
"last_used_at" timestamp NULL DEFAULT NULL,
"is_revoked" BOOLEAN NOT NULL DEFAULT '0'
);

CREATE TABLE "websocket_orchestrator_logs" (
"id" bigint NOT NULL,
"timestamp_utc" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
"log_level" enum('DEBUG','INFO','WARNING','ERROR','CRITICAL') NOT NULL,
"consumer_name" varchar(50) DEFAULT NULL,
"event_type" varchar(100) NOT NULL,
"message" text NOT NULL,
"ticker_count" int DEFAULT NULL,
"consumer_count" int DEFAULT NULL,
"error_type" varchar(100) DEFAULT NULL,
"metadata" json DEFAULT NULL,
"created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "world_assets_ranking" (
"id" int NOT NULL,
"rank" int NOT NULL,
"name" VARCHAR(255) NOT NULL,
"ticker" VARCHAR(50) DEFAULT NULL,
"market_cap_usd" decimal(20,2) DEFAULT NULL,
"price_usd" decimal(10,2) DEFAULT NULL,
"daily_change_percent" decimal(5,2) DEFAULT NULL,
"asset_type_id" int DEFAULT NULL,
"asset_id" int DEFAULT NULL,
"country" VARCHAR(100) DEFAULT NULL,
"ranking_date" date NOT NULL DEFAULT (CURRENT_DATE),
"data_source" VARCHAR(100) DEFAULT NULL,
"last_updated" timestamp NULL DEFAULT CURRENT_TIMESTAMP
);

