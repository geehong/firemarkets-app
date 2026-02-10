"""
Standard Pydantic data schemas for API clients (Data Contracts).
"""
from typing import Optional, List, Union, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

# ============================================================================
# 가격 또는 수치 데이터 (Price/Numeric Data)
# ============================================================================

class OhlcvDataPoint(BaseModel):
    """모든 OHLCV 데이터의 표준 구조"""
    timestamp_utc: datetime
    open_price: float
    high_price: float
    low_price: float
    close_price: float
    volume: Optional[float] = None
    change_percent: Optional[float] = None
    data_interval: Optional[str] = None  # 데이터 간격 (1d, 1w, 1m 등)

class RealtimeQuoteData(BaseModel):
    """모든 실시간 시세 데이터의 표준 구조"""
    symbol: str
    price: float
    change_percent: Optional[float] = None
    timestamp_utc: datetime = Field(default_factory=datetime.utcnow)  # 기본값 설정
    
    model_config = ConfigDict(populate_by_name=True)  # alias와 필드명 모두 허용

class BondMarketData(BaseModel):
    """채권 시장 데이터의 표준 구조"""
    symbol: str
    price: float
    yield_rate: Optional[float] = None
    maturity_date: Optional[datetime] = None
    coupon_rate: Optional[float] = None
    timestamp_utc: datetime

class WorldAssetsRankingData(BaseModel):
    """세계 자산 순위 데이터의 표준 구조"""
    rank: int
    symbol: str
    name: str
    market_cap: Optional[float] = None
    price: float
    change_percent: Optional[float] = None
    timestamp_utc: datetime

# ============================================================================
# 기업 및 재무 데이터 (Company & Financial Data)
# ============================================================================

class CompanyProfileData(BaseModel):
    """Standard structure for company profile data"""
    symbol: str
    name: str
    sector: Optional[str] = None
    industry: Optional[str] = None
    description_en: Optional[str] = None  # English description
    description_ko: Optional[str] = None  # Korean description
    website: Optional[str] = None
    employees: Optional[int] = None
    country: Optional[str] = None
    currency: Optional[str] = None
    market_cap: Optional[float] = None
    # Extended fields for DB mapping
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None  # State/Province (CA, NY, etc.)
    zip_code: Optional[str] = None  # Postal code
    ceo: Optional[str] = None
    phone: Optional[str] = None
    logo_image_url: Optional[str] = None
    ipo_date: Optional[date] = None
    # Exchange and identifier information
    exchange: Optional[str] = None  # Exchange code (NASDAQ, NYSE, etc.)
    exchange_full_name: Optional[str] = None  # Full exchange name
    cik: Optional[str] = None  # CIK code
    isin: Optional[str] = None  # ISIN code
    cusip: Optional[str] = None  # CUSIP code
    figi: Optional[str] = None  # FIGI code
    # Trading information (FMP specific)
    beta: Optional[float] = None
    last_dividend: Optional[float] = None
    price_range: Optional[str] = None
    # Metadata
    is_etf: Optional[bool] = None
    is_actively_trading: Optional[bool] = None
    is_adr: Optional[bool] = None
    is_fund: Optional[bool] = None
    data_source: Optional[str] = None  # API source tracking
    timestamp_utc: datetime

