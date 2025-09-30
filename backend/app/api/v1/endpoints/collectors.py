# backend_temp/app/api/v1/endpoints/collectors.py
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any
from pydantic import BaseModel

from ....core.database import get_postgres_db
from ....collectors import OHLCVCollector, StockCollector, ETFCollector, WorldAssetsCollector

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/collectors")

class CollectorResponse(BaseModel):
    success: bool
    message: str
    job_id: str = None

class AssetTestRequest(BaseModel):
    asset_id: int
    test_mode: bool = True

def run_collector_async(collector_class, db: Session):
    """비동기로 collector를 실행하는 함수"""
    try:
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        collector = collector_class(db)
        loop.run_until_complete(collector.collect())
        loop.close()
        logger.info(f"{collector_class.__name__} collection completed successfully")
    except Exception as e:
        logger.error(f"Error in {collector_class.__name__} collection: {e}", exc_info=True)

def run_single_asset_test(asset_id: int, db: Session):
    """개별 자산 OHLCV 테스트를 실행하는 함수"""
    try:
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        collector = OHLCVCollector(db)
        loop.run_until_complete(collector._fetch_and_store_ohlcv_for_asset(asset_id))
        loop.close()
        logger.info(f"OHLCV test for asset {asset_id} completed successfully")
    except Exception as e:
        logger.error(f"Error in OHLCV test for asset {asset_id}: {e}", exc_info=True)

@router.post("/ohlcv/run", response_model=CollectorResponse)
async def run_ohlcv_collection(background_tasks: BackgroundTasks, db: Session = Depends(get_postgres_db)):
    """OHLCV 데이터 수집을 수동으로 실행"""
    try:
        background_tasks.add_task(run_collector_async, OHLCVCollector, db)
        return CollectorResponse(
            success=True,
            message="OHLCV collection started in background",
            job_id="ohlcv_collection"
        )
    except Exception as e:
        logger.error(f"Failed to start OHLCV collection: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start OHLCV collection: {str(e)}")

@router.post("/ohlcv/test-asset", response_model=CollectorResponse)
async def test_ohlcv_asset(request: AssetTestRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_postgres_db)):
    """개별 자산 OHLCV 테스트"""
    try:
        # 개별 자산 테스트를 위한 특별한 함수 실행
        background_tasks.add_task(run_single_asset_test, request.asset_id, db)
        return CollectorResponse(
            success=True,
            message=f"OHLCV test for asset {request.asset_id} started in background",
            job_id=f"ohlcv_test_asset_{request.asset_id}"
        )
    except Exception as e:
        logger.error(f"Failed to start OHLCV test for asset {request.asset_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start OHLCV test: {str(e)}")

@router.post("/onchain/run", response_model=CollectorResponse)
async def run_onchain_collection(background_tasks: BackgroundTasks, db: Session = Depends(get_postgres_db)):
    """온체인 컬렉터는 v2 전환 동안 비활성화"""
    raise HTTPException(status_code=503, detail="Onchain collector temporarily disabled during v2 transition")

@router.post("/stock/run", response_model=CollectorResponse)
async def run_stock_collection(background_tasks: BackgroundTasks, db: Session = Depends(get_postgres_db)):
    """주식 데이터 수집을 수동으로 실행"""
    try:
        background_tasks.add_task(run_collector_async, StockCollector, db)
        return CollectorResponse(
            success=True,
            message="Stock collection started in background",
            job_id="stock_collection"
        )
    except Exception as e:
        logger.error(f"Failed to start stock collection: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start stock collection: {str(e)}")

@router.post("/etf/run", response_model=CollectorResponse)
async def run_etf_collection(background_tasks: BackgroundTasks, db: Session = Depends(get_postgres_db)):
    """ETF 데이터 수집을 수동으로 실행"""
    try:
        background_tasks.add_task(run_collector_async, ETFCollector, db)
        return CollectorResponse(
            success=True,
            message="ETF collection started in background",
            job_id="etf_collection"
        )
    except Exception as e:
        logger.error(f"Failed to start ETF collection: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start ETF collection: {str(e)}")

@router.post("/technical/run", response_model=CollectorResponse)
async def run_technical_collection(background_tasks: BackgroundTasks, db: Session = Depends(get_postgres_db)):
    """기술적 지표 컬렉터는 v2 전환 동안 비활성화"""
    raise HTTPException(status_code=503, detail="Technical collector temporarily disabled during v2 transition")

@router.post("/world-assets/run", response_model=CollectorResponse)
async def run_world_assets_collection(background_tasks: BackgroundTasks, db: Session = Depends(get_postgres_db)):
    """세계 자산 데이터 수집을 수동으로 실행"""
    try:
        background_tasks.add_task(run_collector_async, WorldAssetsCollector, db)
        return CollectorResponse(
            success=True,
            message="World assets collection started in background",
            job_id="world_assets_collection"
        )
    except Exception as e:
        logger.error(f"Failed to start world assets collection: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start world assets collection: {str(e)}")

@router.post("/all/run", response_model=CollectorResponse)
async def run_all_collections(background_tasks: BackgroundTasks, db: Session = Depends(get_postgres_db)):
    """모든 데이터 수집을 수동으로 실행"""
    try:
        # 모든 collector를 순차적으로 실행
        collectors = [
            (OHLCVCollector, "OHLCV"),
            (StockCollector, "Stock"),
            (ETFCollector, "ETF"),
            (WorldAssetsCollector, "WorldAssets")
        ]
        
        for collector_class, name in collectors:
            background_tasks.add_task(run_collector_async, collector_class, db)
        
        return CollectorResponse(
            success=True,
            message="All collections started in background",
            job_id="all_collections"
        )
    except Exception as e:
        logger.error(f"Failed to start all collections: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start all collections: {str(e)}") 