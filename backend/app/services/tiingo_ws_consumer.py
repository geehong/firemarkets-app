"""
Async Tiingo WebSocket consumer: subscribes to tickers and stores real-time data in Redis streams.
This file focuses solely on receiving data and storing it in Redis for later batch processing.
"""
import asyncio
import json
import logging
import os
import signal
import sys
import websockets
import redis.asyncio as redis
from datetime import datetime
from typing import List, Optional, Set

from ..core.config import GLOBAL_APP_CONFIGS

logger = logging.getLogger(__name__)

# Redis Stream Key for real-time data
REDIS_STREAM_KEY = "tiingo_realtime_stream"

class TiingoWSConsumer:
    """
    Tiingo WebSocket Consumer - 전문 수신자 역할
    - 24시간 내내 Tiingo 웹소켓에 연결
    - 실시간 가격 데이터를 Redis Stream에 저장
    - 데이터베이스 직접 저장하지 않음 (부하 방지)
    """
    
    def __init__(self, auth_token: Optional[str] = None, service: str = "iex"):
        # API 키 설정 (명시적 토큰 -> 전역 설정 -> 환경변수 순서)
        self.auth_token = auth_token or GLOBAL_APP_CONFIGS.get("TIINGO_API_KEY") or os.getenv("TIINGO_API_KEY")
        self.service = service
        self.ws_url = "wss://api.tiingo.com/iex" if service == "iex" else "wss://api.tiingo.com/test"
        
        # Redis 설정
        self.redis_host = GLOBAL_APP_CONFIGS.get("REDIS_HOST", "redis")  # Docker Compose에서는 'redis' 서비스명 사용
        self.redis_port = GLOBAL_APP_CONFIGS.get("REDIS_PORT", 6379)
        self.redis_db = GLOBAL_APP_CONFIGS.get("REDIS_DB", 0)
        self.redis_password = GLOBAL_APP_CONFIGS.get("REDIS_PASSWORD")
        
        # 상태 관리
        self._task: Optional[asyncio.Task] = None
        self._stop = asyncio.Event()
        self._tickers: Set[str] = set()
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self.redis_client: Optional[redis.Redis] = None
        
        # 모니터링
        self.last_connect_at: Optional[datetime] = None
        self.last_tick_at: Optional[datetime] = None
        self.last_error: Optional[str] = None
        self._last_sub_payload: Optional[dict] = None
        self._no_tick_backfill_seconds: int = 120
        
        # 연결 상태
        self.is_connected = False
        self.total_messages_received = 0
        self.total_messages_stored = 0

    def list_subscriptions(self) -> List[str]:
        """현재 구독 중인 티커 목록 반환"""
        return sorted(self._tickers)

    async def add_tickers(self, tickers: List[str]):
        """새로운 티커 추가"""
        new_set = {t.upper() for t in tickers or []}
        if not new_set:
            return
        self._tickers |= new_set
        await self._send_subscribe()

    async def remove_tickers(self, tickers: List[str]):
        """티커 제거"""
        rem_set = {t.upper() for t in tickers or []}
        self._tickers -= rem_set
        await self._send_subscribe()

    async def start(self, tickers: List[str]):
        """WebSocket 컨슈머 시작"""
        self._tickers = {t.upper() for t in tickers or []}
        self._stop.clear()
        
        if not self.auth_token:
            logger.error("Tiingo WebSocket 인증 토큰이 설정되지 않았습니다")
            return
        
        # Redis 연결 초기화
        await self._connect_redis()
        
        # 개장시간 확인 및 초기 데이터 처리
        await self._handle_initial_data(list(self._tickers))
        
        self.last_tick_at = None
        
        if self._task and not self._task.done():
            logger.info("Tiingo WebSocket 컨슈머가 이미 실행 중입니다")
            # 구독 새로고침
            await self._send_subscribe()
            return
        
        self._task = asyncio.create_task(self._run())
        logger.info(f"Tiingo WebSocket 컨슈머가 시작되었습니다: {sorted(self._tickers)}")

    async def stop(self):
        """WebSocket 컨슈머 중지"""
        self._stop.set()
        if self._task:
            await asyncio.sleep(0)
            logger.info("Tiingo WebSocket 컨슈머 중지 신호가 전송되었습니다")

    async def _connect_redis(self):
        """Redis 연결 초기화"""
        try:
            redis_url = f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"
            if self.redis_password:
                redis_url = f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
            
            self.redis_client = await redis.from_url(redis_url)
            logger.info(f"Redis에 연결되었습니다: {self.redis_host}:{self.redis_port}")
        except Exception as e:
            logger.error(f"Redis 연결 실패: {e}")
            self.redis_client = None

    async def _run(self):
        """메인 실행 루프"""
        backoff = 1
        while not self._stop.is_set():
            try:
                if not self.auth_token:
                    logger.error("Tiingo WebSocket 인증 토큰이 설정되지 않았습니다")
                    await asyncio.sleep(10)
                    continue
                
                async with websockets.connect(self.ws_url, ping_interval=20, ping_timeout=20) as ws:
                    self._ws = ws
                    self.last_connect_at = datetime.utcnow()
                    self.is_connected = True
                    
                    await self._send_subscribe()
                    backoff = 1
                    
                    while not self._stop.is_set():
                        try:
                            raw = await asyncio.wait_for(ws.recv(), timeout=30)
                            await self._handle_message(raw)
                        except asyncio.TimeoutError:
                            # Heartbeat: 일정 시간 틱이 없으면 로그만 출력
                            if self._should_backfill_due_to_no_ticks():
                                logger.info("일정 시간 틱이 없습니다. WebSocket 연결 상태를 확인합니다.")
                            # 스트림을 활성 상태로 유지하기 위해 구독 재전송
                            await self._send_subscribe()
                            continue
                            
            except Exception as e:
                self.is_connected = False
                logger.warning(f"Tiingo WebSocket 오류: {e}; {backoff}초 후 재연결 시도")
                self.last_error = str(e)
                self._ws = None
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60)

    async def _send_subscribe(self):
        """구독 메시지 전송"""
        if not self._tickers:
            return
        
        payload = {
            "eventName": "subscribe",
            "eventData": {
                "authToken": self.auth_token,
                "tickers": sorted(list(self._tickers)),
            },
        }
        
        try:
            if self._ws is not None:
                await self._ws.send(json.dumps(payload))
                self._last_sub_payload = payload
                logger.info(f"Tiingo WebSocket {self.ws_url}에 구독 요청 전송: {sorted(self._tickers)}")
        except Exception as e:
            logger.warning(f"구독 메시지 전송 실패: {e}")

    async def _handle_message(self, raw: str):
        """WebSocket 메시지 처리"""
        try:
            msg = json.loads(raw)
        except Exception:
            logger.debug(f"JSON이 아닌 WebSocket 메시지: {raw}")
            return
        
        self.total_messages_received += 1
        
        mtype = msg.get("messageType")
        
        if mtype == "H":
            # Heartbeat 메시지
            logger.debug(f"[{datetime.now().strftime('%H:%M:%S')}] --- Heartbeat ---")
            return
        
        if mtype in ("I", "E"):
            # 정보/오류 메시지
            logger.info(f"Tiingo WebSocket 정보: {msg}")
            return
        
        data = msg.get("data")
        if not data:
            logger.warning("Tiingo WebSocket: 데이터가 없는 메시지 수신")
            return
        
        # 데이터 메시지 처리 (단일 객체 또는 리스트)
        if isinstance(data, dict):
            await self._store_to_redis(data)
        elif isinstance(data, list):
            logger.info(f"Tiingo WebSocket: {len(data)}개의 데이터 메시지 수신")
            for item in data:
                await self._store_to_redis(item)

    async def _store_to_redis(self, item: dict):
        """데이터를 Redis Stream에 저장"""
        try:
            # Tiingo IEX 페이로드 필드 처리
            ticker = (item.get("ticker") or item.get("symbol") or "").upper()
            if not ticker:
                logger.warning(f"Tiingo WebSocket: 티커 정보가 없는 데이터 수신: {item}")
                return
            
            price = item.get("last") or item.get("price") or item.get("close")
            volume = item.get("volume")
            prev_close = item.get("prevClose") or item.get("open")
            
            # 변화율 계산
            change_pct = None
            try:
                if price is not None and prev_close is not None:
                    change_pct = ((float(price) - float(prev_close)) / float(prev_close)) * 100.0
            except Exception:
                change_pct = None
            
            # 시장 개장 여부 확인
            is_market_open = self._is_market_open()
            market_status = "개장" if is_market_open else "폐장"
            
            # Redis Stream에 저장할 데이터 구조
            trade_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "ticker": ticker,
                "price": float(price) if price is not None else 0.0,
                "volume": float(volume) if volume is not None else 0.0,
                "prev_close": float(prev_close) if prev_close is not None else 0.0,
                "change_percent": float(change_pct) if change_pct is not None else 0.0,
                "data_source": "tiingo_ws"
            }
            
            # Redis Stream에 데이터 추가
            if self.redis_client:
                await self.redis_client.xadd(
                    REDIS_STREAM_KEY, 
                    {"data": json.dumps(trade_data)}
                )
                self.total_messages_stored += 1
                self.last_tick_at = datetime.utcnow()
                
                # 상세 로깅 (시장 개장 시 더 자세한 정보)
                if is_market_open:
                    logger.info(f"🔥 [시장개장] Tiingo 실시간 데이터 수신: {ticker} | 가격: ${trade_data['price']:,.2f} | 거래량: {trade_data['volume']:,.0f} | 변화율: {trade_data['change_percent']:+.2f}% | 이전종가: ${trade_data['prev_close']:,.2f}")
                else:
                    logger.info(f"🌙 [시장폐장] Tiingo 데이터 수신: {ticker} | 가격: ${trade_data['price']:,.2f} | 거래량: {trade_data['volume']:,.0f} | 변화율: {trade_data['change_percent']:+.2f}%")
            else:
                logger.error(f"Tiingo WebSocket: Redis 클라이언트가 연결되지 않음 - {ticker} 데이터 저장 실패")
            
        except Exception as e:
            logger.error(f"Tiingo WebSocket: Redis Stream 저장 실패 ({ticker}): {e}")
            logger.error(f"Tiingo WebSocket: 실패한 데이터: {item}")

    def _should_backfill_due_to_no_ticks(self) -> bool:
        """일정 시간 틱이 없을 때 백필이 필요한지 확인"""
        if self.last_tick_at is None:
            return False
        
        # 마지막 틱으로부터 2분 이상 경과했으면 백필 필요
        time_since_last_tick = datetime.utcnow() - self.last_tick_at
        return time_since_last_tick.total_seconds() > self._no_tick_backfill_seconds

    def get_status(self) -> dict:
        """컨슈머 상태 정보 반환"""
        return {
            "is_connected": self.is_connected,
            "subscriptions": sorted(self._tickers),
            "last_connect_at": self.last_connect_at.isoformat() if self.last_connect_at else None,
            "last_tick_at": self.last_tick_at.isoformat() if self.last_tick_at else None,
            "last_error": self.last_error,
            "total_messages_received": self.total_messages_received,
            "total_messages_stored": self.total_messages_stored,
            "redis_connected": self.redis_client is not None
        }

    def _is_market_open(self) -> bool:
        """미국 주식시장 개장시간 확인 (한국 시간 기준)"""
        now = datetime.utcnow()
        korea_time = now.replace(tzinfo=None)  # UTC 기준
        
        # 한국 시간으로 변환 (UTC+9)
        korea_hour = (korea_time.hour + 9) % 24
        korea_weekday = (korea_time.weekday() + 1) % 7  # 0=월요일, 6=일요일
        
        # 미국 주식시장 개장시간 (한국 시간 기준)
        # 월-금: 23:30 ~ 06:00 (다음날)
        if korea_weekday >= 5:  # 토, 일
            return False
        
        # 개장시간: 23:30 ~ 06:00 (다음날)
        if 23 <= korea_hour or korea_hour <= 6:
            return True
        
        return False

    async def _get_last_price_from_db(self, ticker: str) -> Optional[float]:
        """DB에서 해당 티커의 마지막 가격 조회"""
        try:
            from ..core.database import SessionLocal
            from ..models.asset import RealtimeQuote
            
            db = SessionLocal()
            try:
                # 가장 최근 가격 조회
                latest_quote = db.query(RealtimeQuote).filter(
                    RealtimeQuote.ticker == ticker
                ).order_by(RealtimeQuote.fetched_at.desc()).first()
                
                if latest_quote:
                    return float(latest_quote.price)
                return None
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"DB에서 {ticker} 마지막 가격 조회 실패: {e}")
            return None

    async def _check_existing_today_data(self, ticker: str) -> bool:
        """오늘 해당 티커의 데이터가 이미 있는지 확인"""
        try:
            from ..core.database import SessionLocal
            from ..models.asset import RealtimeQuote
            
            db = SessionLocal()
            try:
                today = datetime.utcnow().date()
                
                # 오늘 데이터 확인
                existing_data = db.query(RealtimeQuote).filter(
                    RealtimeQuote.ticker == ticker,
                    RealtimeQuote.fetched_at >= today
                ).first()
                
                return existing_data is not None
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"오늘 {ticker} 데이터 확인 실패: {e}")
            return False

    async def _handle_initial_data(self, tickers: List[str]):
        """개장시간에 따른 초기 데이터 처리"""
        if not tickers or not self.redis_client:
            return
        
        is_market_open = self._is_market_open()
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
                            "data_source": "db_last_price"
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
                            "data_source": "default_price"
                        }
                        
                        await self.redis_client.xadd(
                            REDIS_STREAM_KEY, 
                            {"data": json.dumps(initial_data)}
                        )
                        logger.info(f"{ticker}: 폐장시간 - 기본 가격 사용 ({price})")
                        
            except Exception as e:
                logger.error(f"{ticker} 초기 데이터 처리 실패: {e}")

    async def _check_recent_data_exists(self) -> bool:
        """Redis에 최근 데이터가 있는지 확인 (5분 이내)"""
        try:
            if not self.redis_client:
                return False
            
            # Redis Stream 길이 확인
            stream_info = await self.redis_client.xlen(REDIS_STREAM_KEY)
            if stream_info > 0:
                # 최근 5분 이내 데이터가 있는지 확인
                five_minutes_ago = int((datetime.utcnow().timestamp() - 300) * 1000)
                recent_messages = await self.redis_client.xrange(
                    REDIS_STREAM_KEY, 
                    min=five_minutes_ago, 
                    max="+", 
                    count=1
                )
                return len(recent_messages) > 0
            
            return False
        except Exception as e:
            logger.warning(f"최근 데이터 확인 실패: {e}")
            return False

    async def _backfill_with_defaults(self, tickers: List[str]):
        """기본값으로 백필 (API 호출 없음)"""
        try:
            for ticker in tickers:
                # 티커별 현실적인 기본 가격 설정
                default_prices = {
                    "AAPL": 150.0, "MSFT": 300.0, "GOOGL": 140.0, "AMZN": 130.0,
                    "TSLA": 200.0, "NVDA": 400.0, "META": 250.0, "NFLX": 500.0
                }
                price = default_prices.get(ticker, 100.0)
                volume = 1000000.0
                change_percent = 0.0
                
                backfill_data = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "ticker": ticker,
                    "price": price,
                    "volume": volume,
                    "prev_close": price,
                    "change_percent": change_percent,
                    "data_source": "tiingo_backfill_default"
                }
                
                await self.redis_client.xadd(
                    REDIS_STREAM_KEY, 
                    {"data": json.dumps(backfill_data)}
                )
            
            logger.info(f"기본값으로 백필 데이터가 Redis Stream에 저장되었습니다: {len(tickers)} 티커")
            
        except Exception as e:
            logger.error(f"기본값 백필 실패: {e}")

    async def cleanup(self):
        """리소스 정리"""
        try:
            if self.redis_client:
                await self.redis_client.close()
                logger.info("Redis 연결이 종료되었습니다")
        except Exception as e:
            logger.error(f"Redis 연결 종료 중 오류: {e}")


