# backend_temp/app/api/v1/endpoints/dashboard.py
from typing import List, Optional
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel, Field
from dateutil.relativedelta import relativedelta

from ....core.database import get_postgres_db
from ....models import Asset, AssetType, OHLCVData

# --- Pydantic 스키마 정의 ---
class TickerSummaryData(BaseModel):
    ticker: str
    name: str
    current_price: Optional[float] = None
    change_percent_7m: Optional[float] = None # 7개월 변동률
    monthly_prices_7m: List[Optional[float]] = Field(default_factory=lambda: [None]*7)

class TickerSummaryResponse(BaseModel):
    data: List[TickerSummaryData]

class MarketSummaryResponse(BaseModel):
    total_market_cap: float = Field(..., description="총 시장 시가총액")
    total_24h_volume: float = Field(..., description="총 24시간 거래량")
    top_gainers_count: int = Field(0, description="상승률 상위 자산 개수 (임시)")
    top_losers_count: int = Field(0, description="하락률 상위 자산 개수 (임시)")

class AssetWithTypeName(BaseModel):
    asset_id: int
    ticker: str
    name: str
    type_name: str
    current_price: Optional[float] = None
    change_percent_24h: Optional[float] = None
    volume_24h: Optional[float] = None

    class Config:
        from_attributes = True

class PaginatedAssetResponse(BaseModel):
    data: List[AssetWithTypeName]
    total_count: int

# --- APIRouter 생성 ---
router = APIRouter()

# --- API 엔드포인트 정의 ---
@router.get("/summary", response_model=MarketSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_postgres_db)):
    """대시보드 시장 요약 데이터를 반환합니다."""
    return MarketSummaryResponse(
        total_market_cap=2_500_000_000_000.0,
        total_24h_volume=150_000_000_000.0,
        top_gainers_count=5,
        top_losers_count=3
    )

@router.get("/top-assets", response_model=PaginatedAssetResponse)
def get_dashboard_top_assets(
    limit: int = Query(5, ge=1, description="표시할 상위 자산 개수"),
    db: Session = Depends(get_postgres_db)
):
    """주요 자산 목록을 반환합니다."""
    base_query = db.query(Asset, AssetType.type_name) \
                   .join(AssetType, Asset.asset_type_id == AssetType.asset_type_id)
    
    assets_with_type = base_query.order_by(desc(Asset.asset_id)).limit(limit).all()
    
    result_data = []
    for asset, type_name in assets_with_type:
        asset_dict = asset.__dict__
        asset_dict['type_name'] = type_name
        
        latest_ohlcv = get_latest_ohlcv(db, asset.asset_id)
        
        if latest_ohlcv:
            asset_dict['current_price'] = float(latest_ohlcv.close_price)
            asset_dict['change_percent_24h'] = float(latest_ohlcv.change_percent) if latest_ohlcv.change_percent is not None else 0.0
            asset_dict['volume_24h'] = float(latest_ohlcv.volume)
        else:
            asset_dict['current_price'] = 0.0
            asset_dict['change_percent_24h'] = 0.0
            asset_dict['volume_24h'] = 0.0

        result_data.append(AssetWithTypeName(**asset_dict))
    
    total_count = base_query.count()
    
    return PaginatedAssetResponse(data=result_data, total_count=total_count)

