#!/usr/bin/env python3
"""
Simple test script for YFinance client
Run with: python test_yfinance.py
"""
import asyncio
import sys
import os

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.external_apis.implementations.yfinance_client import YFinanceClient


async def main():
    """Main test function"""
    print("🚀 YFinance Client Test")
    print("=" * 50)
    
    # Initialize client
    client = YFinanceClient()
    
    # Test symbols
    test_symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA']
    
    for symbol in test_symbols:
        print(f"\n📊 Testing {symbol}:")
        print("-" * 30)
        
        try:
            # Test 1: Real-time quote
            print("1️⃣ Testing real-time quote...")
            quote = await client.get_realtime_quote(symbol)
            if quote:
                print(f"   ✅ Price: ${quote.price:,.2f}")
                print(f"   ✅ Change: {quote.change:+.2f} ({quote.change_percent:+.2f}%)")
                print(f"   ✅ Volume: {quote.volume:,}")
                print(f"   ✅ High: ${quote.high:,.2f} | Low: ${quote.low:,.2f}")
            else:
                print("   ❌ No quote data")
            
            # Test 2: Company profile
            print("2️⃣ Testing company profile...")
            profile = await client.get_company_profile(symbol)
            if profile:
                print(f"   ✅ Company: {profile.name}")
                print(f"   ✅ Sector: {profile.sector}")
                print(f"   ✅ Industry: {profile.industry}")
                print(f"   ✅ Market Cap: ${profile.market_cap:,.0f}")
            else:
                print("   ❌ No profile data")
            
            # Test 3: OHLCV data (last 3 days)
            print("3️⃣ Testing OHLCV data...")
            ohlcv = await client.get_ohlcv_data(symbol, limit=3)
            if ohlcv:
                print(f"   ✅ Retrieved {len(ohlcv)} data points")
                for i, data in enumerate(ohlcv[-2:], 1):  # Show last 2 days
                    date = data.timestamp[:10]
                    print(f"   📅 {date}: O=${data.open:,.2f} H=${data.high:,.2f} L=${data.low:,.2f} C=${data.close:,.2f} V={data.volume:,}")
            else:
                print("   ❌ No OHLCV data")
            
            # Test 4: Market cap
            print("4️⃣ Testing market cap...")
            market_cap = await client.get_market_cap(symbol)
            if market_cap:
                print(f"   ✅ Market Cap: ${market_cap:,.0f}")
            else:
                print("   ❌ No market cap data")
                
        except Exception as e:
            print(f"   ❌ Error testing {symbol}: {e}")
    
    print("\n" + "=" * 50)
    print("✅ YFinance Client test completed!")
    print("💡 If you see data above, the client is working correctly!")


if __name__ == "__main__":
    asyncio.run(main())

