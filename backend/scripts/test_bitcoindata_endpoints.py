import asyncio
import httpx
import json

async def test_bitcoindata():
    base_url = "https://bitcoin-data.com/v1"
    endpoints = [
        "mvrv", "mvrv-lth", "lth-mvrv", "mvrv-sth", "sth-mvrv",
        "nupl-lth", "nupl-sth", "lth-nupl", "sth-nupl",
        "terminal-price", "delta-price-usd", "market-cap",
        "mvrv-lth-btc", "mvrv-sth-btc"
    ]
    
    async with httpx.AsyncClient() as client:
        for ep in endpoints:
            url = f"{base_url}/{ep}?size=1"
            print(f"Testing {url}...")
            try:
                resp = await client.get(url, timeout=10)
                print(f"Status: {resp.status_code}")
                if resp.status_code == 200:
                    data = resp.json()
                    print(f"Data snippet: {json.dumps(data, indent=2)[:500]}")
                else:
                    print(f"Error: {resp.text}")
            except Exception as e:
                print(f"Exception: {e}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(test_bitcoindata())
