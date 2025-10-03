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
sio_client = socketio.AsyncClient(logger=verbose, engineio_logger=verbose)

# --- Broadcaster 전용 상태 및 캐시 관리 ---
prev_close_cache: Dict[int, float] = {}
last_cache_refresh: Optional[datetime] = None
cache_refresh_interval = timedelta(minutes=60)

ticker_to_asset_id_cache: Dict[str, int] = {}
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
    from app.models.asset import Asset
    from sqlalchemy.future import select

    session_local = get_async_session_local()
    async with session_local() as session:
        try:
            result = await session.execute(select(Asset.ticker, Asset.asset_id))
            ticker_to_asset_id_cache = {ticker: asset_id for ticker, asset_id in result.all()}
            last_asset_cache_refresh = datetime.now(timezone.utc)
            logger.info(f"✅ Ticker-AssetID 캐시 갱신 완료: {len(ticker_to_asset_id_cache)}개 자산")
        except Exception as e:
            logger.error(f"❌ Ticker-AssetID 캐시 갱신 실패: {e}")

async def _refresh_prev_close_cache():
    """DB에서 전일 종가 데이터를 가져와 캐시합니다."""
    global prev_close_cache, last_cache_refresh
    logger.debug("🔄 전일 종가 캐시 갱신 시작...")
    from app.core.database import get_async_session_local
    from sqlalchemy import text

    session_local = get_async_session_local()
    async with session_local() as session:
        try:
            query = text("""
                WITH latest_ohlcv AS (
                    SELECT asset_id, close_price, ROW_NUMBER() OVER(PARTITION BY asset_id ORDER BY timestamp_utc DESC) as rn
                    FROM ohlcv_day_data
                )
                SELECT asset_id, close_price FROM latest_ohlcv WHERE rn = 1;
            """)
            result = await session.execute(query)
            rows = result.fetchall()
            prev_close_cache = {row[0]: float(row[1]) for row in rows if row[1] is not None}
            last_cache_refresh = datetime.now(timezone.utc)
            logger.info(f"✅ 전일 종가 캐시 갱신 완료: {len(prev_close_cache)}개 자산")
        except Exception as e:
            logger.error(f"❌ 전일 종가 캐시 갱신 실패: {e}")

async def _calculate_change(asset_id: int, current_price: float) -> tuple:
    """캐시를 사용하여 가격 변동률을 계산합니다."""
    prev_close = prev_close_cache.get(asset_id)
    if prev_close is not None:
        try:
            change_amount = current_price - prev_close
            change_percent = (change_amount / prev_close) * 100.0 if prev_close != 0 else 0.0
            return change_amount, change_percent
        except (TypeError, ValueError):
            return None, None
    return None, None

async def listen_to_redis_and_broadcast():
    """Redis Stream을 구독하고 처리된 데이터를 백엔드로 전송하는 메인 로직"""
    redis_host = GLOBAL_APP_CONFIGS.get("REDIS_HOST", "redis")
    redis_port = GLOBAL_APP_CONFIGS.get("REDIS_PORT", 6379)
    redis_password = GLOBAL_APP_CONFIGS.get("REDIS_PASSWORD")
    redis_url = f"redis://{redis_host}:{redis_port}"
    if redis_password:
        redis_url = f"redis://:{redis_password}@{redis_host}:{redis_port}"

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
                if not last_cache_refresh or (now - last_cache_refresh) > cache_refresh_interval:
                    logger.debug("[Broadcaster] Refreshing prev_close cache...")
                    await _refresh_prev_close_cache()

                # 각 스트림을 순회하며 데이터 읽기
                all_messages = []
                for stream_name, group_name in realtime_streams.items():
                    try:
                        logger.debug(f"[Broadcaster] XREADGROUP from '{stream_name}' as '{group_name}'...")
                        # 각 스트림에서 개별적으로 데이터 읽기
                        stream_data = await redis_client.xreadgroup(
                            groupname=group_name,
                            consumername=f"consumer-{int(time.time())}",
                            streams={stream_name: ">"},
                            count=100,
                            block=10  # 짧은 블로킹 시간
                        )
                        logger.debug(f"[Broadcaster] XREADGROUP result for '{stream_name}': {len(stream_data) if stream_data else 0} batches")
                        if stream_data:
                            # (stream_name, messages) 튜플을 리스트에 추가
                            all_messages.extend(stream_data)
                    except exceptions.ResponseError as e:
                        logger.error(f"스트림 '{stream_name}' 읽기 오류: {e}", exc_info=True)
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

                            asset_id = ticker_to_asset_id_cache.get(symbol)
                            if not asset_id:
                                continue

                            change_amount, change_percent = await _calculate_change(asset_id, price)

                            quote_data = {
                                "asset_id": asset_id,
                                "ticker": symbol,
                                "timestamp_utc": datetime.now(timezone.utc).isoformat(),
                                "price": price,
                                "volume": volume,
                                "change_amount": change_amount,
                                "change_percent": change_percent,
                                "data_source": provider
                            }

                            if sio_client.connected:
                                await sio_client.emit('broadcast_quote', quote_data)
                                logger.info(f"🚀 백엔드로 '{symbol}' 데이터 전송 완료")
                            else:
                                logger.warning("백엔드와 연결되지 않아 메시지를 전송할 수 없습니다.")

                            # 메시지 ACK
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
