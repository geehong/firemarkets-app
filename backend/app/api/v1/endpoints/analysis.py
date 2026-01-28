
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Any

from app.api import deps
from app.analysis.speculative import sentiment_analyzer
from app.analysis.quantitative import calculate_correlation_matrix, calculate_spread_analysis
from app.analysis.fundamental import fundamental_analyzer
from app.analysis.technical import calculate_moving_averages

router = APIRouter()

@router.get("/technical/ma", response_model=Any)
def get_moving_averages(
    ticker: str = Query(..., description="Asset Ticker"),
    periods: str = Query("10,20,50,111,200,365,700", description="Comma separated periods"),
    days: int = 1000,
    db: Session = Depends(deps.get_current_db)
):
    """
    Get Moving Averages for an asset.
    """
    period_list = [int(p) for p in periods.split(",")]
    return calculate_moving_averages(db, ticker, period_list, days)


@router.get("/sentiment", response_model=Any)
def analyze_sentiment_text(
    text: str = Query(..., min_length=1, description="Text to analyze sentiment for")
):
    """
    Analyze sentiment of a given text using GPU-accelerated FinBERT model.
    """
    return sentiment_analyzer.analyze(text)

@router.post("/sentiment/news", response_model=Any)
def analyze_news_sentiment(
    news_items: List[dict]
):
    """
    Batch analyze sentiment for a list of news items.
    """
    results = []
    for item in news_items:
        text = item.get("title", "") + " " + item.get("summary", "")
        # Truncate if too long (simple handling)
        sentiment = sentiment_analyzer.analyze(text[:500])
        results.append({
            "id": item.get("id"),
            "sentiment": sentiment
        })
    return results

@router.get("/correlation", response_model=Any)
def get_asset_correlation(
    tickers: List[str] = Query(..., description="List of tickers to correlate, e.g. BTC,ETH,SPY"),
    days: int = Query(90, ge=30, le=10000),
    db: Session = Depends(deps.get_current_db)
):
    """
    Get correlation matrix for a list of assets.
    """
    # Handle comma-separated string in the first element if present
    if len(tickers) == 1 and "," in tickers[0]:
        tickers = tickers[0].split(",")

    if len(tickers) < 2:
        raise HTTPException(status_code=400, detail="At least 2 tickers required")
    
    return calculate_correlation_matrix(db, tickers, days)

@router.get("/spread", response_model=Any)
def get_spread_analysis(
    ticker1: str,
    ticker2: str,
    days: int = 90,
    db: Session = Depends(deps.get_current_db)
):
    """
    Get spread analysis (Z-Score) between two assets.
    """
    return calculate_spread_analysis(db, ticker1, ticker2, days)

@router.get("/macro", response_model=Any)
def get_macro_data(
    type: str = Query("all", enum=["all", "treasury", "indicators", "yield_spread"]),
    db: Session = Depends(deps.get_current_db)
):
    """
    Get macroeconomic data (Treasury rates, GDP, CPI, Spread etc.)
    """
    if type == "treasury":
        return fundamental_analyzer.get_treasury_rates(db)
    elif type == "indicators":
        return fundamental_analyzer.get_macro_indicators(db)
    elif type == "yield_spread":
        return fundamental_analyzer.get_yield_curve_spread(db)
    else:
        return {
            "treasury": fundamental_analyzer.get_treasury_rates(db),
            "indicators": fundamental_analyzer.get_macro_indicators(db),
            "yield_spread": fundamental_analyzer.get_yield_curve_spread(db)
        }
