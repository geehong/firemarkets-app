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

from app.core.database import SessionLocal
from app.models.asset import Asset, AssetType

from dotenv import load_dotenv

# Project root setup
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

# Load .env
load_dotenv(dotenv_path=project_root / '.env')

# Helpers
def safe_float(value):
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

# Configuration
verbose = os.getenv("BROADCASTER_VERBOSE", "false").lower() == "true"
log_level = logging.DEBUG if verbose else logging.INFO

logging.basicConfig(level=log_level, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

# Setup StreamHandler for root logger if needed (often config.py did this)
# ... skipped complex logging setup for simplicity, basicConfig is often enough ...

logger = logging.getLogger("WebSocketBroadcaster")
logger.setLevel(log_level)

# Configs
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

GLOBAL_APP_CONFIGS = {
    "REDIS_HOST": REDIS_HOST,
    "REDIS_PORT": REDIS_PORT,
    "REDIS_DB": REDIS_DB,
    "REDIS_PASSWORD": REDIS_PASSWORD
}

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
last_broadcast_prices = {}  # { (asset_id, ticker): last_price }
asset_cache_refresh_interval = timedelta(minutes=10)

# REALTIME_STREAMS 설정이 없을 경우를 대비한 기본값
default_streams = ["binance:realtime", "coinbase:realtime", "finnhub:realtime", "alpaca:realtime", "swissquote:realtime", "kis:realtime", "polygon:realtime", "twelvedata:realtime"]
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
    """DB에서 실제 자산 목록을 가져와 캐시를 갱신합니다."""
    global ticker_to_asset_id_cache, last_asset_cache_refresh, ticker_to_asset_type_cache
    
    try:
        # 동기 세션 사용
        db = SessionLocal()
        try:
            # 모든 활성 자산 가져오기
            # AssetType.type_name 대신 AssetType 객체 자체를 가져와서 .name 속성을 사용
            assets = db.query(Asset, AssetType)\
                .join(AssetType, Asset.asset_type_id == AssetType.asset_type_id)\
                .filter(Asset.is_active == True)\
                .all()
            
            new_id_cache = {}
            new_id_to_ticker_cache = {}
            new_type_cache = {}
            
            for asset_obj, asset_type_obj in assets:
                t = asset_obj.ticker.upper()
                aid = asset_obj.asset_id
                
                # 중복 티커 체크 (예: 같은 티커가 여러 타입으로 존재할 경우)
                if t in new_id_cache:
                    prev_aid = new_id_cache[t]
                    logger.warning(f"⚠️ [Broadcaster] Duplicate ticker mapping: {t} already points to {prev_aid}, skipping {aid}")
                    continue
                
                new_id_cache[t] = aid
                new_id_to_ticker_cache[aid] = t
                asset_type_str = asset_type_obj.type_name if asset_type_obj else "Unknown"
                new_type_cache[t] = asset_type_str
                
                # 변형 심볼 매핑 (USDT 등)
                for variant in [f"{t}USDT", f"{t}-USDT", f"{t}-USD"]:
                    if variant not in new_id_cache:
                        new_id_cache[variant] = aid
                        new_type_cache[variant] = asset_type_str
            
            ticker_to_asset_id_cache = new_id_cache
            asset_id_to_ticker_cache = new_id_to_ticker_cache
            ticker_to_asset_type_cache = new_type_cache
            
            last_asset_cache_refresh = datetime.now(timezone.utc)
            logger.info(f"✅ Ticker-AssetID Cache updated from DB: {len(ticker_to_asset_id_cache)} entries")
            # 디버그: 주요 자산 매핑 확인
            for test_s in ['BTC', 'ETH', 'QQQ', 'SPY', 'NVDA', 'TSLA']:
                if test_s in ticker_to_asset_id_cache:
                    logger.info(f"📌 [Cache-Check] {test_s} -> ID: {ticker_to_asset_id_cache[test_s]}, Type: {ticker_to_asset_type_cache.get(test_s)}")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"❌ Failed to refresh asset cache from DB: {e}")
        # 실패하더라도 기존 캐시는 유지 (또는 초기화 방지)



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

                # 모든 스트림에서 데이터 병렬로 읽기 (성능 최적화 & Head-of-line blocking 제거)
                all_messages = []
                
                async def read_stream(s_name, g_name):
                    try:
                        return await redis_client.xreadgroup(
                            groupname=g_name,
                            consumername="broadcaster_node",
                            streams={s_name: ">"},
                            count=1000,
                            block=500
                        )
                    except exceptions.ResponseError as e:
                        if "NOGROUP" in str(e):
                            try:
                                await redis_client.xgroup_create(name=s_name, groupname=g_name, id="$", mkstream=True)
                            except: pass
                        return None
                    except Exception:
                        return None

                # 모든 스트림 읽기 작업을 동시에 실행
                tasks = [read_stream(s, g) for s, g in realtime_streams.items()]
                results = await asyncio.gather(*tasks)
                
                for res in results:
                    if res:
                        all_messages.extend(res)

                # 메시지가 없으면 아주 짧게 휴식 (CPU 점유 방지)
                if not all_messages:
                    await asyncio.sleep(0.01)
                    continue

                # 스트림별로 메시지를 모아서 심볼별 최신 데이터만 추출 (De-duplication)
                # target_quotes = { (asset_id, ticker): {data} }
                target_quotes = {}
                # acks = { stream_name: [message_ids] }
                acks = {}

                for stream_name_bytes, messages in all_messages:
                    stream_name = stream_name_bytes.decode('utf-8') if isinstance(stream_name_bytes, bytes) else stream_name_bytes
                    group_name = realtime_streams.get(stream_name)
                    if stream_name not in acks: acks[stream_name] = []
                    for message_id, message_data in messages:
                        try:
                            acks[stream_name].append(message_id)
                            
                            # 🔍 [STREAM READ]
                            symbol_raw = message_data.get(b'symbol', b'').decode('utf-8')
                            price_raw = message_data.get(b'price', b'').decode('utf-8')
                            provider_raw = message_data.get(b'provider', b'unknown').decode('utf-8')
                            
                            p_val = safe_float(price_raw)
                            if p_val is None: continue

                            symbol = symbol_raw.upper()
                            price = p_val
                            volume = safe_float(message_data.get(b'volume', b'').decode('utf-8'))
                            provider = provider_raw

                            # 🛠 [심볼 매핑 고도화]
                            ticker_for_broadcast = symbol
                            asset_id = None
                            
                            # 1. 공급자별 특화 정규화
                            search_symbols = [symbol]
                            if provider == 'coinbase' and '-' in symbol:
                                # "BTC-USD" -> ["BTC", "BTCUSDT"] 추가 탐색
                                base = symbol.split('-')[0]
                                search_symbols.extend([base, f"{base}USDT"])
                            elif provider == 'binance' and symbol.endswith('USDT'):
                                # "BTCUSDT" -> ["BTC"] 추가 탐색
                                base = symbol.replace('USDT', '')
                                search_symbols.append(base)
                            
                            # 2. 가능한 모든 변형으로 매핑 조회
                            for s in search_symbols:
                                asset_id = ticker_to_asset_id_cache.get(s)
                                if not asset_id and provider == 'binance':
                                    # "BINANCE:BTCUSDT" 형태 처리
                                    s_clean = s.replace('BINANCE:', '')
                                    asset_id = ticker_to_asset_id_cache.get(s_clean)
                                    if asset_id: s = s_clean

                                if asset_id:
                                    ticker_for_broadcast = s
                                    # [MAPPING TRACE] - Stocks/ETFs도 추적 대상에 추가
                                    if symbol in ['SOL', 'ETHUSDT', 'BTCUSDT', 'QQQ', 'SPY', 'NVDA', 'TSLA']:
                                        logger.info(f"🔍 [MAPPING-TRACE] {provider} | {symbol} -> Internal: {ticker_for_broadcast} (ID: {asset_id})")
                                    break
                            
                            if not asset_id:
                                if symbol in ['SOL', 'ETHUSDT', 'BTCUSDT']:
                                    logger.warning(f"⚠️ [Broadcaster] Mapping failed for critical asset: {symbol} ({provider})")
                                continue

                            # 🚨 [추가] 가격 이상치 검증 (급격한 변동 차단)
                            # 매우 짧은 시간(배치 간격) 내에 10% 이상 변동은 데이터 오류일 가능성이 높음
                            cache_key = (asset_id, ticker_for_broadcast)
                            if cache_key in last_broadcast_prices:
                                prev_p = last_broadcast_prices[cache_key]
                                if prev_p > 0 and price > 0:
                                    deviation = abs(price - prev_p) / prev_p
                                    if deviation > 0.1:  # 10% 이상 변동
                                        logger.warning(f"🚨 [Broadcaster] 이상 가격 감지(차단) {ticker_for_broadcast}: {prev_p} -> {price} ({deviation*100:.2f}%)")
                                        continue
                            
                            last_broadcast_prices[cache_key] = price

                            # 중복 제거: 같은 asset_id/ticker 조합은 가장 최신(마지막) 메시지로 덮어쓰기
                            target_quotes[(asset_id, ticker_for_broadcast)] = {
                                "asset_id": asset_id,
                                "ticker": ticker_for_broadcast,
                                "asset_type": ticker_to_asset_type_cache.get(ticker_for_broadcast, "Unknown"),
                                "timestamp_utc": datetime.now(timezone.utc).isoformat(),
                                "price": price,
                                "volume": volume,
                                "data_source": provider
                            }

                        except Exception as e:
                            logger.error(f"❌ 메시지 파싱 중 오류 (ID {message_id}): {e}")

                # 1. 수집된 최신 쿼트들을 백엔드로 전송 (배치 모드)
                if target_quotes and sio_client.connected:
                    quotes_list = list(target_quotes.values())
                    try:
                        logger.debug(f"📤 [BATCH BROADCAST] {len(quotes_list)} tickers")
                        await sio_client.emit('broadcast_quotes_batch', quotes_list)
                    except Exception as e:
                        logger.error(f"❌ BROADCAST Batch Emit 오류: {e}")

                # 2. 모든 처리된 메시지 배치 ACK
                for s_name, msg_ids in acks.items():
                    if msg_ids:
                        try:
                            g_name = realtime_streams.get(s_name)
                            await redis_client.xack(s_name, g_name, *msg_ids)
                        except Exception as e:
                            logger.error(f"❌ Batch ACK 오류 ({s_name}): {e}")

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
    # Docker uses backend:8000, Host uses localhost:8001
    backend_url = os.getenv("BACKEND_URL", "http://backend:8000")

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
