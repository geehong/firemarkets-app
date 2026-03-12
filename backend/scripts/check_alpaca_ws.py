import asyncio
import json
import os
import websockets
from dotenv import load_dotenv

# .env 파일 로드 (로컬 및 컨테이너 환경 대응)
env_paths = [
    "/home/geehong/firemarkets-app/backend/.env", # Local
    "/app/.env",                                  # Docker
    ".env",                                       # Current Dir
    "../.env"                                     # Parent Dir
]
found_env = False
for path in env_paths:
    if os.path.exists(path):
        load_dotenv(path)
        print(f"✅ Loaded .env from: {path}")
        found_env = True
        break

if not found_env:
    print("⚠️ No .env file found. Using existing environment variables.")

API_KEY = os.getenv("ALPACA_API_KEY")
SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")
WS_URL = "wss://stream.data.alpaca.markets/v2/iex"

async def check_alpaca():
    if not API_KEY or not SECRET_KEY:
        print("❌ ALPACA_API_KEY or ALPACA_SECRET_KEY not found in .env")
        return

    print(f"Connecting to {WS_URL}...")
    
    try:
        async with websockets.connect(WS_URL, ping_interval=20, ping_timeout=20) as ws:
            # 1. Welcome 메시지 수신
            welcome_msg = await ws.recv()
            print(f"Connected: {welcome_msg}")

            # 2. 인증 시도
            auth_msg = {
                "action": "auth",
                "key": API_KEY,
                "secret": SECRET_KEY
            }
            await ws.send(json.dumps(auth_msg))
            
            auth_resp = await ws.recv()
            print(f"Auth Response: {auth_resp}")

            if "authenticated" not in auth_resp:
                print("❌ Authentication failed")
                return

            # 3. 구독 시도 (SPY, QQQ, VOO)
            tickers = ["SPY", "QQQ", "VOO"]
            subscribe_msg = {
                "action": "subscribe",
                "trades": tickers,
                "quotes": tickers
            }
            await ws.send(json.dumps(subscribe_msg))
            print(f"Subscribed to {tickers}")

            # 4. 데이터 수신 (30초간)
            print("Waiting for data (30 seconds)...")
            start_time = asyncio.get_event_loop().time()
            while asyncio.get_event_loop().time() - start_time < 30:
                try:
                    resp = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    print(f"Received: {resp}")
                except asyncio.TimeoutError:
                    print("... Still waiting for data (timeout) ...")
                except Exception as e:
                    print(f"Error receiving data: {e}")
                    break

    except Exception as e:
        print(f"❌ Connection error: {e}")

if __name__ == "__main__":
    asyncio.run(check_alpaca())
