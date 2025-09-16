#!/usr/bin/env python3
"""
Unit tests for YFinance client using unittest
Run with: python test_yfinance_unittest.py
"""
import unittest
import asyncio
import sys
import os
from unittest.mock import Mock, patch, MagicMock
import pandas as pd
from datetime import datetime, timedelta

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.external_apis.implementations.yfinance_client import YFinanceClient
from app.external_apis.base.schemas import (
    OhlcvDataPoint,
    CompanyProfileData,
    RealtimeQuoteData
)


class TestYFinanceClient(unittest.TestCase):
    """Test cases for YFinance client"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.client = YFinanceClient()
        self.test_symbol = "AAPL"
    
    def test_client_initialization(self):
        """Test client initialization"""
        self.assertIsNotNone(self.client)
        self.assertEqual(self.client.name, "Yahoo Finance")
        print("✅ Client initialization test passed")
    
    @patch('yfinance.Ticker')
    async def test_get_realtime_quote_success(self, mock_ticker):
        """Test successful real-time quote retrieval"""
        # Mock ticker info
        mock_info = {
            'currentPrice': 150.0,
            'regularMarketPrice': 150.0,
            'regularMarketChange': 2.5,
            'regularMarketChangePercent': 1.69,
            'volume': 50000000,
            'dayHigh': 152.0,
            'dayLow': 148.0,
            'open': 149.0,
            'previousClose': 147.5
        }
        
        mock_ticker_instance = Mock()
        mock_ticker_instance.info = mock_info
        mock_ticker.return_value = mock_ticker_instance
        
        # Test the method
        quote = await self.client.get_realtime_quote(self.test_symbol)
        
        # Assertions
        self.assertIsNotNone(quote)
        self.assertEqual(quote.symbol, self.test_symbol)
        self.assertEqual(quote.price, 150.0)
        self.assertEqual(quote.change, 2.5)
        self.assertEqual(quote.change_percent, 1.69)
        self.assertEqual(quote.volume, 50000000)
        print("✅ Real-time quote test passed")
    
    @patch('yfinance.Ticker')
    async def test_get_realtime_quote_no_data(self, mock_ticker):
        """Test real-time quote when no data is available"""
        # Mock empty ticker info
        mock_ticker_instance = Mock()
        mock_ticker_instance.info = {}
        mock_ticker.return_value = mock_ticker_instance
        
        # Test the method
        quote = await self.client.get_realtime_quote(self.test_symbol)
        
        # Assertions
        self.assertIsNone(quote)
        print("✅ Real-time quote no data test passed")
    
    @patch('yfinance.Ticker')
    async def test_get_company_profile_success(self, mock_ticker):
        """Test successful company profile retrieval"""
        # Mock ticker info
        mock_info = {
            'longName': 'Apple Inc.',
            'longBusinessSummary': 'Apple Inc. designs, manufactures, and markets smartphones...',
            'industry': 'Consumer Electronics',
            'sector': 'Technology',
            'country': 'United States',
            'website': 'https://www.apple.com',
            'fullTimeEmployees': 164000,
            'marketCap': 3000000000000,
            'currency': 'USD'
        }
        
        mock_ticker_instance = Mock()
        mock_ticker_instance.info = mock_info
        mock_ticker.return_value = mock_ticker_instance
        
        # Test the method
        profile = await self.client.get_company_profile(self.test_symbol)
        
        # Assertions
        self.assertIsNotNone(profile)
        self.assertEqual(profile.symbol, self.test_symbol)
        self.assertEqual(profile.name, 'Apple Inc.')
        self.assertEqual(profile.sector, 'Technology')
        self.assertEqual(profile.industry, 'Consumer Electronics')
        self.assertEqual(profile.market_cap, 3000000000000)
        print("✅ Company profile test passed")
    
    @patch('yfinance.Ticker')
    async def test_get_ohlcv_data_success(self, mock_ticker):
        """Test successful OHLCV data retrieval"""
        # Mock historical data
        dates = pd.date_range(start='2024-01-01', periods=5, freq='D')
        mock_hist = pd.DataFrame({
            'Open': [140.0, 141.0, 142.0, 143.0, 144.0],
            'High': [145.0, 146.0, 147.0, 148.0, 149.0],
            'Low': [138.0, 139.0, 140.0, 141.0, 142.0],
            'Close': [141.0, 142.0, 143.0, 144.0, 145.0],
            'Volume': [50000000, 51000000, 52000000, 53000000, 54000000]
        }, index=dates)
        
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = mock_hist
        mock_ticker.return_value = mock_ticker_instance
        
        # Test the method
        ohlcv_data = await self.client.get_ohlcv_data(self.test_symbol, limit=5)
        
        # Assertions
        self.assertIsNotNone(ohlcv_data)
        self.assertEqual(len(ohlcv_data), 5)
        self.assertIsInstance(ohlcv_data[0], OhlcvDataPoint)
        self.assertEqual(ohlcv_data[0].open, 140.0)
        self.assertEqual(ohlcv_data[0].close, 141.0)
        self.assertEqual(ohlcv_data[0].volume, 50000000)
        print("✅ OHLCV data test passed")
    
    @patch('yfinance.Ticker')
    async def test_get_ohlcv_data_empty(self, mock_ticker):
        """Test OHLCV data when no data is available"""
        # Mock empty historical data
        mock_ticker_instance = Mock()
        mock_ticker_instance.history.return_value = pd.DataFrame()
        mock_ticker.return_value = mock_ticker_instance
        
        # Test the method
        ohlcv_data = await self.client.get_ohlcv_data(self.test_symbol)
        
        # Assertions
        self.assertEqual(len(ohlcv_data), 0)
        print("✅ OHLCV empty data test passed")
    
    @patch('yfinance.Ticker')
    async def test_get_market_cap_success(self, mock_ticker):
        """Test successful market cap retrieval"""
        # Mock ticker info
        mock_info = {'marketCap': 3000000000000}
        
        mock_ticker_instance = Mock()
        mock_ticker_instance.info = mock_info
        mock_ticker.return_value = mock_ticker_instance
        
        # Test the method
        market_cap = await self.client.get_market_cap(self.test_symbol)
        
        # Assertions
        self.assertIsNotNone(market_cap)
        self.assertEqual(market_cap, 3000000000000)
        print("✅ Market cap test passed")
    
    @patch('yfinance.Ticker')
    async def test_get_market_cap_no_data(self, mock_ticker):
        """Test market cap when no data is available"""
        # Mock empty ticker info
        mock_ticker_instance = Mock()
        mock_ticker_instance.info = {}
        mock_ticker.return_value = mock_ticker_instance
        
        # Test the method
        market_cap = await self.client.get_market_cap(self.test_symbol)
        
        # Assertions
        self.assertIsNone(market_cap)
        print("✅ Market cap no data test passed")
    
    @patch('yfinance.Ticker')
    async def test_get_stock_financials_success(self, mock_ticker):
        """Test successful stock financials retrieval"""
        # Mock ticker info
        mock_info = {
            'totalRevenue': 365000000000,
            'netIncomeToCommon': 95000000000,
            'totalDebt': 120000000000,
            'totalCash': 20000000000,
            'trailingPE': 25.5,
            'priceToBook': 5.2,
            'debtToEquity': 0.8,
            'returnOnEquity': 0.15
        }
        
        mock_ticker_instance = Mock()
        mock_ticker_instance.info = mock_info
        mock_ticker.return_value = mock_ticker_instance
        
        # Test the method
        financials = await self.client.get_stock_financials(self.test_symbol)
        
        # Assertions
        self.assertIsNotNone(financials)
        self.assertEqual(financials.symbol, self.test_symbol)
        self.assertEqual(financials.revenue, 365000000000)
        self.assertEqual(financials.net_income, 95000000000)
        self.assertEqual(financials.pe_ratio, 25.5)
        print("✅ Stock financials test passed")
    
    @patch('yfinance.Ticker')
    async def test_error_handling(self, mock_ticker):
        """Test error handling when yfinance raises exceptions"""
        # Mock ticker to raise exception
        mock_ticker.side_effect = Exception("Network error")
        
        # Test the method
        quote = await self.client.get_realtime_quote(self.test_symbol)
        
        # Assertions
        self.assertIsNone(quote)
        print("✅ Error handling test passed")


class TestYFinanceIntegration(unittest.TestCase):
    """Integration tests for YFinance client (requires actual yfinance)"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.client = YFinanceClient()
        self.test_symbols = ['AAPL', 'MSFT', 'GOOGL']
    
    async def test_real_data_integration(self):
        """Test with real yfinance data (optional integration test)"""
        print("\n🔍 Running integration tests with real data...")
        
        for symbol in self.test_symbols:
            print(f"\n📊 Testing {symbol}:")
            
            try:
                # Test real-time quote
                quote = await self.client.get_realtime_quote(symbol)
                if quote:
                    print(f"  ✅ Price: ${quote.price:,.2f} | Change: {quote.change_percent:+.2f}%")
                else:
                    print(f"  ❌ No quote data")
                
                # Test company profile
                profile = await self.client.get_company_profile(symbol)
                if profile:
                    print(f"  ✅ Company: {profile.name} | Sector: {profile.sector}")
                else:
                    print(f"  ❌ No profile data")
                
                # Test OHLCV data
                ohlcv = await self.client.get_ohlcv_data(symbol, limit=3)
                if ohlcv:
                    print(f"  ✅ OHLCV: {len(ohlcv)} data points")
                else:
                    print(f"  ❌ No OHLCV data")
                    
            except Exception as e:
                print(f"  ❌ Error: {e}")
        
        print("\n✅ Integration tests completed!")


