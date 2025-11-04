# backend_temp/app/models/asset.py
from sqlalchemy import (BIGINT, BigInteger, DECIMAL, TIMESTAMP, Boolean, Column, Date,
                        DateTime, ForeignKey, Integer, String, Text, func, JSON, Float, UniqueConstraint, Index)
from sqlalchemy.orm import relationship

from ..core.database import Base


class AssetType(Base):
    __tablename__ = "asset_types"
    __table_args__ = {'extend_existing': True}
    asset_type_id = Column(Integer, primary_key=True, index=True)
    type_name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    assets = relationship("Asset", back_populates="asset_type")


class Asset(Base):
    __tablename__ = "assets"
    __table_args__ = {'extend_existing': True}
    asset_id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(50), unique=True, nullable=False, index=True)
    asset_type_id = Column(
        Integer, ForeignKey("asset_types.asset_type_id"), nullable=False
    )
    name = Column(String(255), nullable=False)
    exchange = Column(String(100))
    currency = Column(String(10))
    is_active = Column(Boolean, default=True)
    description = Column(Text)
    collection_settings = Column(JSON)  # 수집 설정
    last_collections = Column(JSON)     # 마지막 수집 시간
    data_source = Column(String(50), default="fmp")
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    asset_type = relationship("AssetType", back_populates="assets")
    
    # 포스트 관계 추가
    posts = relationship("Post", back_populates="asset")
    
    # Financial data relationships
    financial_statements = relationship("FinancialStatement", back_populates="asset")
    financial_metrics = relationship("FinancialMetrics", back_populates="asset")
    company_financials = relationship("CompanyFinancials", back_populates="asset")

    # JSON 설정에 대한 편의 메서드들
    def get_setting(self, key: str, default=None):
        """JSON 설정에서 값을 가져옵니다."""
        if not self.collection_settings:
            return default
        return self.collection_settings.get(key, default)
    
    def set_setting(self, key: str, value):
        """JSON 설정에 값을 설정합니다."""
        if not self.collection_settings:
            self.collection_settings = {}
        self.collection_settings[key] = value
    
    def get_last_collection(self, collection_type: str):
        """마지막 수집 시간을 가져옵니다."""
        if not self.last_collections:
            return None
        return self.last_collections.get(collection_type)
    
    def set_last_collection(self, collection_type: str, timestamp):
        """마지막 수집 시간을 설정합니다."""
        if not self.last_collections:
            self.last_collections = {}
        # datetime 객체를 ISO 문자열로 변환하여 JSON 직렬화 가능하게 함
        if hasattr(timestamp, 'isoformat'):
            self.last_collections[collection_type] = timestamp.isoformat()
        else:
            self.last_collections[collection_type] = timestamp
    
    def get_latest_blog(self):
        """가장 최근 블로그 포스트 반환"""
        if self.blogs:
            return max(self.blogs, key=lambda x: x.updated_at)
        return None
    
    def sync_description_with_blog(self, db_session):
        """가장 최근 블로그의 content를 description으로 동기화"""
        latest_blog = self.get_latest_blog()
        if latest_blog and latest_blog.auto_sync_content:
            self.description = latest_blog.content
            return True
        return False
    
    # 편의 메서드들
    def get_collect_price(self):
        return self.get_setting('collect_price', True)
    
    def get_collect_assets_info(self):
        return self.get_setting('collect_assets_info', True)
    
    def get_collect_financials(self):
        return self.get_setting('collect_financials', True)
    
    def get_collect_estimates(self):
        return self.get_setting('collect_estimates', True)
    
    def get_collect_onchain(self):
        return self.get_setting('collect_onchain', False)
    
    def get_collect_technical_indicators(self):
        return self.get_setting('collect_technical_indicators', False)
    



