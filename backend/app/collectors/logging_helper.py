"""
Logging Helper for Collectors
컬렉터들의 로그 기능을 통합하는 헬퍼 클래스
"""
import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class CollectorLoggingHelper:
    """컬렉터들의 로그 기능을 통합하는 헬퍼 클래스"""
    
    def __init__(self, collector_name: str, base_collector):
        self.collector_name = collector_name
        self.base_collector = base_collector
        self.collection_start_time = None
        self.current_batch = 0
        self.total_batches = 0
    
    def start_collection(self, collection_type: str, total_assets: int, **kwargs):
        """수집 시작 로그"""
        self.collection_start_time = datetime.now()
        self.current_batch = 0
        
        self.base_collector.log_task_progress(f"Starting {collection_type} collection", {
            "collector": self.collector_name,
            "collection_type": collection_type,
            "total_assets": total_assets,
            "start_time": self.collection_start_time.isoformat(),
            **kwargs
        })
    
    def log_assets_filtered(self, filtered_count: int, filter_criteria: Dict = None):
        """자산 필터링 결과 로그"""
        self.base_collector.log_task_progress("Assets filtered for collection", {
            "filtered_count": filtered_count,
            "filter_criteria": filter_criteria or {},
            "status": "assets_loaded"
        })
    
    def log_configuration_loaded(self, config_data: Dict):
        """설정 로드 완료 로그"""
        self.base_collector.log_task_progress("Configuration loaded", config_data)
    
    def start_batch_processing(self, batch_number: int, total_batches: int, batch_size: int, 
                             current_assets: List, **kwargs):
        """배치 처리 시작 로그"""
        self.current_batch = batch_number
        self.total_batches = total_batches
        
        self.base_collector.log_task_progress(f"Processing batch {batch_number}/{total_batches}", {
            "batch_number": batch_number,
            "total_batches": total_batches,
            "batch_size": batch_size,
            "assets_in_batch": len(current_assets),
            "asset_tickers": [asset.ticker if hasattr(asset, 'ticker') else str(asset) for asset in current_assets],
            **kwargs
        })
    
    def log_asset_processing_start(self, asset, source: str = None):
        """개별 자산 처리 시작 로그"""
        ticker = asset.ticker if hasattr(asset, 'ticker') else str(asset)
        asset_type = asset.asset_type.type_name if hasattr(asset, 'asset_type') else 'unknown'
        
        self.base_collector.log_task_progress(f"Processing asset: {ticker}", {
            "ticker": ticker,
            "asset_type": asset_type,
            "source": source,
            "batch_progress": f"{self.current_batch}/{self.total_batches}"
        })
    
    def log_api_call_start(self, api_name: str, ticker: str, endpoint: str = None):
        """API 호출 시작 로그"""
        self.base_collector.log_task_progress(f"API call: {api_name}", {
            "api_name": api_name,
            "ticker": ticker,
            "endpoint": endpoint,
            "status": "starting"
        })
    
    def log_api_call_success(self, api_name: str, ticker: str, data_points: int = 0, **kwargs):
        """API 호출 성공 로그"""
        self.base_collector.log_api_call(api_name, f"fetch for {ticker}", True, {
            "ticker": ticker,
            "data_points": data_points,
            **kwargs
        })
    
    def log_api_call_failure(self, api_name: str, ticker: str, error: Exception, **kwargs):
        """API 호출 실패 로그"""
        self.base_collector.log_api_call(api_name, f"fetch for {ticker}", False, {
            "ticker": ticker,
            "error": str(error),
            "error_type": type(error).__name__,
            **kwargs
        })
    
    def log_asset_processing_success(self, asset, source: str, added_count: int = 0, **kwargs):
        """자산 처리 성공 로그"""
        ticker = asset.ticker if hasattr(asset, 'ticker') else str(asset)
        
        self.base_collector.log_task_progress(f"Successfully processed {ticker}", {
            "ticker": ticker,
            "source": source,
            "added_count": added_count,
            "batch_progress": f"{self.current_batch}/{self.total_batches}",
            **kwargs
        })
    
    def log_asset_processing_failure(self, asset, error: Exception, sources_tried: List[str] = None):
        """자산 처리 실패 로그"""
        ticker = asset.ticker if hasattr(asset, 'ticker') else str(asset)
        
        self.base_collector.log_error_with_context(error, f"Asset processing for {ticker}")
        self.base_collector.log_task_progress(f"Failed to process {ticker}", {
            "ticker": ticker,
            "sources_tried": sources_tried or [],
            "error": str(error),
            "error_type": type(error).__name__,
            "status": "failed"
        })
    
    def log_batch_completion(self, batch_number: int, processed_count: int, added_count: int, **kwargs):
        """배치 완료 로그"""
        self.base_collector.log_task_progress(f"Completed batch {batch_number}", {
            "batch_number": batch_number,
            "total_batches": self.total_batches,
            "processed_in_batch": processed_count,
            "added_in_batch": added_count,
            "progress": f"{batch_number}/{self.total_batches}",
            **kwargs
        })
    
    def log_collection_completion(self, total_processed: int, total_added: int, **kwargs):
        """수집 완료 로그"""
        duration = None
        if self.collection_start_time:
            duration = (datetime.now() - self.collection_start_time).total_seconds()
        
        self.base_collector.log_task_progress("Collection completed", {
            "total_processed": total_processed,
            "total_added": total_added,
            "duration_seconds": duration,
            "status": "completed",
            **kwargs
        })
    
    def log_fallback_attempt(self, ticker: str, primary_source: str, fallback_source: str):
        """Fallback 시도 로그"""
        self.base_collector.log_task_progress(f"Trying fallback for {ticker}", {
            "ticker": ticker,
            "primary_source": primary_source,
            "fallback_source": fallback_source,
            "status": "fallback_attempt"
        })
    
    def log_all_sources_failed(self, ticker: str, sources_tried: List[str]):
        """모든 소스 실패 로그"""
        self.base_collector.log_task_progress(f"All sources failed for {ticker}", {
            "ticker": ticker,
            "sources_tried": sources_tried,
            "status": "all_sources_failed"
        })


