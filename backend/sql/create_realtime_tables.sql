-- 실시간 가격 및 시장 데이터 저장 테이블
CREATE TABLE IF NOT EXISTS realtime_quotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL COMMENT '자산 티커',
    asset_type VARCHAR(20) NOT NULL COMMENT '자산 유형 (stock, crypto, etf)',
    
    -- 가격 데이터
    price FLOAT NULL COMMENT '현재 가격',
    change_percent_today FLOAT NULL COMMENT '오늘 변화율 (%)',
    change_amount_today FLOAT NULL COMMENT '오늘 변화액',
    
    -- 시장 데이터
    market_cap FLOAT NULL COMMENT '시가총액',
    volume_today FLOAT NULL COMMENT '오늘 거래량',
    volume_24h FLOAT NULL COMMENT '24시간 거래량',
    
    -- 52주 데이터
    high_52w FLOAT NULL COMMENT '52주 최고가',
    low_52w FLOAT NULL COMMENT '52주 최저가',
    change_52w_percent FLOAT NULL COMMENT '52주 변화율 (%)',
    
    -- 추가 데이터
    pe_ratio FLOAT NULL COMMENT 'P/E 비율',
    pb_ratio FLOAT NULL COMMENT 'P/B 비율',
    dividend_yield FLOAT NULL COMMENT '배당 수익률',
    
    -- 메타데이터
    data_source VARCHAR(50) NOT NULL COMMENT '데이터 소스 (twelvedata, binance, coingecko, yahoo)',
    currency VARCHAR(10) DEFAULT 'USD' COMMENT '통화',
    exchange VARCHAR(50) NULL COMMENT '거래소',
    
    -- 타임스탬프
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '데이터 수집 시간',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시간',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 시간',
    
    -- 인덱스
    INDEX idx_ticker_asset_type (ticker, asset_type),
    INDEX idx_fetched_at (fetched_at),
    INDEX idx_data_source (data_source),
    UNIQUE KEY uq_ticker_asset_type (ticker, asset_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='실시간 가격 및 시장 데이터';

-- 스파크라인 차트용 30일 가격 데이터 저장 테이블
CREATE TABLE IF NOT EXISTS sparkline_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL COMMENT '자산 티커',
    asset_type VARCHAR(20) NOT NULL COMMENT '자산 유형',
    
    -- 30일 가격 데이터 (JSON 형태로 저장)
    price_data TEXT NOT NULL COMMENT '30일 가격 데이터 (JSON 배열)',
    
    -- 메타데이터
    data_source VARCHAR(50) NOT NULL COMMENT '데이터 소스',
    currency VARCHAR(10) DEFAULT 'USD' COMMENT '통화',
    
    -- 타임스탬프
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '데이터 수집 시간',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시간',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 시간',
    
    -- 인덱스
    INDEX idx_ticker_asset_type_sparkline (ticker, asset_type),
    INDEX idx_fetched_at_sparkline (fetched_at),
    UNIQUE KEY uq_ticker_asset_type_sparkline (ticker, asset_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='스파크라인 차트용 30일 가격 데이터';

-- 최소 스키마 실시간 가격 테이블 (신규)
CREATE TABLE IF NOT EXISTS realtime_quotes_rt (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NOT NULL,
    timestamp_utc DATETIME(6) NOT NULL,
    price DECIMAL(18,8) NOT NULL,
    volume DECIMAL(18,8) NULL,
    change DECIMAL(18,8) NULL,
    change_percent DECIMAL(9,4) NULL,
    data_source VARCHAR(32) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX ix_rt_asset_time (asset_id, timestamp_utc DESC),
    INDEX ix_rt_source_time (data_source, timestamp_utc),
    CONSTRAINT fk_rt_asset FOREIGN KEY (asset_id) REFERENCES assets(asset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Minimal real-time quotes';







