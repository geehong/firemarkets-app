"""
Real-time price service for fetching current prices from external APIs.
"""
import logging
from typing import Dict, List, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.external_apis.implementations import BinanceClient, CoinGeckoClient, TwelveDataClient
from app.external_apis.implementations.finnhub_client import FinnhubClient
from app.core.config import GLOBAL_APP_CONFIGS
from ...models import Asset, OHLCVData
from ...api import deps

logger = logging.getLogger(__name__)

# 클라이언트 인스턴스 생성
binance_client = BinanceClient()
coingecko_client = CoinGeckoClient()
twelve_client = TwelveDataClient()
finnhub_api_key = GLOBAL_APP_CONFIGS.get('FINNHUB_API_KEY')
finnhub_client: FinnhubClient | None = FinnhubClient(finnhub_api_key) if finnhub_api_key else None


async def get_realtime_crypto_prices(symbols: List[str]) -> Dict[str, Dict[str, Any]]:
    """
    심볼 목록을 기반으로 Binance에서 암호화폐의 실시간 가격을 조회합니다.
    """
    if not symbols:
        return {}

    # 프론트엔드에서 받은 심볼(e.g., 'BTC')을 Binance 티커(e.g., 'BTCUSDT')로 변환
    binance_tickers = [f"{symbol.upper()}USDT" for symbol in symbols]
    
    try:
        # Binance API 호출 시 올바른 형식으로 전달
        price_data = await binance_client.get_tickers_price(symbols=binance_tickers)
        
        # 결과를 다시 원래 심볼 키로 매핑 {BTC: price}
        formatted_prices = {}
        for symbol in symbols:
            ticker = f"{symbol.upper()}USDT"
            if ticker in price_data:
                formatted_prices[symbol.upper()] = {
                    'price': price_data[ticker],
                    'change_percent': None,  # Binance price API에는 변화율이 없음
                    'market_cap': None,      # Binance price API에는 시가총액이 없음
                    'volume': None           # Binance price API에는 거래량이 없음
                }
        
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
                formatted_prices[symbol.upper()] = {
                    'price': price_data[coingecko_id],
                    'change_percent': None,  # CoinGecko price API에는 변화율이 없음
                    'market_cap': None,      # CoinGecko price API에는 시가총액이 없음
                    'volume': None           # CoinGecko price API에는 거래량이 없음
                }
        
        if formatted_prices:
            logger.info(f"CoinGecko에서 {len(formatted_prices)}개 암호화폐 가격 조회 완료")
            return formatted_prices
            
    except Exception as e:
        logger.error(f"CoinGecko 암호화폐 가격 조회 실패: {e}")

    # 최후의 수단: Finnhub quote로 시도 (BINANCE:{SYMBOL}USDT)
    if finnhub_client:
        fallback_prices: Dict[str, Dict[str, Any]] = {}
        for symbol in symbols:
            finnhub_symbol = f"BINANCE:{symbol.upper()}USDT"
            try:
                quote = await finnhub_client.get_realtime_quote(finnhub_symbol)
                if quote and getattr(quote, 'price', None):
                    fallback_prices[symbol.upper()] = {
                        'price': float(quote.price),
                        'change_percent': float(getattr(quote, 'change_percent', 0)) if getattr(quote, 'change_percent', None) is not None else None,
                        'market_cap': None,
                        'volume': float(getattr(quote, 'volume', 0)) if getattr(quote, 'volume', None) is not None else None
                    }
            except Exception as e:
                logger.warning(f"Finnhub 암호화폐 가격 조회 실패 ({finnhub_symbol}): {e}")
        if fallback_prices:
            logger.info(f"Finnhub에서 {len(fallback_prices)}개 암호화폐 가격 조회 완료 (fallback)")
            return fallback_prices

    # 모든 API 실패 시 빈 딕셔너리 반환
    logger.error("모든 암호화폐 API 실패")
    return {}