@router.get("/widgets/ticker-summary", response_model=TickerSummaryResponse)
def get_ticker_summary_for_widgets(
    tickers: str = Query("BTCUSDT,SPY,MSFT", description="쉼표로 구분된 티커 목록"),
    db: Session = Depends(get_postgres_db)
):
    """위젯에 표시할 여러 티커의 요약 정보를 반환합니다."""
    ticker_list = [t.strip().upper() for t in tickers.split(',')]
    response_data = []
    
    today = date.today()
    
    for ticker_symbol in ticker_list:
        asset = get_asset_by_ticker(db, ticker_symbol)
        if not asset:
            response_data.append(TickerSummaryData(ticker=ticker_symbol, name=f"{ticker_symbol} (Not Found)"))
            continue

        # 현재 가격 조회
        latest_ohlcv = get_latest_ohlcv(db, asset.asset_id)
        current_price = float(latest_ohlcv.close_price) if latest_ohlcv else None

        # 7개월 전 가격 조회
        seven_months_ago_date = today - relativedelta(months=7)
        ohlcv_7m_ago = get_ohlcv_data(db, asset.asset_id, seven_months_ago_date, seven_months_ago_date + timedelta(days=7), "1d")
        price_7m_ago = float(ohlcv_7m_ago[0].close_price) if ohlcv_7m_ago else None

        change_percent_7m = None
        if current_price and price_7m_ago:
            change_percent_7m = ((current_price - price_7m_ago) / price_7m_ago) * 100

        # 월별 가격 데이터 조회 (최근 7개월)
        monthly_prices = []
        for i in range(7):
            month_date = today - relativedelta(months=i)
            month_ohlcv = get_ohlcv_data(db, asset.asset_id, month_date, month_date + timedelta(days=7), "1d")
            if month_ohlcv:
                monthly_prices.insert(0, float(month_ohlcv[0].close_price))
            else:
                monthly_prices.insert(0, None)

        response_data.append(TickerSummaryData(
            ticker=ticker_symbol,
            name=asset.name,
            current_price=current_price,
            change_percent_7m=change_percent_7m,
            monthly_prices_7m=monthly_prices
        ))

    return TickerSummaryResponse(data=response_data)

class KeywordCount(BaseModel):
    keyword: str
    count: int

class DraftKeywordsResponse(BaseModel):
    keywords: List[KeywordCount]

# --------------------------------------------------------------------------
# Hot Draft Keywords Logic Enhancements (Domain Context Pipeline)
# --------------------------------------------------------------------------

# 1. 금융 도메인 화이트리스트 (가중치 대폭 부여)
FINANCE_WHITELIST = {
    "BTC", "ETH", "SOL", "NVDA", "AAPL", "TSLA", "FOMC", "CPI", "ETF", "SEC",
    "금리", "인상", "동결", "인하", "반도체", "비트코인", "이더리움", "나스닥", "엔비디아", "부채", "한도",
    "리플", "알트코인", "현물", "선물", "숏", "롱", "청산"
}

# 2. 개체 가중치 계산 함수
def get_entity_weight(word: str) -> float:
    # 대문자 약어 (BTC, FED, AI, SEC 등) - 정보 밀도 매우 높음
    if word.isupper() and len(word) >= 2: return 2.8
    # 금융 도메인 핵심 키워드
    if word in FINANCE_WHITELIST: return 3.5
    # 영문 고유명사 (Apple, Nvidia 등)
    if len(word) >= 2 and word[0].isupper(): return 2.0
    # 긴 단어일수록 구체적일 확률이 높음
    if len(word) >= 5: return 1.3
    return 1.0

