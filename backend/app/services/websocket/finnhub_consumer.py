"""
Finnhub WebSocket Consumer 구현
"""
import asyncio
import json
import logging
import websockets
from typing import List, Optional
import os
import redis.asyncio as redis
from app.services.websocket.base_consumer import BaseWSConsumer, ConsumerConfig, AssetType
from app.core.config import GLOBAL_APP_CONFIGS

logger = logging.getLogger(__name__)

class FinnhubWSConsumer(BaseWSConsumer):
    """Finnhub WebSocket Consumer"""
    
    def __init__(self, config: ConsumerConfig):
        super().__init__(config)
        self.api_key = GLOBAL_APP_CONFIGS.get('FINNHUB_API_KEY')
        if not self.api_key:
            # 환경변수에서 직접 읽기
            self.api_key = os.getenv('FINNHUB_API_KEY')
        self.ws_url = f"wss://ws.finnhub.io?token={self.api_key}"
        self.websocket = None
        self._receive_task = None
        # Redis
        self._redis = None
        self._redis_url = self._build_redis_url()
    
    @property
    def client_name(self) -> str:
        return "finnhub"
    
    @property
    def api_key(self) -> Optional[str]:
        return self._api_key
    
    @api_key.setter
    def api_key(self, value: str):
        self._api_key = value
    
    async def connect(self) -> bool:
        """WebSocket 연결"""
        try:
            if not self.api_key:
                logger.error("Finnhub API key not configured")
                return False
            
            self.websocket = await websockets.connect(self.ws_url)
            self.is_connected = True
            self.connection_errors = 0
            logger.info(f"✅ {self.client_name} connected")
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} connection failed: {e}")
            self.connection_errors += 1
            return False
    
    async def disconnect(self):
        """WebSocket 연결 해제"""
        try:
            if self.websocket:
                await self.websocket.close()
                self.websocket = None
            self.is_connected = False
            logger.info(f"🔌 {self.client_name} disconnected")
        except Exception as e:
            logger.error(f"❌ {self.client_name} disconnect error: {e}")
    
    def _normalize_symbol(self, ticker: str) -> str:
        """Finnhub 심볼 규격으로 정규화
        - 크립토: USDT로 끝나고 접두사가 없으면 'BINANCE:' 접두사 부여
        - 기본: 그대로 반환
        """
        t = (ticker or '').upper().strip()
        if ':' in t:
            return t
        if t.endswith('USDT'):
            return f"BINANCE:{t}"
        return t

    async def subscribe(self, tickers: List[str]) -> bool:
        """티커 구독"""
        try:
            if not self.is_connected or not self.websocket:
                logger.error(f"❌ {self.client_name} not connected")
                return False
            
            for ticker in tickers:
                norm = self._normalize_symbol(ticker)
                subscribe_msg = {"type": "subscribe", "symbol": norm}
                await self.websocket.send(json.dumps(subscribe_msg))
                self.subscribed_tickers.add(norm)
                logger.info(f"📋 {self.client_name} subscribed to {norm}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} subscription failed: {e}")
            return False
    
    async def unsubscribe(self, tickers: List[str]) -> bool:
        """티커 구독 해제"""
        try:
            if not self.is_connected or not self.websocket:
                return False
            
            for ticker in tickers:
                unsubscribe_msg = {"type": "unsubscribe", "symbol": ticker}
                await self.websocket.send(json.dumps(unsubscribe_msg))
                self.subscribed_tickers.discard(ticker)
                logger.info(f"📋 {self.client_name} unsubscribed from {ticker}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} unsubscription failed: {e}")
            return False
    
    async def run(self):
        """메인 실행 루프"""
        if not self.is_connected:
            logger.error(f"❌ {self.client_name} not connected")
            return
        
        self.is_running = True
        logger.info(f"🚀 {self.client_name} started with {len(self.subscribed_tickers)} tickers")
        
        try:
            async for message in self.websocket:
                if not self.is_running:
                    break
                
                try:
                    data = json.loads(message)
                    await self._handle_message(data)
                except json.JSONDecodeError as e:
                    logger.error(f"❌ {self.client_name} JSON decode error: {e}")
                except Exception as e:
                    logger.error(f"❌ {self.client_name} message handling error: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.warning(f"⚠️ {self.client_name} connection closed")
            self.is_connected = False
        except Exception as e:
            logger.error(f"❌ {self.client_name} run error: {e}")
        finally:
            self.is_running = False
            logger.info(f"🛑 {self.client_name} stopped")
    
    async def _handle_message(self, data: dict):
        """메시지 처리"""
        try:
            if data.get('type') == 'trade':
                # 거래 데이터 처리
                trade_data = data.get('data', [])
                for trade in trade_data:
                    await self._process_trade(trade)
            elif data.get('type') == 'quote':
                # 호가 데이터 처리 (간단 저장)
                quote = data
                symbol = quote.get('s')
                bid = quote.get('b')
                ask = quote.get('a')
                ts = quote.get('t')
                if symbol and (bid is not None or ask is not None):
                    # 가격은 중간값으로 저장 (표준 스키마 충족 위해)
                    mid = None
                    try:
                        if bid is not None and ask is not None:
                            mid = (float(bid) + float(ask)) / 2.0
                        elif bid is not None:
                            mid = float(bid)
                        elif ask is not None:
                            mid = float(ask)
                    except Exception:
                        mid = None
                    if mid is not None:
                        await self._store_to_redis({
                            'symbol': symbol,
                            'price': mid,
                            'volume': None,
                            'timestamp': ts,
                            'provider': self.client_name,
                        })
            elif data.get('type') == 'ping':
                # Ping 응답
                pong_msg = {"type": "pong"}
                await self.websocket.send(json.dumps(pong_msg))
            else:
                logger.debug(f"📨 {self.client_name} received: {data}")
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} message processing error: {e}")
    
    async def _process_trade(self, trade: dict):
        """거래 데이터 처리"""
        try:
            symbol = trade.get('s')
            price = trade.get('p')
            volume = trade.get('v')
            timestamp = trade.get('t')
            
            if symbol and price:
                # Redis에 데이터 저장
                await self._store_to_redis({
                    'symbol': symbol,
                    'price': price,
                    'volume': volume,
                    'timestamp': timestamp,
                    'provider': self.client_name
                })
                
                logger.debug(f"📈 {self.client_name} {symbol}: ${price} (Vol: {volume})")
                
        except Exception as e:
            logger.error(f"❌ {self.client_name} trade processing error: {e}")
    
    def _build_redis_url(self) -> str:
        host = os.getenv('REDIS_HOST', 'redis')
        port = os.getenv('REDIS_PORT', '6379')
        db = os.getenv('REDIS_DB', '0')
        password = os.getenv('REDIS_PASSWORD', '')
        if password:
            return f"redis://:{password}@{host}:{port}/{db}"
        return f"redis://{host}:{port}/{db}"

    async def _get_redis(self):
        if self._redis is None:
            self._redis = await redis.from_url(self._redis_url)
        return self._redis

    async def _store_to_redis(self, data: dict):
        """Redis에 데이터 저장 (표준 스키마)"""
        try:
            r = await self._get_redis()
            stream_key = 'finnhub:realtime'
            # 표준 필드 스키마로 정규화
            entry = {
                'symbol': str(data.get('symbol', '')),
                'price': str(data.get('price', '')),
                'volume': str(data.get('volume', '')),
                'raw_timestamp': str(data.get('timestamp', '')),
                'provider': 'finnhub',
            }
            await r.xadd(stream_key, entry)
        except Exception as e:
            logger.error(f"❌ {self.client_name} redis store error: {e}")
    
    async def _perform_health_check(self) -> bool:
        """헬스체크 수행"""
        try:
            if not self.websocket or self.websocket.closed:
                return False
            
            # Ping 전송
            ping_msg = {"type": "ping"}
            await self.websocket.send(json.dumps(ping_msg))
            return True
            
        except Exception as e:
            logger.error(f"❌ {self.client_name} health check error: {e}")
            return False
