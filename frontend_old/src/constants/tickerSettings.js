// 티커 수집 설정 정의
export const TICKER_SETTING_DEFS = {
  Stocks: [
    {
      key: 'collect_price',
      label: '가격 데이터',
      description: 'OHLCV 가격 데이터 수집',
      default: true,
    },
    {
      key: 'collect_assets_info',
      label: '자산 정보',
      description: '자산 프로필 및 기본 정보 수집',
      default: true,
    },
    {
      key: 'collect_financials',
      label: '재무 데이터',
      description: '재무 정보 및 지표 수집',
      default: true,
    },
    {
      key: 'collect_estimates',
      label: '애널리스트 예측',
      description: '애널리스트 추정치 수집',
      default: true,
    },
    {
      key: 'collect_technical_indicators',
      label: '기술적 지표',
      description: 'SMA, EMA 등 기술적 지표 수집',
      default: false,
    },
  ],
  ETFs: [
    {
      key: 'collect_price',
      label: '가격 데이터',
      description: 'OHLCV 가격 데이터 수집',
      default: true,
    },
    {
      key: 'collect_assets_info',
      label: 'ETF 정보',
      description: 'ETF 상세 정보 및 보유 종목 수집',
      default: true,
    },
  ],
  Funds: [
    {
      key: 'collect_price',
      label: '가격 데이터',
      description: 'OHLCV 가격 데이터 수집',
      default: true,
    },
    {
      key: 'collect_assets_info',
      label: '펀드 정보',
      description: '펀드 상세 정보 수집',
      default: true,
    },
  ],
  Crypto: [
    {
      key: 'collect_price',
      label: '가격 데이터',
      description: 'OHLCV 가격 데이터 수집',
      default: true,
    },
    {
      key: 'collect_crypto_data',
      label: '크립토 데이터',
      description: '시가총액, 순환공급량, CMC 순위 등 크립토 상세 정보 수집',
      default: true,
    },
    {
      key: 'collect_technical_indicators',
      label: '기술적 지표',
      description: '암호화폐 기술적 지표 수집',
      default: false,
    },
  ],
  Indices: [
    {
      key: 'collect_price',
      label: '가격 데이터',
      description: 'OHLCV 가격 데이터 수집',
      default: true,
    },
  ],
  Bonds: [
    {
      key: 'collect_price',
      label: '가격 데이터',
      description: 'OHLCV 가격 데이터 수집',
      default: true,
    },
    {
      key: 'collect_assets_info',
      label: '채권 정보',
      description: '채권 상세 정보 수집',
      default: true,
    },
  ],
  Commodities: [
    {
      key: 'collect_price',
      label: '가격 데이터',
      description: 'OHLCV 가격 데이터 수집',
      default: true,
    },
  ],
  Currencies: [
    {
      key: 'collect_price',
      label: '가격 데이터',
      description: 'OHLCV 가격 데이터 수집',
      default: true,
    },
  ],
}

// 데이터 소스 정의
export const DATA_SOURCES = {
  FMP: 'fmp',
  ALPHA_VANTAGE: 'alpha_vantage',
  BINANCE: 'binance',
  COINBASE: 'coinbase',
  COINMARKETCAP: 'coinmarketcap',
  BGEO: 'bgeometrics',
}

export const DATA_SOURCE_LABELS = {
  [DATA_SOURCES.FMP]: 'FMP',
  [DATA_SOURCES.ALPHA_VANTAGE]: 'Alpha Vantage',
  [DATA_SOURCES.BINANCE]: 'Binance',
  [DATA_SOURCES.COINBASE]: 'Coinbase',
  [DATA_SOURCES.COINMARKETCAP]: 'CoinMarketCap',
  [DATA_SOURCES.BGEO]: 'BGeometrics',
}

// 카테고리별 아이콘 매핑
export const CATEGORY_ICONS = {
  Stocks: 'cil-chart-line',
  ETFs: 'cil-chart-pie',
  Funds: 'cil-library',
  Crypto: 'cil-bitcoin',
  Indices: 'cil-globe-alt',
  Bonds: 'cil-notes',
  Commodities: 'cil-grain',
  Currencies: 'cil-dollar',
}

// 자산 타입별 컬럼 정의
export const ASSET_TYPE_COLUMNS = {
  Stocks: ['price', 'stock_info', 'stock_financials', 'stock_estimates'],
  ETFs: ['price', 'etf_info'],
  Funds: ['price', 'fund_info'],
  Crypto: ['price', 'crypto_data', 'technical_indicators'],
  Indices: ['price'],
  Bonds: ['price', 'bond_info'],
  Commodities: ['price'],
  Currencies: ['price'],
}

// 컬럼 라벨 정의
export const COLUMN_LABELS = {
  price: 'Price',
  stock_info: 'S-Info',
  stock_financials: 'S-Financials',
  stock_estimates: 'S-Estimates',
  etf_info: 'ETF-Info',
  fund_info: 'Fund-Info',
  bond_info: 'Bond-Info',
  crypto_data: 'Crypto-Data',
  technical_indicators: 'Tech-Indi',
}

// 컬럼 설명 정의
export const COLUMN_DESCRIPTIONS = {
  price: 'OHLCV 가격 데이터 수집',
  stock_info: '기업 프로필 정보 수집',
  stock_financials: '재무 정보 및 지표 수집',
  stock_estimates: '애널리스트 추정치 수집',
  etf_info: 'ETF 기본 정보, 섹터 노출도, 보유 종목 수집',
  fund_info: '펀드 기본 정보 수집',
  bond_info: '채권 상세 정보 수집',
  crypto_data: '시가총액, 순환공급량, CMC 순위 등 크립토 상세 정보 수집',
  technical_indicators: '기술적 지표 수집',
}

// 컬럼과 데이터베이스 필드 매핑
export const COLUMN_TO_DB_FIELD = {
  price: 'collect_price',
  stock_info: 'collect_assets_info',
  stock_financials: 'collect_financials',
  stock_estimates: 'collect_estimates',
  etf_info: 'collect_assets_info',
  fund_info: 'collect_assets_info',
  bond_info: 'collect_assets_info',
  crypto_data: 'collect_crypto_data',
  technical_indicators: 'collect_technical_indicators',
}

// 페이지네이션 옵션
export const PAGINATION_OPTIONS = [20, 30, 50]
