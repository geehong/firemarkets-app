import asyncio
import logging
from app.external_apis.implementations.bitcoin_data_client import BitcoinDataClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_metric(metric_name):
    client = BitcoinDataClient()
    print(f"--- Testing {metric_name} ---")
    # Simulate exactly what OnchainCollector uses (days=None implies size=1 in client, but I will ask for size=5 to see context)
    # Actually OnchainCollector calls get_metric(metric_name, days=None) -> client uses size=1.
    # Let's test size=5 to check sort order.
    data = await client.get_metric(metric_name, days=5)
    
    if data:
        print(f"✅ Received {len(data)} items for {metric_name}")
        if len(data) > 0:
            print(f"  First item TS: {data[0].timestamp_utc}")
            print(f"  Last item  TS: {data[-1].timestamp_utc}")
            print(f"  First item val: {getattr(data[0], metric_name, 'N/A')}")
    else:
        print(f"❌ No data received for {metric_name}")

async def main():
    # Test valid and potentially problematic metrics
    metrics = [
        'mvrv_z_score', # User says this exists
        'realized_price', # User says this is NULL
        'realized-price-live', # Check if this exists
        'hashrate', # User says this is intermittent
        'difficulty' # User says this is NULL
    ]
    
    for m in metrics:
        await test_metric(m)

if __name__ == "__main__":
    asyncio.run(main())