def run_async_test(test_func):
    """Helper function to run async tests"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(test_func())
    finally:
        loop.close()


def main():
    """Main test runner"""
    print("🧪 YFinance Client Unit Tests")
    print("=" * 50)
    
    # Create test suite
    suite = unittest.TestSuite()
    
    # Add unit tests
    test_client = TestYFinanceClient()
    
    # Run async unit tests
    async_tests = [
        'test_get_realtime_quote_success',
        'test_get_realtime_quote_no_data',
        'test_get_company_profile_success',
        'test_get_ohlcv_data_success',
        'test_get_ohlcv_data_empty',
        'test_get_market_cap_success',
        'test_get_market_cap_no_data',
        'test_get_stock_financials_success',
        'test_error_handling'
    ]
    
    for test_name in async_tests:
        test_client.setUp()  # Ensure setUp is called
        test_method = getattr(test_client, test_name)
        run_async_test(test_method)
    
    # Run integration tests (optional)
    print("\n" + "=" * 50)
    print("🔍 Integration Tests (Real Data)")
    print("=" * 50)
    
    integration_test = TestYFinanceIntegration()
    run_async_test(integration_test.test_real_data_integration)
    
    print("\n" + "=" * 50)
    print("✅ All tests completed!")
    print("💡 If you see data above, the YFinance client is working correctly!")


if __name__ == "__main__":
    main()
