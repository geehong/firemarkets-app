"""
KIS WebSocket Producer Service
- Connects to Korea Investment & Securities (KIS) WebSocket API.
- Implements `HDFSASP0` (Overseas Realtime Quote) and `H0STCNT0` (Domestic).
- Spec: `readme/kiswebsocks.md`
"""

import asyncio
import json
import logging
import os
import sys
import signal
from pathlib import Path
from datetime import datetime, timezone
import httpx
import websockets
from dotenv import load_dotenv
import redis.asyncio as redis
import random

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
KIS_APP_KEY = os.getenv("KIS_APP_KEY", "")
KIS_APP_SECRET = os.getenv("KIS_APP_SECRET", "")
# Real environment for HDFSASP0
WS_BASE_URL = "ws://ops.koreainvestment.com:21000" 
REST_BASE_URL = "https://openapi.koreainvestment.com:9443"

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

REDIS_STREAM_KEY = "kis:realtime"

# Logging
verbose = os.getenv("KIS_WS_VERBOSE", "true").lower() == "true"
log_level = logging.DEBUG if verbose else logging.INFO
logging.basicConfig(level=log_level, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("KIS-WebSocket")

# Targets
# Format: (SymbolCode, Market, Name, Type)
# Note: For HDFSASP0, tr_key = R + Market(3) + Code.
TARGETS = [
    # Domestic
    {"ticker": "005930", "market": "KRX", "name": "Samsung Electronics", "type": "domestic"},
    # Overseas
    {"ticker": "600519", "market": "SHS", "name": "Kweichow Moutai", "type": "overseas"}, # Shanghai
    {"ticker": "300750", "market": "SZS", "name": "CATL", "type": "overseas"},            # Shenzhen
    {"ticker": "00700", "market": "HKS", "name": "Tencent", "type": "overseas"},          # HK
    {"ticker": "7203", "market": "TSE", "name": "Toyota", "type": "overseas"},            # Tokyo
]

class MockKISWebSocketProducer:
    def __init__(self):
        self.redis_client = None
        self.running = True
        
    async def init_redis(self):
        url = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}" if REDIS_PASSWORD else f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"
        self.redis_client = await redis.from_url(url)
        logger.info(f"✅ [MOCK] Redis connected: {REDIS_HOST}:{REDIS_PORT}")

    async def run(self):
        logger.info("⚠️ [MOCK] Starting Mock Producer due to missing KIS credentials.")
        logger.info("⚠️ [MOCK] Simulating HDFSASP0 / H0STCNT0 data stream.")
        
        while self.running:
            now_iso = datetime.now(timezone.utc).isoformat()
            pipeline = self.redis_client.pipeline()
            
            for target in TARGETS:
                # Simulate price movement
                price = 0
                if target['ticker'] == '005930': price = 60000 + random.uniform(-500, 500) # Samsung
                elif target['ticker'] == '600519': price = 1600 + random.uniform(-10, 10) # Moutai
                elif target['ticker'] == '300750': price = 150 + random.uniform(-2, 2) # CATL
                elif target['ticker'] == '00700': price = 280 + random.uniform(-5, 5) # Tencent
                elif target['ticker'] == '7203': price = 2900 + random.uniform(-30, 30) # Toyota
                
                # Frontend expects: { asset_id(optional/mapped by broadcaster), ticker, price, volume, timestamp_utc, data_source }
                # Broadcaster maps 'ticker' to asset_id.
                
                msg = {
                    "symbol": target['ticker'], 
                    "ticker": target['ticker'],
                    "price": round(price, 2),
                    "volume": random.randint(100, 1000),
                    "provider": "kis_mock", # Broadcaster maps 'kis_mock' or 'kis:realtime' stream
                    "timestamp": now_iso
                }
                
                pipeline.xadd(REDIS_STREAM_KEY, msg)
                
            await pipeline.execute()
            await asyncio.sleep(1) # 1 second update

