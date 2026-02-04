"""
Alpaca Real Connection Verification
- Connects to Alpaca WebSocket (IEX/SIP)
- Authenticates with .env credentials
- Subscribes to real tickers (AAPL, TSLA)
- Prints receive data
"""
import asyncio
import json
import logging
import os
import sys
from pathlib import Path
import websockets
from dotenv import load_dotenv

# Setup path to load .env from project root
# Script location: backend/scripts/verify_alpaca_real.py
# Project root: ../../
current_dir = Path(__file__).resolve().parent
project_root = current_dir.parent.parent
sys.path.insert(0, str(project_root))

load_dotenv(project_root / '.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Alpaca-Verifier")

ALPACA_API_KEY = os.getenv("ALPACA_API_KEY")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")
# SIP (Paid) vs IEX (Free)
# wss://stream.data.alpaca.markets/v2/sip
# wss://stream.data.alpaca.markets/v2/iex
WS_URL = "wss://stream.data.alpaca.markets/v2/iex"

async def main():
    logger.info("🚀 Starting Alpaca Real Verification")
    logger.info(f"Target URL: {WS_URL}")
    logger.info(f"API Key: {ALPACA_API_KEY[:5]}... (Loaded from {project_root / '.env'})")

    if not ALPACA_API_KEY or not ALPACA_SECRET_KEY:
        logger.error("❌ API Keys not found in .env")
        return

    try:
        async with websockets.connect(WS_URL) as ws:
            logger.info("✅ Connected to WebSocket")
            
            # 1. Wait for Welcome
            welcome = await ws.recv()
            logger.info(f"📨 Welcome Msg: {welcome}")
            
            # 2. Authenticate
            auth_payload = {
                "action": "auth",
                "key": ALPACA_API_KEY,
                "secret": ALPACA_SECRET_KEY
            }
            await ws.send(json.dumps(auth_payload))
            logger.info("📤 Sent Authentication")
            
            # 3. Auth Response
            auth_response = await ws.recv()
            logger.info(f"📨 Auth Response: {auth_response}")
            
            auth_data = json.loads(auth_response)
            authenticated = False
            if isinstance(auth_data, list):
                if auth_data[0].get('T') == 'success' and auth_data[0].get('msg') == 'authenticated':
                    authenticated = True
            
            if not authenticated:
                logger.error("❌ Authentication Failed. Check Limit or Keys.")
                return
                
            logger.info("✅ Authentication Successful!")
            
            # 4. Subscribe
            tickers = ["AAPL", "TSLA"]
            sub_payload = {
                "action": "subscribe",
                "trades": tickers,
                "quotes": tickers
            }
            await ws.send(json.dumps(sub_payload))
            logger.info(f"📤 Subscribing to: {tickers}")
            
            # 5. Listen for data
            logger.info("👂 Listening for data (Ctrl+C to stop, waiting 10s)...")
            
            try:
                # Listen for 10 seconds
                start_time = asyncio.get_event_loop().time()
                while asyncio.get_event_loop().time() - start_time < 10:
                    msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    logger.info(f"📊 DATA RECEIVED: {msg}")
            except asyncio.TimeoutError:
                logger.info("⏳ No data received in last 5s (Market might be closed or quiet)")
            
            logger.info("✅ Verification Complete")

    except Exception as e:
        logger.error(f"❌ Error: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
