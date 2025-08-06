"""
OHLCV data collector for fetching and storing price data from various APIs.
"""
import logging
import asyncio
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional, Any

import httpx
import backoff
from sqlalchemy.orm import Session

from .base_collector import BaseCollector
from ..core.config import GLOBAL_APP_CONFIGS
from ..models.asset import Asset
from ..crud.asset import crud_ohlcv

logger = logging.getLogger(__name__)


class OHLCVCollector(BaseCollector):
    """Collects OHLCV data from various APIs"""
    
    def __init__(self, db: Session = None):
        super().__init__(db)
        self.api_timeout = GLOBAL_APP_CONFIGS.get("API_REQUEST_TIMEOUT_SECONDS", 30)
        self.max_retries = GLOBAL_APP_CONFIGS.get("MAX_API_RETRY_ATTEMPTS", 3)
        
        # 새로운 설정들 추가
        self.ohlcv_interval = GLOBAL_APP_CONFIGS.get("OHLCV_DATA_INTERVAL", "1d")
        
        # OHLCV_DATA_INTERVALS는 JSON 문자열로 저장되므로 파싱 필요
        import json
        ohlcv_intervals_raw = GLOBAL_APP_CONFIGS.get("OHLCV_DATA_INTERVALS", '["1d", "1h", "4h"]')
        try:
            if isinstance(ohlcv_intervals_raw, str):
                self.ohlcv_intervals = json.loads(ohlcv_intervals_raw)
            else:
                self.ohlcv_intervals = ohlcv_intervals_raw
        except (json.JSONDecodeError, TypeError):
            logger.warning(f"Invalid OHLCV_DATA_INTERVALS format: {ohlcv_intervals_raw}, using default")
            self.ohlcv_intervals = ["1d", "1h", "4h"]
        
        self.enable_multiple_intervals = GLOBAL_APP_CONFIGS.get("ENABLE_MULTIPLE_INTERVALS", False)
        self.historical_days_per_run = GLOBAL_APP_CONFIGS.get("HISTORICAL_DATA_DAYS_PER_RUN", 1000)
        self.max_historical_days = GLOBAL_APP_CONFIGS.get("MAX_HISTORICAL_DAYS", 10950)
        self.enable_historical_backfill = GLOBAL_APP_CONFIGS.get("ENABLE_HISTORICAL_BACKFILL", True)
    
    async def collect_with_settings(self) -> Dict[str, Any]:
        """Collect OHLCV data with individual asset settings"""
        db = self.get_db_session()
        
        try:
            # Get assets that have OHLCV collection enabled in their settings
            # 하이브리드 방식: True/False와 true/false 모두 지원
            from sqlalchemy import or_, text
            
            condition1 = Asset.collection_settings.contains({"collect_price": True})
            condition2 = text("JSON_EXTRACT(collection_settings, '$.collect_price') = true")
            
            assets = db.query(Asset).filter(
                Asset.is_active == True,
                or_(condition1, condition2)
            ).all()
            
            if not assets:
                await self.safe_emit('scheduler_log', {
                    'message': "OHLCV 수집이 활성화된 자산이 없습니다.", 
                    'type': 'warning'
                })
                return {"message": "No assets with OHLCV collection enabled", "processed": 0}
            
            await self.safe_emit('scheduler_log', {
                'message': f"OHLCV 데이터 수집 시작: {len(assets)}개 자산 (설정 기반)", 
                'type': 'info'
            })
            
            # 다중 간격 설정 확인 - 데이터베이스에서 직접 조회
            from ..models import AppConfiguration
            enable_multiple_intervals = db.query(AppConfiguration).filter(
                AppConfiguration.config_key == "ENABLE_MULTIPLE_INTERVALS"
            ).first()
            enable_multiple_intervals = enable_multiple_intervals.config_value.lower() == 'true' if enable_multiple_intervals else False
            
            ohlcv_intervals_config = db.query(AppConfiguration).filter(
                AppConfiguration.config_key == "OHLCV_DATA_INTERVALS"
            ).first()
            
            if ohlcv_intervals_config:
                import json
                try:
                    ohlcv_intervals = json.loads(ohlcv_intervals_config.config_value)
                except:
                    ohlcv_intervals = ["1d"]
            else:
                ohlcv_intervals = ["1d"]
            
            await self.safe_emit('scheduler_log', {
                'message': f"수집 간격: {ohlcv_intervals} (다중 간격: {enable_multiple_intervals})", 
                'type': 'info'
            })
            
            # 히스토리 백필이 활성화된 경우 백필 로직 실행
            if self.enable_historical_backfill:
                await self._perform_historical_backfill(assets)
            
            # 각 간격별로 데이터 수집
            total_results = []
            for interval in ohlcv_intervals:
                await self.safe_emit('scheduler_log', {
                    'message': f"{interval} 간격 데이터 수집 시작", 
                    'type': 'info'
                })
                
                result = await self._collect_data_with_interval(assets, interval)
                total_results.append(result)
            
            # 결과 합계
            total_processed = sum(r.get("processed_assets", 0) for r in total_results)
            total_added = sum(r.get("total_added_records", 0) for r in total_results)
            
            await self.safe_emit('scheduler_log', {
                'message': f"OHLCV 다중 간격 수집 완료: {total_processed}개 자산 처리, {total_added}개 레코드 추가", 
                'type': 'success'
            })
            
            return {
                "processed_assets": total_processed,
                "total_added_records": total_added,
                "intervals_processed": len(ohlcv_intervals),
                "message": f"Successfully processed {total_processed} assets across {len(ohlcv_intervals)} intervals"
            }
            
        except Exception as e:
            self.log_progress(f"OHLCV collection with settings failed: {e}", "error")
            raise
        finally:
            db.close()
    
    async def _collect_data(self) -> Dict[str, Any]:
        """Collect OHLCV data for all assets"""
        db = self.get_db_session()
        
        try:
            # Get all assets that need OHLCV data
            assets = db.query(Asset).filter(Asset.is_active == True).all()
            
            if not assets:
                await self.safe_emit('scheduler_log', {
                    'message': "활성 자산이 없습니다.", 
                    'type': 'warning'
                })
                return {"message": "No active assets found", "processed": 0}
            
            await self.safe_emit('scheduler_log', {
                'message': f"OHLCV 데이터 수집 시작: {len(assets)}개 자산", 
                'type': 'info'
            })
            self.log_progress(f"Starting OHLCV collection for {len(assets)} assets")
            
            # Process assets in batches to avoid overwhelming APIs
            batch_size = 5
            total_processed = 0
            total_added = 0
            
            for i in range(0, len(assets), batch_size):
                batch = assets[i:i + batch_size]
                
                await self.safe_emit('scheduler_log', {
                    'message': f"배치 처리 중: {i+1}-{min(i+batch_size, len(assets))}/{len(assets)}", 
                    'type': 'info'
                })
                
                # Process batch concurrently
                tasks = [self._fetch_and_store_ohlcv_for_asset(asset) for asset in batch]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for result in results:
                    if isinstance(result, Exception):
                        self.log_progress(f"Asset processing error: {result}", "error")
                        await self.safe_emit('scheduler_log', {
                            'message': f"자산 처리 오류: {result}", 
                            'type': 'error'
                        })
                    else:
                        total_processed += 1
                        total_added += result.get("added_count", 0)
                        if result.get("success", False):
                            await self.safe_emit('scheduler_log', {
                                'message': f"[{result.get('ticker', 'Unknown')}] {result.get('source', 'Unknown')}에서 {result.get('added_count', 0)}개 데이터 수집 완료", 
                                'type': 'success'
                            })
                
                # Rate limiting between batches
                if i + batch_size < len(assets):
                    await asyncio.sleep(2)
            
            await self.safe_emit('scheduler_log', {
                'message': f"OHLCV 데이터 수집 완료: {total_processed}개 자산 처리, {total_added}개 레코드 추가", 
                'type': 'success'
            })
            
            return {
                "processed_assets": total_processed,
                "total_added_records": total_added,
                "message": f"Successfully processed {total_processed} assets"
            }
            
        except Exception as e:
            self.log_progress(f"OHLCV collection failed: {e}", "error")
            raise
    
    async def _collect_data_with_interval(self, assets: List[Asset], interval: str) -> Dict[str, Any]:
        """Collect OHLCV data for specific interval"""
        db = self.get_db_session()
        
        try:
            await self.safe_emit('scheduler_log', {
                'message': f"OHLCV {interval} 간격 데이터 수집 시작: {len(assets)}개 자산", 
                'type': 'info'
            })
            
            # Process assets in batches to avoid overwhelming APIs
            batch_size = 5
            total_processed = 0
            total_added = 0
            
            for i in range(0, len(assets), batch_size):
                batch = assets[i:i + batch_size]
                
                await self.safe_emit('scheduler_log', {
                    'message': f"{interval} 배치 처리 중: {i+1}-{min(i+batch_size, len(assets))}/{len(assets)}", 
                    'type': 'info'
                })
                
                # Process batch concurrently
                tasks = [self._fetch_and_store_ohlcv_for_asset_with_interval(asset, interval) for asset in batch]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for result in results:
                    if isinstance(result, Exception):
                        self.log_progress(f"Asset processing error: {result}", "error")
                        await self.safe_emit('scheduler_log', {
                            'message': f"자산 처리 오류: {result}", 
                            'type': 'error'
                        })
                    else:
                        total_processed += 1
                        total_added += result.get("added_count", 0)
                        if result.get("success", False):
                            await self.safe_emit('scheduler_log', {
                                'message': f"[{result.get('ticker', 'Unknown')}] {interval} {result.get('source', 'Unknown')}에서 {result.get('added_count', 0)}개 데이터 수집 완료", 
                                'type': 'success'
                            })
                
                # Rate limiting between batches
                if i + batch_size < len(assets):
                    await asyncio.sleep(2)
            
            await self.safe_emit('scheduler_log', {
                'message': f"OHLCV {interval} 간격 데이터 수집 완료: {total_processed}개 자산 처리, {total_added}개 레코드 추가", 
                'type': 'success'
            })
            
            return {
                "processed_assets": total_processed,
                "total_added_records": total_added,
                "interval": interval,
                "message": f"Successfully processed {total_processed} assets for {interval} interval"
            }
            
        except Exception as e:
            self.log_progress(f"OHLCV {interval} collection failed: {e}", "error")
            raise
        finally:
            db.close()
    
    @backoff.on_exception(
        backoff.expo,
        (httpx.RequestError, httpx.HTTPStatusError),
        max_tries=3,
        max_time=60
    )
    async def _fetch_async(self, client: httpx.AsyncClient, url: str, api_name: str, ticker: str):
        """Fetch data from API with retry logic"""
        await self.safe_emit('scheduler_log', {
            'message': f"[{ticker}] {api_name} API 호출 시도: {url}", 
            'type': 'info'
        })
        
        response = await client.get(url, timeout=self.api_timeout)
        
        if response.status_code == 429:  # Too Many Requests
            await self.safe_emit('scheduler_log', {
                'message': f"[{ticker}] {api_name} API 호출 제한 도달. 재시도합니다.", 
                'type': 'warning'
            })
            response.raise_for_status()
        
        response.raise_for_status()
        return response.json()
    
    async def _fetch_ohlcv_from_alpha_vantage(self, client: httpx.AsyncClient, ticker: str, api_keys_list: List[str]) -> List[Dict]:
        """Fetch OHLCV data from Alpha Vantage"""
        for api_key in api_keys_list:
            if not api_key:
                continue
                
            url = f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={ticker}&apikey={api_key}&outputsize=full"
            
            try:
                data = await self._fetch_async(client, url, "Alpha Vantage", ticker)
                
                if "Time Series (Daily)" in data:
                    return [
                        {
                            "timestamp_utc": self._safe_date_parse(date_str),
                            "open_price": self._safe_float(daily_data.get("1. open")),
                            "high_price": self._safe_float(daily_data.get("2. high")),
                            "low_price": self._safe_float(daily_data.get("3. low")),
                            "close_price": self._safe_float(daily_data.get("4. close")),
                            "volume": self._safe_float(daily_data.get("6. volume"), 0.0),
                        }
                        for date_str, daily_data in data["Time Series (Daily)"].items()
                        if self._safe_date_parse(date_str)
                    ]
                elif "Error Message" in data:
                    await self.safe_emit('scheduler_log', {
                        'message': f"Alpha Vantage API 오류 ({ticker}): {data['Error Message']}", 
                        'type': 'warning'
                    })
                    if "API call frequency" in data.get("Error Message", ""):
                        raise httpx.HTTPStatusError("Alpha Vantage API rate limit reached.", request=None, response=None)
                    continue
                else:
                    await self.safe_emit('scheduler_log', {
                        'message': f"Alpha Vantage: 예상치 못한 응답 형식 ({ticker})", 
                        'type': 'warning'
                    })
                    continue
                    
            except httpx.HTTPStatusError as e:
                if e.response and e.response.status_code == 429:
                    await self.safe_emit('scheduler_log', {
                        'message': f"Alpha Vantage API 호출 제한 도달 ({ticker}). 재시도합니다.", 
                        'type': 'warning'
                    })
                    raise
                continue
            except Exception as e:
                await self.safe_emit('scheduler_log', {
                    'message': f"Alpha Vantage 데이터 파싱 오류 ({ticker}): {e}", 
                    'type': 'error'
                })
                continue
                
        return []
    
    async def _fetch_ohlcv_from_fmp(self, client: httpx.AsyncClient, ticker: str, api_key: str) -> List[Dict]:
        """Fetch OHLCV data from FMP"""
        url = f"https://financialmodelingprep.com/api/v3/historical-price-full/{ticker}?apikey={api_key}"
        
        try:
            data = await self._fetch_async(client, url, "FMP", ticker)
            
            if "historical" in data:
                return [
                    {
                        "timestamp_utc": self._safe_date_parse(d.get("date")),
                        "open_price": self._safe_float(d.get("open")),
                        "high_price": self._safe_float(d.get("high")),
                        "low_price": self._safe_float(d.get("low")),
                        "close_price": self._safe_float(d.get("close")),
                        "volume": self._safe_float(d.get("volume"), 0.0),
                    }
                    for d in data["historical"] if self._safe_date_parse(d.get("date"))
                ]
        except Exception as e:
            self.log_progress(f"FMP data parsing error ({ticker}): {e}", "error")
            
        return []
    
    async def _fetch_ohlcv_from_binance(self, client: httpx.AsyncClient, ticker: str) -> List[Dict]:
        """Fetch OHLCV data from Binance"""
        url = f"https://api.binance.com/api/v3/klines?symbol={ticker}&interval=1d&limit=1000"
        
        try:
            data = await self._fetch_async(client, url, "Binance", ticker)
            
            if isinstance(data, list):
                return [
                    {
                        "timestamp_utc": datetime.fromtimestamp(kline[0] / 1000),
                        "open_price": self._safe_float(kline[1]),
                        "high_price": self._safe_float(kline[2]),
                        "low_price": self._safe_float(kline[3]),
                        "close_price": self._safe_float(kline[4]),
                        "volume": self._safe_float(kline[5], 0.0),
                    }
                    for kline in data
                ]
        except Exception as e:
            self.log_progress(f"Binance data parsing error ({ticker}): {e}", "error")
            
        return []
    
    async def _fetch_ohlcv_from_coinbase(self, client: httpx.AsyncClient, ticker: str, granularity: str = '86400') -> List[Dict]:
        """Fetch OHLCV data from Coinbase"""
        url = f"https://api.exchange.coinbase.com/products/{ticker}/candles?granularity={granularity}"
        
        try:
            data = await self._fetch_async(client, url, "Coinbase", ticker)
            
            if isinstance(data, list):
                return [
                    {
                        "timestamp_utc": datetime.fromtimestamp(candle[0]),
                        "low_price": self._safe_float(candle[1]),
                        "high_price": self._safe_float(candle[2]),
                        "open_price": self._safe_float(candle[3]),
                        "close_price": self._safe_float(candle[4]),
                        "volume": self._safe_float(candle[5], 0.0),
                    }
                    for candle in data
                ]
        except Exception as e:
            self.log_progress(f"Coinbase data parsing error ({ticker}): {e}", "error")
            
        return []
    
    async def _fetch_ohlcv_from_coinmarketcap(self, client: httpx.AsyncClient, ticker: str) -> List[Dict[str, Any]]:
        """CoinMarketCap에서 OHLCV 데이터를 가져옵니다."""
        try:
            api_key = GLOBAL_APP_CONFIGS.get("COINMARKETCAP_API_KEY")
            if not api_key:
                raise ValueError("CoinMarketCap API key not configured")
            
            # CoinMarketCap API는 OHLCV 데이터를 직접 제공하지 않으므로
            # 현재 가격과 기본 정보만 가져옵니다
            url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest"
            params = {
                "symbol": ticker.replace("USDT", "").replace("USD", ""),
                "convert": "USD"
            }
            headers = {
                "X-CMC_PRO_API_KEY": api_key,
                "Accept": "application/json"
            }
            
            response = await client.get(url, params=params, headers=headers, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            if "data" not in data or ticker.replace("USDT", "").replace("USD", "") not in data["data"]:
                return []
            
            crypto_data = data["data"][ticker.replace("USDT", "").replace("USD", "")]
            quote = crypto_data.get("quote", {}).get("USD", {})
            
            # 현재 시간을 기준으로 OHLCV 데이터 생성
            current_time = datetime.now()
            ohlcv_data = [{
                "date": current_time.date(),
                "open": float(quote.get("price", 0)),
                "high": float(quote.get("price", 0)),
                "low": float(quote.get("price", 0)),
                "close": float(quote.get("price", 0)),
                "volume": float(quote.get("volume_24h", 0)),
                "market_cap": float(quote.get("market_cap", 0)),
                "source": "coinmarketcap"
            }]
            
            return ohlcv_data
            
        except Exception as e:
            self.log_progress(f"Error fetching from CoinMarketCap for {ticker}: {e}", "error")
            return []
    
    async def _store_ohlcv_data(self, asset_id: int, ohlcv_list: List[Dict]) -> int:
        """Store OHLCV data and calculate daily change percentages"""
        if not ohlcv_list:
            return 0
        
        db = self.get_db_session()
        
        # Sort by timestamp
        ohlcv_list.sort(key=lambda x: x['timestamp_utc'])
        
        # Calculate change percentages
        for i, data_point in enumerate(ohlcv_list):
            data_point['asset_id'] = asset_id
            
            if i > 0:
                prev_close = ohlcv_list[i-1]['close_price']
                current_close = data_point['close_price']
                if prev_close and current_close and prev_close > 0:
                    change = ((current_close - prev_close) / prev_close) * 100
                    data_point['change_percent'] = round(change, 4)
                else:
                    data_point['change_percent'] = 0.0
            else:
                # For first data point, check previous day from DB
                prev_ohlcv = crud_ohlcv.get_previous_day_ohlcv(db, asset_id, data_point['timestamp_utc'].date())
                if prev_ohlcv and prev_ohlcv.close_price > 0:
                    change = ((data_point['close_price'] - float(prev_ohlcv.close_price)) / float(prev_ohlcv.close_price)) * 100
                    data_point['change_percent'] = round(change, 4)
                else:
                    data_point['change_percent'] = 0.0
        
        # Bulk upsert to database
        added_count = crud_ohlcv.bulk_upsert_ohlcv(db, ohlcv_list)
        return added_count
    
    async def _store_ohlcv_data_with_interval(self, asset_id: int, ohlcv_list: List[Dict], interval: str) -> int:
        """Store OHLCV data with specific interval"""
        if not ohlcv_list:
            return 0
        
        db = self.get_db_session()
        try:
            # 기존 데이터와 중복 체크 및 업데이트
            added_count = 0
            
            for data_point in ohlcv_list:
                # 간격 정보 추가
                data_point['data_interval'] = interval
                
                # 기존 데이터 확인
                existing = db.query(crud_ohlcv.model).filter(
                    crud_ohlcv.model.asset_id == asset_id,
                    crud_ohlcv.model.timestamp_utc == data_point['timestamp_utc'],
                    crud_ohlcv.model.data_interval == interval
                ).first()
                
                if existing:
                    # 기존 데이터 업데이트
                    for key, value in data_point.items():
                        if key != 'timestamp_utc' and key != 'data_interval':
                            setattr(existing, key, value)
                    existing.updated_at = datetime.now()
                else:
                    # 새 데이터 추가
                    new_ohlcv = crud_ohlcv.model(**data_point)
                    db.add(new_ohlcv)
                    added_count += 1
            
            db.commit()
            return added_count
            
        except Exception as e:
            db.rollback()
            self.log_progress(f"Error storing {interval} OHLCV data: {e}", "error")
            raise
        finally:
            db.close()
    
    async def _fetch_and_store_ohlcv_for_asset(self, asset: Asset) -> Dict[str, Any]:
        """단일 자산에 대한 OHLCV 데이터를 수집하고 저장합니다."""
        # 데이터 소스별 fallback 전략 정의
        asset_type_name_lower = asset.asset_type.type_name.lower()
        primary_source = asset.data_source
        fallback_sources = []
        
        if asset_type_name_lower in ['stocks', 'etfs', 'bonds', 'funds']:
            if primary_source == 'alpha_vantage':
                fallback_sources = ['fmp']
            elif primary_source == 'fmp':
                fallback_sources = ['alpha_vantage']
        elif asset_type_name_lower == 'cryptocurrency':
            if primary_source == 'binance':
                fallback_sources = ['coinbase', 'coinmarketcap']
            elif primary_source == 'coinbase':
                fallback_sources = ['binance', 'coinmarketcap']
            elif primary_source == 'coinmarketcap':
                fallback_sources = ['binance', 'coinbase']
            else:
                fallback_sources = ['binance', 'coinbase', 'coinmarketcap']
        
        sources_to_try = [primary_source] + [s for s in fallback_sources if s != primary_source]
        
        async with httpx.AsyncClient() as client:
            for source in sources_to_try:
                try:
                    ohlcv_data = []
                    
                    if source == 'alpha_vantage':
                        api_keys = GLOBAL_APP_CONFIGS.get("ALPHA_VANTAGE_API_KEYS", [])
                        ohlcv_data = await self._fetch_ohlcv_from_alpha_vantage(client, asset.ticker, api_keys)
                    elif source == 'fmp':
                        api_key = GLOBAL_APP_CONFIGS.get("FMP_API_KEY", "")
                        ohlcv_data = await self._fetch_ohlcv_from_fmp(client, asset.ticker, api_key)
                    elif source == 'binance':
                        ohlcv_data = await self._fetch_ohlcv_from_binance(client, asset.ticker)
                    elif source == 'coinbase':
                        ohlcv_data = await self._fetch_ohlcv_from_coinbase(client, asset.ticker)
                    elif source == 'coinmarketcap':
                        ohlcv_data = await self._fetch_ohlcv_from_coinmarketcap(client, asset.ticker)
                    
                    if ohlcv_data:
                        added_count = await self._store_ohlcv_data(asset.asset_id, ohlcv_data)
                        return {
                            "asset_id": asset.asset_id,
                            "ticker": asset.ticker,
                            "source": source,
                            "added_count": added_count,
                            "success": True
                        }
                        
                except Exception as e:
                    self.log_progress(f"Failed to fetch from {source} for {asset.ticker}: {e}", "warning")
                    continue
        
        return {
            "asset_id": asset.asset_id,
            "ticker": asset.ticker,
            "success": False,
            "error": "All data sources failed"
        }
    
    async def _fetch_and_store_ohlcv_for_asset_with_interval(self, asset: Asset, interval: str) -> Dict[str, Any]:
        """단일 자산에 대한 특정 간격 OHLCV 데이터를 수집하고 저장합니다."""
        # 데이터 소스별 fallback 전략 정의
        asset_type_name_lower = asset.asset_type.type_name.lower()
        primary_source = asset.data_source
        fallback_sources = []
        
        if asset_type_name_lower in ['stocks', 'etfs', 'bonds', 'funds']:
            if primary_source == 'alpha_vantage':
                fallback_sources = ['fmp']
            elif primary_source == 'fmp':
                fallback_sources = ['alpha_vantage']
        elif asset_type_name_lower == 'cryptocurrency':
            if primary_source == 'binance':
                fallback_sources = ['coinbase', 'coinmarketcap']
            elif primary_source == 'coinbase':
                fallback_sources = ['binance', 'coinmarketcap']
            elif primary_source == 'coinmarketcap':
                fallback_sources = ['binance', 'coinbase']
            else:
                fallback_sources = ['binance', 'coinbase', 'coinmarketcap']
        
        sources_to_try = [primary_source] + [s for s in fallback_sources if s != primary_source]
        
        async with httpx.AsyncClient() as client:
            for source in sources_to_try:
                try:
                    ohlcv_data = []
                    
                    if source == 'alpha_vantage':
                        ohlcv_data = await self._fetch_ohlcv_from_alpha_vantage_with_interval(client, asset.ticker, [], interval)
                    elif source == 'fmp':
                        ohlcv_data = await self._fetch_ohlcv_from_fmp_with_interval(client, asset.ticker, "", interval)
                    elif source == 'binance':
                        ohlcv_data = await self._fetch_ohlcv_from_binance_with_interval(client, asset.ticker, interval)
                    elif source == 'coinbase':
                        ohlcv_data = await self._fetch_ohlcv_from_coinbase_with_interval(client, asset.ticker, interval)
                    elif source == 'coinmarketcap':
                        ohlcv_data = await self._fetch_ohlcv_from_coinmarketcap_with_interval(client, asset.ticker, interval)
                    
                    if ohlcv_data:
                        added_count = await self._store_ohlcv_data_with_interval(asset.asset_id, ohlcv_data, interval)
                        return {
                            "asset_id": asset.asset_id,
                            "ticker": asset.ticker,
                            "source": source,
                            "interval": interval,
                            "added_count": added_count,
                            "success": True
                        }
                        
                except Exception as e:
                    self.log_progress(f"Failed to fetch {interval} from {source} for {asset.ticker}: {e}", "warning")
                    continue
        
        return {
            "asset_id": asset.asset_id,
            "ticker": asset.ticker,
            "interval": interval,
            "success": False,
            "error": "All data sources failed"
        }
    
    def _safe_float(self, value: Any, default: float = None) -> Optional[float]:
        """Safely convert value to float"""
        if value is None:
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default
    
    def _safe_date_parse(self, date_str: str) -> Optional[datetime]:
        """Safely parse date string"""
        if not date_str:
            return None
        try:
            return datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            return None
    
    async def _perform_historical_backfill(self, assets: List[Asset]) -> None:
        """Perform historical data backfill for missing data"""
        if not self.enable_historical_backfill:
            return
            
        await self.safe_emit('scheduler_log', {
            'message': f"히스토리 백필 시작: {len(assets)}개 자산", 
            'type': 'info'
        })
        
        for asset in assets:
            try:
                # 각 자산의 최신 데이터 날짜 확인
                latest_data = self.db.query(crud_ohlcv.model).filter(
                    crud_ohlcv.model.asset_id == asset.asset_id
                ).order_by(crud_ohlcv.model.timestamp_utc.desc()).first()
                
                if latest_data:
                    latest_date = latest_data.timestamp_utc.date()
                    current_date = datetime.now().date()
                    
                    # 최신 데이터가 오늘보다 이전인 경우 백필 수행
                    if latest_date < current_date:
                        days_to_backfill = (current_date - latest_date).days
                        if days_to_backfill > 0:
                            await self._backfill_historical_data(asset, days_to_backfill)
                            
            except Exception as e:
                self.log_progress(f"Historical backfill error for {asset.ticker}: {e}", "error")
    
    async def _backfill_historical_data(self, asset: Asset, days_to_backfill: int) -> None:
        """Backfill historical data for a specific asset"""
        try:
            # 백필할 기간을 청크로 나누어 처리
            chunk_size = min(self.historical_days_per_run, days_to_backfill)
            
            for i in range(0, days_to_backfill, chunk_size):
                end_date = datetime.now().date() - timedelta(days=i)
                start_date = end_date - timedelta(days=chunk_size-1)
                
                await self.safe_emit('scheduler_log', {
                    'message': f"[{asset.ticker}] 히스토리 백필: {start_date} ~ {end_date}", 
                    'type': 'info'
                })
                
                # 이 기간의 데이터 수집
                await self._fetch_historical_data_for_period(asset, start_date, end_date)
                
        except Exception as e:
            self.log_progress(f"Backfill error for {asset.ticker}: {e}", "error")
    
    async def _fetch_historical_data_for_period(self, asset: Asset, start_date: date, end_date: date) -> None:
        """Fetch historical data for a specific period"""
        # 실제 구현은 API별로 다르게 처리
        # 여기서는 기본적인 구조만 제공
        pass

    async def _fetch_ohlcv_from_alpha_vantage_with_interval(self, client: httpx.AsyncClient, ticker: str, api_keys_list: List[str], interval: str) -> List[Dict]:
        """Fetch OHLCV data from Alpha Vantage with specific interval"""
        # API 키를 데이터베이스에서 조회
        db = self.get_db_session()
        try:
            from ..models import AppConfiguration
            api_keys_config = db.query(AppConfiguration).filter(
                AppConfiguration.config_key == "ALPHA_VANTAGE_API_KEYS"
            ).first()
            
            if api_keys_config:
                import json
                try:
                    api_keys_list = json.loads(api_keys_config.config_value)
                except:
                    api_keys_list = []
        finally:
            db.close()
        
        for api_key in api_keys_list:
            if not api_key:
                continue
            
            # 간격에 따른 API 함수 선택
            if interval == '1d':
                function = 'TIME_SERIES_DAILY'
            elif interval == '1h':
                function = 'TIME_SERIES_INTRADAY'
                interval_param = '&interval=60min'
            elif interval == '4h':
                function = 'TIME_SERIES_INTRADAY'
                interval_param = '&interval=60min'  # Alpha Vantage는 4h를 직접 지원하지 않음
            else:
                function = 'TIME_SERIES_DAILY'
                interval_param = ''
            
            url = f"https://www.alphavantage.co/query?function={function}&symbol={ticker}&apikey={api_key}&outputsize=full{interval_param}"
            
            try:
                data = await self._fetch_async(client, url, "Alpha Vantage", ticker)
                
                if "Time Series (Daily)" in data:
                    return [
                        {
                            "timestamp_utc": self._safe_date_parse(date_str),
                            "open_price": self._safe_float(daily_data.get("1. open")),
                            "high_price": self._safe_float(daily_data.get("2. high")),
                            "low_price": self._safe_float(daily_data.get("3. low")),
                            "close_price": self._safe_float(daily_data.get("4. close")),
                            "volume": self._safe_float(daily_data.get("6. volume"), 0.0),
                        }
                        for date_str, daily_data in data["Time Series (Daily)"].items()
                        if self._safe_date_parse(date_str)
                    ]
                elif "Time Series (60min)" in data:
                    return [
                        {
                            "timestamp_utc": self._safe_datetime_parse(date_str, '%Y-%m-%d %H:%M:%S'),
                            "open_price": self._safe_float(hourly_data.get("1. open")),
                            "high_price": self._safe_float(hourly_data.get("2. high")),
                            "low_price": self._safe_float(hourly_data.get("3. low")),
                            "close_price": self._safe_float(hourly_data.get("4. close")),
                            "volume": self._safe_float(hourly_data.get("6. volume"), 0.0),
                        }
                        for date_str, hourly_data in data["Time Series (60min)"].items()
                        if self._safe_datetime_parse(date_str, '%Y-%m-%d %H:%M:%S')
                    ]
                elif "Error Message" in data:
                    await self.safe_emit('scheduler_log', {
                        'message': f"Alpha Vantage API 오류 ({ticker}): {data['Error Message']}", 
                        'type': 'warning'
                    })
                    if "API call frequency" in data.get("Error Message", ""):
                        raise httpx.HTTPStatusError("Alpha Vantage API rate limit reached.", request=None, response=None)
                    continue
                else:
                    await self.safe_emit('scheduler_log', {
                        'message': f"Alpha Vantage: 예상치 못한 응답 형식 ({ticker})", 
                        'type': 'warning'
                    })
                    continue
                    
            except httpx.HTTPStatusError as e:
                if e.response and e.response.status_code == 429:
                    await self.safe_emit('scheduler_log', {
                        'message': f"Alpha Vantage API 호출 제한 도달 ({ticker}). 재시도합니다.", 
                        'type': 'warning'
                    })
                    raise
                continue
            except Exception as e:
                await self.safe_emit('scheduler_log', {
                    'message': f"Alpha Vantage 데이터 파싱 오류 ({ticker}): {e}", 
                    'type': 'error'
                })
                continue
                
        return []

    async def _fetch_ohlcv_from_fmp_with_interval(self, client: httpx.AsyncClient, ticker: str, api_key: str, interval: str) -> List[Dict]:
        """Fetch OHLCV data from FMP with specific interval"""
        # API 키를 데이터베이스에서 조회
        db = self.get_db_session()
        try:
            from ..models import AppConfiguration
            api_key_config = db.query(AppConfiguration).filter(
                AppConfiguration.config_key == "FMP_API_KEY"
            ).first()
            
            if api_key_config:
                api_key = api_key_config.config_value
        finally:
            db.close()
        
        if not api_key:
            return []
        
        # FMP는 주로 일간 데이터를 제공
        url = f"https://financialmodelingprep.com/api/v3/historical-price-full/{ticker}?apikey={api_key}"
        
        try:
            data = await self._fetch_async(client, url, "FMP", ticker)
            
            if "historical" in data:
                return [
                    {
                        "timestamp_utc": self._safe_date_parse(item["date"]),
                        "open_price": self._safe_float(item["open"]),
                        "high_price": self._safe_float(item["high"]),
                        "low_price": self._safe_float(item["low"]),
                        "close_price": self._safe_float(item["close"]),
                        "volume": self._safe_float(item["volume"], 0.0),
                    }
                    for item in data["historical"]
                    if self._safe_date_parse(item["date"])
                ]
            else:
                await self.safe_emit('scheduler_log', {
                    'message': f"FMP: 예상치 못한 응답 형식 ({ticker})", 
                    'type': 'warning'
                })
                return []
                
        except Exception as e:
            await self.safe_emit('scheduler_log', {
                'message': f"FMP 데이터 파싱 오류 ({ticker}): {e}", 
                'type': 'error'
            })
            return []
    
    async def _fetch_ohlcv_from_binance_with_interval(self, client: httpx.AsyncClient, ticker: str, interval: str) -> List[Dict]:
        """Fetch OHLCV data from Binance with specific interval"""
        # Binance 간격 매핑
        interval_map = {
            '1d': '1d',
            '4h': '4h',
            '1h': '1h',
            '1w': '1w',
            '1m': '1M'
        }
        
        binance_interval = interval_map.get(interval, '1d')
        url = f"https://api.binance.com/api/v3/klines?symbol={ticker}&interval={binance_interval}&limit=1000"
        
        try:
            data = await self._fetch_async(client, url, "Binance", ticker)
            
            return [
                {
                    "timestamp_utc": datetime.fromtimestamp(item[0] / 1000),
                    "open_price": self._safe_float(item[1]),
                    "high_price": self._safe_float(item[2]),
                    "low_price": self._safe_float(item[3]),
                    "close_price": self._safe_float(item[4]),
                    "volume": self._safe_float(item[5], 0.0),
                }
                for item in data
                if len(item) >= 6
            ]
                
        except Exception as e:
            await self.safe_emit('scheduler_log', {
                'message': f"Binance 데이터 파싱 오류 ({ticker}): {e}", 
                'type': 'error'
            })
            return []
    
    async def _fetch_ohlcv_from_coinbase_with_interval(self, client: httpx.AsyncClient, ticker: str, interval: str) -> List[Dict]:
        """Fetch OHLCV data from Coinbase with specific interval"""
        # Coinbase 간격 매핑
        granularity_map = {
            '1d': 86400,
            '4h': 14400,
            '1h': 3600,
            '1w': 604800,
            '1m': 2592000
        }
        
        granularity = granularity_map.get(interval, 86400)
        url = f"https://api.pro.coinbase.com/products/{ticker}/candles?granularity={granularity}"
        
        try:
            data = await self._fetch_async(client, url, "Coinbase", ticker)
            
            return [
                {
                    "timestamp_utc": datetime.fromtimestamp(item[0]),
                    "open_price": self._safe_float(item[3]),
                    "high_price": self._safe_float(item[2]),
                    "low_price": self._safe_float(item[1]),
                    "close_price": self._safe_float(item[4]),
                    "volume": self._safe_float(item[5], 0.0),
                }
                for item in data
                if len(item) >= 6
            ]
                
        except Exception as e:
            await self.safe_emit('scheduler_log', {
                'message': f"Coinbase 데이터 파싱 오류 ({ticker}): {e}", 
                'type': 'error'
            })
            return []
    
    async def _fetch_ohlcv_from_coinmarketcap_with_interval(self, client: httpx.AsyncClient, ticker: str, interval: str) -> List[Dict]:
        """Fetch OHLCV data from CoinMarketCap with specific interval"""
        # API 키를 데이터베이스에서 조회
        db = self.get_db_session()
        try:
            from ..models import AppConfiguration
            api_key_config = db.query(AppConfiguration).filter(
                AppConfiguration.config_key == "COINMARKETCAP_API_KEY"
            ).first()
            
            if api_key_config:
                api_key = api_key_config.config_value
            else:
                api_key = ""
        finally:
            db.close()
        
        if not api_key:
            return []
        
        # CoinMarketCap는 주로 일간 데이터를 제공
        url = f"https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol={ticker}&convert=USD"
        
        try:
            headers = {"X-CMC_PRO_API_KEY": api_key}
            response = await client.get(url, headers=headers, timeout=self.api_timeout)
            response.raise_for_status()
            data = response.json()
            
            if "data" in data and ticker in data["data"]:
                quote = data["data"][ticker]["quote"]["USD"]
                current_time = datetime.now()
                
                return [{
                    "timestamp_utc": current_time,
                    "open_price": self._safe_float(quote.get("open_24h")),
                    "high_price": self._safe_float(quote.get("high_24h")),
                    "low_price": self._safe_float(quote.get("low_24h")),
                    "close_price": self._safe_float(quote.get("price")),
                    "volume": self._safe_float(quote.get("volume_24h"), 0.0),
                }]
            else:
                await self.safe_emit('scheduler_log', {
                    'message': f"CoinMarketCap: 예상치 못한 응답 형식 ({ticker})", 
                    'type': 'warning'
                })
                return []
                
        except Exception as e:
            await self.safe_emit('scheduler_log', {
                'message': f"CoinMarketCap 데이터 파싱 오류 ({ticker}): {e}", 
                'type': 'error'
            })
            return []



