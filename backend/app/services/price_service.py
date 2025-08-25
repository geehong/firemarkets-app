"""
Real-time price service for fetching current prices from external APIs.
"""
import logging
from typing import Dict, List
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..external_apis.binance_client import BinanceClient
from ..external_apis.yahoo_client import YahooFinanceClient
from ..external_apis.coingecko_client import CoinGeckoClient
from ..external_apis.twelvedata_client import TwelveDataClient
from ..models import Asset, OHLCVData
from ..api import deps

logger = logging.getLogger(__name__)

# 클라이언트 인스턴스 생성
binance_client = BinanceClient()
yahoo_client = YahooFinanceClient()
coingecko_client = CoinGeckoClient()

twelve_client = TwelveDataClient()


async def get_realtime_crypto_prices(symbols: List[str]) -> Dict[str, float]:
    """
    심볼 목록을 기반으로 암호화폐의 실시간 가격을 조회합니다.
    Binance를 우선 시도하고, 실패 시 CoinGecko를 사용합니다.
    
    Args:
        symbols: 암호화폐 심볼 리스트 (예: ['BTC', 'ETH'])
        
    Returns:
        {SYMBOL: price} 형태의 딕셔너리
    """
    if not symbols:
        return {}

    # Binance 시도 (더 정확한 실시간 데이터)
    try:
        binance_tickers = [f"{symbol.upper()}USDT" for symbol in symbols]
        logger.info(f"Binance에서 {len(binance_tickers)}개 암호화폐 가격 조회 시작")
        
        price_data = await binance_client.get_tickers_price(symbols=binance_tickers)
        
        # 결과를 다시 원래 심볼 키로 매핑 {BTC: price}
        formatted_prices = {}
        for symbol in symbols:
            ticker = f"{symbol.upper()}USDT"
            if ticker in price_data:
                formatted_prices[symbol.upper()] = price_data[ticker]
        
        if formatted_prices:
            logger.info(f"Binance에서 {len(formatted_prices)}개 암호화폐 가격 조회 완료")
            return formatted_prices
            
    except Exception as e:
        logger.warning(f"Binance 암호화폐 가격 조회 실패, CoinGecko로 대체: {e}")

    # Binance 실패 시 CoinGecko 사용 (더 안정적)
    try:
        # CoinGecko는 소문자 ID를 사용합니다
        coingecko_symbols = [symbol.lower() for symbol in symbols]
        logger.info(f"CoinGecko에서 {len(coingecko_symbols)}개 암호화폐 가격 조회 시작")
        
        price_data = await coingecko_client.get_current_prices(symbols=coingecko_symbols)
        
        # 결과를 대문자 심볼로 변환
        formatted_prices = {}
        for symbol in symbols:
            coingecko_id = symbol.lower()
            if coingecko_id in price_data:
                formatted_prices[symbol.upper()] = price_data[coingecko_id]
        
        if formatted_prices:
            logger.info(f"CoinGecko에서 {len(formatted_prices)}개 암호화폐 가격 조회 완료")
            return formatted_prices
            
    except Exception as e:
        logger.error(f"CoinGecko 암호화폐 가격 조회 실패: {e}")

    # 모든 API 실패 시 빈 딕셔너리 반환
    logger.error("모든 암호화폐 API 실패")
    return {}


async def get_realtime_stock_prices(symbols: List[str]) -> Dict[str, float]:
    """
    심볼 목록을 기반으로 주식의 최신 가격을 조회합니다.
    우선 TwelveData(무료 플랜: 분당 8회, 일 800회)를 사용하고,
    실패/누락분은 DB에 저장된 최신 OHLCV 종가로 보완합니다 (최대 1일 지연 가능).
    """
    if not symbols:
        return {}

    results: Dict[str, float] = {}

    # 1) TwelveData에서 최대한 채우기
    try:
        td_prices = await twelve_client.get_realtime_prices(symbols)
        results.update({k.upper(): v for k, v in td_prices.items() if v is not None})
    except Exception as e:
        logger.warning(f"TwelveData primary fetch failed, will fallback to DB: {e}")

    # 2) 누락된 심볼은 DB 최신 OHLCV로 보완
    missing = [s for s in symbols if s.upper() not in results]
    if missing:
        try:
            db = next(deps.get_db())
            for symbol in missing:
                asset = db.query(Asset).filter(Asset.ticker == symbol.upper()).first()
                if not asset:
                    continue
                latest = (
                    db.query(OHLCVData)
                    .filter(OHLCVData.asset_id == asset.asset_id, OHLCVData.data_interval == '1d')
                    .order_by(OHLCVData.timestamp_utc.desc())
                    .first()
                )
                if latest and latest.close_price is not None:
                    results[symbol.upper()] = float(latest.close_price)
        except Exception as e:
            logger.error(f"DB fallback failed for stock prices: {e}")

    return results


async def get_realtime_prices_by_type(symbols: List[str], asset_type: str) -> Dict[str, float]:
    """
    자산 유형에 따라 적절한 소스에서 실시간 가격을 조회합니다.
    
    Args:
        symbols: 자산 심볼 리스트
        asset_type: 자산 유형 ('crypto' 또는 'stock')
        
    Returns:
        {SYMBOL: price} 형태의 딕셔너리
    """
    if asset_type.lower() == 'crypto':
        return await get_realtime_crypto_prices(symbols)
    elif asset_type.lower() == 'stock':
        return await get_realtime_stock_prices(symbols)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported asset type: {asset_type}")
