#!/usr/bin/env python3
"""
Simple test script for Finnhub API client
"""
import asyncio
import sys
import os

# Add the app directory to Python path
sys.path.append('/app')

from app.external_apis.implementations.finnhub_client import FinnhubClient

async def main():
    print("🚀 Finnhub API Test Suite")
    print("=" * 50)
    
    # Use the provided API key
    api_key = "d2t3t79r01qkuv3j6p30d2t3t79r01qkuv3j6p3g"
    
    print(f"🔑 Using API Key: {api_key[:8]}...")
    print()
    
    # Create client
    client = FinnhubClient(api_key)
    
    try:
        # Test connection
        print("🔗 Testing API Connection...")
        is_connected = await client.test_connection()
        print(f"   Status: {'✅ Connected' if is_connected else '❌ Failed'}")
        print()
        
        # Show rate limit info
        print("📊 Rate Limit Information:")
        rate_info = client.get_rate_limit_info()
        for key, value in rate_info.items():
            print(f"   {key}: {value}")
        print()
        
        if is_connected:
            # Test real-time quotes
            print("💰 Testing Real-time Quotes:")
            symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA']
            
            for symbol in symbols:
                print(f"   📈 {symbol}:")
                quote = await client.get_realtime_quote(symbol)
                if quote:
                    print(f"      Price: ${quote.price:,.2f}")
                    print(f"      Change: {quote.change:+.2f} ({quote.change_percent:+.2f}%)")
                    print(f"      Volume: {quote.volume:,}")
                else:
                    print(f"      ❌ No data available")
                print()
            
            # Test company profiles
            print("🏢 Testing Company Profiles:")
            for symbol in ['AAPL', 'MSFT']:
                print(f"   📋 {symbol}:")
                profile = await client.get_company_profile(symbol)
                if profile:
                    print(f"      Name: {profile.name}")
                    print(f"      Industry: {profile.industry}")
                    print(f"      Sector: {profile.sector}")
                    print(f"      Country: {profile.country}")
                    print(f"      Market Cap: ${profile.market_cap:,.0f}")
                else:
                    print(f"      ❌ No profile data")
                print()
            
            # Test historical data
            print("📊 Testing Historical Data:")
            symbol = 'AAPL'
            print(f"   📈 {symbol} (last 5 days):")
            ohlcv = await client.get_ohlcv_data(symbol, limit=5)
            if ohlcv:
                print(f"      Retrieved {len(ohlcv)} data points")
                for i, point in enumerate(ohlcv[-3:]):  # Show last 3
                    date = point.timestamp[:10]
                    print(f"      {date}: O=${point.open:.2f} H=${point.high:.2f} L=${point.low:.2f} C=${point.close:.2f} V={point.volume:,}")
            else:
                print(f"      ❌ No historical data")
            print()
            
            # Test technical indicators
            print("📈 Testing Technical Indicators:")
            print(f"   🔍 {symbol}:")
            indicators = await client.get_technical_indicators(symbol)
            if indicators:
                print(f"      RSI: {indicators.rsi:.2f}")
                print(f"      SMA 50: ${indicators.sma_50:.2f}")
                print(f"      SMA 200: ${indicators.sma_200:.2f}")
            else:
                print(f"      ❌ No technical indicators")
            print()
            
            # Test financials
            print("💼 Testing Financial Data:")
            print(f"   📊 {symbol}:")
            financials = await client.get_stock_financials(symbol)
            if financials:
                print(f"      Revenue: ${financials.revenue:,.0f}")
                print(f"      Net Income: ${financials.net_income:,.0f}")
                print(f"      P/E Ratio: {financials.pe_ratio:.2f}")
                print(f"      P/B Ratio: {financials.pb_ratio:.2f}")
            else:
                print(f"      ❌ No financial data")
        
        print("✅ All tests completed!")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(main())