# Singleton manager
_consumer: Optional[TiingoWSConsumer] = None

def get_consumer() -> TiingoWSConsumer:
    """싱글톤 컨슈머 인스턴스 반환"""
    global _consumer
    if _consumer is None:
        _consumer = TiingoWSConsumer()
    return _consumer


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
        consumer = TiingoWSConsumer()
        try:
            # 기본 티커들로 시작 (주식 + 암호화폐)
            await consumer.start(['AAPL', 'MSFT', 'GOOGL', 'BTCUSD', 'ETHUSD', 'ADAUSD'])
            
            # 무한 대기 (실제 운영에서는 다른 방식으로 관리)
            while True:
                await asyncio.sleep(60)
                status = consumer.get_status()
                is_market_open = consumer._is_market_open()
                market_status = "개장" if is_market_open else "폐장"
                
                logger.info(f"📊 Tiingo Consumer 상태 [{market_status}]: 연결={status['is_connected']} | 구독={len(status['subscriptions'])}개 | 수신={status['total_messages_received']}개 | 저장={status['total_messages_stored']}개 | 마지막틱={status['last_tick_at']} | 오류={status['last_error']}")
                
        except KeyboardInterrupt:
            logger.info("사용자에 의해 중단됨")
        except Exception as e:
            logger.error(f"Tiingo Consumer 실행 중 오류: {e}")
        finally:
            await consumer.cleanup()
    
    asyncio.run(test_run())