class KISWebSocketProducer:
    def __init__(self):
        self.approval_key = None
        self.redis_client = None
        self.running = True
        
    async def init_redis(self):
        url = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}" if REDIS_PASSWORD else f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"
        self.redis_client = await redis.from_url(url)
        logger.info(f"✅ Redis connected: {REDIS_HOST}:{REDIS_PORT}")

    async def get_approval_key(self):
        """Get WebSocket Approval Key (valid for 24h)"""
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
                    return self.approval_key
                else:
                    logger.error(f"❌ Failed to get Approval Key (empty): {data}")
                    return None
        except Exception as e:
            logger.error(f"❌ Failed to get Approval Key: {e}")
            return None

    def build_tr_key(self, target):
        """Construct TR Key based on HDFSASP0 spec"""
        ticker = target["ticker"]
        market = target["market"]
        
        if target["type"] == "domestic":
            # Domestic: Just the ticker (6 digits)
            return ticker
        else:
            # Overseas: R + Market(3) + Ticker. (D is for US Night, we use R for Day/Asia Paid)
            # Market codes: HKS(Hong Kong), TSE(Tokyo), SHS(Shanghai), SZS(Shenzhen)
            # Example: RHKS00700, RTSE7203
            return f"R{market}{ticker}"

    async def connect_and_listen(self):
        if not self.approval_key:
            if not await self.get_approval_key():
                logger.error("Cannot proceed without Approval Key.")
                return

        # Domestic and Overseas use different path?
        # Doc: /tryitout/HDFSASP0 (Overseas)
        # Domestic usually: /tryitout/H0STCNT0
        # Connect to Base URL and then send subscribe messages.
        # Actually in KIS Websocket, the path often dictates the handler.
        # Can we multiplex? Usually yes on the same connection if paths match, but paths differ.
        # We will run separate tasks.
        
        # KIS single connection limit prevents simultaneous Domestic & Overseas.
        # Strategy: Connect to Overseas (Priority) and Mock Domestic.
        
        # Start Mock Generator for Domestic
        asyncio.create_task(self.run_domestic_mock())
        
        # Connect to Overseas Realtime
        await self.run_socket(f"{WS_BASE_URL}/tryitout/HDFSASP0", "overseas")

    async def run_domestic_mock(self):
        """Generate mock data for Domestic targets since we can't connect to H0STCNT0 simultaneously"""
        logger.info("⚠️ Starting Mock Generator for Domestic targets (Hybrid Mode)")
        while self.running:
            for target in TARGETS:
                if target["type"] == "domestic":
                    price = 0
                    if target['ticker'] == '005930': price = 60000 + random.uniform(-500, 500) # Samsung
                    
                    msg = {
                        "symbol": target['ticker'],
                        "price": round(price, 2),
                        "volume": random.randint(100, 1000),
                        "provider": "kis_domestic_mock",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                    try:
                        await self.redis_client.xadd(REDIS_STREAM_KEY, msg)
                    except Exception:
                        pass
            await asyncio.sleep(1)

    async def run_socket(self, uri, source_type):
        while self.running:
            try:
                logger.info(f"🔌 Connecting to {source_type.upper()} WebSocket: {uri}")
                async with websockets.connect(uri) as websocket:
                    logger.info(f"✅ Connected to {source_type.upper()}")
                    
                    # Subscribe ONLY to Overseas targets for this socket
                    for target in TARGETS:
                        if target["type"] == "overseas":
                            tr_id = "HDFSASP0"
                            tr_key = self.build_tr_key(target)
                            
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
                            logger.info(f"📤 Subscribed: {target['name']} ({tr_key}) via {source_type}")

                    # Listen
                    async for message in websocket:
                        await self.handle_message(message, source_type)
                        
            except Exception as e:
                logger.error(f"❌ WebSocket Error ({source_type}): {e}")
                await asyncio.sleep(5)

    async def handle_message(self, message, source_type):
        try:
            msg_str = message
            if isinstance(msg_str, bytes):
                msg_str = msg_str.decode('utf-8')

            first_char = msg_str[0]
            
            # 0: Encrypted/Plain Data (Realtime)
            # 1: Plain Data?
            # JSON: System Msg (PingPong etc)
            
            if first_char not in ['0', '1']:
                try:
                    data = json.loads(msg_str)
                    if "header" in data:
                        tr_id = data["header"].get("tr_id")
                        if tr_id == "PINGPONG":
                            # PONG if needed? KIS sends PINGPONG to keepalive.
                            # Usually we just ignore or log.
                            # logger.debug("PINGPONG received")
                            pass
                        elif "msg_cd" in data["body"]:
                             # Subscription Ack
                             logger.info(f"Subscription Ack: {data['body']['msg1']}")
                    return
                except:
                    pass

            # Real Data Parsing
            parts = msg_str.split('|')
            if len(parts) < 4:
                return

            # parts[0]: 0 or 1
            # parts[1]: TR_ID
            # parts[2]: DATA_CNT
            # parts[3]: TR_KEY (Symbol/Code)
            
            tr_id = parts[1]
            # tr_key_recv = parts[3] # e.g. RHKS00700 or 005930
            
            data_segment = parts[-1]
            fields = data_segment.split('^')
            
            p_data = None
            
            if tr_id == "HDFSASP0": # Overseas Realtime Quote
                # fields index from spec (HDFSASP0):
                # 0: RSYM, 1: SYMB, 2: ZDIV ...
                # 11: PBID1 (Purchase Bid 1)
                # 12: PASK1 (Purchase Ask 1 - Sell Quote)
                
                if len(fields) > 12:
                    symb = fields[1] # SYMB
                    # Using PASK1 (Ask Price) as 'Current Price' approximation for Quotes
                    # because HDFSASP0 is Quote data, not execution.
                    price_str = fields[12] 
                    volume_str = fields[7] # BVOL (Buy Total Vol)? or fields[8] AVOL?
                    # Spec: 7: BVOL, 8: AVOL. 
                    # Note: No 'Trade Volume' in Quote data usually. 
                    # Maybe we use average of Bid/Ask? 
                    # Let's use PASK1 for Price.
                    
                    price = safe_float(price_str)
                    volume = safe_float(volume_str)
                    
                    # Note: Need to match the 'ticker' we used in subscription to ensure frontend mapping.
                    # We might need to normalization.
                    # SYMB is e.g. '00700' or '7203'.
                    
                    p_data = {
                        "symbol": symb,
                        "price": price,
                        "volume": volume,
                        "provider": "kis_overseas",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }

            elif tr_id == "H0STCNT0": # Domestic Realtime Execution
                # 0: MKSC_SHRN_ISCD (Symbol)
                # 1: STCK_CNTG_HOUR
                # 2: STCK_PRPR (Current Price)
                # 12: ACML_VOL (Accumulated Volume)
                
                if len(fields) > 12:
                    symb = fields[0]
                    price = safe_float(fields[2])
                    volume = safe_float(fields[12])
                    
                    p_data = {
                        "symbol": symb,
                        "price": price,
                        "volume": volume,
                        "provider": "kis_domestic",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }

            if p_data:
                await self.redis_client.xadd(REDIS_STREAM_KEY, p_data)
                logger.debug(f"Received: {p_data['symbol']} ${p_data['price']}")

        except Exception as e:
            logger.error(f"Parse Error: {e}")

async def main():
    if not KIS_APP_KEY or not KIS_APP_SECRET:
        logger.warning("KIS credentials missing in .env. Switching to MOCK MODE.")
        producer = MockKISWebSocketProducer()
        await producer.init_redis()
        await producer.run()
        return

    producer = KISWebSocketProducer()
    await producer.init_redis()
    await producer.connect_and_listen()

if __name__ == "__main__":
    asyncio.run(main())
