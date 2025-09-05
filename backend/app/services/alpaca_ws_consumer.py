"""
Alpaca Markets WebSocket Consumer
실시간 주식 데이터를 수신하여 Redis Stream으로 전송하는 서비스
"""

import asyncio
import json
import logging
import os
import signal
import sys
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Set
import redis.asyncio as redis
from alpaca_trade_api.stream import Stream

from ..core.config import GLOBAL_APP_CONFIGS
from ..core.database import SessionLocal
from ..models.asset import Asset

# 로깅 설정
logger = logging.getLogger(__name__)

# Redis Stream 키
REDIS_STREAM_KEY = "alpaca_realtime_stream"

# Alpaca API 설정
ALPACA_API_KEY = os.getenv("ALPACA_API_KEY")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")
ALPACA_PAPER = os.getenv("ALPACA_PAPER", "true").lower() == "true"  # Paper Trading 사용 여부

class AlpacaWSConsumer:
    """
    Alpaca Markets WebSocket Consumer
    - 실시간 거래 데이터를 수신하여 Redis Stream으로 전송
    - 기존 Tiingo WebSocket과 동일한 아키텍처 사용
    """
    
    def __init__(self):
        self.stream = None
        self.redis_client = None
        self._tickers: Set[str] = set()
        self._running = False
        self._stop_event = asyncio.Event()
        
        # Redis 설정
        self.redis_host = GLOBAL_APP_CONFIGS.get("REDIS_HOST", "redis")
        self.redis_port = GLOBAL_APP_CONFIGS.get("REDIS_PORT", 6379)
        self.redis_db = GLOBAL_APP_CONFIGS.get("REDIS_DB", 0)
        self.redis_password = GLOBAL_APP_CONFIGS.get("REDIS_PASSWORD")
        
        # 상태 정보
        self.last_tick_at = None
        self.total_messages_received = 0
        self.total_messages_stored = 0
        self.last_error = None
        
        # API 키 검증
        if not ALPACA_API_KEY or not ALPACA_SECRET_KEY:
            raise ValueError("ALPACA_API_KEY와 ALPACA_SECRET_KEY가 설정되지 않았습니다.")
    
    async def _connect_redis(self):
        """Redis에 연결"""
        try:
            self.redis_client = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                db=self.redis_db,
                password=self.redis_password,
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info(f"Redis에 연결되었습니다: {self.redis_host}:{self.redis_port}")
        except Exception as e:
            logger.error(f"Redis 연결 실패: {e}")
            raise
    
    async def _store_to_redis(self, data: Dict):
        """데이터를 Redis Stream에 저장"""
        if not self.redis_client:
            return
        
        try:
            await self.redis_client.xadd(
                REDIS_STREAM_KEY,
                {"data": json.dumps(data)}
            )
            self.total_messages_stored += 1
        except Exception as e:
            logger.error(f"Redis 저장 실패: {e}")
            self.last_error = str(e)
    
    def _is_market_open(self, now: datetime) -> bool:
        """미국 주식시장 개장시간 확인 (한국 시간 기준)"""
        # 한국 시간으로 변환 (UTC+9)
        kst_time = now.replace(tzinfo=timezone.utc).astimezone(timezone(timedelta(hours=9)))
        
        # 주말 체크
        if kst_time.weekday() >= 5:  # 토요일(5), 일요일(6)
            return False
        
        # 미국 동부시간 기준 개장시간 (한국시간 22:30 ~ 다음날 05:00)
        hour = kst_time.hour
        
        # 같은 날 22:30 이후 또는 다음날 05:00 이전
        if hour >= 22 or hour < 5:
            return True
        
        return False
    
    async def _get_last_price_from_db(self, ticker: str) -> Optional[float]:
        """DB에서 해당 티커의 마지막 가격 조회"""
        try:
            db = SessionLocal()
            asset = db.query(Asset).filter(Asset.ticker == ticker).first()
            if asset and hasattr(asset, 'last_price') and asset.last_price:
                return float(asset.last_price)
        except Exception as e:
            logger.error(f"DB에서 {ticker} 마지막 가격 조회 실패: {e}")
        finally:
            db.close()
        return None
    
    async def _check_existing_today_data(self, ticker: str) -> bool:
        """오늘 해당 티커의 데이터가 이미 있는지 확인"""
        try:
            db = SessionLocal()
            today = datetime.utcnow().date()
            
            # realtime_quotes 테이블에서 오늘 데이터 확인
            from ..models.asset import RealtimeQuote
            existing = db.query(RealtimeQuote).filter(
                RealtimeQuote.ticker == ticker,
                RealtimeQuote.fetched_at >= today
            ).first()
            
            return existing is not None
        except Exception as e:
            logger.error(f"오늘 데이터 확인 실패 {ticker}: {e}")
            return False
        finally:
            db.close()
    
    async def _handle_initial_data(self, tickers: List[str]):
        """개장시간에 따른 초기 데이터 처리"""
        if not tickers or not self.redis_client:
            return
        
        is_market_open = self._is_market_open(datetime.utcnow())
        logger.info(f"미국 주식시장 상태: {'개장' if is_market_open else '폐장'}")
        
        for ticker in tickers:
            try:
                # 오늘 데이터가 이미 있는지 확인
                has_today_data = await self._check_existing_today_data(ticker)
                
                if has_today_data:
                    logger.info(f"{ticker}: 오늘 데이터가 이미 존재합니다. 건너뜁니다.")
                    continue
                
                if is_market_open:
                    # 개장시간: WebSocket 연결 후 실시간 데이터 수신 대기
                    logger.info(f"{ticker}: 개장시간 - 실시간 데이터 수신 대기")
                    continue
                else:
                    # 폐장시간: DB에서 마지막 가격 조회하여 저장
                    last_price = await self._get_last_price_from_db(ticker)
                    
                    if last_price:
                        # DB에서 가져온 마지막 가격으로 데이터 생성
                        initial_data = {
                            "timestamp": datetime.utcnow().isoformat(),
                            "ticker": ticker,
                            "price": last_price,
                            "volume": 0.0,  # 폐장시간이므로 거래량 0
                            "prev_close": last_price,
                            "change_percent": 0.0,
                            "data_source": "alpaca_db_last_price"
                        }
                        
                        await self.redis_client.xadd(
                            REDIS_STREAM_KEY, 
                            {"data": json.dumps(initial_data)}
                        )
                        logger.info(f"{ticker}: 폐장시간 - DB 마지막 가격 사용 ({last_price})")
                    else:
                        # DB에 데이터가 없으면 기본값 사용
                        default_prices = {
                            "AAPL": 150.0, "MSFT": 300.0, "GOOGL": 140.0, "AMZN": 130.0,
                            "TSLA": 200.0, "NVDA": 400.0, "META": 250.0, "NFLX": 500.0
                        }
                        price = default_prices.get(ticker, 100.0)
                        
                        initial_data = {
                            "timestamp": datetime.utcnow().isoformat(),
                            "ticker": ticker,
                            "price": price,
                            "volume": 0.0,
                            "prev_close": price,
                            "change_percent": 0.0,
                            "data_source": "alpaca_default_price"
                        }
                        
                        await self.redis_client.xadd(
                            REDIS_STREAM_KEY, 
                            {"data": json.dumps(initial_data)}
                        )
                        logger.info(f"{ticker}: 폐장시간 - 기본 가격 사용 ({price})")
                        
            except Exception as e:
                logger.error(f"{ticker} 초기 데이터 처리 실패: {e}")
    
    async def trade_handler(self, trade_data):
        """실시간 거래 데이터 핸들러"""
        try:
            self.total_messages_received += 1
            self.last_tick_at = datetime.utcnow()
            
            # Alpaca 거래 데이터를 표준 형식으로 변환
            data = {
                "timestamp": trade_data.timestamp.isoformat() if hasattr(trade_data.timestamp, 'isoformat') else datetime.utcnow().isoformat(),
                "ticker": trade_data.symbol,
                "price": float(trade_data.price),
                "volume": float(trade_data.size),
                "prev_close": None,  # Alpaca는 이전 종가를 제공하지 않음
                "change_percent": None,
                "data_source": "alpaca_realtime"
            }
            
            # Redis Stream에 저장
            await self._store_to_redis(data)
            
            logger.debug(f"Alpaca 실시간 데이터 수신: {trade_data.symbol} ${trade_data.price:,.2f} ({trade_data.size} shares)")
            
        except Exception as e:
            logger.error(f"거래 데이터 처리 실패: {e}")
            self.last_error = str(e)
    
    async def start(self, tickers: List[str]):
        """Alpaca WebSocket Consumer 시작"""
        self._tickers = {t.upper() for t in tickers or []}
        
        if not self._tickers:
            logger.warning("구독할 티커가 없습니다.")
            return
        
        logger.info(f"Alpaca WebSocket Consumer 시작: {list(self._tickers)}")
        
        # Redis 연결
        await self._connect_redis()
        
        # 개장시간 확인 및 초기 데이터 처리
        await self._handle_initial_data(list(self._tickers))
        
        self.last_tick_at = None
        self._running = True
        
        # Alpaca Stream 설정
        self.stream = Stream(
            ALPACA_API_KEY, 
            ALPACA_SECRET_KEY, 
            data_feed='iex'  # IEX 데이터 피드 사용
        )
        
        # 각 티커에 대해 거래 데이터 구독
        for ticker in self._tickers:
            self.stream.subscribe_trades(self.trade_handler, ticker)
        
        logger.info(f"Alpaca WebSocket 구독 완료: {list(self._tickers)}")
        
        # 스트림 실행 (연결 제한 처리)
        max_retries = 3
        retry_count = 0
        retry_delay = 60  # 60초 대기
        
        while self._running and retry_count < max_retries:
            try:
                logger.info(f"Alpaca Stream 연결 시도 {retry_count + 1}/{max_retries}")
                await self.stream._run_forever()
                break  # 성공적으로 실행되면 루프 종료
            except ValueError as e:
                if "connection limit exceeded" in str(e):
                    retry_count += 1
                    logger.warning(f"연결 제한 초과 (시도 {retry_count}/{max_retries}). {retry_delay}초 후 재시도...")
                    self.last_error = f"Connection limit exceeded (attempt {retry_count}/{max_retries})"
                    
                    if retry_count >= max_retries:
                        logger.error("최대 재시도 횟수 초과. 연결을 포기합니다.")
                        break
                    
                    # 재시도 전 대기
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # 지수 백오프
                    
                    # 새로운 Stream 객체 생성
                    try:
                        if self.stream:
                            await self.stream.close()
                    except:
                        pass
                    
                    self.stream = Stream(
                        ALPACA_API_KEY, 
                        ALPACA_SECRET_KEY, 
                        data_feed='iex'
                    )
                    
                    # 다시 구독
                    for ticker in self._tickers:
                        self.stream.subscribe_trades(self.trade_handler, ticker)
                        
                else:
                    logger.error(f"Alpaca Stream 실행 오류: {e}")
                    self.last_error = str(e)
                    break
            except Exception as e:
                logger.error(f"Alpaca Stream 실행 오류: {e}")
                self.last_error = str(e)
                break
        else:
            if retry_count >= max_retries:
                logger.error("연결 제한으로 인해 Alpaca Stream을 시작할 수 없습니다.")
                self.last_error = "Connection limit exceeded after max retries"
        
        self._running = False
    
    async def stop(self):
        """Consumer 중지"""
        logger.info("Alpaca WebSocket Consumer 중지 신호가 전송되었습니다")
        self._running = False
        self._stop_event.set()
        
        if self.stream:
            try:
                await self.stream.close()
            except Exception as e:
                logger.error(f"Stream 종료 오류: {e}")
        
        if self.redis_client:
            try:
                await self.redis_client.close()
                logger.info("Redis 연결이 종료되었습니다")
            except Exception as e:
                logger.error(f"Redis 연결 종료 오류: {e}")
    
    def get_status(self) -> Dict:
        """현재 상태 정보 반환"""
        return {
            "is_connected": self._running,
            "subscriptions": list(self._tickers),
            "last_connect_at": None,  # Alpaca는 연결 시간 정보를 제공하지 않음
            "last_tick_at": self.last_tick_at.isoformat() if self.last_tick_at else None,
            "last_error": self.last_error,
            "total_messages_received": self.total_messages_received,
            "total_messages_stored": self.total_messages_stored,
            "redis_connected": self.redis_client is not None
        }

# 시그널 핸들러 설정
def signal_handler(signum, frame):
    """시그널 핸들러"""
    logger.info(f"시그널 {signum} 수신, 프로그램 종료")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

if __name__ == "__main__":
    # 로깅 설정
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # 테스트용 실행
    async def test_run():
        consumer = AlpacaWSConsumer()
        try:
            await consumer.start(['AAPL', 'MSFT', 'GOOGL'])
        except KeyboardInterrupt:
            logger.info("사용자에 의해 중단됨")
        finally:
            await consumer.stop()
    
    asyncio.run(test_run())
