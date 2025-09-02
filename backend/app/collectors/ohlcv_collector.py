"""
OHLCV data collector for fetching and storing price data from various APIs.
"""
import logging
import asyncio
import json
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional

import httpx
import backoff
import pandas as pd
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, text

from .base_collector import BaseCollector
from ..utils.logging_helper import CollectorLoggingHelper, create_collection_summary_log
from ..core.config import GLOBAL_APP_CONFIGS
from ..models.asset import Asset
from ..models.system import AppConfiguration
from ..crud import asset as crud_asset, crud_ohlcv
from ..api import deps
from ..services.api_strategy_manager import api_manager

logger = logging.getLogger(__name__)


class OHLCVCollector(BaseCollector):
    """
    OHLCV 데이터를 스마트하게 수집, 처리, 저장하는 고도화된 컬렉터입니다.
    데이터 무결성 검사, 자동 복구, API 호출 예산 관리를 포함합니다.
    """

    def __init__(self, db: Session = None):
        super().__init__(db)
        self.api_timeout = 30
        self.enable_historical_backfill = True
        self.max_historical_days = 1000
        self.historical_days_per_run = 100
        # 로깅 헬퍼 초기화
        self.logging_helper = CollectorLoggingHelper("OHLCVCollector", self)

    async def collect_with_settings(self) -> Dict[str, Any]:
        """Collect OHLCV data with individual asset settings"""
        db = self.get_db_session()
        
        try:
            # Get assets that have OHLCV collection enabled in their settings
            # 하이브리드 방식: True/False와 true/false 모두 지원
            condition1 = Asset.collection_settings.contains({"collect_price": True})
            condition2 = text("JSON_EXTRACT(collection_settings, '$.collect_price') = true")
            
            # Asset 객체 대신 asset_id만 가져와서 세션 오류 방지
            # 모든 자산 타입 포함 (크립토 포함)
            from ..models.asset import AssetType
            asset_ids = db.query(Asset.asset_id).join(AssetType).filter(
                Asset.is_active == True,
                or_(condition1, condition2)
            ).all()
            
            asset_ids = [asset_id[0] for asset_id in asset_ids]  # 튜플에서 asset_id 추출
            
            if not asset_ids:
                await self.safe_emit('scheduler_log', {
                    'message': "OHLCV 수집이 활성화된 자산이 없습니다.", 
                    'type': 'warning'
                })
                return {"message": "No assets with OHLCV collection enabled", "processed": 0}
            
            # 상세 로깅 시작 (실제 API는 나중에 결정)
            self.logging_helper.start_collection("OHLCV", len(asset_ids), api_provider="Multiple")
            
            await self.safe_emit('scheduler_log', {
                'message': f"OHLCV 데이터 수집 시작: {len(asset_ids)}개 자산 (설정 기반)", 
                'type': 'info'
            })
            
            # 다중 간격 설정 확인 - 데이터베이스에서 직접 조회
            enable_multiple_intervals = db.query(AppConfiguration).filter(
                AppConfiguration.config_key == "ENABLE_MULTIPLE_INTERVALS"
            ).first()
            enable_multiple_intervals = enable_multiple_intervals.config_value.lower() == 'true' if enable_multiple_intervals else False
            
            ohlcv_intervals_config = db.query(AppConfiguration).filter(
                AppConfiguration.config_key == "OHLCV_DATA_INTERVALS"
            ).first()
            
            if ohlcv_intervals_config:
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
            
            # 각 간격별로 데이터 수집 (최신 데이터 먼저)
            total_results = []
            for interval in ohlcv_intervals:
                await self.safe_emit('scheduler_log', {
                    'message': f"{interval} 간격 데이터 수집 시작", 
                    'type': 'info'
                })
                
                result = await self._collect_data_with_interval(asset_ids, interval)
                total_results.append(result)
            
            # 히스토리 백필이 활성화된 경우 백필 로직 실행 (최신 데이터 수집 후)
            if self.enable_historical_backfill:
                await self.safe_emit('scheduler_log', {
                    'message': "최신 데이터 수집 완료. 히스토리 백필 시작", 
                    'type': 'info'
                })
                await self._perform_historical_backfill(asset_ids)
            
            # 결과 합계
            total_processed = sum(r.get("processed_assets", 0) for r in total_results)
            total_added = sum(r.get("total_added_records", 0) for r in total_results)
            
            # 실제 사용된 API 추적
            api_usage = {}
            for result in total_results:
                if isinstance(result, dict) and "api_usage" in result:
                    for api, count in result["api_usage"].items():
                        api_usage[api] = api_usage.get(api, 0) + count
            
            # 가장 많이 사용된 API를 기본값으로 설정
            primary_api = max(api_usage.items(), key=lambda x: x[1])[0] if api_usage else "FMP"
            
            # 상세 로깅 완료
            self.logging_helper.log_collection_completion(
                total_processed, 
                total_added,
                api_provider=primary_api,
                collection_type="OHLCV",
                intervals_processed=len(ohlcv_intervals)
            )
            
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
            # Get all asset IDs that need OHLCV data - Asset 객체 대신 asset_id만 가져와서 세션 오류 방지
            asset_ids = db.query(Asset.asset_id).filter(Asset.is_active == True).all()
            asset_ids = [asset_id[0] for asset_id in asset_ids]  # 튜플에서 asset_id 추출
            
            if not asset_ids:
                await self.safe_emit('scheduler_log', {
                    'message': "활성 자산이 없습니다.", 
                    'type': 'warning'
                })
                return {"message": "No active assets found", "processed": 0}
            
            await self.safe_emit('scheduler_log', {
                'message': f"OHLCV 데이터 수집 시작: {len(asset_ids)}개 자산", 
                'type': 'info'
            })
            self.log_progress(f"Starting OHLCV collection for {len(asset_ids)} assets")
            
            # Process assets in batches to avoid overwhelming APIs
            batch_size = GLOBAL_APP_CONFIGS.get("BATCH_SIZE", 1)  # 기본값을 1로 변경
            total_processed = 0
            total_added = 0
            
            for i in range(0, len(asset_ids), batch_size):
                batch = asset_ids[i:i + batch_size]
                
                await self.safe_emit('scheduler_log', {
                    'message': f"배치 처리 중: {i+1}-{min(i+batch_size, len(asset_ids))}/{len(asset_ids)}", 
                    'type': 'info'
                })
                
                # Process batch concurrently - asset_id만 전달
                tasks = [self._fetch_and_store_ohlcv_for_asset(asset_id) for asset_id in batch]
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
                
                # Rate limiting between batches - API 제한을 피하기 위해 더 긴 대기 시간
                if i + batch_size < len(asset_ids):
                    await asyncio.sleep(5)  # 2초에서 5초로 증가
            
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
        finally:
            db.close()
    
    async def _collect_data_with_interval(self, asset_ids: List[int], interval: str) -> Dict[str, Any]:
        """Collect OHLCV data for specific interval"""
        db = self.get_db_session()
        
        try:
            await self.safe_emit('scheduler_log', {
                'message': f"OHLCV {interval} 간격 데이터 수집 시작: {len(asset_ids)}개 자산", 
                'type': 'info'
            })
            
            # Process assets in batches to avoid overwhelming APIs
            batch_size = GLOBAL_APP_CONFIGS.get("BATCH_SIZE", 1)  # 기본값을 1로 변경
            total_processed = 0
            total_added = 0
            api_usage = {}  # API 사용량 추적
            
            for i in range(0, len(asset_ids), batch_size):
                batch = asset_ids[i:i + batch_size]
                
                await self.safe_emit('scheduler_log', {
                    'message': f"{interval} 배치 처리 중: {i+1}-{min(i+batch_size, len(asset_ids))}/{len(asset_ids)}", 
                    'type': 'info'
                })
                
                # Process batch concurrently - asset_id만 전달
                tasks = [self._fetch_and_store_ohlcv_for_asset_with_interval(asset_id, interval) for asset_id in batch]
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
                        
                        # API 사용량 추적
                        if result.get("success", False) and result.get("source"):
                            source = result.get("source")
                            api_usage[source] = api_usage.get(source, 0) + 1
                        
                        if result.get("success", False):
                            await self.safe_emit('scheduler_log', {
                                'message': f"[{result.get('ticker', 'Unknown')}] {interval} {result.get('source', 'Unknown')}에서 {result.get('added_count', 0)}개 데이터 수집 완료", 
                                'type': 'success'
                            })
                
                # Rate limiting between batches - API 제한을 피하기 위해 더 긴 대기 시간
                if i + batch_size < len(asset_ids):
                    await asyncio.sleep(5)  # 2초에서 5초로 증가
            
            await self.safe_emit('scheduler_log', {
                'message': f"OHLCV {interval} 간격 데이터 수집 완료: {total_processed}개 자산 처리, {total_added}개 레코드 추가", 
                'type': 'success'
            })
            
            return {
                "processed_assets": total_processed,
                "total_added_records": total_added,
                "interval": interval,
                "api_usage": api_usage,  # API 사용량 포함
                "message": f"Successfully processed {total_processed} assets for {interval} interval"
            }
            
        except Exception as e:
            self.log_progress(f"OHLCV {interval} collection failed: {e}", "error")
            raise
        finally:
            db.close()

    async def _fetch_and_store_ohlcv_for_asset(self, asset_id: int) -> Dict[str, Any]:
        """단일 자산에 대한 OHLCV 데이터를 수집하고 저장합니다."""
        # 새로운 세션에서 Asset 정보를 다시 로드하여 세션 오류 방지
        db = self.get_db_session()
        try:
            # Asset과 AssetType을 함께 로드
            fresh_asset = db.query(Asset).options(joinedload(Asset.asset_type)).filter(Asset.asset_id == asset_id).first()
            
            if not fresh_asset:
                # 상세 로깅 - 자산을 찾을 수 없는 경우
                self.logging_helper.log_asset_processing_failure(
                    {"asset_id": asset_id, "ticker": "Unknown"}, 
                    Exception("Asset not found")
                )
                return {
                    "asset_id": asset_id,
                    "ticker": "Unknown",
                    "success": False,
                    "error": "Asset not found"
                }
            
            # 상세 로깅 - 자산 처리 시작
            self.logging_helper.log_asset_processing_start(fresh_asset)
            
            # 데이터 소스별 fallback 전략 정의
            asset_type_name_lower = fresh_asset.asset_type.type_name.lower()
            primary_source = fresh_asset.data_source
            fallback_sources = []
            
            if asset_type_name_lower in ['stocks', 'etfs', 'bonds', 'funds']:
                if primary_source == 'tiingo':
                    fallback_sources = ['fmp', 'alpha_vantage']
                elif primary_source == 'fmp':
                    fallback_sources = ['tiingo', 'alpha_vantage']
                elif primary_source == 'alpha_vantage':
                    fallback_sources = ['tiingo', 'fmp']
                else:
                    fallback_sources = ['tiingo', 'fmp', 'alpha_vantage']
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
                        # 상세 로깅 - API 호출 시작
                        self.logging_helper.log_api_call_start(source, fresh_asset.ticker)
                        
                        ohlcv_data = []
                        
                        if source == 'tiingo':
                            ohlcv_data = await self._fetch_ohlcv_from_tiingo(client, fresh_asset.ticker)
                        elif source == 'polygon':
                            ohlcv_data = await self._fetch_ohlcv_from_polygon(client, fresh_asset.ticker)
                        elif source == 'alpha_vantage':
                            api_keys = GLOBAL_APP_CONFIGS.get("ALPHA_VANTAGE_API_KEYS", [])
                            ohlcv_data = await self._fetch_ohlcv_from_alpha_vantage(client, fresh_asset.ticker, api_keys)
                        elif source == 'fmp':
                            api_key = GLOBAL_APP_CONFIGS.get("FMP_API_KEY", "")
                            ohlcv_data = await self._fetch_ohlcv_from_fmp(client, fresh_asset.ticker)
                        elif source == 'binance':
                            ohlcv_data = await self._fetch_ohlcv_from_binance(client, fresh_asset.ticker)
                        elif source == 'coinbase':
                            ohlcv_data = await self._fetch_ohlcv_from_coinbase(client, fresh_asset.ticker)
                        elif source == 'coinmarketcap':
                            ohlcv_data = await self._fetch_ohlcv_from_coinmarketcap(client, fresh_asset.ticker)
                        
                        if ohlcv_data:
                            try:
                                added_count = await self._store_ohlcv_data(asset_id, ohlcv_data)
                            except Exception as store_error:
                                self.log_progress(f"Error storing data for {fresh_asset.ticker}: {store_error}", "error")
                                raise store_error
                            
                            # 상세 로깅 - 성공
                            self.logging_helper.log_api_call_success(source, fresh_asset.ticker, len(ohlcv_data))
                            self.logging_helper.log_asset_processing_success(fresh_asset, source, added_count)
                            
                            return {
                                "asset_id": asset_id,
                                "ticker": fresh_asset.ticker,
                                "source": source,
                                "added_count": added_count,
                                "success": True
                            }
                        else:
                            # 상세 로깅 - API 호출은 성공했지만 데이터가 없는 경우
                            self.logging_helper.log_api_call_failure(source, fresh_asset.ticker, Exception("No data returned"))
                            
                    except Exception as e:
                        # 상세 로깅 - API 호출 실패
                        self.logging_helper.log_api_call_failure(source, fresh_asset.ticker, e)
                        self.log_progress(f"Failed to fetch from {source} for {fresh_asset.ticker}: {e}", "warning")
                        continue
            
            # 상세 로깅 - 모든 소스 실패
            self.logging_helper.log_all_sources_failed(fresh_asset.ticker, sources_to_try)
            self.logging_helper.log_asset_processing_failure(fresh_asset, Exception("All data sources failed"), sources_to_try)
            
            return {
                "asset_id": asset_id,
                "ticker": fresh_asset.ticker if fresh_asset else "Unknown",
                "success": False,
                "error": "All data sources failed"
            }
        finally:
            db.close()
    
    async def _fetch_and_store_ohlcv_for_asset_with_interval(self, asset_id: int, interval: str) -> Dict[str, Any]:
        """
        [IMPROVED] 단일 자산에 대한 특정 간격 OHLCV 데이터를 수집하고 저장합니다.
        이제 api_strategy_manager의 지능적인 파라미터 계산 기능을 활용합니다.
        """
        # 새로운 세션에서 Asset 정보를 다시 로드하여 세션 오류 방지
        db = self.get_db_session()
        try:
            # Asset과 AssetType을 함께 로드
            fresh_asset = db.query(Asset).options(joinedload(Asset.asset_type)).filter(Asset.asset_id == asset_id).first()
            
            if not fresh_asset:
                return {
                    "asset_id": asset_id,
                    "ticker": "Unknown",
                    "success": False,
                    "error": "Asset not found"
                }
            
            # API 전략 관리자를 사용하여 데이터 수집
            ticker = fresh_asset.ticker
            asset_type_name_lower = fresh_asset.asset_type.type_name.lower() if fresh_asset.asset_type else ""
            
            # [IMPROVED] asset_id를 전달하여 DB 상태 기반 최적 파라미터 자동 계산
            if 'commodities' in asset_type_name_lower:
                # 커머디티 데이터 수집 (FMP 우선순위)
                data = await api_manager.get_commodity_ohlcv(ticker, interval=interval, asset_id=asset_id)
            elif 'crypto' in asset_type_name_lower:
                # 암호화폐 데이터 수집 - 자산 타입과 asset_id 전달
                data = await api_manager.get_ohlcv(ticker, interval=interval, asset_type=asset_type_name_lower, asset_id=asset_id)
            else:
                # 주식/ETF 데이터 수집 - 자산 타입과 asset_id 전달
                data = await api_manager.get_ohlcv(ticker, interval=interval, asset_type=asset_type_name_lower, asset_id=asset_id)
            
            if data is not None and not data.empty:
                # DataFrame을 OHLCV 형식으로 변환
                ohlcv_data = []
                
                # 디버깅: DataFrame 정보 로깅
                self.log_progress(f"Processing DataFrame for {ticker}: shape={data.shape}, columns={list(data.columns)}", "info")
                
                for index, row in data.iterrows():
                    # timestamp가 유효한지 확인
                    if index is None or (hasattr(index, '__int__') and int(index) == 0):
                        continue
                    
                    # timestamp를 datetime으로 변환
                    if hasattr(index, 'to_pydatetime'):
                        timestamp = index.to_pydatetime()
                    elif isinstance(index, (datetime, pd.Timestamp)):
                        timestamp = index
                    else:
                        continue
                    
                    # 디버깅: 각 행의 데이터 확인
                    open_price = self._safe_float(row.get('open', row.get('open_price', row.get('Open', 0))))
                    high_price = self._safe_float(row.get('high', row.get('high_price', row.get('High', 0))))
                    low_price = self._safe_float(row.get('low', row.get('low_price', row.get('Low', 0))))
                    close_price = self._safe_float(row.get('close', row.get('close_price', row.get('Close', 0))))
                    volume = self._safe_float(row.get('volume', row.get('Volume', 0)), 0.0)
                    
                    # 디버깅: 가격 데이터 로깅 (처음 3개만)
                    if len(ohlcv_data) < 3:
                        self.log_progress(f"Row data for {ticker}: open={open_price}, high={high_price}, low={low_price}, close={close_price}", "info")
                    
                    # 최종 검증: 모든 가격 데이터가 유효한지 확인
                    if (close_price is None or close_price <= 0 or 
                        open_price is None or open_price <= 0 or
                        high_price is None or high_price <= 0 or
                        low_price is None or low_price <= 0):
                        if len(ohlcv_data) < 3:  # 처음 3개만 로깅
                            self.log_progress(f"Skipping row for {ticker}: open={open_price}, high={high_price}, low={low_price}, close={close_price} (invalid prices)", "warning")
                        continue
                    
                    # 추가 검증: 가격 데이터의 논리적 일관성 확인
                    if (high_price < low_price or 
                        high_price < open_price or 
                        high_price < close_price or
                        low_price > open_price or 
                        low_price > close_price):
                        if len(ohlcv_data) < 3:  # 처음 3개만 로깅
                            self.log_progress(f"Skipping row for {ticker}: price logic error (high={high_price}, low={low_price}, open={open_price}, close={close_price})", "warning")
                        continue
                    
                    ohlcv_record = {
                        "timestamp_utc": timestamp,
                        "open_price": open_price,
                        "high_price": high_price,
                        "low_price": low_price,
                        "close_price": close_price,
                        "volume": volume,
                        "asset_id": asset_id,
                        "data_interval": interval
                    }
                    ohlcv_data.append(ohlcv_record)
                
                if ohlcv_data:
                    added_count = await self._store_ohlcv_data_with_interval(asset_id, ohlcv_data, interval)
                    return {
                        "asset_id": asset_id,
                        "ticker": ticker,
                        "source": "API Strategy Manager",
                        "interval": interval,
                        "added_count": added_count,
                        "success": True
                    }
            
            return {
                "asset_id": asset_id,
                "ticker": ticker,
                "interval": interval,
                "success": False,
                "error": "No data available from any API source"
            }
        finally:
            db.close()

    async def _get_latest_data_date(self, asset_id: int, interval: str) -> Optional[date]:
        """Get the latest data date for a specific asset and interval"""
        db = self.get_db_session()
        try:
            from ..crud.asset import crud_ohlcv
            
            latest_data = db.query(crud_ohlcv.model).filter(
                crud_ohlcv.model.asset_id == asset_id,
                crud_ohlcv.model.data_interval == interval
            ).order_by(crud_ohlcv.model.timestamp_utc.desc()).first()
            
            if latest_data:
                return latest_data.timestamp_utc.date()
            return None
        finally:
            db.close()
    
    def _calculate_days_needed(self, latest_date: Optional[date]) -> int:
        """Calculate how many days of data are needed based on latest date"""
        if latest_date is None:
            # 데이터가 없으면 HISTORICAL_DATA_DAYS_PER_RUN만큼 수집
            return self.historical_days_per_run
        
        current_date = datetime.now().date()
        days_diff = (current_date - latest_date).days
        
        if days_diff <= 0:
            # 최신 데이터가 있으면 1일만 수집 (최신 데이터 업데이트)
            return 1
        elif days_diff > self.historical_days_per_run:
            # 너무 오래된 데이터면 HISTORICAL_DATA_DAYS_PER_RUN만큼 수집
            return self.historical_days_per_run
        else:
            # 빠진 일수만큼 수집
            return days_diff

    async def _perform_historical_backfill(self, asset_ids: List[int]) -> None:
        """Perform historical data backfill for missing data"""
        if not self.enable_historical_backfill:
            return
            
        await self.safe_emit('scheduler_log', {
            'message': f"히스토리 백필 시작: {len(asset_ids)}개 자산", 
            'type': 'info'
        })
        
        for asset_id in asset_ids:
            try:
                # asset_id를 사용하여 Asset 정보를 다시 조회
                db = self.get_db_session()
                asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
                if not asset:
                    db.close()
                    continue
                    
                ticker = getattr(asset, 'ticker', 'Unknown')
                db.close()
                
                # 각 자산의 최신 데이터 날짜 확인
                db = self.get_db_session()
                latest_data = db.query(crud_ohlcv.model).filter(
                    crud_ohlcv.model.asset_id == asset_id
                ).order_by(crud_ohlcv.model.timestamp_utc.desc()).first()
                
                if latest_data:
                    latest_date = latest_data.timestamp_utc.date()
                    current_date = datetime.now().date()
                    
                    # 최신 데이터가 오늘보다 이전인 경우 백필 수행
                    if latest_date < current_date:
                        days_to_backfill = (current_date - latest_date).days
                        if days_to_backfill > 0:
                            await self._backfill_historical_data(asset_id, ticker, days_to_backfill)
                else:
                    # 데이터가 없는 경우 최대 히스토리 기간만큼 백필
                    await self._backfill_historical_data(asset_id, ticker, self.max_historical_days)
                    
                db.close()
                            
            except Exception as e:
                ticker = getattr(asset, 'ticker', 'Unknown')
                self.log_progress(f"Historical backfill error for {ticker}: {e}", "error")

    async def _backfill_historical_data(self, asset_id: int, ticker: str, days_to_backfill: int) -> None:
        """Backfill historical data for a specific asset"""
        try:
            # 백필할 기간을 청크로 나누어 처리
            chunk_size = min(self.historical_days_per_run, days_to_backfill)
            
            for i in range(0, days_to_backfill, chunk_size):
                end_date = datetime.now().date() - timedelta(days=i)
                start_date = end_date - timedelta(days=chunk_size-1)
                
                await self.safe_emit('scheduler_log', {
                    'message': f"[{ticker}] 히스토리 백필: {start_date} ~ {end_date}", 
                    'type': 'info'
                })
                
                # 이 기간의 데이터 수집
                await self._fetch_historical_data_for_period(asset_id, ticker, start_date, end_date)
                
        except Exception as e:
            self.log_progress(f"Backfill error for {ticker}: {e}", "error")
    
    async def _fetch_historical_data_for_period(self, asset_id: int, ticker: str, start_date: date, end_date: date) -> None:
        """Fetch historical data for a specific period"""
        try:
            # 자산 타입을 다시 조회
            db = self.get_db_session()
            asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
            if not asset:
                db.close()
                return
                
            asset_type_name = asset.asset_type.type_name.lower() if asset.asset_type else ""
            db.close()
            
            # [IMPROVED] api_strategy_manager를 사용하여 백필 데이터 수집
            # 이제 우선순위가 올바르게 적용됩니다 (Tiingo 1순위)
            if 'crypto' in asset_type_name:
                data = await api_manager.get_ohlcv(ticker, "1d", asset_type=asset_type_name, asset_id=asset_id)
            else:
                data = await api_manager.get_ohlcv(ticker, "1d", asset_type=asset_type_name, asset_id=asset_id)
            
            if data is not None and not data.empty:
                # DataFrame을 OHLCV 레코드로 변환
                ohlcv_data = []
                for index, row in data.iterrows():
                    # timestamp 검증 및 변환
                    if not isinstance(index, (datetime, pd.Timestamp)):
                        continue
                    
                    close_price = self._safe_float(row.get('close', row.get('close_price')))
                    
                    # 최종 검증: 0이 아닌 close_price만 저장
                    if close_price is not None and close_price > 0:
                        ohlcv_record = {
                            "timestamp_utc": index.to_pydatetime() if hasattr(index, 'to_pydatetime') else index,
                            "open_price": self._safe_float(row.get('open', row.get('open_price'))),
                            "high_price": self._safe_float(row.get('high', row.get('high_price'))),
                            "low_price": self._safe_float(row.get('low', row.get('low_price'))),
                            "close_price": close_price,
                            "volume": self._safe_float(row.get('volume', 0.0)),
                            "asset_id": asset_id,
                            "data_interval": "1d"
                        }
                        ohlcv_data.append(ohlcv_record)
                
                if ohlcv_data:
                    await self._store_ohlcv_data_with_interval(asset_id, ohlcv_data, "1d")
                    await self.safe_emit('scheduler_log', {
                        'message': f"[{ticker}] 히스토리 데이터 {len(ohlcv_data)}개 저장 완료 (API Manager 사용)", 
                        'type': 'success'
                    })
                    
        except Exception as e:
            self.log_progress(f"Historical data fetch error for {ticker}: {e}", "error")
    
    # [REMOVED] 직접 API 호출 메서드들 - api_strategy_manager로 대체됨
    # _fetch_crypto_historical_data와 _fetch_stock_historical_data 메서드는 제거됨
    # 이제 모든 API 호출은 api_strategy_manager를 통해 우선순위에 따라 처리됩니다

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
                
            # HISTORICAL_DATA_DAYS_PER_RUN 설정 조회
            historical_days_config = db.query(AppConfiguration).filter(
                AppConfiguration.config_key == "HISTORICAL_DATA_DAYS_PER_RUN"
            ).first()
            
            historical_days = int(historical_days_config.config_value) if historical_days_config else 1000
        finally:
            db.close()
        
        if not api_key:
            return []
        
        # 간격별 limit 설정 (HISTORICAL_DATA_DAYS_PER_RUN 기반)
        limit_map = {
            '1d': 1,    # 1일 간격: 최신 1개
            '4h': 6,    # 4시간 간격: 하루 6개 (24시간/4시간)
            '1h': 24,   # 1시간 간격: 하루 24개
            '1w': 1,    # 1주 간격: 최신 1개
            '1m': 1     # 1개월 간격: 최신 1개
        }
        
        # 히스토리 백필의 경우 HISTORICAL_DATA_DAYS_PER_RUN 사용
        if interval == '1d' and self.enable_historical_backfill:
            limit = historical_days
        else:
            limit = limit_map.get(interval, 1)
        
        # FMP는 주로 일간 데이터를 제공하지만 limit으로 제한
        url = f"https://financialmodelingprep.com/api/v3/historical-price-full/{ticker}?apikey={api_key}&limit={limit}"
        
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
        
        # HISTORICAL_DATA_DAYS_PER_RUN 설정 조회
        db = self.get_db_session()
        try:
            from ..models import AppConfiguration
            historical_days_config = db.query(AppConfiguration).filter(
                AppConfiguration.config_key == "HISTORICAL_DATA_DAYS_PER_RUN"
            ).first()
            
            historical_days = int(historical_days_config.config_value) if historical_days_config else 1000
        finally:
            db.close()
        
        # 간격별 limit 설정 (HISTORICAL_DATA_DAYS_PER_RUN 기반)
        limit_map = {
            '1d': 1,    # 1일 간격: 최신 1개
            '4h': 6,    # 4시간 간격: 하루 6개 (24시간/4시간)
            '1h': 24,   # 1시간 간격: 하루 24개
            '1w': 1,    # 1주 간격: 최신 1개
            '1m': 1     # 1개월 간격: 최신 1개
        }
        
        binance_interval = interval_map.get(interval, '1d')
        
        # 히스토리 백필의 경우 HISTORICAL_DATA_DAYS_PER_RUN 사용
        if interval == '1d' and self.enable_historical_backfill:
            limit = historical_days
        else:
            limit = limit_map.get(interval, 1)
        
        url = f"https://api.binance.com/api/v3/klines?symbol={ticker}&interval={binance_interval}&limit={limit}"
        
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

    async def _fetch_ohlcv_from_tiingo(self, client: httpx.AsyncClient, ticker: str) -> List[Dict]:
        """Fetch OHLCV data from Tiingo using api_manager"""
        try:
            # api_manager를 사용하여 OHLCV 데이터 조회
            from datetime import datetime, timedelta
            end_date = datetime.now().strftime("%Y-%m-%d")
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            
            data = await api_manager.get_ohlcv(ticker, "1d")
            
            if data is not None and not data.empty:
                result = []
                for index, row in data.iterrows():
                    # timestamp 처리 - DataFrame의 인덱스가 timestamp인 경우
                    if hasattr(index, 'to_pydatetime'):
                        timestamp = index.to_pydatetime()
                    elif isinstance(index, (datetime, pd.Timestamp)):
                        timestamp = index
                    else:
                        # 인덱스가 timestamp가 아닌 경우, timestamp_utc 컬럼 사용
                        timestamp = row.get("timestamp_utc")
                        if timestamp is None:
                            timestamp = datetime.now()
                    
                    # 데이터 변환
                    record = {
                        "timestamp_utc": timestamp,
                        "open_price": self._safe_float(row.get("open_price")),
                        "high_price": self._safe_float(row.get("high_price")),
                        "low_price": self._safe_float(row.get("low_price")),
                        "close_price": self._safe_float(row.get("close_price")),
                        "volume": self._safe_float(row.get("volume"), 0.0),
                    }
                    
                    # close_price가 None이 아닌 경우만 추가
                    if record["close_price"] is not None:
                        result.append(record)
                
                return result
            else:
                await self.safe_emit('scheduler_log', {
                    'message': f"Tiingo: 데이터 없음 ({ticker})", 
                    'type': 'warning'
                })
                return []
                
        except Exception as e:
            await self.safe_emit('scheduler_log', {
                'message': f"Tiingo 데이터 파싱 오류 ({ticker}): {e}", 
                'type': 'error'
            })
            return []

    async def _fetch_ohlcv_from_tiingo_with_interval(self, client: httpx.AsyncClient, ticker: str, interval: str) -> List[Dict]:
        """Fetch OHLCV data from Tiingo with specific interval using api_manager"""
        try:
            # api_manager를 사용하여 OHLCV 데이터 조회
            data = await api_manager.get_ohlcv(ticker, interval)
            
            if data is not None and not data.empty:
                return [
                    {
                        "timestamp_utc": row.name.to_pydatetime() if hasattr(row.name, 'to_pydatetime') else datetime.now(),
                        "open_price": self._safe_float(row.get("open", 0)),
                        "high_price": self._safe_float(row.get("high", 0)),
                        "low_price": self._safe_float(row.get("low", 0)),
                        "close_price": self._safe_float(row.get("close", 0)),
                        "volume": self._safe_float(row.get("volume", 0), 0.0),
                    }
                    for _, row in data.iterrows()
                    if row.get("close", 0) is not None
                ]
            else:
                await self.safe_emit('scheduler_log', {
                    'message': f"Tiingo {interval}: 데이터 없음 ({ticker})", 
                    'type': 'warning'
                })
                return []
                
        except Exception as e:
            await self.safe_emit('scheduler_log', {
                'message': f"Tiingo {interval} 데이터 파싱 오류 ({ticker}): {e}", 
                'type': 'error'
            })
            return []

    async def _fetch_ohlcv_from_polygon(self, client: httpx.AsyncClient, ticker: str) -> List[Dict]:
        """Fetch OHLCV data from Polygon.io using api_manager"""
        try:
            # api_manager를 사용하여 OHLCV 데이터 조회
            from datetime import datetime, timedelta
            end_date = datetime.now().strftime("%Y-%m-%d")
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            
            data = await api_manager.get_ohlcv(ticker, "1d")
            
            if data is not None and not data.empty:
                result = []
                for index, row in data.iterrows():
                    # timestamp 처리 - DataFrame의 인덱스가 timestamp인 경우
                    if hasattr(index, 'to_pydatetime'):
                        timestamp = index.to_pydatetime()
                    elif isinstance(index, (datetime, pd.Timestamp)):
                        timestamp = index
                    else:
                        # 인덱스가 timestamp가 아닌 경우, timestamp_utc 컬럼 사용
                        timestamp = row.get("timestamp_utc")
                        if timestamp is None:
                            timestamp = datetime.now()
                    
                    # 데이터 변환
                    record = {
                        "timestamp_utc": timestamp,
                        "open_price": self._safe_float(row.get("open_price")),
                        "high_price": self._safe_float(row.get("high_price")),
                        "low_price": self._safe_float(row.get("low_price")),
                        "close_price": self._safe_float(row.get("close_price")),
                        "volume": self._safe_float(row.get("volume"), 0.0),
                    }
                    
                    # close_price가 None이 아닌 경우만 추가
                    if record["close_price"] is not None:
                        result.append(record)
                
                return result
            else:
                await self.safe_emit('scheduler_log', {
                    'message': f"Polygon: 데이터 없음 ({ticker})", 
                    'type': 'warning'
                })
                return []
                
        except Exception as e:
            await self.safe_emit('scheduler_log', {
                'message': f"Polygon 데이터 파싱 오류 ({ticker}): {e}", 
                'type': 'error'
            })
            return []

    async def _fetch_ohlcv_from_polygon_with_interval(self, client: httpx.AsyncClient, ticker: str, interval: str) -> List[Dict]:
        """Fetch OHLCV data from Polygon.io with specific interval using api_manager"""
        try:
            # api_manager를 사용하여 OHLCV 데이터 조회
            data = await api_manager.get_ohlcv(ticker, interval)
            
            if data is not None and not data.empty:
                result = []
                for index, row in data.iterrows():
                    # timestamp 처리 - DataFrame의 인덱스가 timestamp인 경우
                    if hasattr(index, 'to_pydatetime'):
                        timestamp = index.to_pydatetime()
                    elif isinstance(index, (datetime, pd.Timestamp)):
                        timestamp = index
                    else:
                        # 인덱스가 timestamp가 아닌 경우, timestamp_utc 컬럼 사용
                        timestamp = row.get("timestamp_utc")
                        if timestamp is None:
                            timestamp = datetime.now()
                    
                    # 데이터 변환
                    record = {
                        "timestamp_utc": timestamp,
                        "open_price": self._safe_float(row.get("open_price")),
                        "high_price": self._safe_float(row.get("high_price")),
                        "low_price": self._safe_float(row.get("low_price")),
                        "close_price": self._safe_float(row.get("close_price")),
                        "volume": self._safe_float(row.get("volume"), 0.0),
                    }
                    
                    # close_price가 None이 아닌 경우만 추가
                    if record["close_price"] is not None:
                        result.append(record)
                
                return result
            else:
                await self.safe_emit('scheduler_log', {
                    'message': f"Polygon {interval}: 데이터 없음 ({ticker})", 
                    'type': 'warning'
                })
                return []
                
        except Exception as e:
            await self.safe_emit('scheduler_log', {
                'message': f"Polygon {interval} 데이터 파싱 오류 ({ticker}): {e}", 
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

    async def _fetch_ohlcv_from_fmp(self, client: httpx.AsyncClient, ticker: str) -> List[Dict]:
        """Fetch OHLCV data from FMP"""
        # API 키를 데이터베이스에서 조회
        db = self.get_db_session()
        try:
            from ..models import AppConfiguration
            api_key_config = db.query(AppConfiguration).filter(
                AppConfiguration.config_key == "FMP_API_KEY"
            ).first()
            
            if api_key_config:
                api_key = api_key_config.config_value
            else:
                api_key = ""
        finally:
            db.close()
        
        if not api_key:
            return []
        
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
                    for d in data["historical"] 
                    if d.get("date") and self._safe_date_parse(d.get("date")) is not None
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
            await self.safe_emit('scheduler_log', {
                'message': f"Binance 데이터 파싱 오류 ({ticker}): {e}", 
                'type': 'error'
            })
            
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
            await self.safe_emit('scheduler_log', {
                'message': f"Coinbase 데이터 파싱 오류 ({ticker}): {e}", 
                'type': 'error'
            })
            
        return []

    async def _fetch_ohlcv_from_coinmarketcap(self, client: httpx.AsyncClient, ticker: str) -> List[Dict[str, Any]]:
        """CoinMarketCap에서 OHLCV 데이터를 가져옵니다."""
        try:
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
                "timestamp_utc": current_time,
                "open_price": float(quote.get("price", 0)),
                "high_price": float(quote.get("price", 0)),
                "low_price": float(quote.get("price", 0)),
                "close_price": float(quote.get("price", 0)),
                "volume": float(quote.get("volume_24h", 0)),
            }]
            
            return ohlcv_data
            
        except Exception as e:
            await self.safe_emit('scheduler_log', {
                'message': f"Error fetching from CoinMarketCap for {ticker}: {e}", 
                'type': 'error'
            })
            return []

    # BaseCollector의 공통 메소드 사용하므로 제거

    async def _fetch_async(self, client: httpx.AsyncClient, url: str, api_name: str, ticker: str):
        """Fetch data from API using common request method"""
        return await self._make_request(
            client=client,
            url=url,
            api_name=api_name,
            ticker=ticker
        )

    async def _store_ohlcv_data(self, asset_id: int, ohlcv_list: List[Dict]) -> int:
        """Store OHLCV data and calculate daily change percentages"""
        if not ohlcv_list:
            return 0
        
        db = self.get_db_session()
        
        try:
            # 디버깅: 입력 데이터 확인
            self.log_progress(f"Processing {len(ohlcv_list)} records for asset {asset_id}", "info")
            if len(ohlcv_list) > 0:
                sample_record = ohlcv_list[0]
                self.log_progress(f"Sample record keys: {list(sample_record.keys())}", "info")
                self.log_progress(f"Sample close_price: {sample_record.get('close_price')}", "info")
            
            # Sort by timestamp
            ohlcv_list.sort(key=lambda x: x['timestamp_utc'])
            
            # Calculate change percentages
            for i, data_point in enumerate(ohlcv_list):
                data_point['asset_id'] = asset_id
                
                if i > 0:
                    prev_close = ohlcv_list[i-1]['close_price']
                    current_close = data_point['close_price']
                    
                    # 디버깅: 값 확인
                    if i < 3:  # 처음 3개만 로깅
                        self.log_progress(f"Data point {i}: prev_close={prev_close} (type: {type(prev_close)}), current_close={current_close} (type: {type(current_close)})", "info")
                    
                    if prev_close is not None and current_close is not None and prev_close > 0:
                        change = ((current_close - prev_close) / prev_close) * 100
                        data_point['change_percent'] = round(change, 4)
                    else:
                        data_point['change_percent'] = 0.0
                else:
                    # For first data point, check previous day from DB
                    from ..crud.asset import crud_ohlcv
                    prev_ohlcv = crud_ohlcv.get_previous_day_ohlcv(db, asset_id, data_point['timestamp_utc'].date())
                    if prev_ohlcv and prev_ohlcv.close_price is not None and prev_ohlcv.close_price > 0:
                        change = ((data_point['close_price'] - float(prev_ohlcv.close_price)) / float(prev_ohlcv.close_price)) * 100
                        data_point['change_percent'] = round(change, 4)
                    else:
                        data_point['change_percent'] = 0.0
            
            # Bulk upsert to database
            from ..crud.asset import crud_ohlcv
            added_count = crud_ohlcv.bulk_upsert_ohlcv(db, ohlcv_list)
            return added_count
        except Exception as e:
            self.log_progress(f"Error in _store_ohlcv_data: {e}", "error")
            import traceback
            self.log_progress(f"Traceback: {traceback.format_exc()}", "error")
            raise
        finally:
            db.close()

    async def _store_ohlcv_data_with_interval(self, asset_id: int, ohlcv_list: List[Dict], interval: str) -> int:
        """Store OHLCV data with specific interval"""
        if not ohlcv_list:
            return 0
        
        db = self.get_db_session()
        try:
            # 기존 데이터와 중복 체크 및 업데이트
            added_count = 0
            from ..crud.asset import crud_ohlcv
            
            for data_point in ohlcv_list:
                # asset_id와 간격 정보 추가
                data_point['asset_id'] = asset_id
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