class StockFinancialsData(BaseModel):
    """주식 재무 데이터의 표준 구조"""
    symbol: str
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    eps: Optional[float] = None
    dividend_yield: Optional[float] = None
    dividend_per_share: Optional[float] = None
    beta: Optional[float] = None
    peg_ratio: Optional[float] = None
    price_to_book_ratio: Optional[float] = None
    profit_margin_ttm: Optional[float] = None
    return_on_equity_ttm: Optional[float] = None
    revenue_ttm: Optional[float] = None
    ebitda: Optional[float] = None
    shares_outstanding: Optional[float] = None
    currency: Optional[str] = None
    snapshot_date: Optional[datetime] = None
    timestamp_utc: datetime
    # 이동평균/52주 고저 (DB 스키마 매핑 필드)
    week_52_high: Optional[float] = None
    week_52_low: Optional[float] = None
    day_50_moving_avg: Optional[float] = None
    day_200_moving_avg: Optional[float] = None
    # 추가 재무 지표
    book_value: Optional[float] = None  # 장부가치
    revenue_per_share_ttm: Optional[float] = None  # 주당 매출
    operating_margin_ttm: Optional[float] = None  # 영업 마진
    return_on_assets_ttm: Optional[float] = None  # 자산 수익률
    gross_profit_ttm: Optional[float] = None  # 총 이익
    quarterly_earnings_growth_yoy: Optional[float] = None  # 분기 수익 성장률
    quarterly_revenue_growth_yoy: Optional[float] = None  # 분기 매출 성장률
    analyst_target_price: Optional[float] = None  # 애널리스트 목표가
    trailing_pe: Optional[float] = None  # 후행 PER
    forward_pe: Optional[float] = None  # 선행 PER
    price_to_sales_ratio_ttm: Optional[float] = None  # 주가매출비율
    ev_to_revenue: Optional[float] = None  # 기업가치매출비율
    ev_to_ebitda: Optional[float] = None  # 기업가치EBITDA비율

class StockAnalystEstimatesData(BaseModel):
    """주식 애널리스트 추정치 데이터의 표준 구조"""
    symbol: str
    # DB 스키마 매핑 필드
    revenue_low: Optional[float] = None
    revenue_high: Optional[float] = None
    revenue_avg: Optional[float] = None
    ebitda_avg: Optional[float] = None
    eps_avg: Optional[float] = None
    eps_high: Optional[float] = None
    eps_low: Optional[float] = None
    revenue_analysts_count: Optional[int] = None
    eps_analysts_count: Optional[int] = None
    fiscal_date: Optional[date] = None
    # 추가 재무 추정치 필드
    ebitda_low: Optional[float] = None
    ebitda_high: Optional[float] = None
    ebit_avg: Optional[float] = None
    ebit_low: Optional[float] = None
    ebit_high: Optional[float] = None
    net_income_avg: Optional[float] = None
    net_income_low: Optional[float] = None
    net_income_high: Optional[float] = None
    sga_expense_avg: Optional[float] = None
    sga_expense_low: Optional[float] = None
    sga_expense_high: Optional[float] = None
    # 참고: 벤더 고유 필드는 필요 시 별도 확장
    timestamp_utc: datetime

# ============================================================================
# ETF 데이터 (ETF Data)
# ============================================================================

class EtfSectorData(BaseModel):
    """ETF 섹터 정보"""
    sector: str
    weight: float

class EtfHoldingData(BaseModel):
    """ETF 보유 종목 정보"""
    symbol: str
    description: str
    weight: float

class EtfInfoData(BaseModel):
    """ETF 정보 데이터의 표준 구조 (Alpha Vantage ETF_PROFILE API 호환)"""
    symbol: str
    net_assets: Optional[float] = None
    net_expense_ratio: Optional[float] = None
    portfolio_turnover: Optional[float] = None
    dividend_yield: Optional[float] = None
    inception_date: Optional[date] = None
    leveraged: Optional[bool] = None
    sectors: Optional[List[EtfSectorData]] = None
    holdings: Optional[List[EtfHoldingData]] = None
    timestamp_utc: datetime

    def model_dump(self, **kwargs) -> dict:
        """JSON 직렬화를 위해 날짜 객체를 문자열로 변환"""
        data = super().model_dump(**kwargs)
        if data.get('inception_date'):
            data['inception_date'] = data['inception_date'].isoformat()
        if data.get('timestamp_utc'):
            data['timestamp_utc'] = data['timestamp_utc'].isoformat()
        return data

# 기존 호환성을 위한 별칭 (deprecated)
EtfSectorExposureData = EtfSectorData
EtfHoldingsData = EtfHoldingData

# ============================================================================
# 암호화폐 데이터 (Cryptocurrency Data)
# ============================================================================

