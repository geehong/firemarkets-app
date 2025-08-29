"""
API 전략 관리자: 여러 외부 API를 순서대로 호출하고 실패 시 자동 전환하는 Failover 메커니즘
"""

import pandas as pd
from typing import Optional, List, Dict, Any
from app.utils.logger import logger
from app.external_apis.fmp_client import FMPClient
from app.external_apis.twelvedata_client import TwelveDataClient
from app.external_apis.alpha_vantage_client import AlphaVantageClient
from app.external_apis.yahoo_client import YahooFinanceClient as YahooClient
from app.external_apis.binance_client import BinanceClient
from app.external_apis.coinbase_client import CoinbaseClient
from app.external_apis.coinmarketcap_client import CoinMarketCapClient
from app.external_apis.tiingo_client import TiingoClient
from app.external_apis.coingecko_client import CoinGeckoClient
from app.external_apis.bitcoin_data_client import BitcoinDataClient

class ApiStrategyManager:
    """API 전략 관리자: 여러 API를 순서대로 시도하고 실패 시 자동 전환"""
    
    def __init__(self):
        """API 클라이언트들을 우선순위 순서로 초기화"""
        self.ohlcv_clients = [
            FMPClient(),
            TwelveDataClient(),
            AlphaVantageClient(),
            YahooClient()
        ]
        
        self.crypto_clients = [
            FMPClient(),
            TwelveDataClient(),
            AlphaVantageClient(),
            BinanceClient(),
            CoinbaseClient(),
            CoinMarketCapClient(),
            CoinGeckoClient(),
            BitcoinDataClient()
        ]
        
        self.stock_clients = [
            FMPClient(),
            AlphaVantageClient(),
            YahooClient(),
            TwelveDataClient(),
            TiingoClient()
        ]
        
        self.logger = logger
    
    async def get_ohlcv(self, ticker: str, interval: str = "1d", limit: int = 100) -> Optional[pd.DataFrame]:
        """
        OHLCV 데이터를 여러 API에서 순서대로 시도하여 가져옵니다.
        
        Args:
            ticker: 주식/암호화폐 티커
            interval: 시간 간격 (1d, 4h, 1h 등)
            limit: 가져올 데이터 개수
            
        Returns:
            DataFrame 또는 None (모든 API 실패 시)
        """
        last_exception = None
        
        for i, client in enumerate(self.ohlcv_clients):
            try:
                self.logger.info(f"Attempting to fetch OHLCV for {ticker} using {client.__class__.__name__} (attempt {i+1}/{len(self.ohlcv_clients)})")
                
                # 각 클라이언트의 메서드명이 다를 수 있으므로 적응적으로 호출
                if hasattr(client, 'get_historical_data'):
                    data = await client.get_historical_data(ticker, interval, limit)
                elif hasattr(client, 'get_ohlcv'):
                    data = await client.get_ohlcv(ticker, interval, limit)
                elif hasattr(client, 'get_stock_data'):
                    data = await client.get_stock_data(ticker, interval, limit)
                else:
                    self.logger.warning(f"{client.__class__.__name__} has no known data fetching method")
                    continue
                
                if data is not None and not data.empty:
                    self.logger.info(f"Successfully fetched OHLCV for {ticker} from {client.__class__.__name__} ({len(data)} records)")
                    return data
                else:
                    self.logger.warning(f"{client.__class__.__name__} returned empty data for {ticker}")
                    
            except Exception as e:
                self.logger.warning(f"{client.__class__.__name__} failed for {ticker}. Reason: {e}. Trying next client.")
                last_exception = e
        
        self.logger.error(f"All API clients failed to fetch OHLCV for {ticker}. Last error: {last_exception}")
        return None
    
    async def get_crypto_data(self, symbol: str, interval: str = "1d", limit: int = 100) -> Optional[pd.DataFrame]:
        """
        암호화폐 데이터를 여러 API에서 순서대로 시도하여 가져옵니다.
        """
        last_exception = None
        
        for i, client in enumerate(self.crypto_clients):
            try:
                self.logger.info(f"Attempting to fetch crypto data for {symbol} using {client.__class__.__name__} (attempt {i+1}/{len(self.crypto_clients)})")
                
                if hasattr(client, 'get_crypto_data'):
                    data = await client.get_crypto_data(symbol, interval, limit)
                elif hasattr(client, 'get_historical_data'):
                    data = await client.get_historical_data(symbol, interval, limit)
                elif hasattr(client, 'get_coin_market_data'):
                    # CoinGecko 클라이언트의 경우
                    data = await client.get_coin_market_data(symbol)
                    if data:
                        # DataFrame 형태로 변환
                        import pandas as pd
                        data = pd.DataFrame([data])
                elif hasattr(client, 'get_onchain_metrics'):
                    # Bitcoin Data 클라이언트의 경우
                    data = await client.get_onchain_metrics("price", limit)
                else:
                    self.logger.warning(f"{client.__class__.__name__} has no known crypto data fetching method")
                    continue
                
                if data is not None and not data.empty:
                    self.logger.info(f"Successfully fetched crypto data for {symbol} from {client.__class__.__name__} ({len(data)} records)")
                    return data
                else:
                    self.logger.warning(f"{client.__class__.__name__} returned empty crypto data for {symbol}")
                    
            except Exception as e:
                self.logger.warning(f"{client.__class__.__name__} failed for crypto {symbol}. Reason: {e}. Trying next client.")
                last_exception = e
        
        self.logger.error(f"All API clients failed to fetch crypto data for {symbol}. Last error: {last_exception}")
        return None
    
    async def get_stock_data(self, ticker: str, interval: str = "1d", limit: int = 100) -> Optional[pd.DataFrame]:
        """
        주식 데이터를 여러 API에서 순서대로 시도하여 가져옵니다.
        """
        last_exception = None
        
        for i, client in enumerate(self.stock_clients):
            try:
                self.logger.info(f"Attempting to fetch stock data for {ticker} using {client.__class__.__name__} (attempt {i+1}/{len(self.stock_clients)})")
                
                if hasattr(client, 'get_stock_data'):
                    data = await client.get_stock_data(ticker, interval, limit)
                elif hasattr(client, 'get_historical_data'):
                    data = await client.get_historical_data(ticker, interval, limit)
                elif hasattr(client, 'get_ohlcv'):
                    data = await client.get_ohlcv(ticker, interval, limit)
                elif hasattr(client, 'get_quote'):
                    # Tiingo 클라이언트의 경우
                    data = await client.get_quote(ticker)
                    if data:
                        # DataFrame 형태로 변환
                        import pandas as pd
                        data = pd.DataFrame([data])
                else:
                    self.logger.warning(f"{client.__class__.__name__} has no known stock data fetching method")
                    continue
                
                if data is not None and not data.empty:
                    self.logger.info(f"Successfully fetched stock data for {ticker} from {client.__class__.__name__} ({len(data)} records)")
                    return data
                else:
                    self.logger.warning(f"{client.__class__.__name__} returned empty stock data for {ticker}")
                    
            except Exception as e:
                self.logger.warning(f"{client.__class__.__name__} failed for stock {ticker}. Reason: {e}. Trying next client.")
                last_exception = e
        
        self.logger.error(f"All API clients failed to fetch stock data for {ticker}. Last error: {last_exception}")
        return None
    
    async def get_company_info(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        회사 정보를 여러 API에서 순서대로 시도하여 가져옵니다.
        """
        last_exception = None
        
        for i, client in enumerate(self.stock_clients):
            try:
                self.logger.info(f"Attempting to fetch company info for {ticker} using {client.__class__.__name__} (attempt {i+1}/{len(self.stock_clients)})")
                
                if hasattr(client, 'get_company_info'):
                    data = await client.get_company_info(ticker)
                elif hasattr(client, 'get_profile'):
                    data = await client.get_profile(ticker)
                elif hasattr(client, 'get_metadata'):
                    # Tiingo 클라이언트의 경우
                    data = await client.get_metadata(ticker)
                else:
                    self.logger.warning(f"{client.__class__.__name__} has no known company info fetching method")
                    continue
                
                if data is not None:
                    self.logger.info(f"Successfully fetched company info for {ticker} from {client.__class__.__name__}")
                    return data
                else:
                    self.logger.warning(f"{client.__class__.__name__} returned empty company info for {ticker}")
                    
            except Exception as e:
                self.logger.warning(f"{client.__class__.__name__} failed for company info {ticker}. Reason: {e}. Trying next client.")
                last_exception = e
        
        self.logger.error(f"All API clients failed to fetch company info for {ticker}. Last error: {last_exception}")
        return None
    
    def get_market_data(self, ticker: str, data_type: str = "ohlcv", **kwargs) -> Optional[pd.DataFrame]:
        """
        범용 데이터 가져오기 메서드
        
        Args:
            ticker: 티커 심볼
            data_type: 데이터 타입 ("ohlcv", "crypto", "stock")
            **kwargs: 추가 파라미터
        """
        if data_type == "ohlcv":
            return self.get_ohlcv(ticker, **kwargs)
        elif data_type == "crypto":
            return self.get_crypto_data(ticker, **kwargs)
        elif data_type == "stock":
            return self.get_stock_data(ticker, **kwargs)
        else:
            self.logger.error(f"Unknown data type: {data_type}")
            return None
    
    def get_api_status(self) -> Dict[str, List[str]]:
        """
        각 API 클라이언트의 상태를 반환합니다.
        """
        status = {
            "ohlcv_clients": [client.__class__.__name__ for client in self.ohlcv_clients],
            "crypto_clients": [client.__class__.__name__ for client in self.crypto_clients],
            "stock_clients": [client.__class__.__name__ for client in self.stock_clients]
        }
        return status

# 전역 인스턴스
api_manager = ApiStrategyManager()
