-- indice_infos 테이블은 지수의 기본 정보(이름, 거래소 등)와 함께 일일 시세 스냅샷을 저장하는 형태로 설계
--API : https://financialmodelingprep.com/stable/quote?symbol=^GSPC
CREATE TABLE
    `index_infos` (
        `index_info_id` INT NOT NULL AUTO_INCREMENT,
        `asset_id` INT NOT NULL COMMENT 'assets 테이블의 FK',
        `snapshot_date` DATE NOT NULL COMMENT '데이터 스냅샷 날짜',
        `price` DECIMAL(20, 4) NULL,
        `change_percentage` DECIMAL(10, 4) NULL,
        `volume` BIGINT NULL,
        `day_low` DECIMAL(20, 4) NULL,
        `day_high` DECIMAL(20, 4) NULL,
        `year_low` DECIMAL(20, 4) NULL,
        `year_high` DECIMAL(20, 4) NULL,
        `price_avg_50` DECIMAL(20, 4) NULL,
        `price_avg_200` DECIMAL(20, 4) NULL,
        PRIMARY KEY (`index_info_id`),
        UNIQUE KEY `asset_id_snapshot_date` (`asset_id`, `snapshot_date`),
        FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE CASCADE
    );

-- 하나의 API에만 의존하지 않는 것입니다. 각 데이터 필드마다 주(Primary) 데이터 소스와 보조(Fallback) 데이터 소스를 정하고, 계층적으로 데이터를 수집하여 하나의 통일된 데이터 모델을 완성하는 방식
-- 1. stock_profiles: 거의 변하지 않는 기업 개요 정보
CREATE TABLE
    `stock_profiles` (
        `profile_id` INT NOT NULL AUTO_INCREMENT,
        `asset_id` INT NOT NULL UNIQUE,
        `company_name` VARCHAR(255) NOT NULL,
        `description` TEXT,
        `sector` VARCHAR(100),
        `industry` VARCHAR(100),
        `country` VARCHAR(50),
        `city` VARCHAR(100),
        `address` VARCHAR(255),
        `phone` VARCHAR(50),
        `website` VARCHAR(255),
        `ceo` VARCHAR(100),
        `employees_count` INT,
        `ipo_date` DATE,
        `logo_image_url` VARCHAR(255),
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`profile_id`),
        FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE CASCADE
    ) ENGINE = InnoDB COMMENT = '기업의 정적 프로필 정보';

-- 2. stock_financials: 주기적으로 업데이트되는 재무/시세 데이터
CREATE TABLE
    `stock_financials` (
        `financial_id` INT NOT NULL AUTO_INCREMENT,
        `asset_id` INT NOT NULL,
        `snapshot_date` DATE NOT NULL COMMENT '데이터 기준일',
        `currency` VARCHAR(10),
        `market_cap` BIGINT,
        `ebitda` BIGINT,
        `shares_outstanding` BIGINT,
        `pe_ratio` DECIMAL(10, 4),
        `peg_ratio` DECIMAL(10, 4),
        `beta` DECIMAL(10, 4),
        `eps` DECIMAL(10, 4),
        `dividend_yield` DECIMAL(10, 4),
        `dividend_per_share` DECIMAL(10, 4),
        `profit_margin_ttm` DECIMAL(10, 4),
        `return_on_equity_ttm` DECIMAL(10, 4),
        `revenue_ttm` BIGINT,
        `price_to_book_ratio` DECIMAL(10, 4),
        `_52_week_high` DECIMAL(18, 4),
        `_52_week_low` DECIMAL(18, 4),
        `_50_day_moving_avg` DECIMAL(18, 4),
        `_200_day_moving_avg` DECIMAL(18, 4),
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`financial_id`),
        UNIQUE KEY `asset_id_snapshot_date` (`asset_id`, `snapshot_date`),
        FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE CASCADE
    ) ENGINE = InnoDB COMMENT = '기업의 재무 및 주요 시세 지표';

-- 3. stock_analyst_estimates: 분석가 추정치 데이터
CREATE TABLE
    `stock_analyst_estimates` (
        `estimate_id` INT NOT NULL AUTO_INCREMENT,
        `asset_id` INT NOT NULL,
        `fiscal_date` DATE NOT NULL COMMENT '추정치 대상 회계일',
        `revenue_avg` BIGINT,
        `revenue_low` BIGINT,
        `revenue_high` BIGINT,
        `revenue_analysts_count` INT,
        `eps_avg` DECIMAL(10, 4),
        `eps_low` DECIMAL(10, 4),
        `eps_high` DECIMAL(10, 4),
        `eps_analysts_count` INT,
        `ebitda_avg` BIGINT,
        `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`estimate_id`),
        UNIQUE KEY `asset_id_fiscal_date` (`asset_id`, `fiscal_date`),
        FOREIGN KEY (`asset_id`) REFERENCES `assets` (`asset_id`) ON DELETE CASCADE
    ) ENGINE = InnoDB COMMENT = '분석가들의 기업 실적 추정치';