class OHLCVData(Base):
    __tablename__ = "ohlcv_day_data"
    ohlcv_id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(
        Integer,
        ForeignKey("assets.asset_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    timestamp_utc = Column(DateTime, nullable=False, index=True)
    data_interval = Column(String(10))
    open_price = Column(DECIMAL(24, 10), nullable=False)
    high_price = Column(DECIMAL(24, 10), nullable=False)
    low_price = Column(DECIMAL(24, 10), nullable=False)
    close_price = Column(DECIMAL(24, 10), nullable=False)
    volume = Column(DECIMAL(30, 10), nullable=False)
    change_percent = Column(DECIMAL(10, 4))  # 일일 변동률
    created_at = Column(TIMESTAMP, server_default=func.now())


class OHLCVIntradayData(Base):
    __tablename__ = "ohlcv_intraday_data"
    ohlcv_id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(
        Integer,
        ForeignKey("assets.asset_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    timestamp_utc = Column(DateTime, nullable=False, index=True)
    data_interval = Column(String(10))
    open_price = Column(DECIMAL(24, 10), nullable=False)
    high_price = Column(DECIMAL(24, 10), nullable=False)
    low_price = Column(DECIMAL(24, 10), nullable=False)
    close_price = Column(DECIMAL(24, 10), nullable=False)
    volume = Column(DECIMAL(30, 10), nullable=False)
    change_percent = Column(DECIMAL(10, 4))  # 변동률
    created_at = Column(TIMESTAMP, server_default=func.now())


class StockProfile(Base):
    __tablename__ = "stock_profiles"
    profile_id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(
        Integer, ForeignKey("assets.asset_id"), nullable=False, unique=True
    )
    company_name = Column(String(255), nullable=False)
    # Preferred fields: bilingual descriptions
    description_en = Column(Text)
    description_ko = Column(Text)
    sector = Column(String(100))
    industry = Column(String(100))
    country = Column(String(50))
    city = Column(String(100))
    state = Column(String(50))  # 주/도 (CA, NY 등)
    zip_code = Column(String(20))  # 우편번호
    address = Column(String(255))
    phone = Column(String(50))
    website = Column(String(255))
    ceo = Column(String(100))
    employees_count = Column(Integer)
    market_cap = Column(BigInteger)  # 시가총액 (USD)
    ipo_date = Column(Date)
    logo_image_url = Column(String(255))
    # 거래소 및 식별자 정보
    exchange = Column(String(50))  # 거래소 코드 (NASDAQ, NYSE 등)
    exchange_full_name = Column(String(100))  # 거래소 전체명
    cik = Column(String(20))  # CIK 코드
    isin = Column(String(20))  # ISIN 코드
    cusip = Column(String(20))  # CUSIP 코드
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class StockFinancial(Base):
    __tablename__ = "stock_financials"
    financial_id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.asset_id"), nullable=False)
    snapshot_date = Column(Date, nullable=False)
    currency = Column(String(10))
    market_cap = Column(BIGINT)
    ebitda = Column(BIGINT)
    shares_outstanding = Column(BIGINT)
    pe_ratio = Column(DECIMAL(10, 4))
    peg_ratio = Column(DECIMAL(10, 4))
    beta = Column(DECIMAL(10, 4))
    eps = Column(DECIMAL(10, 4))
    dividend_yield = Column(DECIMAL(10, 4))
    dividend_per_share = Column(DECIMAL(10, 4))
    profit_margin_ttm = Column(DECIMAL(10, 4))
    return_on_equity_ttm = Column(DECIMAL(10, 4))
    revenue_ttm = Column(BIGINT)
    price_to_book_ratio = Column(DECIMAL(10, 4))
    week_52_high = Column(DECIMAL(18, 4))
    week_52_low = Column(DECIMAL(18, 4))
    day_50_moving_avg = Column(DECIMAL(18, 4))
    day_200_moving_avg = Column(DECIMAL(18, 4))
    # 추가 재무 지표
    book_value = Column(DECIMAL(20, 4))  # 장부가치
    revenue_per_share_ttm = Column(DECIMAL(20, 4))  # 주당 매출
    operating_margin_ttm = Column(DECIMAL(10, 6))  # 영업 마진
    return_on_assets_ttm = Column(DECIMAL(10, 6))  # 자산 수익률
    gross_profit_ttm = Column(BIGINT)  # 총 이익
    quarterly_earnings_growth_yoy = Column(DECIMAL(10, 6))  # 분기 수익 성장률
    quarterly_revenue_growth_yoy = Column(DECIMAL(10, 6))  # 분기 매출 성장률
    analyst_target_price = Column(DECIMAL(20, 4))  # 애널리스트 목표가
    trailing_pe = Column(DECIMAL(20, 4))  # 후행 PER
    forward_pe = Column(DECIMAL(20, 4))  # 선행 PER
    price_to_sales_ratio_ttm = Column(DECIMAL(20, 4))  # 주가매출비율
    ev_to_revenue = Column(DECIMAL(20, 4))  # 기업가치매출비율
    ev_to_ebitda = Column(DECIMAL(20, 4))  # 기업가치EBITDA비율
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class StockAnalystEstimate(Base):
    __tablename__ = "stock_analyst_estimates"
    estimate_id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.asset_id"), nullable=False)
    fiscal_date = Column(Date, nullable=False)
    revenue_avg = Column(BIGINT)
    revenue_low = Column(BIGINT)
    revenue_high = Column(BIGINT)
    revenue_analysts_count = Column(Integer)
    eps_avg = Column(DECIMAL(10, 4))
    eps_low = Column(DECIMAL(10, 4))
    eps_high = Column(DECIMAL(10, 4))
    eps_analysts_count = Column(Integer)
    ebitda_avg = Column(BIGINT)
    ebitda_low = Column(BIGINT)
    ebitda_high = Column(BIGINT)
    ebit_avg = Column(BIGINT)
    ebit_low = Column(BIGINT)
    ebit_high = Column(BIGINT)
    net_income_avg = Column(BIGINT)
    net_income_low = Column(BIGINT)
    net_income_high = Column(BIGINT)
    sga_expense_avg = Column(BIGINT)
    sga_expense_low = Column(BIGINT)
    sga_expense_high = Column(BIGINT)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


# ------------------------------
# Macrotrends normalized storage
# ------------------------------

class MacrotrendsFinancial(Base):
    __tablename__ = "macrotrends_financials"

    id = Column(BIGINT, primary_key=True, index=True, autoincrement=True)
    asset_id = Column(Integer, ForeignKey("assets.asset_id"), nullable=False)
    section = Column(String(32), nullable=False)  # 'income' | 'balance' | 'cash-flow' | 'ratios'
    field_name = Column(String(128), nullable=False)
    snapshot_date = Column(Date, nullable=False)
    value_numeric = Column(DECIMAL(24, 6))
    value_text = Column(String(256))
    unit = Column(String(32))
    currency = Column(String(10))
    source_url = Column(String(512))
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("asset_id", "section", "field_name", "snapshot_date", name="ux_macrotrends_financials_unique"),
        Index("ix_macrotrends_financials_asset_date", "asset_id", "snapshot_date"),
        Index("ix_macrotrends_financials_section_field", "section", "field_name"),
    )


class MacrotrendsField(Base):
    __tablename__ = "macrotrends_fields"

    field_key = Column(String(128), primary_key=True)
    alias = Column(String(128))
    section = Column(String(32))
    description = Column(String(512))


class ETFInfo(Base):
    __tablename__ = "etf_info"
    etf_info_id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(
        Integer,
        ForeignKey("assets.asset_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    snapshot_date = Column(Date, nullable=False, comment="Information reference date (stores the latest information)")
    net_assets = Column(DECIMAL(22, 0), comment="Net Assets")
    net_expense_ratio = Column(DECIMAL(10, 4), comment="Net Expense Ratio")
    portfolio_turnover = Column(DECIMAL(10, 4), comment="Portfolio Turnover Rate")
    dividend_yield = Column(DECIMAL(10, 4), comment="Dividend Yield")
    inception_date = Column(Date, comment="Inception Date")
    leveraged = Column(Boolean, comment="Leveraged status")
    sectors = Column(JSON, comment="ETF 섹터별 비중 정보")
    holdings = Column(JSON, comment="ETF 보유 종목 정보")
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class IndexInfo(Base):
    __tablename__ = "index_infos"
    index_info_id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.asset_id"), nullable=False)
    snapshot_date = Column(Date, nullable=False)
    price = Column(DECIMAL(20, 4))
    change_percentage = Column(DECIMAL(10, 4))
    volume = Column(BIGINT)
    day_low = Column(DECIMAL(20, 4))
    day_high = Column(DECIMAL(20, 4))
    year_low = Column(DECIMAL(20, 4))
    year_high = Column(DECIMAL(20, 4))
    price_avg_50 = Column(DECIMAL(20, 4))
    price_avg_200 = Column(DECIMAL(20, 4))
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class CryptoData(Base):
    __tablename__ = "crypto_data"
    
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.asset_id"), nullable=False, unique=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    
    # Market cap and supply data
    market_cap = Column(DECIMAL(30, 2), nullable=True)
    circulating_supply = Column(DECIMAL(30, 10), nullable=True)
    total_supply = Column(DECIMAL(30, 10), nullable=True)
    max_supply = Column(DECIMAL(30, 10), nullable=True)
    
    # Price and volume data
    current_price = Column(DECIMAL(24, 10), nullable=True)
    volume_24h = Column(DECIMAL(30, 10), nullable=True)
    
    # Price change percentages
    percent_change_1h = Column(DECIMAL(10, 4), nullable=True)
    percent_change_24h = Column(DECIMAL(10, 4), nullable=True)
    percent_change_7d = Column(DECIMAL(10, 4), nullable=True)
    percent_change_30d = Column(DECIMAL(10, 4), nullable=True)
    
    # Metadata
    cmc_rank = Column(Integer, nullable=True)
    category = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    website_url = Column(String(500), nullable=True)
    
    # Additional fields for CoinMarketCap API
    price = Column(DECIMAL(24, 10), nullable=True)  # Alternative price field
    slug = Column(String(100), nullable=True)
    date_added = Column(Date, nullable=True)
    platform = Column(Text, nullable=True)
    explorer = Column(JSON, nullable=True)  # JSON 형식으로 저장
    source_code = Column(JSON, nullable=True)  # JSON 형식으로 저장
    
    # Tags and status
    tags = Column(JSON, nullable=True)  # JSON 형식으로 저장
    is_active = Column(Boolean, default=True)
    last_updated = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    created_at = Column(TIMESTAMP, server_default=func.now())

    def __repr__(self):
        return f"<CryptoData(id={self.id}, symbol='{self.symbol}', name='{self.name}')>"


class RealtimeQuote(Base):
    """실시간 가격 최소 스키마 테이블"""
    __tablename__ = 'realtime_quotes'

    id = Column(Integer, primary_key=True, autoincrement=True)
    asset_id = Column(Integer, ForeignKey('assets.asset_id'), nullable=False, index=True)
    timestamp_utc = Column(DateTime, nullable=False, index=True)
    price = Column(DECIMAL(18, 8), nullable=False)
    volume = Column(DECIMAL(18, 8), nullable=True)
    change_amount = Column(DECIMAL(18, 8), nullable=True)
    change_percent = Column(DECIMAL(9, 4), nullable=True)
    data_source = Column(String(32), nullable=False)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class RealtimeQuoteTimeDelay(Base):
    """15분 지연 누적 데이터 테이블"""
    __tablename__ = 'realtime_quotes_time_delay'

    id = Column(Integer, primary_key=True, autoincrement=True)
    asset_id = Column(Integer, ForeignKey('assets.asset_id'), nullable=False, index=True)
    timestamp_utc = Column(DateTime, nullable=False, index=True)
    price = Column(DECIMAL(18, 8), nullable=False)
    volume = Column(DECIMAL(18, 8), nullable=True)
    change_amount = Column(DECIMAL(18, 8), nullable=True)
    change_percent = Column(DECIMAL(9, 4), nullable=True)
    data_source = Column(String(32), nullable=False)
    data_interval = Column(String(10), nullable=False, default='15m')
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Enforce uniqueness regardless of data source
    __table_args__ = (
        UniqueConstraint('asset_id', 'timestamp_utc', name='uq_realtime_delay_asset_ts'),
    )


class OnchainMetricsInfo(Base):
    __tablename__ = "onchain_metrics_info"
    
    metric_id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    category = Column(String(50), nullable=False)
    
    # 차트 표출 정보 (JSON 형태로 저장)
    interpretations = Column(JSON, nullable=True)
    chart_title = Column(String(200), nullable=True)
    loading_text = Column(String(100), nullable=True)
    
    # 상태 및 데이터 정보
    status = Column(String(20), nullable=False, default='active')
    data_count = Column(Integer, default=0)
    current_range = Column(String(100), nullable=True)
    last_update = Column(DateTime, nullable=True)
    is_enabled = Column(Boolean, default=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class WorldAssetsRanking(Base):
    __tablename__ = 'world_assets_ranking'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True)
    rank = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    ticker = Column(String(50))
    market_cap_usd = Column(DECIMAL(20, 2))
    price_usd = Column(DECIMAL(10, 2))
    daily_change_percent = Column(DECIMAL(5, 2))
    country = Column(String(100))
    asset_type_id = Column(Integer, ForeignKey('asset_types.asset_type_id'))
    asset_id = Column(Integer, ForeignKey('assets.asset_id'))
    ranking_date = Column(Date, nullable=False, default=func.current_date())
    data_source = Column(String(100))
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<WorldAssetsRanking(id={self.id}, name='{self.name}', rank={self.rank})>"


class BondMarketData(Base):
    __tablename__ = 'bond_market_data'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    asset_type_id = Column(Integer, ForeignKey('asset_types.asset_type_id'), default=6)
    market_size_usd = Column(DECIMAL(20, 2))
    quarter = Column(String(10))
    data_source = Column(String(100), default='BIS')
    collection_date = Column(Date, nullable=False, default=func.current_date())
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<BondMarketData(id={self.id}, name='{self.name}', market_size={self.market_size_usd})>"


class ScrapingLogs(Base):
    __tablename__ = 'scraping_logs'
    
    id = Column(Integer, primary_key=True)
    source = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False)  # 'success', 'failed', 'partial'
    records_processed = Column(Integer, default=0)
    records_successful = Column(Integer, default=0)
    error_message = Column(Text)
    execution_time_seconds = Column(DECIMAL(10, 2))
    started_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime)

    def __repr__(self):
        return f"<ScrapingLogs(id={self.id}, source='{self.source}', status='{self.status}')>"


class CryptoMetric(Base):
    __tablename__ = 'crypto_metrics'
    __table_args__ = {'extend_existing': True}
    
    metric_id = Column(BigInteger, primary_key=True)  # DB 스키마와 일치
    asset_id = Column(Integer, ForeignKey('assets.asset_id'), nullable=False, index=True)
    timestamp_utc = Column(Date, nullable=False, index=True)  # DB 스키마와 일치 (Date 타입)
    
    # HODL Waves (Bitcoin age distribution) - JSON으로 통합
    hodl_age_distribution = Column(JSON, nullable=True)  # {"0d_1d": 0.1, "1d_1w": 0.2, ...}
    
    # Network metrics
    hashrate = Column(DECIMAL(30, 10), nullable=True)  # 중복 제거, hashrate만 사용
    difficulty = Column(DECIMAL(30, 10), nullable=True)
    miner_reserves = Column(DECIMAL(24, 10), nullable=True)
    
    # Market metrics
    realized_cap = Column(DECIMAL(30, 2), nullable=True)
    mvrv_z_score = Column(DECIMAL(18, 10), nullable=True)
    realized_price = Column(DECIMAL(24, 10), nullable=True)
    sopr = Column(DECIMAL(18, 10), nullable=True)
    nupl = Column(DECIMAL(18, 10), nullable=True)
    cdd_90dma = Column(DECIMAL(18, 10), nullable=True)
    true_market_mean = Column(DECIMAL(24, 10), nullable=True)
    nrpl_btc = Column(DECIMAL(24, 10), nullable=True)
    aviv = Column(DECIMAL(18, 10), nullable=True)
    thermo_cap = Column(DECIMAL(30, 2), nullable=True)
    hodl_waves_supply = Column(DECIMAL(18, 10), nullable=True)
    etf_btc_total = Column(DECIMAL(24, 10), nullable=True)
    etf_btc_flow = Column(DECIMAL(24, 10), nullable=True)
    open_interest_futures = Column(JSON, nullable=True)
    
    # Metadata
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<CryptoMetric(metric_id={self.metric_id}, asset_id={self.asset_id}, timestamp={self.timestamp_utc})>"


class SparklineData(Base):
    __tablename__ = 'sparkline_data'
    
    id = Column(Integer, primary_key=True)
    ticker = Column(String(20), nullable=False, index=True)
    asset_type = Column(String(20), nullable=False, index=True)
    # 실제 DB 컬럼명은 price_data (TEXT) 이므로 이에 맞게 매핑
    price_data = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<SparklineData(id={self.id}, ticker='{self.ticker}', asset_type='{self.asset_type}')>"


    # 권장 인덱스: (asset_id, timestamp_utc DESC)

# ============================================================================
# System Configuration Models
# ============================================================================

class AppConfiguration(Base):
    """애플리케이션 설정 테이블"""
    __tablename__ = 'app_configurations'
    
    config_id = Column(Integer, primary_key=True, autoincrement=True)
    config_key = Column(String(100), unique=True, nullable=False, index=True)
    config_value = Column(Text, nullable=True)
    data_type = Column(String(20), default='string')  # string, int, float, boolean, json
    description = Column(Text, nullable=True)
    is_sensitive = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    category = Column(String(50), default='general')
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<AppConfiguration(config_id={self.config_id}, key='{self.config_key}', value='{self.config_value}')>"


class SchedulerLog(Base):
    """스케줄러 실행 로그 테이블"""
    __tablename__ = 'scheduler_logs'
    
    log_id = Column(BIGINT, primary_key=True, autoincrement=True)
    job_name = Column(String(100), nullable=False, index=True)
    start_time = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    end_time = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    status = Column(String(50), nullable=False, index=True, default='pending')  # pending, running, completed, failed
    current_task = Column(String(255), nullable=True, default=None)
    strategy_used = Column(String(100), nullable=True, default=None)
    checkpoint_data = Column(JSON, nullable=True)
    retry_count = Column(Integer, nullable=True, default=0)
    assets_processed = Column(Integer, nullable=True, default=0)
    data_points_added = Column(Integer, nullable=True, default=0)
    error_message = Column(Text, nullable=True)
    details = Column(JSON, nullable=True)  # 추가 메타데이터
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    
    def __repr__(self):
        return f"<SchedulerLog(log_id={self.log_id}, job='{self.job_name}', status='{self.status}')>"


class ApiCallLog(Base):
    """API 호출 로그 테이블"""
    __tablename__ = 'api_call_logs'
    
    log_id = Column(BigInteger, primary_key=True, autoincrement=True)
    api_name = Column(String(50), nullable=False, index=True)
    endpoint = Column(String(255), nullable=True)
    asset_ticker = Column(String(20), nullable=True, index=True)
    status_code = Column(Integer, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    success = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<ApiCallLog(log_id={self.log_id}, api='{self.api_name}', status={self.status_code})>"


class TechnicalIndicator(Base):
    """기술적 지표 데이터 테이블"""
    __tablename__ = 'technical_indicators'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    asset_id = Column(Integer, ForeignKey('assets.asset_id'), nullable=False, index=True)
    indicator_type = Column(String(50), nullable=False, index=True)  # RSI, MACD, SMA, etc.
    value = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    period = Column(Integer, nullable=True)  # 지표 계산 기간
    indicator_metadata = Column(JSON, nullable=True)  # 추가 지표 정보
    
    def __repr__(self):
        return f"<TechnicalIndicator(id={self.id}, asset_id={self.asset_id}, type='{self.indicator_type}')>"


class EconomicIndicator(Base):
    """경제 지표 데이터 테이블"""
    __tablename__ = 'economic_indicators'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    indicator_name = Column(String(100), nullable=False, index=True)
    country = Column(String(50), nullable=True)
    value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=True)
    period = Column(String(20), nullable=True)  # Q1, Q2, Monthly, etc.
    release_date = Column(Date, nullable=False, index=True)
    source = Column(String(100), nullable=True)
    
    def __repr__(self):
        return f"<EconomicIndicator(id={self.id}, name='{self.indicator_name}', value={self.value})>"


class SystemMetrics(Base):
    """시스템 메트릭스 테이블"""
    __tablename__ = 'system_metrics'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    metric_name = Column(String(100), nullable=False, index=True)
    metric_value = Column(Float, nullable=False)
    metric_unit = Column(String(20), nullable=True)
    timestamp = Column(DateTime, server_default=func.now(), index=True)
    metric_metadata = Column(JSON, nullable=True)  # 추가 메트릭 정보
    
    def __repr__(self):
        return f"<SystemMetrics(id={self.id}, name='{self.metric_name}', value={self.metric_value})>"


class ApiUsageLog(Base):
    """API 사용량 로그 테이블"""
    __tablename__ = 'api_usage_logs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    api_name = Column(String(50), nullable=False, index=True)
    endpoint = Column(String(200), nullable=True)
    calls_made = Column(Integer, default=0)
    calls_remaining = Column(Integer, nullable=True)
    reset_time = Column(DateTime, nullable=True)
    timestamp = Column(DateTime, server_default=func.now(), index=True)
    
    def __repr__(self):
        return f"<ApiUsageLog(id={self.id}, api='{self.api_name}', calls={self.calls_made})>"


class DataCollectionLog(Base):
    """데이터 수집 로그 테이블"""
    __tablename__ = 'data_collection_logs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    collector_name = Column(String(50), nullable=False, index=True)
    asset_id = Column(Integer, ForeignKey('assets.asset_id'), nullable=True, index=True)
    data_type = Column(String(50), nullable=False)
    records_collected = Column(Integer, default=0)
    records_saved = Column(Integer, default=0)
    execution_time_seconds = Column(Float, nullable=True)
    status = Column(String(20), nullable=False, index=True)  # success, failed, partial
    error_message = Column(Text, nullable=True)
    timestamp = Column(DateTime, server_default=func.now(), index=True)
    collection_metadata = Column(JSON, nullable=True)  # 수집 관련 메타데이터
    
    def __repr__(self):
        return f"<DataCollectionLog(id={self.id}, collector='{self.collector_name}', status='{self.status}')>"


class AuditLog(Base):
    """감사 로그 테이블"""
    __tablename__ = 'audit_logs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    # user_agent = Column(Text, nullable=True)  # DB에 컬럼이 없어서 주석 처리
    timestamp = Column(DateTime, server_default=func.now(), index=True)
    details = Column(JSON, nullable=True)
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, action='{self.action}', user_id={self.user_id})>"


class User(Base):
    """사용자 테이블"""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default='user', index=True)
    permissions = Column(JSON, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    full_name = Column(String(100), nullable=True)
    phone_number = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    avatar_url = Column(String(255), nullable=True)
    login_attempts = Column(Integer, nullable=False, default=0)
    locked_until = Column(TIMESTAMP, nullable=True)
    last_login = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(TIMESTAMP, nullable=True)
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', role='{self.role}')>"


class UserSession(Base):
    """사용자 세션 테이블"""
    __tablename__ = 'user_sessions'
    
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    session_id = Column(String(36), unique=True, nullable=False)  # UUID
    refresh_token_hash = Column(String(255), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    issued_at = Column(TIMESTAMP, server_default=func.now())
    expires_at = Column(TIMESTAMP, nullable=False)
    last_used_at = Column(TIMESTAMP, nullable=True)
    is_revoked = Column(Boolean, nullable=False, default=False)
    
    def __repr__(self):
        return f"<UserSession(id={self.id}, user_id={self.user_id}, session_id='{self.session_id}')>"


class TokenBlacklist(Base):
    """토큰 블랙리스트 테이블"""
    __tablename__ = 'token_blacklist'
    
    id = Column(BIGINT, primary_key=True, autoincrement=True)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    expires_at = Column(TIMESTAMP, nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    def __repr__(self):
        return f"<TokenBlacklist(id={self.id}, user_id={self.user_id}, token_hash='{self.token_hash[:10]}...')>"

