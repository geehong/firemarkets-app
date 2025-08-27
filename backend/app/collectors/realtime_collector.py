"""
Realtime Data Collector
실시간 데이터 수집기 (Tiingo WebSocket + 스케줄러 통합 관리)
"""
import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta

from .base_collector import BaseCollector
from ..services.tiingo_ws_consumer import get_consumer
from ..services.scheduler_service import get_scheduler
from ..core.database import SessionLocal
from ..models.realtime import RealtimeQuote, SparklineData
from ..external_apis.twelvedata_client import TwelveDataClient
from ..external_apis.binance_client import BinanceClient
from ..external_apis.tiingo_client import TiingoClient

logger = logging.getLogger(__name__)


class RealtimeCollector(BaseCollector):
    """실시간 데이터 수집기"""
    
    def __init__(self):
        super().__init__()
        self.consumer = get_consumer()
        self.scheduler = get_scheduler()
        self.twelvedata_client = TwelveDataClient()
        self.binance_client = BinanceClient()
        self.tiingo_client = TiingoClient()
        
        # 수집 설정
        self.default_tickers = {
            "Stocks": ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"],
            "Crypto": ["BTCUSDT", "ETHUSDT", "SOLUSDT", "ADAUSDT", "DOTUSDT"],
            "ETFs": ["SPY", "QQQ", "IWM", "VTI", "VEA"],
            "Funds": ["VTSAX", "VTIAX", "VBTLX", "VBMFX", "VGSIX"],
            "Commodities": ["GC", "SI", "CL", "NG", "ZC"]
        }
        
        # 수집 간격 (초)
        self.intervals = {
            "Crypto": 5 * 60,      # 5분
            "Stocks": 15 * 60,     # 15분
            "ETFs": 30 * 60,       # 30분
            "Funds": 30 * 60,      # 30분
            "Commodities": 4 * 60 * 60  # 4시간
        }
    
    async def _collect_data(self) -> Dict[str, Any]:
        """BaseCollector 요구사항을 충족하는 추상 메서드 구현"""
        # collect_with_settings를 호출하여 실제 수집 로직 실행
        return await self.collect_with_settings()
    
    async def collect_with_settings(self) -> Dict[str, Any]:
        """설정에 따른 실시간 데이터 수집"""
        try:
            self.log_progress("Starting realtime data collection")
            
            # 1. Tiingo WebSocket 시작
            await self._start_websocket()
            
            # 2. 스케줄러 시작
            await self._start_scheduler()
            
            # 3. 초기 데이터 백필
            await self._backfill_initial_data()
            
            return {
                'success': True,
                'message': 'Realtime collectors started successfully',
                'websocket_status': 'running',
                'scheduler_status': 'running',
                'total_added_records': 0  # 실시간 수집은 지속적이므로 0
            }
            
        except Exception as e:
            logger.error(f"Failed to start realtime collectors: {e}")
            return {
                'success': False,
                'message': f'Failed to start realtime collectors: {str(e)}',
                'total_added_records': 0
            }
    
    async def _start_websocket(self):
        """Tiingo WebSocket 시작"""
        try:
            logger.info("Starting Tiingo WebSocket...")
            # 기본 주식 종목으로 WebSocket 시작
            default_stocks = self.default_tickers.get("Stocks", ["AAPL", "MSFT", "GOOGL"])
            logger.info(f"Attempting to start WebSocket with tickers: {default_stocks}")
            await self.consumer.start(default_stocks)
            logger.info(f"Tiingo WebSocket started successfully with {len(default_stocks)} tickers")
            
        except Exception as e:
            logger.error(f"Failed to start Tiingo WebSocket: {e}")
            logger.error(f"Exception details: {type(e).__name__}: {str(e)}")
            raise
    
    async def _start_scheduler(self):
        """실시간 스케줄러 시작"""
        try:
            await self.scheduler.start()
            logger.info("Realtime scheduler started")
            
        except Exception as e:
            logger.error(f"Failed to start realtime scheduler: {e}")
            raise
    
    async def _backfill_initial_data(self):
        """초기 데이터 백필 (WebSocket 시작 전에 기본 데이터 제공)"""
        try:
            db = SessionLocal()
            
            # 각 자산 유형별로 기본 데이터 수집
            for asset_type, tickers in self.default_tickers.items():
                if asset_type == "Crypto":
                    await self._collect_crypto_data(db, tickers)
                elif asset_type in ["Stocks", "ETFs", "Funds"]:
                    await self._collect_stock_data(db, tickers, asset_type)
                elif asset_type == "Commodities":
                    await self._collect_commodity_data(db, tickers)
            
            db.close()
            logger.info("Initial data backfill completed")
            
        except Exception as e:
            logger.error(f"Failed to backfill initial data: {e}")
    
    async def _collect_crypto_data(self, db, tickers: List[str]):
        """암호화폐 데이터 수집"""
        try:
            # Binance API 호출을 위한 올바른 형식으로 변환
            # tickers가 ["BTC", "ETH", "SOL"] 형태라면 ["BTCUSDT", "ETHUSDT", "SOLUSDT"]로 변환
            binance_tickers = []
            for ticker in tickers:
                if not ticker.endswith("USDT"):
                    binance_tickers.append(f"{ticker}USDT")
                else:
                    binance_tickers.append(ticker)
            
            # Binance에서 데이터 조회
            prices = await self.binance_client.get_tickers_price(binance_tickers)
            
            for ticker, price in prices.items():
                # USDT 제거하여 기본 심볼로 변환
                base_symbol = ticker.replace("USDT", "")
                
                # RealtimeQuote에 저장
                quote = RealtimeQuote(
                    ticker=base_symbol,
                    asset_type="Crypto",
                    price=price,
                    data_source="binance",
                    currency="USD"
                )
                
                # Upsert 로직
                existing = db.query(RealtimeQuote).filter(
                    RealtimeQuote.ticker == base_symbol,
                    RealtimeQuote.asset_type == "Crypto"
                ).first()
                
                if existing:
                    existing.price = quote.price
                    existing.fetched_at = datetime.now()
                else:
                    db.add(quote)
            
            db.commit()
            logger.info(f"Collected crypto data for {len(tickers)} tickers")
            
        except Exception as e:
            logger.error(f"Failed to collect crypto data: {e}")
            db.rollback()
    
    async def _collect_stock_data(self, db, tickers: List[str], asset_type: str):
        """주식/ETF/Fund 데이터 수집"""
        try:
            # Assets 테이블에서 data_source 확인하여 적절한 API 선택
            from ..models.asset import Asset
            
            # 각 티커별로 data_source 확인
            for ticker in tickers:
                asset = db.query(Asset).filter(Asset.ticker == ticker).first()
                data_source = asset.data_source if asset else 'twelvedata'
                
                if data_source == 'twelvedata':
                    # TwelveData에서 데이터 조회
                    price_data = await self.twelvedata_client.get_quote(ticker)
                elif data_source == 'tiingo':
                    # Tiingo에서 데이터 조회
                    price_data = await self.tiingo_client.get_quote(ticker)
                else:
                    # 기본값으로 TwelveData 사용
                    price_data = await self.twelvedata_client.get_quote(ticker)
                
                if price_data:
                    quote = RealtimeQuote(
                        ticker=ticker,
                        asset_type=asset_type,
                        price=price_data.get('close') if data_source == 'twelvedata' else price_data.get('last'),
                        change_percent_today=price_data.get('percent_change') if data_source == 'twelvedata' else price_data.get('changePercent'),
                        volume_today=price_data.get('volume'),
                        data_source=data_source,
                        currency="USD"
                    )
                    
                    # Upsert 로직
                    existing = db.query(RealtimeQuote).filter(
                        RealtimeQuote.ticker == ticker,
                        RealtimeQuote.asset_type == asset_type
                    ).first()
                    
                    if existing:
                        existing.price = quote.price
                        existing.change_percent_today = quote.change_percent_today
                        existing.volume_today = quote.volume_today
                        existing.fetched_at = datetime.now()
                    else:
                        db.add(quote)
            
            db.commit()
            logger.info(f"Collected {asset_type} data for {len(tickers)} tickers")
            
        except Exception as e:
            logger.error(f"Failed to collect {asset_type} data: {e}")
            db.rollback()
    
    async def _collect_commodity_data(self, db, tickers: List[str]):
        """상품 데이터 수집"""
        try:
            # Tiingo에서 데이터 조회
            quotes = await self.tiingo_client.get_batch_quotes(tickers)
            
            for ticker, quote_data in quotes.items():
                quote = RealtimeQuote(
                    ticker=ticker,
                    asset_type="Commodities",
                    price=quote_data.get('last'),
                    change_percent_today=quote_data.get('changePercent'),
                    volume_today=quote_data.get('volume'),
                    data_source="tiingo",
                    currency="USD"
                )
                
                # Upsert 로직
                existing = db.query(RealtimeQuote).filter(
                    RealtimeQuote.ticker == ticker,
                    RealtimeQuote.asset_type == "Commodities"
                ).first()
                
                if existing:
                    existing.price = quote.price
                    existing.change_percent_today = quote.change_percent_today
                    existing.volume_today = quote.volume_today
                    existing.fetched_at = datetime.now()
                else:
                    db.add(quote)
            
            db.commit()
            logger.info(f"Collected commodity data for {len(tickers)} tickers")
            
        except Exception as e:
            logger.error(f"Failed to collect commodity data: {e}")
            db.rollback()
    
    async def stop_collectors(self):
        """실시간 수집기 중지"""
        try:
            # WebSocket 중지
            await self.consumer.stop()
            logger.info("Tiingo WebSocket stopped")
            
            # 스케줄러 중지
            await self.scheduler.stop()
            logger.info("Realtime scheduler stopped")
            
            return {
                'success': True,
                'message': 'Realtime collectors stopped successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to stop realtime collectors: {e}")
            return {
                'success': False,
                'message': f'Failed to stop realtime collectors: {str(e)}'
            }
    
    def get_status(self) -> Dict[str, Any]:
        """수집기 상태 조회"""
        try:
            return {
                'websocket': {
                    'running': not self.consumer._task.done() if self.consumer._task else False,
                    'subscriptions': self.consumer.list_subscriptions(),
                    'last_connect_at': self.consumer.last_connect_at,
                    'last_tick_at': self.consumer.last_tick_at,
                    'last_error': self.consumer.last_error,
                },
                'scheduler': {
                    'status': self.scheduler.status(),
                    'intervals': self.scheduler.intervals
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get collector status: {e}")
            return {
                'error': str(e)
            }
