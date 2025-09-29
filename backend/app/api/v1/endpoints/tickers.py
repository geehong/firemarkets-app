# backend_temp/app/api/v1/endpoints/tickers.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from sqlalchemy.orm.attributes import flag_modified
import asyncio
import logging
from datetime import datetime

from ....core.database import get_postgres_db
from ....schemas.common import CollectionStatusResponse, CollectionSettingsResponse, LastCollectionsResponse, ReloadResponse
from pydantic import BaseModel
from typing import List, Dict, Any

# 일괄 업데이트를 위한 스키마
class BulkUpdateRequest(BaseModel):
    updates: List[Dict[str, Any]]

# 로깅 설정
logger = logging.getLogger(__name__)

from ....models import Asset

router = APIRouter(prefix="/tickers", tags=["tickers"])

# 수집 작업 상태를 저장할 전역 딕셔너리
collection_tasks = {}

@router.post("/{asset_id}/execute-collection", response_model=ReloadResponse)
async def execute_data_collection(
    asset_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_postgres_db)
):
    """개별 티커의 데이터 수집 실행"""
    
    # 자산 존재 확인 (DB에서 최신 정보 가져오기)
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # 이미 수집 중인지 확인
    if asset_id in collection_tasks and collection_tasks[asset_id].get('running', False):
        raise HTTPException(status_code=400, detail="Collection already in progress for this asset")
    
    # JSON 필드에서 설정값 읽기
    settings = asset.collection_settings or {}

    # 수집 가능한 항목이 있는지 확인
    collectable_items = []
    if settings.get('collect_price', True):
        collectable_items.append("price data")
    if settings.get('collect_assets_info', True):
        collectable_items.append("assets info")
    if settings.get('collect_technical_indicators', False):
        collectable_items.append("technical indicators")
    if settings.get('collect_onchain', False):
        collectable_items.append("onchain data")
    
    if not collectable_items:
        raise HTTPException(
            status_code=400, 
            detail=f"No collection items enabled for {asset.ticker}. Please enable at least one collection setting."
        )
    
    logger.info(f"Starting collection for {asset.ticker} with settings: {collectable_items}")
    
    # 수집 작업 상태 초기화
    collection_tasks[asset_id] = {
        'running': True,
        'started_at': datetime.now(),
        'progress': 0,
        'status': 'starting',
        'message': f'Starting data collection for {asset.ticker}...'
    }
    
    # 백그라운드에서 수집 작업 실행
    background_tasks.add_task(run_individual_collection, asset_id, db)
    
    return {
        "message": f"Data collection started for {asset.ticker}",
        "asset_id": asset_id,
        "ticker": asset.ticker,
        "status": "started",
        "collectable_items": collectable_items
    }

@router.get("/{asset_id}/collection-status", response_model=CollectionStatusResponse)
async def get_collection_status(asset_id: int):
    """수집 상태 확인"""
    
    if asset_id not in collection_tasks:
        return {
            "asset_id": asset_id,
            "running": False,
            "status": "not_started",
            "message": "No collection task found"
        }
    
    task_info = collection_tasks[asset_id]
    return {
        "asset_id": asset_id,
        "running": task_info.get('running', False),
        "status": task_info.get('status', 'unknown'),
        "progress": task_info.get('progress', 0),
        "message": task_info.get('message', ''),
        "started_at": task_info.get('started_at'),
        "completed_at": task_info.get('completed_at')
    }

@router.post("/{asset_id}/stop-collection", response_model=ReloadResponse)
async def stop_data_collection(asset_id: int):
    """수집 중지"""
    
    if asset_id not in collection_tasks:
        raise HTTPException(status_code=404, detail="No collection task found for this asset")
    
    task_info = collection_tasks[asset_id]
    if not task_info.get('running', False):
        raise HTTPException(status_code=400, detail="No collection is currently running")
    
    # 수집 중지
    task_info['running'] = False
    task_info['status'] = 'stopping'
    task_info['message'] = 'Stopping collection...'
    
    return {
        "message": "Collection stop requested",
        "asset_id": asset_id,
        "status": "stopping"
    }