class BatchProcessor:
    """배치 처리를 위한 헬퍼 클래스"""
    
    def __init__(self, logging_helper: CollectorLoggingHelper, batch_size: int = 3):
        self.logging_helper = logging_helper
        self.batch_size = batch_size
        self.total_processed = 0
        self.total_added = 0
    
    async def process_assets(self, assets: List, process_func, **kwargs):
        """자산들을 배치로 처리"""
        total_batches = (len(assets) + self.batch_size - 1) // self.batch_size
        
        for i in range(0, len(assets), self.batch_size):
            batch = assets[i:i + self.batch_size]
            batch_number = (i // self.batch_size) + 1
            
            # 배치 시작 로그
            self.logging_helper.start_batch_processing(
                batch_number, total_batches, self.batch_size, batch, **kwargs
            )
            
            # 배치 처리
            batch_processed = 0
            batch_added = 0
            
            for asset in batch:
                try:
                    # 자산 처리 시작 로그
                    self.logging_helper.log_asset_processing_start(asset)
                    
                    # 실제 처리 함수 호출
                    result = await process_func(asset)
                    
                    if result.get("success", False):
                        batch_processed += 1
                        batch_added += result.get("added_count", 0)
                        
                        # 성공 로그
                        self.logging_helper.log_asset_processing_success(
                            asset, 
                            result.get("source", "unknown"),
                            result.get("added_count", 0)
                        )
                    else:
                        # 실패 로그
                        self.logging_helper.log_asset_processing_failure(
                            asset,
                            Exception(result.get("error", "Unknown error")),
                            result.get("sources_tried", [])
                        )
                        
                except Exception as e:
                    # 예외 로그
                    self.logging_helper.log_asset_processing_failure(asset, e)
            
            # 배치 완료 로그
            self.logging_helper.log_batch_completion(
                batch_number, batch_processed, batch_added
            )
            
            self.total_processed += batch_processed
            self.total_added += batch_added
            
            # Rate limiting
            if batch_number < total_batches:
                await asyncio.sleep(2)
        
        return {
            "processed_assets": self.total_processed,
            "total_added_records": self.total_added
        }
