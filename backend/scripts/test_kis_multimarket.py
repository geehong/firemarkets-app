import asyncio
import os
import sys
from datetime import datetime

# Add the project root to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from app.external_apis.implementations.kis_client import KisClient


async def test_multimarket():
    print("--- Starting KIS Multi-Market Test ---")
    client = KisClient()
    
    # Check connection
    # print(f"Connection Check: {await client.test_connection()}")
    
    # 1. Korea (Samsung Electronics)
    print("\n[KR] Samsung Electronics (005930)")
    res_kr = await client.get_realtime_quote("005930")
    if res_kr:
        print(f"Price: {res_kr.price} KRW (Change: {res_kr.change_percent}%)")
    else:
        print("Failed to fetch KR quote.")
        
    # 2. Japan (Toyota Motor - 7203)
    # Market Code for Tokyo: TSE
    print("\n[JP] Toyota Motor (7203) - TSE")
    res_jp = await client.get_overseas_realtime_quote("7203", "TSE")
    if res_jp:
        print(f"Price: {res_jp.price} JPY (Change: {res_jp.change_percent}%)")
    else:
        print("Failed to fetch JP quote.")

    # 3. Hong Kong (Tencent - 00700)
    # Market Code for Hong Kong: HKS
    print("\n[HK] Tencent (00700) - HKS")
    res_hk = await client.get_overseas_realtime_quote("00700", "HKS")
    if res_hk:
        print(f"Price: {res_hk.price} HKD (Change: {res_hk.change_percent}%)")
    else:
        print("Failed to fetch HK quote.")
        
    # 4. China (Kweichow Moutai - 600519)
    # Market Code for Shanghai: SHS
    print("\n[CN] Kweichow Moutai (600519) - SHS")
    res_cn = await client.get_overseas_realtime_quote("600519", "SHS")
    if res_cn:
        print(f"Price: {res_cn.price} CNY (Change: {res_cn.change_percent}%)")
    else:
        print("Failed to fetch CN quote.")
        
    # 5. US (Apple - AAPL)
    # Market Code for NASDAQ: NAS
    print("\n[US] Apple (AAPL) - NAS")
    res_us = await client.get_overseas_realtime_quote("AAPL", "NAS")
    if res_us:
        print(f"Price: {res_us.price} USD (Change: {res_us.change_percent}%)")
    else:
        print("Failed to fetch US quote.")


if __name__ == "__main__":
    asyncio.run(test_multimarket())