class CryptoData(BaseModel):
    """암호화폐 데이터의 표준 구조"""
    symbol: str
    price: Optional[float] = None  # Some cryptocurrencies may not have a price (e.g., inactive/delisted)
    market_cap: Optional[float] = None
    volume_24h: Optional[float] = None
    change_24h: Optional[float] = None
    price_change_24h: Optional[float] = None  # 호환성을 위한 별칭
    circulating_supply: Optional[float] = None
    total_supply: Optional[float] = None
    max_supply: Optional[float] = None
    rank: Optional[int] = None
    timestamp_utc: datetime

# ============================================================================
# 지수 데이터 (Index Data)
# ============================================================================

class IndexInfoData(BaseModel):
    """지수 정보 데이터의 표준 구조"""
    symbol: str
    name: str
    description: Optional[str] = None
    current_value: float
    change_percent: Optional[float] = None
    timestamp_utc: datetime

# ============================================================================
# 기술적 지표 데이터 (Technical Indicators Data)
# ============================================================================

class TechnicalIndicatorsData(BaseModel):
    """기술적 지표 데이터의 표준 구조"""
    symbol: str
    sma_20: Optional[float] = None  # Simple Moving Average 20
    sma_50: Optional[float] = None  # Simple Moving Average 50
    sma_200: Optional[float] = None  # Simple Moving Average 200
    ema_12: Optional[float] = None  # Exponential Moving Average 12
    ema_26: Optional[float] = None  # Exponential Moving Average 26
    rsi: Optional[float] = None  # Relative Strength Index
    macd: Optional[float] = None  # MACD
    macd_signal: Optional[float] = None  # MACD Signal
    bollinger_upper: Optional[float] = None  # Bollinger Bands Upper
    bollinger_lower: Optional[float] = None  # Bollinger Bands Lower
    bollinger_middle: Optional[float] = None  # Bollinger Bands Middle
    timestamp_utc: datetime

# ============================================================================
# 온체인 데이터 (On-chain Data)
# ============================================================================

class OnchainMetricDataPoint(BaseModel):
    """온체인 메트릭 데이터 포인트의 표준 구조"""
    asset_id: int
    timestamp_utc: datetime
    metric_name: str
    metric_value: float
    additional_data: Optional[Dict[str, Any]] = None

class OnChainMetricData(BaseModel):
    """간단한 온체인 메트릭 데이터 (기존 호환성 유지)"""
    symbol: str
    timestamp_utc: datetime
    mvrv_ratio: Optional[float] = None  # Market Value to Realized Value
    nupl_ratio: Optional[float] = None  # Net Unrealized Profit/Loss
    sopr_ratio: Optional[float] = None  # Spent Output Profit Ratio
    hash_rate: Optional[float] = None
    network_difficulty: Optional[float] = None

class CryptoMetricsData(BaseModel):
    """실제 crypto_metrics 테이블과 일치하는 온체인 메트릭 데이터"""
    asset_id: int
    timestamp_utc: datetime
    
    # 기본 온체인 지표
    mvrv_z_score: Optional[float] = None
    nupl: Optional[float] = None
    sopr: Optional[float] = None
    realized_cap: Optional[float] = None
    realized_price: Optional[float] = None
    thermo_cap: Optional[float] = None
    true_market_mean: Optional[float] = None
    
    # 네트워크 지표
    hashrate: Optional[float] = None
    difficulty: Optional[float] = None
    
    # HODL Age 분포 (JSON으로 통합)
    hodl_age_distribution: Optional[Dict[str, float]] = None  # {"0d_1d": 0.1, "1d_1w": 0.2, ...}
    hodl_waves_supply: Optional[float] = None
    
    # 기타 지표
    aviv: Optional[float] = None
    cdd_90dma: Optional[float] = None
    nrpl_usd: Optional[float] = None
    sth_realized_price: Optional[float] = None
    
    # ETF 데이터
    etf_btc_flow: Optional[float] = None
    etf_btc_total: Optional[float] = None
    
    # New on-chain metrics
    mvrv: Optional[float] = None
    lth_mvrv: Optional[float] = None
    sth_mvrv: Optional[float] = None
    puell_multiple: Optional[float] = None
    reserve_risk: Optional[float] = None
    rhodl_ratio: Optional[float] = None
    terminal_price: Optional[float] = None
    delta_price_usd: Optional[float] = None
    lth_nupl: Optional[float] = None
    sth_nupl: Optional[float] = None
    utxos_in_profit_pct: Optional[float] = None
    utxos_in_loss_pct: Optional[float] = None
    nvts: Optional[float] = None
    market_cap: Optional[float] = None
    
    # New metrics (2026-02-10)
    open_interest_futures: Optional[float] = None
    funding_rate: Optional[float] = None
    bitcoin_dominance: Optional[float] = None

