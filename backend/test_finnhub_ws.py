#!/usr/bin/env python3
"""
Simple test script for Finnhub WebSocket using standard websocket-client
Based on the official Finnhub WebSocket example
"""
import websocket
import json
import time

def on_message(ws, message):
    print(f"📨 Received: {message}")

def on_error(ws, error):
    print(f"❌ Error: {error}")

def on_close(ws, close_status_code, close_msg):
    print("🔌 WebSocket closed")

def on_open(ws):
    print("🔗 WebSocket opened")
    print("📡 Subscribing to symbols...")
    
    # Subscribe to symbols as per standard test
    symbols = [
        'AAPL',
        'AMZN', 
        'BINANCE:BTCUSDT',
        'IC MARKETS:1'
    ]
    
    for symbol in symbols:
        subscribe_msg = {"type": "subscribe", "symbol": symbol}
        ws.send(json.dumps(subscribe_msg))
        print(f"   ✅ Subscribed to {symbol}")

if __name__ == "__main__":
    print("🚀 Finnhub WebSocket Test")
    print("=" * 50)
    
    # API key from environment or use the provided one
    api_key = "d2t3t79r01qkuv3j6p30d2t3t79r01qkuv3j6p3g"
    ws_url = f"wss://ws.finnhub.io?token={api_key}"
    
    print(f"🔑 Using API Key: {api_key[:8]}...")
    print(f"🌐 WebSocket URL: {ws_url}")
    print()
    
    # Enable trace for debugging
    websocket.enableTrace(True)
    
    # Create WebSocket connection
    ws = websocket.WebSocketApp(
        ws_url,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close,
        on_open=on_open
    )
    
    print("🔄 Starting WebSocket connection...")
    print("Press Ctrl+C to stop")
    print()
    
    try:
        ws.run_forever()
    except KeyboardInterrupt:
        print("\n⏹️  Stopping WebSocket connection...")
        ws.close()
        print("✅ Test completed!")

