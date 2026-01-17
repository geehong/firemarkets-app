import asyncio
import httpx
import json

async def test_latest_data():
    base_url = "https://bitcoin-data.com/v1"
    endpoints = ["mvrv", "nupl", "nupl-lth"]
    
    async with httpx.AsyncClient() as client:
        for ep in endpoints:
            url = f"{base_url}/{ep}?limit=5&sort=unixTs,desc"
            print(f"Testing {url}...")
            try:
                resp = await client.get(url, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    print(f"Type: {type(data)}")
                    if isinstance(data, list):
                        print(f"Count: {len(data)}")
                        for item in data[:3]:
                            print(f"  {item.get('d')} (unix: {item.get('unixTs')})")
                    else:
                        print(f"Data: {str(data)[:200]}")
                else:
                    print(f"Error {resp.status_code}: {resp.text}")
            except Exception as e:
                print(f"Exception: {e}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(test_latest_data())
