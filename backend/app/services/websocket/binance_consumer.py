import asyncio
import json
import logging
import time
import websockets
import traceback
from typing import List, Optional
import os
import redis.asyncio as redis
from datetime import datetime, timezone
from app.services.websocket.base_consumer import BaseWSConsumer, ConsumerConfig, AssetType
from app.utils.asset_mapping_loader import get_symbol_for_provider

logger = logging.getLogger(__name__)

class BinanceWSConsumer(BaseWSConsumer):
    def __init__(self, config: ConsumerConfig):
        super().__init__(config)
        # Try both 9443 and 443 if needed
        self.ws_url = "wss://stream.binance.com:9443/stream"
        self._ws = None
        self._request_id = 0
        self._redis_url = self._build_redis_url()
        self.redis_client = None
        self.subscribed_tickers = []
        self._is_subscribed = False
        self._asset_id_map = {}

    @property
    def client_name(self) -> str: return "binance"
    @property
    def api_key(self) -> Optional[str]: return None

    def _build_redis_url(self) -> str:
        host = os.getenv('REDIS_HOST', 'redis')
        port = os.getenv('REDIS_PORT', '6379')
        db = os.getenv('REDIS_DB', '0')
        password = os.getenv('REDIS_PASSWORD', '')
        if password: return f"redis://:{password}@{host}:{port}/{db}"
        return f"redis://{host}:{port}/{db}"

    async def connect(self) -> bool:
        logger.info("🚩 [BINANCE] connect() START")
        try:
            # 1. Redis Connect
            if not self.redis_client:
                self.redis_client = await redis.from_url(self._redis_url)
            logger.info("🚩 [BINANCE] Redis Connected")
            
            # 2. WebSocket Connect
            logger.info(f"🔌 [BINANCE] Connecting to {self.ws_url} (timeout 30s)")
            self._ws = await asyncio.wait_for(
                websockets.connect(self.ws_url, ping_interval=20, ping_timeout=20), 
                timeout=30.0
            )
            self.is_connected = True
            logger.info("🚩 [BINANCE] WebSocket Connected")
            
            await self._load_asset_ids()
            return True
        except Exception as e:
            logger.error(f"❌ [BINANCE] connect() FAILED: {type(e).__name__}: {e}")
            logger.error(traceback.format_exc())
            return False

    async def _load_asset_ids(self):
        """DB에서 자산 목록을 로드하여 바이낸스 심볼과 매핑"""
        from app.core.database import SessionLocal
        from app.models.asset import Asset
        try:
            with SessionLocal() as db:
                assets = db.query(Asset.asset_id, Asset.ticker).all()
                self._asset_id_map = {}
                for aid, t in assets:
                    norm_s = self._normalize_symbol(t).lower()
                    # 이미 매핑된 심볼이 있다면 경고 출력 (덮어쓰기 방지)
                    if norm_s in self._asset_id_map:
                        old_aid = self._asset_id_map[norm_s]
                        logger.warning(f"⚠️ [BINANCE] Asset mapping conflict: {norm_s} already maps to {old_aid}, skipping {aid} ({t})")
                        continue
                    self._asset_id_map[norm_s] = aid
                logger.info(f"📍 [BINANCE] Asset Map Loaded: {len(self._asset_id_map)} items")
        except Exception as e:
            logger.error(f"❌ [BINANCE] Failed to load assets: {e}")

    def _normalize_symbol(self, ticker: str) -> str:
        t = (ticker or '').upper().strip()
        return (get_symbol_for_provider(t, "binance") or t).lower()

    async def subscribe(self, tickers: List[str]) -> bool:
        try:
            if not self.is_connected or not self._ws: return False
            streams = []
            for t in tickers:
                normalized = self._normalize_symbol(t)
                streams.extend([f"{normalized}@trade", f"{normalized}@ticker"])
                if normalized not in self.subscribed_tickers: self.subscribed_tickers.append(normalized)
            
            if not streams: return True
            
            msg = {"method": "SUBSCRIBE", "params": streams, "id": self._get_next_id()}
            await self._ws.send(json.dumps(msg))
            logger.info(f"📤 [BINANCE] Subscribed to {len(streams)} streams")
            return True
        except Exception as e:
            logger.error(f"❌ [BINANCE] Subscribe error: {e}")
            return False

    async def unsubscribe(self, tickers: List[str]) -> bool: return True
    async def _perform_health_check(self) -> bool: return True
    def _get_next_id(self) -> int:
        self._request_id += 1
        return self._request_id

    async def disconnect(self):
        if self._ws: await self._ws.close()
        self.is_connected = False

    async def run(self):
        self.is_running = True
        while self.is_running:
            try:
                if not self.is_connected:
                    if not await self.connect():
                        await asyncio.sleep(10)
                        continue
                async for message in self._ws:
                    data = json.loads(message)
                    if "stream" in data and "data" in data:
                        stream, payload = data["stream"], data["data"]
                        
                        # 🔍 [DEBUG] 수신 스트림 이름 확인
                        if "btcusdt" in stream:
                            logger.debug(f"📥 [BINANCE-STREAM] Received: {stream}")

                        # 1. 실시간 거래 데이터 (가장 신뢰할 수 있는 가격 소스)
                        if "@trade" in stream or "@aggTrade" in stream:
                            await self._process_trade_message(payload)
                        
                        # 2. 24시간 통계 데이터 (통계용, 가격 업데이트에는 보조적으로만 사용)
                        elif "@ticker" in stream:
                            await self._process_ticker_message(payload)
                    
                    elif "id" in data:
                        logger.info(f"✅ [BINANCE] Response: {data}")
            except Exception as e:
                logger.error(f"❌ [BINANCE] Run Error: {e}")
                self.is_connected = False
                await asyncio.sleep(10)

    async def _process_trade_message(self, data: dict):
        """거래(trade/aggTrade) 메시지 처리: 'p'는 무조건 가격임"""
        symbol = data.get('s', '').lower()
        asset_id = self._asset_id_map.get(symbol)
        
        price = data.get('p')
        quantity = data.get('q')
        
        if not price or not asset_id: return

        try:
            p = float(price)
            q = float(quantity or 0)
            
            # [검증] 어처구니 없는 가격 필터링 (BTC가 1000달러 미만이면 이상함)
            if symbol == 'btcusdt' and p < 10000:
                logger.error(f"⚠️ [BINANCE-CORRUPT-PRICE] BTC price looks like change value: {p}")
                return

            dt = datetime.fromtimestamp(data.get('E', 0)/1000.0, tz=timezone.utc)
            
            # 웹소켓 브로드캐스트용 Redis Stream 저장
            await self._store_to_redis_stream(data, p, q, "trade")
            
        except Exception as e:
            logger.error(f"❌ [BINANCE] Trade process error: {e}")

    async def _process_ticker_message(self, data: dict):
        """티커(ticker) 메시지 처리: 실시간 방송에서는 배제 (오직 거래 데이터만 사용)"""
        # 통계나 OHLCV 보완용으로만 사용하거나 루프에서 처리
        pass

    async def _store_to_redis_stream(self, data: dict, price: float, volume: float, mtype: str):
        """Redis Stream에 저장 (브로드캐스터 전용)"""
        r = self.redis_client
        if not r: return
        
        # 브로드캐스터가 오해하지 않도록 'price'와 'volume'을 명시적으로 전달
        entry = {
            'symbol': data.get('s'),
            'price': str(price),
            'volume': str(volume),
            'provider': 'binance',
            'type': mtype,
            'ts': str(data.get('E', int(time.time() * 1000)))
        }
        await r.xadd('binance:realtime', entry, maxlen=1000, approximate=True)

    async def _store_legacy(self, data: dict, mtype: str):
        # 🚨 DEBUG: 원본 데이터 10개만 파일에 덤프하여 필드 검증
        try:
            with open('/tmp/binance_raw.log', 'a') as f:
                f.write(f"[{mtype}] {json.dumps(data)}\n")
        except: pass

        r = self.redis_client
        if r:
            # mtype에 따라 필드 매핑 분기 (Binance API 규격 준수)
            if mtype == "trade":
                price = data.get('p')
                volume = data.get('q')
                change_p = None
            else:  # ticker
                price = data.get('c')  # Last Price
                volume = data.get('v')  # Total volume
                change_p = data.get('P')  # Price change percent
            
            if not price: return

            entry = {
                'symbol': data.get('s'),
                'price': str(price),
                'volume': str(volume or '0'),
                'change_percent': str(change_p or '0'),
                'provider': 'binance',
                'type': mtype,
                'ts': str(data.get('E', int(time.time() * 1000)))
            }
            await r.xadd('binance:realtime', entry, maxlen=1000, approximate=True)
