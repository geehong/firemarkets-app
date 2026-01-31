"""
WebSocket Broadcaster Service
- Connects to Redis Pub/Sub.
- Listens for real-time quote messages.
- Forwards messages to the main backend service via an internal Socket.IO connection.
"""

import asyncio
import json
import logging
import os
import signal
import sys
import time
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, List

import redis.asyncio as redis
from redis import exceptions
import socketio

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

from app.core.config import GLOBAL_APP_CONFIGS, load_and_set_global_configs
from app.utils.helpers import safe_float

# 로깅 설정 (환경변수로 상세 로그 제어)
verbose = os.getenv("BROADCASTER_VERBOSE", "false").lower() == "true"
log_level = logging.DEBUG if verbose else logging.INFO

logging.basicConfig(level=log_level, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

import sys
_sh = logging.StreamHandler(sys.stdout)
_sh.setLevel(log_level)
_sh.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
root_logger = logging.getLogger()
root_logger.handlers = []
root_logger.addHandler(_sh)
root_logger.setLevel(log_level)

logger = logging.getLogger("WebSocketBroadcaster")
logger.setLevel(log_level)

# 전역 설정 로드
try:
    load_and_set_global_configs()
    logger.info("✅ Global configurations loaded.")
except Exception as e:
    logger.error(f"❌ Failed to load global configurations: {e}")

# Socket.IO 클라이언트 설정 (백엔드 서버에 연결)
# reconnection=True, reconnection_attempts=0 (무한), reconnection_delay=1 (1초)
sio_client = socketio.AsyncClient(
    logger=verbose, 
    engineio_logger=verbose,
    reconnection=True,
    reconnection_attempts=0,
    reconnection_delay=1,
    reconnection_delay_max=5
)

# --- Broadcaster 전용 상태 및 캐시 관리 ---

ticker_to_asset_id_cache: Dict[str, int] = {}
ticker_to_asset_type_cache: Dict[str, str] = {}
last_asset_cache_refresh: Optional[datetime] = None
asset_cache_refresh_interval = timedelta(minutes=10)

# REALTIME_STREAMS 설정이 없을 경우를 대비한 기본값
default_streams = ["binance:realtime", "coinbase:realtime", "finnhub:realtime", "alpaca:realtime", "swissquote:realtime"]
stream_names = GLOBAL_APP_CONFIGS.get("REALTIME_STREAMS", default_streams)
realtime_streams = {
    stream: f"{stream.split(':')[0]}_broadcaster_group" for stream in stream_names
}



@sio_client.event
async def connect():
    logger.info("✅ 'backend' 서비스에 성공적으로 연결되었습니다.")


@sio_client.event
async def disconnect():
    logger.warning("🔌 'backend' 서비스와의 연결이 끊어졌습니다.")


async def _refresh_asset_cache():
    """DB에서 Ticker -> Asset ID 맵을 가져와 캐시합니다."""
    global ticker_to_asset_id_cache, last_asset_cache_refresh
    logger.debug("🔄 Ticker-AssetID 캐시 갱신 시작...")
    from app.core.database import get_async_session_local
    from app.models.asset import Asset, AssetType
    from sqlalchemy.future import select

    session_local = get_async_session_local()
    async with session_local() as session:
        try:
            # Asset과 AssetType을 조인하여 type_name도 함께 조회
            stmt = select(Asset.ticker, Asset.asset_id, AssetType.type_name).join(AssetType, Asset.asset_type_id == AssetType.asset_type_id)
            result = await session.execute(stmt)
            
            rows = result.all()
            ticker_to_asset_id_cache = {ticker: asset_id for ticker, asset_id, type_name in rows}
            ticker_to_asset_type_cache = {ticker: type_name for ticker, asset_id, type_name in rows}
            
            last_asset_cache_refresh = datetime.now(timezone.utc)
            logger.info(f"✅ Ticker-AssetID/Type 캐시 갱신 완료: {len(ticker_to_asset_id_cache)}개 자산")
        except Exception as e:
            logger.error(f"❌ Ticker-AssetID 캐시 갱신 실패: {e}")



async def listen_to_redis_and_broadcast():
    """Redis Stream을 구독하고 처리된 데이터를 백엔드로 전송하는 메인 로직"""
    redis_host = GLOBAL_APP_CONFIGS.get("REDIS_HOST", "redis")
    redis_port = GLOBAL_APP_CONFIGS.get("REDIS_PORT", 6379)
    redis_db = GLOBAL_APP_CONFIGS.get("REDIS_DB", 0)
    redis_password = GLOBAL_APP_CONFIGS.get("REDIS_PASSWORD")
    # DB 인덱스를 포함하여 URL 구성 (producer들과 동일한 DB 사용 보장)
    try:
        redis_db_int = int(redis_db) if redis_db is not None else 0
    except Exception:
        redis_db_int = 0

    redis_url = f"redis://{redis_host}:{redis_port}/{redis_db_int}"
    if redis_password:
        redis_url = f"redis://:{redis_password}@{redis_host}:{redis_port}/{redis_db_int}"

    logger.info(f"🔗 Redis Stream 리스너 시작: {redis_url}")

    while True:
        logger.debug("[Broadcaster] Main loop tick - preparing to connect to Redis")
        redis_client = None
        try:
            logger.debug("[Broadcaster] Connecting to Redis...")
            redis_client = await redis.from_url(redis_url)
            logger.debug("[Broadcaster] Redis connected. Creating/ensuring consumer groups...")
            for stream_name, group_name in realtime_streams.items():
                logger.debug(f"[Broadcaster] Ensure group '{group_name}' on stream '{stream_name}'")
                try:
                    # 먼저 스트림이 존재하는지 확인
                    stream_exists = await redis_client.exists(stream_name)
                    if not stream_exists:
                        logger.info(f"📝 스트림 '{stream_name}'이 존재하지 않음. 빈 스트림 생성 중...")
                        # 빈 스트림 생성 (더미 데이터로)
                        await redis_client.xadd(stream_name, {"init": "stream_created"}, maxlen=1, approximate=True)
                        logger.info(f"✅ 빈 스트림 '{stream_name}' 생성 완료")
                    
                    # Consumer Group 생성
                    await redis_client.xgroup_create(name=stream_name, groupname=group_name, id="0", mkstream=True)
                    logger.info(f"✅ Consumer Group 생성: {group_name} on {stream_name}")
                except exceptions.ResponseError as e:
                    if "BUSYGROUP" in str(e):
                        logger.debug(f"ℹ️ Consumer Group '{group_name}'가 이미 존재합니다.")
                    else:
                        logger.error(f"Consumer Group '{group_name}' 생성 중 오류: {e}", exc_info=True)

            logger.debug("[Broadcaster] Entering Redis read loop...")
            while True:
                # 주기적으로 캐시 갱신
                now = datetime.now(timezone.utc)
                if not last_asset_cache_refresh or (now - last_asset_cache_refresh) > asset_cache_refresh_interval:
                    logger.debug("[Broadcaster] Refreshing asset cache...")
                    await _refresh_asset_cache()

                # 연결 확인 및 대기 로직
                if not sio_client.connected:
                    logger.warning("⚠️ 백엔드와 연결되지 않음. 재연결 대기 중... (메시지 처리 일시 중지)")
                    while not sio_client.connected:
                        await asyncio.sleep(1)
                    logger.info("✅ 백엔드 재연결 완료! 메시지 처리 재개.")

                # 모든 스트림에서 데이터 읽기 (CPU 최적화)
                # block=1000으로 최대 1초 대기, 메시지 없으면 다음 스트림으로
                all_messages = []
                try:
                    for stream_name, group_name in realtime_streams.items():
                        try:
                            stream_data = await redis_client.xreadgroup(
                                groupname=group_name,
                                consumername="broadcaster",
                                streams={stream_name: ">"},
                                count=1000,  # 배치 크기 증가
                                block=1000  # 1초 대기 (메시지 있으면 즉시 반환)
                            )
                            if stream_data:
                                for stream_name_bytes, messages in stream_data:
                                    stream_name_str = stream_name_bytes.decode('utf-8') if isinstance(stream_name_bytes, bytes) else str(stream_name_bytes)
                                    logger.debug(f"📥 [BROADCASTER←REDIS] 스트림 '{stream_name_str}'에서 {len(messages)}개 메시지 수신")
                                all_messages.extend(stream_data)
                        except exceptions.ResponseError as e:
                            if "NOGROUP" in str(e):
                                logger.warning(f"⚠️ Consumer Group '{group_name}'가 스트림 '{stream_name}'에 존재하지 않음. 재생성 시도...")
                                try:
                                    await redis_client.xgroup_create(name=stream_name, groupname=group_name, id="$", mkstream=True)
                                    logger.info(f"✅ Consumer Group '{group_name}' 재생성 완료 (최신 위치에서 시작)")
                                except Exception as recreate_error:
                                    logger.error(f"❌ Consumer Group 재생성 실패: {recreate_error}")
                            else:
                                logger.error(f"스트림 '{stream_name}' 읽기 오류: {e}")
                            continue
                except Exception as read_error:
                    logger.error(f"스트림 읽기 중 오류: {read_error}")
                    await asyncio.sleep(2)
                    continue

                # 메시지가 없으면 짧게 대기 후 계속 (block=1000이므로 이미 대기함)
                if not all_messages:
                    await asyncio.sleep(0.1)  # 짧은 대기 후 다음 루프
                    continue

                for stream_name_bytes, messages in all_messages:
                    stream_name = stream_name_bytes.decode('utf-8') if isinstance(stream_name_bytes, bytes) else stream_name_bytes
                    group_name = realtime_streams.get(stream_name)

                    for message_id, message_data in messages:
                        try:
                            symbol = message_data.get(b'symbol', b'').decode('utf-8').upper()
                            price = safe_float(message_data.get(b'price', b'').decode('utf-8'))
                            volume = safe_float(message_data.get(b'volume', b'').decode('utf-8'))
                            provider = message_data.get(b'provider', b'unknown').decode('utf-8')

                            if not symbol or price is None:
                                continue

                            # 티커 형식 변환 (Coinbase: ETH-USD -> ETHUSDT, Binance: 그대로)
                            original_symbol = symbol
                            
                            # provider가 없으면 stream_name에서 추론
                            if provider == 'unknown' or not provider:
                                if 'coinbase' in stream_name.lower():
                                    provider = 'coinbase'
                                elif 'binance' in stream_name.lower():
                                    provider = 'binance'
                                elif 'finnhub' in stream_name.lower():
                                    provider = 'finnhub'
                            
                            # 티커 변환 로직
                            if symbol.endswith('-USD'):
                                # ETH-USD -> ETHUSDT 변환 (Coinbase 형식)
                                base = symbol[:-4]  # '-USD' 제거
                                symbol = f"{base}USDT"
                                logger.debug(f"🔄 티커 변환: {original_symbol} -> {symbol} (provider: {provider}, stream: {stream_name})")
                            elif not symbol.endswith('USDT') and provider == 'binance':
                                # Binance는 USDT 접미사가 없으면 추가
                                if not any(symbol.endswith(suffix) for suffix in ['USDT', 'BUSD', 'BTC', 'ETH']):
                                    symbol = f"{symbol}USDT"
                                    logger.debug(f"🔄 Binance 티커 변환: {original_symbol} -> {symbol}")

                            # 먼저 전체 심볼로 검색
                            asset_id = ticker_to_asset_id_cache.get(symbol)
                            ticker_for_broadcast = symbol  # 브로드캐스트에 사용할 티커
                            
                            # 없으면 원본 심볼로도 시도
                            if not asset_id and original_symbol != symbol:
                                asset_id = ticker_to_asset_id_cache.get(original_symbol)
                                if asset_id:
                                    ticker_for_broadcast = original_symbol
                                    logger.debug(f"🔍 변환된 심볼 '{symbol}' not found, using original: '{original_symbol}'")
                            
                            # 여전히 없으면 USDT 접미사 제거하여 검색
                            if not asset_id and symbol.endswith('USDT'):
                                symbol_for_db = symbol.replace('USDT', '')
                                asset_id = ticker_to_asset_id_cache.get(symbol_for_db)
                                if asset_id:
                                    ticker_for_broadcast = symbol_for_db  # DB 티커 사용 (예: ETH)
                                logger.debug(f"🔍 Full symbol '{symbol}' not found, trying without USDT: '{symbol_for_db}'")
                            
                            if not asset_id:
                                logger.debug(f"⚠️ Asset ID not found for symbol: {symbol} (original: {original_symbol}, provider: {provider})")
                                logger.debug(f"📋 Available symbols in cache: {list(ticker_to_asset_id_cache.keys())[:10]}...")
                                continue
                            else:
                                logger.debug(f"✅ Found asset_id {asset_id} for symbol: {symbol} (original: {original_symbol})")

                            # 브로드캐스트할 때는 데이터베이스에 저장된 티커 형식 사용 (예: ETH)
                            # Frontend의 useRealtimePrices와 일치하도록 DB 티커 형식 (예: ETH) 사용
                            quote_data = {
                                "asset_id": asset_id,
                                "ticker": ticker_for_broadcast,  # DB 티커 형식 (예: ETH, BTC)
                                "asset_type": ticker_to_asset_type_cache.get(ticker_for_broadcast, "Unknown"), # 자산 타입 추가
                                "timestamp_utc": datetime.now(timezone.utc).isoformat(),
                                "price": price,
                                "volume": volume,
                                "data_source": provider
                            }

                            if sio_client.connected:
                                logger.debug(f"📤 [BROADCASTER→BACKEND] 전송 시도: {symbol} = ${price} (asset_id: {asset_id})")
                                await sio_client.emit('broadcast_quote', quote_data)
                                logger.debug(f"✅ [BROADCASTER→BACKEND] 전송 완료: {symbol} = ${price}")
                            else:
                                logger.warning(f"⚠️ [BROADCASTER→BACKEND] 백엔드 연결 끊김: {symbol} 전송 불가 (재시도 예정)")

                            # 메시지 ACK (연결 상태에서만)
                            if sio_client.connected:
                                await redis_client.xack(stream_name, group_name, message_id)

                        except Exception as e:
                            logger.exception(f"❌ 메시지 처리 중 오류: {e}")
                            # 오류 발생 시에도 ACK 처리하여 무한 루프 방지
                            await redis_client.xack(stream_name, group_name, message_id)

        except asyncio.CancelledError:
            logger.info("🛑 Redis listener task was cancelled.")
            raise
        except (exceptions.ConnectionError, exceptions.TimeoutError) as e:
            logger.exception(f"❌ Redis Stream 연결 오류: {e}")
        except Exception as e:
            logger.exception(f"❌ Redis 리스너 루프 예기치 않은 오류: {e}")
        finally:
            logger.error("🔌 Redis 연결 정리 및 5초 후 재시도...")
            if redis_client:
                try:
                    await redis_client.close()
                except Exception as redis_err:
                    logger.exception(f"Redis 클라이언트 정리 중 오류: {redis_err}")
            await asyncio.sleep(5)


async def main():
    """서비스 시작점"""
    backend_url = "http://backend:8000"  # Docker 네트워크 내부 통신

    # 백엔드에 연결 시도
    while not sio_client.connected:
        try:
            await sio_client.connect(backend_url, transports=["websocket"])
        except Exception as e:
            logger.critical(f"❌ 백엔드({backend_url})에 연결할 수 없습니다. 5초 후 재시도합니다. 오류: {e}")
            await asyncio.sleep(5)

    # Redis 리스너 시작
    listener_task = asyncio.create_task(listen_to_redis_and_broadcast())

    def _signal_handler(*_):
        logger.info("SIGINT 또는 SIGTERM 수신, 종료합니다...")
        # 태스크를 직접 취소
        if not listener_task.done():
            listener_task.cancel()

    loop = asyncio.get_running_loop()
    loop.add_signal_handler(signal.SIGINT, _signal_handler)
    loop.add_signal_handler(signal.SIGTERM, _signal_handler)

    try:
        # 태스크가 끝날 때까지 대기
        await listener_task
    except asyncio.CancelledError:
        logger.info("Listener task successfully cancelled.")
    finally:
        # 정리
        if sio_client.connected:
            await sio_client.disconnect()
        logger.info("👋 Broadcaster 서비스가 종료되었습니다.")


if __name__ == "__main__":
    asyncio.run(main())