# ============================================================================
# API 응답 데이터 (API Response Data)
# ============================================================================

class ApiResponse(BaseModel):
    """API 응답의 표준 구조"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    message: Optional[str] = None
    error_code: Optional[str] = None
    timestamp_utc: datetime = Field(default_factory=datetime.utcnow)

class PaginatedResponse(BaseModel):
    """페이지네이션된 API 응답의 표준 구조"""
    success: bool
    data: List[Dict[str, Any]]
    total_count: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool
    timestamp_utc: datetime = Field(default_factory=datetime.utcnow)

# ============================================================================
# 유틸리티 타입들 (Utility Types)
# ============================================================================

# 타입 별칭들
OhlcvData = List[OhlcvDataPoint]
RealtimeQuoteList = List[RealtimeQuoteData]
RealtimeQuotes = List[RealtimeQuoteData]  # 호환성을 위한 별칭
BondMarketDataList = List[BondMarketData]
WorldAssetsRankingList = List[WorldAssetsRankingData]
CompanyProfileList = List[CompanyProfileData]
CompanyProfiles = List[CompanyProfileData]  # 호환성을 위한 별칭
StockFinancialsList = List[StockFinancialsData]
StockFinancials = List[StockFinancialsData]  # 호환성을 위한 별칭
StockAnalystEstimatesList = List[StockAnalystEstimatesData]
StockAnalystEstimates = List[StockAnalystEstimatesData]  # 호환성을 위한 별칭
EtfInfoList = List[EtfInfoData]
EtfInfos = List[EtfInfoData]  # 호환성을 위한 별칭
EtfSectorExposureList = List[EtfSectorExposureData]
EtfSectorExposures = List[EtfSectorExposureData]  # 호환성을 위한 별칭
EtfHoldingsList = List[EtfHoldingsData]
EtfHoldings = List[EtfHoldingsData]  # 호환성을 위한 별칭
CryptoDataList = List[CryptoData]
IndexInfoList = List[IndexInfoData]
IndexInfos = List[IndexInfoData]  # 호환성을 위한 별칭
TechnicalIndicatorsList = List[TechnicalIndicatorsData]
TechnicalIndicators = List[TechnicalIndicatorsData]  # 호환성을 위한 별칭
OnchainMetricDataPointList = List[OnchainMetricDataPoint]
OnChainMetricList = List[OnChainMetricData]
CryptoMetricsList = List[CryptoMetricsData]

# 유니온 타입들
QuoteData = Union[RealtimeQuoteData, BondMarketData, WorldAssetsRankingData]
ProfileData = Union[CompanyProfileData, EtfInfoData, IndexInfoData]
FinancialData = Union[StockFinancialsData, StockAnalystEstimatesData]
CryptoQuoteData = Union[CryptoData, RealtimeQuoteData]

# 호환성을 위한 별칭들
AnyFinancialData = Union[StockFinancialsData, StockAnalystEstimatesData]
AnyProfileData = Union[CompanyProfileData, EtfInfoData, IndexInfoData]
AnyMarketData = Union[RealtimeQuoteData, BondMarketData, WorldAssetsRankingData, CryptoData]

# ============================================================================
# 설정 및 메타데이터 (Configuration & Metadata)
# ============================================================================

class ApiRateLimitInfo(BaseModel):
    """API 호출 제한 정보"""
    calls_per_minute: int
    calls_per_day: Optional[int] = None
    calls_per_month: Optional[int] = None
    reset_time: Optional[datetime] = None

class ApiConnectionInfo(BaseModel):
    """API 연결 정보"""
    api_name: str
    base_url: str
    is_connected: bool
    response_time_ms: Optional[float] = None
    last_check: datetime = Field(default_factory=datetime.utcnow)