@router.get("/draft-keywords", response_model=DraftKeywordsResponse)
def get_draft_keywords(
    limit: int = Query(20, ge=1, description="Number of keywords to return"),
    db: Session = Depends(get_postgres_db)
):
    """
    Analyzes titles of draft news using a specialized Finance Domain Pipeline.
    Prioritizes entities (tickers, events) over generic news filler.
    """
    from ....models.blog import Post
    from sqlalchemy import or_
    import re
    import math
    from collections import Counter

    # Fetch draft posts
    posts = db.query(Post.title).filter(
        Post.status == 'draft',
        or_(
            Post.post_type == 'ai_draft_news',
            Post.post_type == 'raw_news'
        )
    ).all()

    if not posts:
        return DraftKeywordsResponse(keywords=[])

    # 3. 강화된 불용어 리스트 (JSON 파일에서 동적 로드)
    import json
    import os
    
    stop_words = set()
    # Path relative to the app root or absolute path
    # In docker, it's usually /app/app/utils/stop_words.json
    # Or we can use __file__ to find it
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Walk up to 'app' then down to 'utils'
    # dashboard.py is in app/api/v1/endpoints/
    json_path = os.path.join(current_dir, "..", "..", "..", "utils", "stop_words.json")
    
    try:
        if os.path.exists(json_path):
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                stop_words = set(data.get("stop_words", []))
    except Exception as e:
        print(f"Error loading stop_words.json: {e}")
        # Fallback to a bare minimum if file is broken
        stop_words = {'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or'}

    word_total_counts = Counter()
    word_document_counts = Counter()
    doc_count = len(posts)

    for p in posts:
        title_ko = p.title.get('ko', '')
        title_en = p.title.get('en', '')
        
        # 정교한 토큰화: 영문은 대문자 보존, 한글은 명사 위주 추출(2자 이상)
        tokens_en = re.findall(r'\b[A-Z][a-zA-Z0-9]{1,}\b|\b[a-z]{3,}\b', title_en)
        tokens_ko = re.findall(r'[가-힣]{2,}', title_ko)
        
        combined_tokens = tokens_en + tokens_ko
        
        # 기본 필터링 (불용어 및 숫자 제외)
        filtered = [t for t in combined_tokens if t.lower() not in stop_words and not t.isdigit()]
        
        word_total_counts.update(filtered)
        word_document_counts.update(set(filtered))

    scored_keywords = []
    for word, tf in word_total_counts.items():
        df = word_document_counts[word]
        
        # 1. TF-IDF 계산 (IDF 보정)
        # Smoothing 추가 (+1)
        idf = math.log(doc_count / (df + 1)) + 1
        
        # 2. 가중치 결합: TF * IDF * EntityWeight * LengthWeight
        # 단어 길이에 따른 보정 (길수록 구체적)
        length_weight = math.log(len(word)) + 1
        ent_weight = get_entity_weight(word)
        
        final_score = tf * idf * ent_weight * length_weight
        
        # 3. 도메인 페널티: 지나치게 흔한 단어(20% 이상 등장)는 정보 가치 급락
        if df / doc_count > 0.20 and doc_count > 5:
            final_score *= 0.1

        scored_keywords.append((word, tf, final_score))

    # 점수(Score) 기준 정렬, 동점일 경우 빈도(TF) 기준
    top_keywords = sorted(scored_keywords, key=lambda x: (x[2], x[1]), reverse=True)[:limit]
    
    return DraftKeywordsResponse(
        keywords=[KeywordCount(keyword=item[0], count=item[1]) for item in top_keywords]
    )

# Helper functions
def get_latest_ohlcv(db: Session, asset_id: int):
    """최신 OHLCV 데이터 조회"""
    return db.query(OHLCVData).filter(
        OHLCVData.asset_id == asset_id,
        OHLCVData.data_interval.is_(None)  # 일봉 데이터는 data_interval이 NULL
    ).order_by(OHLCVData.timestamp_utc.desc()).first()

def get_asset_by_ticker(db: Session, ticker: str):
    """Ticker로 자산 조회"""
    return db.query(Asset).filter(Asset.ticker == ticker).first()

def get_ohlcv_data(db: Session, asset_id: int, start_date: Optional[date], end_date: Optional[date], data_interval: str, limit: int = 2000):
    """OHLCV 데이터 조회"""
    query = db.query(OHLCVData).filter(
        OHLCVData.asset_id == asset_id,
        OHLCVData.data_interval == data_interval
    )
    
    if start_date:
        query = query.filter(OHLCVData.timestamp_utc >= start_date)
    if end_date:
        query = query.filter(OHLCVData.timestamp_utc <= end_date)
    
    return query.order_by(OHLCVData.timestamp_utc.asc()).limit(limit).all()






