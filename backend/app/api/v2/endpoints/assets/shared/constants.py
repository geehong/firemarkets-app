# backend/app/api/v2/endpoints/assets/shared/constants.py
"""
공통 상수 정의
"""

# 캐시 TTL (초)
CACHE_TTL = {
    "core": {
        "types": 300,       # 자산 타입: 5분
        "list": 300,        # 자산 목록: 5분
        "metadata": 300,    # 메타데이터: 5분
    },
    "market": {
        "price": 60,        # 현재가: 1분
        "ohlcv_1d": 300,    # 일봉: 5분
        "ohlcv_1h": 60,     # 시간봉: 1분
        "ohlcv_1m": 10,     # 분봉: 10초
    },
    "detail": {
        "profile": 3600,    # 프로필: 1시간
        "financials": 86400,  # 재무: 24시간
        "crypto_info": 3600,  # 코인 정보: 1시간
        "etf_info": 3600,   # ETF 정보: 1시간
    },
    "analysis": {
        "technicals": 300,  # 기술지표: 5분
        "estimates": 3600,  # 예측: 1시간
        "treemap": 300,     # 트리맵: 5분
    },
    "overview": {
        "default": 300,     # 개요: 5분
        "bundle": 300,      # 번들: 5분
    },
}

# SQL View 매핑
VIEW_MAP = {
    'Stocks': 'stock_info_view',
    'Crypto': 'crypto_info_view',
    'ETFs': 'etf_info_view',
    'Funds': 'etf_info_view',
    'Indices': None,  # 기본 쿼리 사용
}

# 데이터 소스 우선순위 (낮을수록 우선)
DATA_SOURCE_PRIORITY = {
    '8marketcap_companies': 1,
    '8marketcap_cryptos': 2,
    '8marketcap_etfs': 3,
    '8marketcap_metals': 4,
}

# 자산 타입명 표준화
ASSET_TYPE_ALIASES = {
    'crypto': 'Crypto',
    'cryptocurrency': 'Crypto',
    'stocks': 'Stocks',
    'stock': 'Stocks',
    'etfs': 'ETFs',
    'etf': 'ETFs',
    'funds': 'Funds',
    'fund': 'Funds',
    'indices': 'Indices',
    'index': 'Indices',
}

# 지원되는 데이터 인터벌
SUPPORTED_INTERVALS = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1W', '1M']

# 응답 시간 목표 (ms) - 모니터링용
RESPONSE_TIME_TARGETS = {
    "core": 100,
    "market": 200,
    "detail": 500,
    "analysis": 300,
    "overview": 400,
}
