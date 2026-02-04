
import asyncio
import websockets
import json
import os
import ssl

# Credentials from .env (retrieved in previous step)
API_KEY = "PKZURQ6IJTRM46W4YB42QF46HF"
SECRET_KEY = "AVVwfW8XMtLUpm9KQHUjzGFndmExJoGFW5yHud4Wboec"
# URL provided by user
URL = "wss://stream.data.alpaca.markets/v2/test"

async def test_alpaca():
    print(f"Connecting to {URL}...")
    
    # Try with headers first as requested by user
    extra_headers = {
        "APCA-API-KEY-ID": API_KEY,
        "APCA-API-SECRET-KEY": SECRET_KEY
    }
    
    try:
        async with websockets.connect(URL, extra_headers=extra_headers) as ws:
            print("Connected!")
            
            # Wait for initial message
            msg = await ws.recv()
            print(f"Received: {msg}")
            
            # Usually Alpaca sends [{"T":"success", "msg":"connected"}]
            # Then we need to send auth IF headers didn't cover it.
            # But user thinks headers will cover it. 
            # If msg is 'connected', we might still need to auth.
            
            # Let's try sending standard auth payload too just in case
            auth_payload = {
                "action": "auth",
                "key": API_KEY,
                "secret": SECRET_KEY
            }
            print(f"Sending auth payload: {json.dumps(auth_payload)}")
            await ws.send(json.dumps(auth_payload))
            
            response = await ws.recv()
            print(f"Auth response: {response}")
            
            await asyncio.sleep(1)
            
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_alpaca())