async def get_realtime_stock_prices(symbols: List[str]) -> Dict[str, Dict[str, Any]]:
    """
    심볼 목록을 기반으로 주식의 최신 가격, 변화율, 시가총액, 거래량을 조회합니다.
    TwelveData의 /quote 엔드포인트를 사용하여 모든 데이터를 한 번에 가져옵니다.
    """
    if not symbols:
        return {}

    results: Dict[str, Dict[str, Any]] = {}

    # 1) TwelveData에서 quote 데이터 가져오기 (price, change_percent, market_cap, volume 포함)
    try:
        td_quotes = await twelve_client.get_realtime_quotes(symbols)
        for symbol, quote_data in td_quotes.items():
            results[symbol.upper()] = {
                'price': float(quote_data.get('close', 0)) if quote_data.get('close') else None,
                'change_percent': float(quote_data.get('percent_change', 0)) if quote_data.get('percent_change') else None,
                'market_cap': None,  # TwelveData 무료 플랜에서는 market_cap 제공하지 않음
                'volume': float(quote_data.get('volume', 0)) if quote_data.get('volume') else None
            }
        logger.info(f"TwelveData에서 {len(td_quotes)}개 주식 quote 데이터 조회 완료")
    except Exception as e:
        logger.warning(f"TwelveData quote fetch failed, will fallback to price only: {e}")

    # 2-a) 누락된 심볼은 Finnhub quote로 보완 시도
    missing = [s for s in symbols if s.upper() not in results]
    if missing and finnhub_client:
        for symbol in list(missing):
            try:
                quote = await finnhub_client.get_realtime_quote(symbol.upper())
                if quote and getattr(quote, 'price', None):
                    results[symbol.upper()] = {
                        'price': float(quote.price),
                        'change_percent': float(getattr(quote, 'change_percent', 0)) if getattr(quote, 'change_percent', None) is not None else None,
                        'market_cap': None,
                        'volume': float(getattr(quote, 'volume', 0)) if getattr(quote, 'volume', None) is not None else None
                    }
                    try:
                        missing.remove(symbol)
                    except ValueError:
                        pass
            except Exception as e:
                logger.warning(f"Finnhub 주식 가격 조회 실패 ({symbol}): {e}")

    # 2-b) 여전히 누락된 심볼은 기본 가격만 DB에서 보완
    if missing:
        try:
            db = next(deps.get_postgres_db())
            for symbol in missing:
                asset = db.query(Asset).filter(Asset.ticker == symbol.upper()).first()
                if not asset:
                    continue
                latest = (
                    db.query(OHLCVData)
                    .filter(OHLCVData.asset_id == asset.asset_id, OHLCVData.data_interval.is_(None))  # 일봉 데이터는 data_interval이 NULL
                    .order_by(OHLCVData.timestamp_utc.desc())
                    .first()
                )
                if latest and latest.close_price is not None:
                    results[symbol.upper()] = {
                        'price': float(latest.close_price),
                        'change_percent': float(latest.change_percent) if latest.change_percent else None,
                        'market_cap': None,  # DB에는 시가총액 정보가 없음
                        'volume': float(latest.volume) if latest.volume else None
                    }
        except Exception as e:
            logger.error(f"DB fallback failed for stock prices: {e}")

    return results


async def get_realtime_prices_by_type(symbols: List[str], asset_type: str) -> Dict[str, Dict[str, Any]]:
    """
    자산 유형에 따라 적절한 소스에서 실시간 가격을 조회합니다.
    
    Args:
        symbols: 자산 심볼 리스트
        asset_type: 자산 유형 ('crypto' 또는 'stock')
        
    Returns:
        {SYMBOL: {price, change_percent, market_cap, volume}} 형태의 딕셔너리
    """
    if asset_type.lower() == 'crypto':
        return await get_realtime_crypto_prices(symbols)
    elif asset_type.lower() == 'stock':
        return await get_realtime_stock_prices(symbols)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported asset type: {asset_type}")