@router.put("/{asset_id}/collection-settings", response_model=CollectionSettingsResponse)
async def update_ticker_collection_settings(
    asset_id: int,
    settings: dict,  # JSON 형태의 설정
    db: Session = Depends(get_postgres_db)
):
    """특정 티커의 수집 설정을 업데이트합니다."""
    try:
        asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        # 기존 설정과 새 설정을 병합
        current_settings = asset.collection_settings or {}
        updated_settings = {**current_settings, **settings}
        
        # 설정 업데이트
        asset.collection_settings = updated_settings
        
        # data_source는 별도 필드로 처리
        if 'data_source' in settings:
            asset.data_source = settings['data_source']

        db.commit()
        db.refresh(asset)
        
        return {
            "asset_id": asset_id,
            "settings": asset.collection_settings or {},
            "updated_at": asset.updated_at
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update ticker collection settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update ticker collection settings: {str(e)}")

@router.put("/bulk-update", response_model=List[CollectionSettingsResponse])
async def bulk_update_ticker_collection_settings(
    request: BulkUpdateRequest,
    db: Session = Depends(get_postgres_db)
):
    """여러 티커의 수집 설정을 일괄 업데이트합니다."""
    try:
        logger.info(f"Bulk update request received with {len(request.updates)} updates")
        
        # 모든 asset_id 추출
        asset_ids = [update_data.get('asset_id') for update_data in request.updates if update_data.get('asset_id')]
        
        if not asset_ids:
            logger.warning("No valid asset_ids found in request")
            return []
        
        logger.info(f"Processing updates for asset_ids: {asset_ids}")
        
        # 한 번의 쿼리로 모든 자산 가져오기
        assets = db.query(Asset).filter(Asset.asset_id.in_(asset_ids)).all()
        asset_dict = {asset.asset_id: asset for asset in assets}
        
        updated_assets = []
        
        for update_data in request.updates:
            asset_id = update_data.get('asset_id')
            if not asset_id or asset_id not in asset_dict:
                logger.warning(f"Asset {asset_id} not found, skipping")
                continue
            
            asset = asset_dict[asset_id]
            
            # asset_id를 제외한 나머지를 설정으로 사용
            settings = {k: v for k, v in update_data.items() if k != 'asset_id'}
            
            # 기존 설정과 새 설정을 병합
            current_settings = asset.collection_settings or {}
            updated_settings = {**current_settings, **settings}
            
            # 설정 업데이트
            asset.collection_settings = updated_settings
            
            # data_source는 별도 필드로 처리
            if 'data_source' in settings:
                asset.data_source = settings['data_source']
            
            updated_assets.append(asset)
            logger.info(f"Updated asset {asset_id} with settings: {settings}")
        
        # 모든 업데이트를 한 번에 커밋
        db.commit()
        logger.info(f"Successfully committed {len(updated_assets)} updates")
        
        # 응답 생성 (새로고침 없이 직접 데이터 사용)
        return [
            {
                "asset_id": asset.asset_id,
                "settings": asset.collection_settings or {},
                "updated_at": asset.updated_at
            }
            for asset in updated_assets
        ]
        
    except Exception as e:
        logger.error(f"Failed to bulk update ticker collection settings: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to bulk update ticker collection settings: {str(e)}")

@router.put("/{asset_id}/last-collections", response_model=LastCollectionsResponse)
async def update_ticker_last_collections(
    asset_id: int,
    last_collections: dict,  # JSON 형태의 마지막 수집 시간
    db: Session = Depends(get_postgres_db)
):
    """특정 티커의 마지막 수집 시간을 업데이트합니다."""
    try:
        asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        # 기존 수집 시간과 새 수집 시간을 병합
        current_collections = asset.last_collections or {}
        updated_collections = {**current_collections, **last_collections}
        
        # 수집 시간 업데이트
        asset.last_collections = updated_collections

        db.commit()
        db.refresh(asset)
        
        return {"message": "Ticker last collections updated successfully", "asset_id": asset_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update ticker last collections: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update ticker last collections: {str(e)}")

async def run_individual_collection(asset_id: int, db: Session):
    """개별 자산의 데이터 수집 실행"""
    
    logger.info(f"Starting individual collection for asset_id: {asset_id}")
    
    try:
        # 자산 정보 가져오기 (AssetType 관계 포함)
        asset = db.query(Asset).options(joinedload(Asset.asset_type)).filter(Asset.asset_id == asset_id).first()
        if not asset:
            logger.error(f"Asset not found for asset_id: {asset_id}")
            collection_tasks[asset_id]['status'] = 'error'
            collection_tasks[asset_id]['message'] = 'Asset not found'
            collection_tasks[asset_id]['running'] = False
            return
        
        logger.info(f"Found asset: {asset.ticker} (ID: {asset_id})")
        collection_tasks[asset_id]['status'] = 'running'
        collection_tasks[asset_id]['message'] = f'Collecting data for {asset.ticker}'
        
        # JSON 필드에서 설정값 읽기
        settings = asset.collection_settings or {}

        import httpx
        
        # 1. 가격 데이터 수집 (모든 자산)
        if settings.get('collect_price', True):
            logger.info(f"Starting price collection for {asset.ticker}")
            collection_tasks[asset_id]['progress'] = 10
            collection_tasks[asset_id]['message'] = f'Collecting price data for {asset.ticker}'
            
            try:
                # 여기에 실제 가격 데이터 수집 로직 구현
                logger.info(f"Price collection completed for {asset.ticker}")
                collection_tasks[asset_id]['progress'] = 30
            except Exception as e:
                logger.error(f"Price collection failed for {asset.ticker}: {str(e)}", exc_info=True)
                collection_tasks[asset_id]['message'] = f'Price collection failed: {str(e)}'
                # 가격 수집 실패는 전체 작업을 중단하지 않음
        
        # 2. 자산 정보 수집 (주식, ETF, 지수 등)
        if settings.get('collect_assets_info', True):
            collection_tasks[asset_id]['progress'] = 50
            collection_tasks[asset_id]['message'] = f'Collecting assets info for {asset.ticker}'
            
            try:
                # 여기에 실제 자산 정보 수집 로직 구현
                logger.info(f"Assets info collection completed for {asset.ticker}")
                collection_tasks[asset_id]['progress'] = 70
            except Exception as e:
                logger.error(f"Assets info collection failed for {asset.ticker}: {str(e)}", exc_info=True)
                collection_tasks[asset_id]['message'] = f'Assets info collection failed: {str(e)}'
        
        # 3. 기술적 지표 수집
        if settings.get('collect_technical_indicators', False):
            collection_tasks[asset_id]['progress'] = 80
            collection_tasks[asset_id]['message'] = f'Collecting technical indicators for {asset.ticker}'
            
            try:
                # 여기에 실제 기술적 지표 수집 로직 구현
                logger.info(f"Technical indicators collection completed for {asset.ticker}")
                collection_tasks[asset_id]['progress'] = 90
            except Exception as e:
                logger.error(f"Technical indicators collection failed for {asset.ticker}: {str(e)}", exc_info=True)
                collection_tasks[asset_id]['message'] = f'Technical indicators collection failed: {str(e)}'
        
        # 4. 온체인 데이터 수집
        if settings.get('collect_onchain', False):
            collection_tasks[asset_id]['progress'] = 95
            collection_tasks[asset_id]['message'] = f'Collecting onchain data for {asset.ticker}'
            
            try:
                # 여기에 실제 온체인 데이터 수집 로직 구현
                logger.info(f"Onchain data collection completed for {asset.ticker}")
                collection_tasks[asset_id]['progress'] = 100
            except Exception as e:
                logger.error(f"Onchain data collection failed for {asset.ticker}: {str(e)}", exc_info=True)
                collection_tasks[asset_id]['message'] = f'Onchain data collection failed: {str(e)}'
        
        # 수집 완료
        collection_tasks[asset_id]['status'] = 'completed'
        collection_tasks[asset_id]['message'] = f'Data collection completed for {asset.ticker}'
        collection_tasks[asset_id]['running'] = False
        collection_tasks[asset_id]['completed_at'] = datetime.now()
        
        logger.info(f"Individual collection completed for {asset.ticker}")
        
    except Exception as e:
        logger.error(f"Individual collection failed for asset_id {asset_id}: {str(e)}", exc_info=True)
        collection_tasks[asset_id]['status'] = 'error'
        collection_tasks[asset_id]['message'] = f'Collection failed: {str(e)}'
        collection_tasks[asset_id]['running'] = False
        collection_tasks[asset_id]['completed_at'] = datetime.now() 