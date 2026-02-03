import asyncio
import os
import sys
from unittest.mock import MagicMock, AsyncMock, patch

# Add the project root to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from app.external_apis.implementations.kis_client import KisClient
from app.external_apis.base.schemas import RealtimeQuoteData

async def test_multimarket_mock():
    print("--- Starting KIS Multi-Market MOCK Test ---")
    
    # Mock httpx.AsyncClient
    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client_cls.return_value.__aenter__.return_value = mock_client
        
        # 1. Mock Token Response
        token_resp = MagicMock()
        token_resp.status_code = 200
        token_resp.json.return_value = {
            "access_token": "mock_token",
            "expires_in": 3600
        }
        mock_client.post.return_value = token_resp
        
        client = KisClient()
        # Force token set to avoid first call
        client.access_token = "mock_token"
        client.token_expiry = 9999999999
        
        # 2. Mock Data Responses
        # We need a side_effect for .get() that returns different MagicMocks
        # each with different .json() results.
        
        # Response 1: KR
        resp1 = MagicMock()
        resp1.status_code = 200
        resp1.json.return_value = {
            "rt_cd": "0",
            "output": {"stck_prpr": "75000", "prdy_ctrt": "1.5"}
        }
        
        # Response 2: JP
        resp2 = MagicMock()
        resp2.status_code = 200
        resp2.json.return_value = {
            "rt_cd": "0",
            "output": {"last": "2850.5", "rate": "-0.5"}
        }

        # Response 3: HK
        resp3 = MagicMock()
        resp3.status_code = 200
        resp3.json.return_value = {
            "rt_cd": "0",
            "output": {"last": "380.2", "rate": "2.1"}
        }

        # Response 4: CN
        resp4 = MagicMock()
        resp4.status_code = 200
        resp4.json.return_value = {
            "rt_cd": "0",
            "output": {"last": "1650.0", "rate": "0.1"}
        }

        # Response 5: US
        resp5 = MagicMock()
        resp5.status_code = 200
        resp5.json.return_value = {
            "rt_cd": "0",
            "output": {"last": "185.5", "rate": "1.2"}
        }
        
        mock_client.get.side_effect = [resp1, resp2, resp3, resp4, resp5]


        # Test KR
        print("\n[KR] Samsung Electronics (005930)")
        res_kr = await client.get_realtime_quote("005930")
        if res_kr and res_kr.price == 75000.0:
            print(f"SUCCESS: {res_kr.price} KRW (Change: {res_kr.change_percent}%)")
        else:
            print(f"FAILED: {res_kr}")

        # Test JP
        print("\n[JP] Toyota Motor (7203) - TSE")
        res_jp = await client.get_overseas_realtime_quote("7203", "TSE")
        if res_jp and res_jp.price == 2850.5:
            print(f"SUCCESS: {res_jp.price} JPY (Change: {res_jp.change_percent}%)")
        else:
            print(f"FAILED: {res_jp}")

        # Test HK
        print("\n[HK] Tencent (00700) - HKS")
        res_hk = await client.get_overseas_realtime_quote("00700", "HKS")
        if res_hk and res_hk.price == 380.2:
            print(f"SUCCESS: {res_hk.price} HKD (Change: {res_hk.change_percent}%)")
        else:
            print(f"FAILED: {res_hk}")
            
        # Test CN
        print("\n[CN] Kweichow Moutai (600519) - SHS")
        res_cn = await client.get_overseas_realtime_quote("600519", "SHS")
        if res_cn and res_cn.price == 1650.0:
            print(f"SUCCESS: {res_cn.price} CNY (Change: {res_cn.change_percent}%)")
        else:
            print(f"FAILED: {res_cn}")

        # Test US
        print("\n[US] Apple (AAPL) - NAS")
        res_us = await client.get_overseas_realtime_quote("AAPL", "NAS")
        if res_us and res_us.price == 185.5:
            print(f"SUCCESS: {res_us.price} USD (Change: {res_us.change_percent}%)")
        else:
            print(f"FAILED: {res_us}")

if __name__ == "__main__":
    asyncio.run(test_multimarket_mock())
