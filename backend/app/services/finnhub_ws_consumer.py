"""
Finnhub WebSocket Consumer for real-time market data.
Provides real-time stock quotes, trades, and other market data.
"""
import asyncio
import json
import logging
import signal
import sys
import os
import threading
import time
from typing import Dict, List, Optional, Set
from datetime import datetime, timezone, timedelta
import websocket
from websocket import WebSocketApp
import redis.asyncio as redis

logger = logging.getLogger(__name__)


class FinnhubWSConsumer:
    """Finnhub WebSocket consumer for real-time market data"""
    
    def __init__(self):
        self.api_key = os.getenv('FINNHUB_API_KEY')
        self.secret_key = os.getenv('FINNHUB_SECRET_KEY')
        self.ws_url = f"wss://ws.finnhub.io?token={self.api_key}"
        
        # Redis configuration
        self.redis_host = os.getenv('REDIS_HOST', 'redis')
        self.redis_port = int(os.getenv('REDIS_PORT', 6379))
        self.redis_password = os.getenv('REDIS_PASSWORD', '')
        self.redis_db = int(os.getenv('REDIS_DB', 0))
        
        self.redis_client = None
        self.websocket = None
        self.subscribed_symbols: Set[str] = set()
        self.is_running = False
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 10
        self.reconnect_delay = 5
        self.ws_thread = None
        
        # Event loop for async operations
        self.loop = None
        self.loop_thread = None
        
        # Default symbols to subscribe to (stocks only for market close testing)
        self.default_symbols = [
            'AAPL', 'AMZN', 'MSFT', 'GOOGL', 'TSLA'
            # 'BINANCE:BTCUSDT', 'IC MARKETS:1'  # Crypto/Forex commented out
        ]
        
        logger.info("Finnhub WebSocket Consumer initialized")
    
    def _start_event_loop(self):
        """Start a dedicated event loop for async operations"""
        def run_loop():
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            self.loop.run_forever()
        
        self.loop_thread = threading.Thread(target=run_loop, daemon=True)
        self.loop_thread.start()
        
        # Wait for loop to be ready
        while self.loop is None:
            time.sleep(0.01)
    
    def _stop_event_loop(self):
        """Stop the dedicated event loop"""
        if self.loop and not self.loop.is_closed():
            self.loop.call_soon_threadsafe(self.loop.stop)
            if self.loop_thread and self.loop_thread.is_alive():
                self.loop_thread.join(timeout=5)
    
    async def _connect_redis(self):
        """Connect to Redis"""
        try:
            if self.redis_password:
                redis_url = f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
            else:
                redis_url = f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"
            
            self.redis_client = await redis.from_url(redis_url)
            await self.redis_client.ping()
            logger.info(f"Redis에 연결되었습니다: {self.redis_host}:{self.redis_port}")
        except Exception as e:
            logger.error(f"Redis 연결 실패: {e}")
            self.redis_client = None
    
    def _is_market_open(self, symbol: str = None) -> bool:
        """시장 개장시간 확인 (심볼별로 다름)"""
        now = datetime.utcnow()
        
        # 암호화폐는 24시간 거래 (더 포괄적인 체크)
        if symbol:
            symbol_upper = symbol.upper()
            crypto_indicators = ['BINANCE:', 'COINBASE:', 'CRYPTO:', 'BTC', 'ETH', 'USDT', 'USDC', 'IC MARKETS:']
            if any(crypto in symbol_upper for crypto in crypto_indicators):
                logger.debug(f"Crypto symbol detected: {symbol} -> Market always open")
                return True
        
        # 미국 동부 시간으로 변환 (UTC-5, 일광절약시간 고려하지 않음)
        est_time = now.replace(tzinfo=timezone.utc).astimezone(timezone(timedelta(hours=-5)))
        
        # 주말 체크 (토요일=5, 일요일=6)
        if est_time.weekday() >= 5:
            return False
        
        # 거래시간: 월-금 09:30-16:00 (EST)
        market_open = est_time.replace(hour=9, minute=30, second=0, microsecond=0)
        market_close = est_time.replace(hour=16, minute=0, second=0, microsecond=0)
        
        return market_open <= est_time <= market_close
    
    def _store_to_redis_sync(self, data: Dict, data_type: str = "quote"):
        """Store real-time data to Redis synchronously using the dedicated event loop"""
        try:
            if not self.loop or self.loop.is_closed():
                logger.error("Event loop not available for Redis operations")
                return
            
            # Get symbol for market status check
            symbol = data.get('symbol', 'Unknown')
            is_market_open = self._is_market_open(symbol)
            
            # Create Redis stream entry
            stream_data = {
                'provider': 'finnhub',
                'type': data_type,
                'data': json.dumps(data),
                'timestamp': datetime.now().isoformat(),
                'market_status': 'open' if is_market_open else 'closed'
            }
            
            # Schedule the async operation on the dedicated loop
            future = asyncio.run_coroutine_threadsafe(
                self._store_to_redis_async(stream_data, symbol, data_type, is_market_open),
                self.loop
            )
            
            # Wait for completion with timeout
            try:
                future.result(timeout=5)
            except Exception as e:
                logger.error(f"Redis operation timed out or failed: {e}")
            
        except Exception as e:
            logger.error(f"Failed to store Finnhub data to Redis: {e}")
    
    async def _store_to_redis_async(self, stream_data: Dict, symbol: str, data_type: str, is_market_open: bool):
        """Async Redis storage operation"""
        try:
            if not self.redis_client:
                logger.error("Redis client not connected")
                return
            
            # Store in Redis stream
            await self.redis_client.xadd('finnhub:realtime', stream_data)
            
            # Log with market status
            market_emoji = "🔥" if is_market_open else "🌙"
            market_status = "시장개장" if is_market_open else "시장폐장"
            
            logger.info(f"{market_emoji} [{market_status}] Finnhub {data_type} data stored: {symbol}")
            
        except Exception as e:
            logger.error(f"Failed to store Finnhub data to Redis: {e}")
    
    def _on_message(self, ws, message):
        """Handle incoming WebSocket message (standard websocket-client callback)"""
        try:
            data = json.loads(message)
            
            if 'type' in data:
                message_type = data['type']
                
                if message_type == 'trade':
                    # Handle trade data synchronously
                    self._handle_trade_data_sync(data)
                elif message_type == 'quote':
                    # Handle quote data synchronously
                    self._handle_quote_data_sync(data)
                elif message_type == 'ping':
                    # Respond to ping with pong
                    self._send_pong_sync()
                elif message_type == 'error':
                    logger.error(f"Finnhub WebSocket error: {data.get('msg', 'Unknown error')}")
                else:
                    logger.debug(f"Unhandled message type: {message_type}")
            else:
                logger.debug(f"Received message without type: {data}")
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON message: {e}")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
    
    def _on_error(self, ws, error):
        """Handle WebSocket errors (standard websocket-client callback)"""
        logger.error(f"WebSocket error: {error}")
    
    def _on_close(self, ws, close_status_code, close_msg):
        """Handle WebSocket close (standard websocket-client callback)"""
        logger.warning(f"WebSocket closed: {close_status_code} - {close_msg}")
        if self.is_running:
            logger.info("Attempting to reconnect...")
            threading.Timer(self.reconnect_delay, self._reconnect).start()
    
    def _on_open(self, ws):
        """Handle WebSocket open (standard websocket-client callback)"""
        logger.info("WebSocket connection opened")
        self.reconnect_attempts = 0
        
        # Subscribe to default symbols
        for symbol in self.default_symbols:
            self._subscribe_to_symbol(symbol)
    
    def _handle_trade_data_sync(self, data: Dict):
        """Handle trade data synchronously"""
        try:
            # Handle multiple trades in data array
            if 'data' in data and isinstance(data['data'], list):
                for trade in data['data']:
                    self._process_single_trade(trade)
            else:
                self._process_single_trade(data)
                
        except Exception as e:
            logger.error(f"Error handling trade data: {e}")
    
    def _process_single_trade(self, trade: Dict):
        """Process a single trade"""
        try:
            symbol = trade.get('s', 'Unknown')
            price = trade.get('p', 0)
            volume = trade.get('v', 0)
            timestamp = trade.get('t', 0)
            
            # Convert timestamp to readable format
            trade_time = datetime.fromtimestamp(timestamp / 1000).isoformat()
            
            trade_data = {
                'symbol': symbol,
                'price': price,
                'volume': volume,
                'timestamp': trade_time,
                'raw_timestamp': timestamp
            }
            
            # Store to Redis using the dedicated event loop
            self._store_to_redis_sync(trade_data, 'trade')
            
            # Log trade with market status (symbol-specific)
            is_market_open = self._is_market_open(symbol)
            market_emoji = "🔥" if is_market_open else "🌙"
            market_status = "시장개장" if is_market_open else "시장폐장"
            
            logger.info(f"{market_emoji} [{market_status}] Trade: {symbol} @ ${price:.2f} (Vol: {volume:,})")
            
        except Exception as e:
            logger.error(f"Error processing single trade: {e}")
    
    async def _handle_trade_data(self, data: Dict):
        """Handle trade data (async version - kept for compatibility)"""
        self._handle_trade_data_sync(data)
    
    def _handle_quote_data_sync(self, data: Dict):
        """Handle quote data synchronously"""
        try:
            symbol = data.get('s', 'Unknown')
            bid = data.get('b', 0)
            ask = data.get('a', 0)
            bid_size = data.get('bs', 0)
            ask_size = data.get('as', 0)
            timestamp = data.get('t', 0)
            
            # Convert timestamp to readable format
            quote_time = datetime.fromtimestamp(timestamp / 1000).isoformat()
            
            quote_data = {
                'symbol': symbol,
                'bid': bid,
                'ask': ask,
                'bid_size': bid_size,
                'ask_size': ask_size,
                'timestamp': quote_time,
                'raw_timestamp': timestamp
            }
            
            # Store to Redis using the dedicated event loop
            self._store_to_redis_sync(quote_data, 'quote')
            
            # Log quote with market status (symbol-specific)
            is_market_open = self._is_market_open(symbol)
            market_emoji = "🔥" if is_market_open else "🌙"
            market_status = "시장개장" if is_market_open else "시장폐장"
            
            logger.info(f"{market_emoji} [{market_status}] Quote: {symbol} Bid: ${bid:.2f} Ask: ${ask:.2f}")
            
        except Exception as e:
            logger.error(f"Error handling quote data: {e}")
    
    def _send_pong_sync(self):
        """Send pong response to ping synchronously"""
        try:
            if self.websocket:
                self.websocket.send(json.dumps({"type": "pong"}))
                logger.debug("Sent pong response")
        except Exception as e:
            logger.error(f"Failed to send pong: {e}")
    
    async def _handle_quote_data(self, data: Dict):
        """Handle quote data (async version - kept for compatibility)"""
        self._handle_quote_data_sync(data)
    
    async def _send_pong(self):
        """Send pong response to ping (async version - kept for compatibility)"""
        self._send_pong_sync()
    
    def _subscribe_to_symbol(self, symbol: str):
        """Subscribe to a single symbol for real-time data"""
        try:
            if not self.websocket:
                logger.error("WebSocket not connected")
                return
            
            if symbol not in self.subscribed_symbols:
                # Subscribe to trades and quotes
                subscribe_msg = {"type": "subscribe", "symbol": symbol}
                self.websocket.send(json.dumps(subscribe_msg))
                
                self.subscribed_symbols.add(symbol)
                logger.info(f"Subscribed to {symbol}")
            
        except Exception as e:
            logger.error(f"Failed to subscribe to {symbol}: {e}")
    
    def _unsubscribe_from_symbol(self, symbol: str):
        """Unsubscribe from a single symbol"""
        try:
            if not self.websocket:
                return
            
            if symbol in self.subscribed_symbols:
                unsubscribe_msg = {"type": "unsubscribe", "symbol": symbol}
                self.websocket.send(json.dumps(unsubscribe_msg))
                
                self.subscribed_symbols.remove(symbol)
                logger.info(f"Unsubscribed from {symbol}")
            
        except Exception as e:
            logger.error(f"Failed to unsubscribe from {symbol}: {e}")
    
    def _connect_websocket(self):
        """Connect to Finnhub WebSocket using standard websocket-client"""
        try:
            logger.info(f"Connecting to Finnhub WebSocket: {self.ws_url}")
            
            # Enable trace for debugging
            websocket.enableTrace(True)
            
            # Create WebSocketApp with callbacks
            self.websocket = WebSocketApp(
                self.ws_url,
                on_message=self._on_message,
                on_error=self._on_error,
                on_close=self._on_close,
                on_open=self._on_open
            )
            
            logger.info("WebSocket connection created")
            
        except Exception as e:
            logger.error(f"Failed to create WebSocket connection: {e}")
            raise e
    
    def _reconnect(self):
        """Reconnect to WebSocket with exponential backoff"""
        if self.reconnect_attempts >= self.max_reconnect_attempts:
            logger.error("Max reconnection attempts reached. Stopping consumer.")
            self.is_running = False
            return
        
        self.reconnect_attempts += 1
        delay = min(self.reconnect_delay * (2 ** self.reconnect_attempts), 300)  # Max 5 minutes
        
        logger.info(f"Reconnecting in {delay} seconds (attempt {self.reconnect_attempts}/{self.max_reconnect_attempts})")
        time.sleep(delay)
        
        try:
            self._connect_websocket()
            self._run_websocket()
        except Exception as e:
            logger.error(f"Reconnection failed: {e}")
            self._reconnect()
    
    def _run_websocket(self):
        """Run WebSocket in a separate thread"""
        if self.websocket:
            self.ws_thread = threading.Thread(target=self.websocket.run_forever)
            self.ws_thread.daemon = True
            self.ws_thread.start()
            logger.info("WebSocket thread started")
    
    def log_status(self):
        """Log current consumer status"""
        market_emoji = "🔥" if self._is_market_open() else "🌙"
        market_status = "시장개장" if self._is_market_open() else "시장폐장"
        
        logger.info(f"📊 Finnhub WebSocket Consumer Status:")
        logger.info(f"   {market_emoji} Market Status: {market_status}")
        logger.info(f"   🔗 WebSocket: {'Connected' if self.websocket and not self.websocket.closed else 'Disconnected'}")
        logger.info(f"   📈 Subscribed Symbols: {len(self.subscribed_symbols)}")
        logger.info(f"   🔄 Reconnect Attempts: {self.reconnect_attempts}")
        logger.info(f"   🏃 Running: {self.is_running}")
    
    def start(self):
        """Start the WebSocket consumer"""
        if not self.api_key:
            logger.error("Finnhub API key not configured")
            return
        
        logger.info("Starting Finnhub WebSocket Consumer...")
        self.is_running = True
        
        try:
            # Start dedicated event loop for async operations
            self._start_event_loop()
            
            # Connect to Redis using the dedicated loop
            future = asyncio.run_coroutine_threadsafe(self._connect_redis(), self.loop)
            future.result(timeout=10)  # Wait for Redis connection
            
            self._connect_websocket()
            self._run_websocket()
            
            # Keep the main thread alive
            while self.is_running:
                time.sleep(1)
                    
        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
        except Exception as e:
            logger.error(f"Fatal error in consumer: {e}")
        finally:
            self.stop()
    
    def stop(self):
        """Stop the WebSocket consumer"""
        logger.info("Stopping Finnhub WebSocket Consumer...")
        self.is_running = False
        
        if self.websocket:
            # Unsubscribe from all symbols
            for symbol in list(self.subscribed_symbols):
                self._unsubscribe_from_symbol(symbol)
            
            self.websocket.close()
            logger.info("WebSocket connection closed")
        
        if self.ws_thread and self.ws_thread.is_alive():
            self.ws_thread.join(timeout=5)
            logger.info("WebSocket thread stopped")
        
        if self.redis_client and self.loop:
            try:
                future = asyncio.run_coroutine_threadsafe(self.redis_client.close(), self.loop)
                future.result(timeout=5)
                logger.info("Redis connection closed")
            except Exception as e:
                logger.error(f"Failed to close Redis connection: {e}")
        
        # Stop the dedicated event loop
        self._stop_event_loop()


# Signal handlers for graceful shutdown
def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}, initiating shutdown...")
    sys.exit(0)


def test_run():
    """Test function for standalone execution"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    consumer = FinnhubWSConsumer()
    
    try:
        # Start consumer
        consumer.start()
    except KeyboardInterrupt:
        logger.info("Test interrupted by user")
    except Exception as e:
        logger.error(f"Test failed: {e}")
    finally:
        consumer.stop()


if __name__ == "__main__":
    test_run()
