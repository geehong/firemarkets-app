
import asyncio
import json
import logging
import os
import sys
import random
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Optional, Set
from collections import namedtuple
from base64 import b64decode

import httpx
import websockets
import redis.asyncio as redis
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
from dotenv import load_dotenv

# Ensure core is in path if needed (usually handled by app runner)
# project_root = Path(__file__).resolve().parent.parent.parent.parent
# sys.path.insert(0, str(project_root))

from app.services.websocket.base_consumer import BaseWSConsumer, ConsumerConfig, AssetType

logger = logging.getLogger("KisConsumer")

# Load environment variables
load_dotenv()

# KIS Configuration
KIS_APP_KEY = os.getenv("KIS_APP_KEY", "")
KIS_APP_SECRET = os.getenv("KIS_APP_SECRET", "")
KIS_HTS_ID = os.getenv("KIS_HTS_ID", "") # Needed for some TRs if applicable

# Prod vs Virtual
# Using Production URLs as default from run_kis_websocket.py
WS_BASE_URL = "ws://ops.koreainvestment.com:21000" 
REST_BASE_URL = "https://openapi.koreainvestment.com:9443"

# Redis
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
REDIS_STREAM_KEY = "kis:realtime"

# AES Constants
AES_KEY_BYTES = 32

class KisConsumer(BaseWSConsumer):
    def __init__(self, config: ConsumerConfig):
        super().__init__(config)
        self.approval_key = None
        self.redis_client = None
        self.ws_overseas: Optional[websockets.WebSocketClientProtocol] = None
        # self._mock_domestic_task = None (Removed)
        
        # Targets (Hardcoded as per run_kis_websocket.py, ideally should be dynamic or passed in config)
        self.targets = [
            # Domestic
            {"ticker": "005930", "market": "KRX", "name": "Samsung Electronics", "type": "domestic"},
            # Overseas (Temporarily commented out for testing)
            # {"ticker": "600519", "market": "SHS", "name": "Kweichow Moutai", "type": "overseas"}, # Shanghai
            # {"ticker": "300750", "market": "SZS", "name": "CATL", "type": "overseas"},            # Shenzhen
            # {"ticker": "00700", "market": "HKS", "name": "Tencent", "type": "overseas"},          # HK
            # {"ticker": "7203", "market": "TSE", "name": "Toyota", "type": "overseas"},            # Tokyo
        ]
        
        # Crypto setup for decryption
        self.iv = None
        self.key = None

    @property
    def client_name(self) -> str:
        return "kis"

    @property
    def api_key(self) -> Optional[str]:
        return KIS_APP_KEY

    async def connect(self) -> bool:
        """Initialize Redis and Authenticate"""
        try:
            # 1. Init Redis
            url = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}" if REDIS_PASSWORD else f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"
            self.redis_client = await redis.from_url(url)
            logger.info(f"✅ Redis connected: {REDIS_HOST}:{REDIS_PORT}")
            
            # 2. Get Approval Key (if using real API)
            if self.is_production_mode():
                await self.get_approval_key()
                if not self.approval_key:
                    logger.error("❌ Failed to obtain Approval Key.")
                    return False
            else:
                logger.warning("⚠️ KIS credentials missing or incomplete. Running in MOCK/HYBRID mode.")
                
            self.is_connected = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Connect failed: {e}")
            return False

    async def disconnect(self):
        self.is_running = False
        if self.ws_overseas:
            await self.ws_overseas.close()
        if self.redis_client:
            await self.redis_client.close()
        # if self._mock_domestic_task: (Removed)
        #     self._mock_domestic_task.cancel()
        self.is_connected = False

    async def subscribe(self, tickers: List[str]) -> bool:
        # KIS websocket subscription is handled during connection/run loop based on self.targets for now.
        # Dynamic subscription implementation:
        # TODO: Implement dynamic add to self.targets and send sub frame
        return True

    async def unsubscribe(self, tickers: List[str]) -> bool:
        return True

    async def run(self):
        """Main loop."""
        self.is_running = True
        
        if self.is_production_mode():
             # Real Connection to Overseas
            await self.run_ws_overseas()
        else:
            logger.warning("⚠️ No KIS Credentials. Service will idle (Mock logic removed).")
            while self.is_running:
                await asyncio.sleep(1)

    async def _perform_health_check(self) -> bool:
        if not self.is_running:
            return False
        # Check if ws is open
        if self.is_production_mode():
             if not self.ws_overseas or self.ws_overseas.closed:
                 return False
        return True

    # --- Helpers ---

    def is_production_mode(self):
        return bool(KIS_APP_KEY and KIS_APP_SECRET)

    async def get_approval_key(self):
        """Get WebSocket Approval Key (valid for 24h) - Ported from run_kis_websocket.py / kis_cunsumer.py"""
        url = f"{REST_BASE_URL}/oauth2/Approval"
        headers = {"content-type": "application/json; utf-8"}
        body = {
            "grant_type": "client_credentials",
            "appkey": KIS_APP_KEY,
            "secretkey": KIS_APP_SECRET
        }
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, headers=headers, json=body, timeout=10.0)
                resp.raise_for_status()
                data = resp.json()
                self.approval_key = data.get("approval_key")
                if self.approval_key:
                    logger.info(f"🔑 Approval Key obtained: {self.approval_key[:10]}...")
                else:
                    logger.error(f"❌ Failed to get Approval Key (empty): {data}")
        except Exception as e:
            logger.error(f"❌ Failed to get Approval Key: {e}")

    def build_tr_key(self, target):
        ticker = target["ticker"]
        market = target["market"]
        if target["type"] == "domestic":
            return ticker
        else:
            # Overseas: R + Market(3) + Ticker. (D is for US Night, we use R for Day/Asia Paid/Real)
            return f"R{market}{ticker}"

    async def run_ws_overseas(self):
        # NOTE: Temporary modification to test DOMESTIC connection
        uri = f"{WS_BASE_URL}/tryitout/H0STCNT0"
        while self.is_running:
            try:
                logger.info(f"🔌 Connecting to KIS Domestic WS: {uri}")
                async with websockets.connect(uri) as websocket:
                    self.ws_overseas = websocket
                    logger.info("✅ Connected to KIS Domestic WS")
                    
                    # Subscribe
                    for target in self.targets:
                        # Modified loop to check for DOMESTIC
                        if target["type"] == "domestic":
                            tr_id = "H0STCNT0" # Domestic Realtime Transaction
                            tr_key = target["ticker"] # Domestic uses ticker code
                            
                            req = {
                                "header": {
                                    "approval_key": self.approval_key,
                                    "custtype": "P",
                                    "tr_type": "1",
                                    "content-type": "utf-8"
                                },
                                "body": {
                                    "input": {
                                        "tr_id": tr_id,
                                        "tr_key": tr_key
                                    }
                                }
                            }
                            await websocket.send(json.dumps(req))
                            logger.info(f"📤 Subscribed: {target['name']} ({tr_key})")

                    # Listen
                    async for message in websocket:
                        await self.handle_message(message)
                        
            except Exception as e:
                logger.error(f"❌ WebSocket Error: {e}")
                self.connection_errors += 1
                await asyncio.sleep(5) # Reconnect delay

    async def handle_message(self, message):
        try:
            msg_str = message
            if isinstance(msg_str, bytes):
                msg_str = msg_str.decode('utf-8')

            first_char = msg_str[0]
            
            # 0: Encrypted/Plain Data (Realtime)
            # 1: Encrypted/Plain Data (Realtime) ?
            
            if first_char not in ['0', '1']:
                # System Message (JSON)
                try:
                    data = json.loads(msg_str)
                    if "header" in data:
                        tr_id = data["header"].get("tr_id")
                        if tr_id == "PINGPONG":
                            # Pong if needed
                            await self.ws_overseas.send(message) # Echo back
                            return
                        elif "msg_cd" in data.get("body", {}):
                             logger.info(f"Subscription Ack: {data['body']['msg1']}")
                             
                        # Capture encryption keys if provided
                        if "output" in data.get("body", {}) and "iv" in data["body"]["output"]:
                            self.iv = data["body"]["output"]["iv"]
                            self.key = data["body"]["output"]["key"]
                            logger.info("🔐 Received Encryption Keys")
                            
                    return
                except:
                    pass

            # Real Data Parsing (Pipe separated)
            parts = msg_str.split('|')
            if len(parts) < 4:
                return

            # parts[0]: 0 or 1
            # parts[1]: TR_ID
            # parts[2]: DATA_CNT
            # parts[3]: TR_KEY / Data
            
            # Check if encrypted
            is_encrypted = (parts[0] == '1')
            tr_id = parts[1]
            data_segment = parts[-1]
            
            if is_encrypted:
                if self.key and self.iv:
                    data_segment = self.aes_cbc_base64_dec(self.key, self.iv, data_segment)
                else:
                    logger.warning("⚠️ Received encrypted data but no key/iv")
                    return

            fields = data_segment.split('^')
            
            if tr_id == "HDFSASP0": # Overseas Realtime Quote
                # HDFSASP0 Map (Simulated/Approx)
                # 0: RSYM (Symb), ... 12: PASK1 (Price approx)
                if len(fields) > 12:
                    symb = fields[1]
                    price_str = fields[12]
                    volume_str = fields[7] # BVOL
                    
                    price = self.safe_float(price_str)
                    volume = self.safe_float(volume_str)
                    
                    p_data = {
                        "symbol": symb,
                        "price": price,
                        "volume": volume,
                        "provider": "kis_overseas",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                    await self.publish(p_data)

            elif tr_id == "H0STCNT0": # Domestic
                 if len(fields) > 12:
                    symb = fields[0]
                    price = self.safe_float(fields[2])
                    volume = self.safe_float(fields[12])
                     
                    p_data = {
                        "symbol": symb,
                        "price": price,
                        "volume": volume,
                        "provider": "kis_domestic",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                    await self.publish(p_data)

        except Exception as e:
            logger.error(f"Parse Error: {e}")

    async def publish(self, data):
        if self.redis_client:
            await self.redis_client.xadd(REDIS_STREAM_KEY, data)
            # logger.debug(f"Received: {data['symbol']} ${data['price']}")

    # Mock methods removed
            
    # --- Utils ---
    @staticmethod
    def safe_float(value):
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def aes_cbc_base64_dec(key, iv, cipher_text):
        if not key or not iv:
             raise ValueError("Key/IV missing")
        # KIS keys usually default utf-8
        cipher = AES.new(key.encode("utf-8"), AES.MODE_CBC, iv.encode("utf-8"))
        return bytes.decode(unpad(cipher.decrypt(b64decode(cipher_text)), AES.block_size))

if __name__ == "__main__":
    # Test runner
    logging.basicConfig(level=logging.INFO)
    
    # Mock Config
    config = ConsumerConfig(
        max_subscriptions=10,
        supported_asset_types=[AssetType.STOCK],
        rate_limit_per_minute=60,
        priority=1
    )
    
    consumer = KisConsumer(config)
    
    async def main():
        if await consumer.connect():
            await consumer.run()
            
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass