#!/usr/bin/env python3
"""
Simple YFinance client test - no DB dependencies
"""
import asyncio
import sys
import os

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

# Import yfinance directly for testing
import yfinance as yf
import pandas as pd


async def test_yfinance_direct():
    """Test yfinance directly without our client wrapper"""
    print("🧪 Testing YFinance Direct API")
    print("=" * 50)
    
    test_symbols = ['AAPL', 'MSFT', 'GOOGL']
    
    for symbol in test_symbols:
        print(f"\n📊 Testing {symbol}:")
        print("-" * 30)
        
        try:
            # Create ticker
            ticker = yf.Ticker(symbol)
            
            # Test 1: Get info
            print("1️⃣ Testing ticker info...")
            info = ticker.info
            if info:
                print(f"   ✅ Company: {info.get('longName', 'N/A')}")
                print(f"   ✅ Sector: {info.get('sector', 'N/A')}")
                print(f"   ✅ Price: ${info.get('currentPrice', info.get('regularMarketPrice', 'N/A'))}")
                print(f"   ✅ Market Cap: ${info.get('marketCap', 'N/A'):,}" if info.get('marketCap') else "   ❌ No market cap")
            else:
                print("   ❌ No info data")
            
            # Test 2: Get historical data
            print("2️⃣ Testing historical data...")
            hist = ticker.history(period="5d")
            if not hist.empty:
                print(f"   ✅ Retrieved {len(hist)} days of data")
                latest = hist.iloc[-1]
                print(f"   📅 Latest: {hist.index[-1].strftime('%Y-%m-%d')} | Close: ${latest['Close']:,.2f}")
            else:
                print("   ❌ No historical data")
            
            # Test 3: Get real-time quote
            print("3️⃣ Testing real-time quote...")
            quote = ticker.history(period="1d", interval="1m")
            if not quote.empty:
                print(f"   ✅ Real-time data available")
                latest_price = quote['Close'].iloc[-1]
                print(f"   💰 Latest Price: ${latest_price:,.2f}")
            else:
                print("   ❌ No real-time data")
                
        except Exception as e:
            print(f"   ❌ Error testing {symbol}: {e}")
    
    print("\n" + "=" * 50)
    print("✅ YFinance direct test completed!")


async def test_our_client():
    """Test our YFinance client wrapper"""
    print("\n🔧 Testing Our YFinance Client Wrapper")
    print("=" * 50)
    
    try:
        from app.external_apis.implementations.yfinance_client import YFinanceClient
        
        client = YFinanceClient()
        test_symbol = "AAPL"
        
        print(f"📊 Testing {test_symbol} with our client:")
        print("-" * 40)
        
        # Test real-time quote
        print("1️⃣ Testing real-time quote...")
        quote = await client.get_realtime_quote(test_symbol)
        if quote:
            print(f"   ✅ Price: ${quote.price:,.2f}")
            print(f"   ✅ Change: {quote.change:+.2f} ({quote.change_percent:+.2f}%)")
            print(f"   ✅ Volume: {quote.volume:,}")
        else:
            print("   ❌ No quote data")
        
        # Test company profile
        print("2️⃣ Testing company profile...")
        profile = await client.get_company_profile(test_symbol)
        if profile:
            print(f"   ✅ Company: {profile.name}")
            print(f"   ✅ Sector: {profile.sector}")
            print(f"   ✅ Market Cap: ${profile.market_cap:,.0f}")
        else:
            print("   ❌ No profile data")
        
        # Test OHLCV data
        print("3️⃣ Testing OHLCV data...")
        ohlcv = await client.get_ohlcv_data(test_symbol, limit=3)
        if ohlcv:
            print(f"   ✅ Retrieved {len(ohlcv)} data points")
            for i, data in enumerate(ohlcv[-2:], 1):
                date = data.timestamp[:10]
                print(f"   📅 {date}: Close=${data.close:,.2f} Volume={data.volume:,}")
        else:
            print("   ❌ No OHLCV data")
            
    except Exception as e:
        print(f"❌ Error testing our client: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 50)
    print("✅ Our client test completed!")


async def main():
    """Main test function"""
    print("🚀 YFinance Testing Suite")
    print("=" * 50)
    
    # Test 1: Direct yfinance
    await test_yfinance_direct()
    
    # Test 2: Our client wrapper
    await test_our_client()
    
    print("\n🎉 All tests completed!")
    print("💡 If you see data above, YFinance is working correctly!")


if __name__ == "__main__":
    asyncio.run(main())

