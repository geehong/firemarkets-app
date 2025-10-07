# backend_temp/app/api/v1/endpoints/assets.py
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy import func, extract
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
import logging

from ....core.database import get_postgres_db
from ....core.cache import invalidate_asset_types_cache, invalidate_assets_cache
from ....core.database_optimization import get_asset_types_optimized, get_assets_optimized, get_ohlcv_data_optimized
from ....models import OHLCVData, Asset
from ....schemas.asset import (
    AssetsListResponse, AssetTypesResponse, MarketCapsResponse, AssetDetailResponse,
    OHLCVResponse, StockProfileResponse, StockFinancialsResponse, StockEstimatesResponse,
    IndexInfoResponse, ETFInfoResponse, ETFSectorExposureResponse, ETFHoldingsResponse,
    CryptoMetricsResponse, TechnicalIndicatorsResponse, PriceResponse,
    TreemapLiveResponse, TreemapLiveItem
)
from ....schemas.common import TickerSummaryResponse

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/asset-types", response_model=AssetTypesResponse)
def get_asset_types(
    db: Session = Depends(get_postgres_db),
    has_data: bool = Query(False, description="데이터가 있는 자산 유형만 필터링합니다."),
    include_description: bool = Query(True, description="description 필드 포함 여부")
):
    """모든 자산 유형 목록 조회"""
    try:
        from ....models import AssetType, Asset, OHLCVData
        from sqlalchemy.sql import exists
        
        query = db.query(AssetType)
        
        if has_data:
            # --- 성능 개선: EXISTS 서브쿼리 사용 ---
            # Asset과 OHLCVData에 데이터가 존재하는지 확인하는 서브쿼리 생성
            has_data_subquery = db.query(Asset.asset_id)\
                .join(OHLCVData, OHLCVData.asset_id == Asset.asset_id)\
                .filter(Asset.asset_type_id == AssetType.asset_type_id)\
                .exists()
            
            # 메인 쿼리에서는 서브쿼리의 결과가 '존재하는' AssetType만 필터링
            query = query.filter(has_data_subquery)
        
        asset_types = query.all()
        
        # SQLAlchemy 모델을 Pydantic 스키마로 변환
        asset_type_responses = []
        for asset_type in asset_types:
            asset_type_dict = {
                'asset_type_id': asset_type.asset_type_id,
                'type_name': asset_type.type_name,
                'created_at': asset_type.created_at,
                'updated_at': asset_type.updated_at,
            }
            
            # description이 필요한 경우에만 포함
            if include_description:
                asset_type_dict['description'] = asset_type.description
            
            asset_type_responses.append(asset_type_dict)
        
        return AssetTypesResponse(data=asset_type_responses)
    except Exception as e:
        # 오류 발생 시 더 자세한 로그를 남기는 것이 좋습니다.
        import logging
        logging.exception("Failed to get asset types")
        raise HTTPException(status_code=500, detail=f"Failed to get asset types: {str(e)}")

@router.get("/assets", response_model=AssetsListResponse)
def get_all_assets(
    type_name: Optional[str] = Query(None, description="필터링할 자산 유형 이름"),
    has_ohlcv_data: bool = Query(False, description="OHLCV 데이터가 있는 자산만 필터링합니다."),
    limit: int = Query(1000, ge=1, description="페이지당 자산 개수"),
    offset: int = Query(0, ge=0, description="데이터 시작 오프셋"),
    db: Session = Depends(get_postgres_db)
):
    """모든 자산 목록 조회"""
    try:
        from ....models import Asset, AssetType, OHLCVData
        base_query = db.query(Asset, AssetType.type_name) \
                       .join(AssetType, Asset.asset_type_id == AssetType.asset_type_id)

        if has_ohlcv_data:
            base_query = base_query.filter(
                db.query(OHLCVData).filter(OHLCVData.asset_id == Asset.asset_id).exists()
            )

        if type_name:
            base_query = base_query.filter(AssetType.type_name == type_name)

        total_count = base_query.count()
        assets_with_type = base_query.offset(offset).limit(limit).all()
        
        result_data = []
        for asset, type_name in assets_with_type:
            # collection_settings에서 개별 필드들을 추출
            collection_settings = asset.collection_settings or {}
            
            asset_dict = {
                'asset_id': asset.asset_id,
                'ticker': asset.ticker,
                'asset_type_id': asset.asset_type_id,
                'name': asset.name,
                'exchange': asset.exchange,
                'currency': asset.currency,
                'is_active': asset.is_active,
                'description': asset.description,
                'data_source': asset.data_source,
                'created_at': asset.created_at,
                'updated_at': asset.updated_at,
                'type_name': type_name,
                # collection_settings에서 개별 필드들을 추출
                'collect_price': collection_settings.get('collect_price', True),
                'collect_assets_info': collection_settings.get('collect_assets_info', True),
                'collect_financials': collection_settings.get('collect_financials', True),
                'collect_estimates': collection_settings.get('collect_estimates', True),
                'collect_onchain': collection_settings.get('collect_onchain', False),
                'collect_technical_indicators': collection_settings.get('collect_technical_indicators', False),
                # 전체 collection_settings도 포함
                'collection_settings': collection_settings,
            }
            result_data.append(asset_dict)
        
        return {"data": result_data, "total_count": total_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get assets: {str(e)}")

@router.get("/assets-lists", response_model=AssetsListResponse)
def get_all_assets_pg(
    type_name: Optional[str] = Query(None, description="필터링할 자산 유형 이름"),
    has_ohlcv_data: bool = Query(True, description="OHLCV 데이터가 있는 자산만 필터링합니다."),
    limit: int = Query(1000, ge=1, description="페이지당 자산 개수"),
    offset: int = Query(0, ge=0, description="데이터 시작 오프셋"),
    db: Session = Depends(get_postgres_db)
):
    """모든 자산 목록 조회 (PostgreSQL 전용)"""
    try:
        from ....models import Asset, AssetType, OHLCVData
        base_query = db.query(Asset, AssetType.type_name) \
                       .join(AssetType, Asset.asset_type_id == AssetType.asset_type_id)

        if has_ohlcv_data:
            base_query = base_query.filter(
                db.query(OHLCVData).filter(OHLCVData.asset_id == Asset.asset_id).exists()
            )

        if type_name:
            base_query = base_query.filter(AssetType.type_name == type_name)

        total_count = base_query.count()
        assets_with_type = base_query.offset(offset).limit(limit).all()
        
        result_data = []
        for asset, type_name in assets_with_type:
            collection_settings = asset.collection_settings or {}
            asset_dict = {
                'asset_id': asset.asset_id,
                'ticker': asset.ticker,
                'asset_type_id': asset.asset_type_id,
                'name': asset.name,
                'exchange': asset.exchange,
                'currency': asset.currency,
                'is_active': asset.is_active,
                'description': asset.description,
                'data_source': asset.data_source,
                'created_at': asset.created_at,
                'updated_at': asset.updated_at,
                'type_name': type_name,
                'collect_price': collection_settings.get('collect_price', True),
                'collect_assets_info': collection_settings.get('collect_assets_info', True),
                'collect_financials': collection_settings.get('collect_financials', True),
                'collect_estimates': collection_settings.get('collect_estimates', True),
                'collect_onchain': collection_settings.get('collect_onchain', False),
                'collect_technical_indicators': collection_settings.get('collect_technical_indicators', False),
                'collection_settings': collection_settings,
            }
            result_data.append(asset_dict)
        
        return {"data": result_data, "total_count": total_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get assets (pg): {str(e)}")

@router.get("/market-caps", response_model=MarketCapsResponse)
def get_assets_market_caps(
    type_name: Optional[str] = Query(None, description="필터링할 자산 유형 이름"),
    has_ohlcv_data: bool = Query(True, description="OHLCV 데이터가 있는 자산만 필터링합니다."),
    has_asset_data: bool = Query(True, description="데이터베이스에 자산이 있는 것만 필터링합니다."),
    limit: int = Query(100, ge=1, description="페이지당 자산 개수"),  # 기본값을 100으로 줄임
    offset: int = Query(0, ge=0, description="데이터 시작 오프셋"),
    db: Session = Depends(get_postgres_db)
):
    """모든 자산의 최신 market_cap 데이터 조회 (TreeMap용) - 자산 유형별 다른 데이터 소스 사용"""
    try:
        from ....models import Asset, AssetType, OHLCVData, StockFinancial, WorldAssetsRanking
        from sqlalchemy import func, or_
        
        # has_asset_data 옵션에 따라 쿼리 분기
        if has_asset_data:
            # assets 테이블에서 조회
            base_query = db.query(Asset, AssetType.type_name) \
                           .join(AssetType, Asset.asset_type_id == AssetType.asset_type_id)

            if has_ohlcv_data:
                base_query = base_query.filter(
                    db.query(OHLCVData).filter(OHLCVData.asset_id == Asset.asset_id).exists()
                )

            if type_name:
                base_query = base_query.filter(AssetType.type_name == type_name)

            total_count = base_query.count()
            assets_with_type = base_query.offset(offset).limit(limit).all()
            
            result_data = []
            for asset, type_name in assets_with_type:
                market_cap = None
                snapshot_date = None
                
                # 자산 유형별로 다른 데이터 소스에서 시가총액 조회
                if type_name.lower() == 'stocks':
                    # 주식: stock_financials + world_assets_ranking 중 최신 데이터
                    latest_financial = db.query(StockFinancial) \
                                        .filter(StockFinancial.asset_id == asset.asset_id) \
                                        .order_by(StockFinancial.snapshot_date.desc()) \
                                        .first()
                    
                    latest_world_asset = db.query(WorldAssetsRanking) \
                                          .filter(
                                              WorldAssetsRanking.asset_id == asset.asset_id,
                                              WorldAssetsRanking.market_cap_usd.isnot(None)
                                          ) \
                                          .order_by(WorldAssetsRanking.ranking_date.desc()) \
                                          .first()
                    
                    # 최신 데이터 선택 (날짜 기준)
                    if latest_financial and latest_world_asset:
                        if latest_financial.snapshot_date >= latest_world_asset.ranking_date:
                            market_cap = float(latest_financial.market_cap) if latest_financial.market_cap else None
                            snapshot_date = latest_financial.snapshot_date
                        else:
                            market_cap = float(latest_world_asset.market_cap_usd)
                            snapshot_date = latest_world_asset.ranking_date
                    elif latest_financial:
                        market_cap = float(latest_financial.market_cap) if latest_financial.market_cap else None
                        snapshot_date = latest_financial.snapshot_date
                    elif latest_world_asset:
                        market_cap = float(latest_world_asset.market_cap_usd)
                        snapshot_date = latest_world_asset.ranking_date
                        
                elif type_name.lower() in ['crypto', 'cryptocurrency']:
                    # 암호화폐: world_assets_ranking에서 조회 (crypto_data는 별도 구현 필요시 추가)
                    latest_world_asset = db.query(WorldAssetsRanking) \
                                          .filter(
                                              WorldAssetsRanking.asset_id == asset.asset_id,
                                              WorldAssetsRanking.market_cap_usd.isnot(None)
                                          ) \
                                          .order_by(WorldAssetsRanking.ranking_date.desc()) \
                                          .first()
                    
                    if latest_world_asset:
                        market_cap = float(latest_world_asset.market_cap_usd)
                        snapshot_date = latest_world_asset.ranking_date
                        
                else:
                    # 기타 자산 (ETF, 원자재 등): world_assets_ranking에서 조회
                    latest_world_asset = db.query(WorldAssetsRanking) \
                                          .filter(
                                              WorldAssetsRanking.asset_id == asset.asset_id,
                                              WorldAssetsRanking.market_cap_usd.isnot(None)
                                          ) \
                                          .order_by(WorldAssetsRanking.ranking_date.desc()) \
                                          .first()
                    
                    if latest_world_asset:
                        market_cap = float(latest_world_asset.market_cap_usd)
                        snapshot_date = latest_world_asset.ranking_date
                
                # 최신 OHLCV 데이터에서 현재 가격 가져오기
                latest_ohlcv = get_latest_ohlcv(db, asset.asset_id)
                
                # 30일 전 OHLCV 데이터 가져오기 (성능 계산용)
                thirty_days_ago = datetime.now() - timedelta(days=30)
                thirty_days_ago_ohlcv = db.query(OHLCVData) \
                                         .filter(
                                             OHLCVData.asset_id == asset.asset_id,
                                             OHLCVData.data_interval.is_(None),
                                             OHLCVData.timestamp_utc >= thirty_days_ago
                                         ) \
                                         .order_by(OHLCVData.timestamp_utc.asc()) \
                                         .first()
                
                # 성능 계산
                performance = 0
                if latest_ohlcv and thirty_days_ago_ohlcv:
                    current_price = float(latest_ohlcv.close_price)
                    thirty_days_price = float(thirty_days_ago_ohlcv.close_price)
                    if thirty_days_price > 0:
                        performance = ((current_price - thirty_days_price) / thirty_days_price) * 100
                
                # world_assets_ranking에서 daily_change_percent 가져오기 (다중 소스 검증)
                daily_change_percent = None
                
                # 1단계: 동일 날짜에서 모든 데이터 소스 확인
                today_world_assets = db.query(WorldAssetsRanking) \
                                     .filter(
                                         WorldAssetsRanking.asset_id == asset.asset_id,
                                         WorldAssetsRanking.ranking_date == func.current_date()
                                     ) \
                                     .all()
                
                # 2단계: 각 데이터 소스에서 daily_change_percent 확인
                for world_asset in today_world_assets:
                    if world_asset.daily_change_percent is not None:
                        daily_change_percent = float(world_asset.daily_change_percent)
                        break  # 첫 번째 유효한 값을 찾으면 중단
                
                # 3단계: 모든 소스에서 daily_change_percent가 null이면 이전일 데이터와 비교
                if daily_change_percent is None and today_world_assets:
                    # 오늘 가격 가져오기
                    today_price = None
                    for world_asset in today_world_assets:
                        if world_asset.price_usd is not None:
                            today_price = float(world_asset.price_usd)
                            break
                    
                    if today_price is not None:
                        # 이전일 데이터 조회 (최근 7일 내)
                        yesterday_asset = db.query(WorldAssetsRanking) \
                                           .filter(
                                               WorldAssetsRanking.asset_id == asset.asset_id,
                                               WorldAssetsRanking.ranking_date < func.current_date(),
                                               WorldAssetsRanking.price_usd.isnot(None)
                                           ) \
                                           .order_by(WorldAssetsRanking.ranking_date.desc()) \
                                           .first()
                        
                        if yesterday_asset and yesterday_asset.price_usd is not None:
                            yesterday_price = float(yesterday_asset.price_usd)
                            if yesterday_price > 0:
                                # 일일 변화율 계산
                                daily_change_percent = ((today_price - yesterday_price) / yesterday_price) * 100
                                logger.info(f"Calculated daily_change_percent for {asset.ticker}: {daily_change_percent:.2f}% (today: {today_price}, yesterday: {yesterday_price})")
                
                # 4단계: 그래도 null이면 해당 자산은 패스 (None 유지)

                # world_assets_ranking에서 price_usd 가져오기
                price_usd = None
                if type_name.lower() == 'stocks':
                    # 주식의 경우 world_assets_ranking에서 price_usd 조회
                    latest_world_asset = db.query(WorldAssetsRanking) \
                                          .filter(
                                              WorldAssetsRanking.asset_id == asset.asset_id,
                                          ) \
                                          .order_by(WorldAssetsRanking.ranking_date.desc()) \
                                          .first()
                    if latest_world_asset:
                        price_usd = float(latest_world_asset.price_usd)
                elif type_name.lower() in ['crypto', 'cryptocurrency']:
                    # 암호화폐의 경우 world_assets_ranking에서 price_usd 조회
                    latest_world_asset = db.query(WorldAssetsRanking) \
                                          .filter(
                                              WorldAssetsRanking.asset_id == asset.asset_id,
                                          ) \
                                          .order_by(WorldAssetsRanking.ranking_date.desc()) \
                                          .first()
                    if latest_world_asset:
                        price_usd = float(latest_world_asset.price_usd)
                else:
                    # 기타 자산의 경우 world_assets_ranking에서 price_usd 조회
                    latest_world_asset = db.query(WorldAssetsRanking) \
                                          .filter(
                                              WorldAssetsRanking.asset_id == asset.asset_id,
                                          ) \
                                          .order_by(WorldAssetsRanking.ranking_date.desc()) \
                                          .first()
                    if latest_world_asset:
                        price_usd = float(latest_world_asset.price_usd)

                asset_dict = {
                    'asset_id': asset.asset_id,
                    'ticker': asset.ticker,
                    'name': asset.name,
                    'type_name': type_name,
                    'exchange': asset.exchange,
                    'currency': asset.currency,
                    'current_price': float(latest_ohlcv.close_price) if latest_ohlcv else price_usd,  # OHLCV가 없으면 world_assets_ranking의 price_usd 사용
                    'price': price_usd,  # world_assets_ranking에서 가져온 가격
                    'market_cap': market_cap,
                    'performance': performance,
                    'volume': float(latest_ohlcv.volume) if latest_ohlcv else 0,
                    'change_percent_24h': float(latest_ohlcv.change_percent) if latest_ohlcv and latest_ohlcv.change_percent else 0,
                    'daily_change_percent': daily_change_percent,  # world_assets_ranking에서 가져온 일일 변화율
                    'snapshot_date': snapshot_date,
                }
                result_data.append(asset_dict)
        else:
            # world_assets_ranking 테이블에서 직접 조회
            # 오늘 날짜의 특정 데이터 소스들만 조회
            today = datetime.now().date()
            target_data_sources = ['8marketcap_companies', '8marketcap_cryptos', '8marketcap_etfs', '8marketcap_metals']
            
            base_query = db.query(WorldAssetsRanking, AssetType.type_name) \
                           .join(AssetType, WorldAssetsRanking.asset_type_id == AssetType.asset_type_id) \
                           .filter(
                               WorldAssetsRanking.market_cap_usd.isnot(None),
                               WorldAssetsRanking.asset_id.isnot(None),  # asset_id가 None이 아닌 것만
                               WorldAssetsRanking.ranking_date == today,  # 오늘 날짜만
                               WorldAssetsRanking.data_source.in_(target_data_sources)  # 특정 데이터 소스만
                           )

            if type_name:
                base_query = base_query.filter(AssetType.type_name == type_name)

            total_count = base_query.count()
            
            # limit이 1000 이상이면 모든 데이터를 가져옴 (중복 제거를 위해)
            if limit >= 1000:
                world_assets = base_query.all()
            else:
                world_assets = base_query.offset(offset).limit(limit).all()
            
            # 중복 제거: 동일한 ticker에 대해 하나만 선택 (우선순위: companies > cryptos > etfs > metals)
            seen_tickers = set()
            unique_assets = []
            data_source_priority = {'8marketcap_companies': 1, '8marketcap_cryptos': 2, '8marketcap_etfs': 3, '8marketcap_metals': 4}
            
            for world_asset, type_name in world_assets:
                if world_asset.ticker not in seen_tickers:
                    seen_tickers.add(world_asset.ticker)
                    unique_assets.append((world_asset, type_name))
                else:
                    # 이미 있는 ticker인 경우, 우선순위가 높은 데이터 소스로 교체
                    for i, (existing_asset, existing_type) in enumerate(unique_assets):
                        if existing_asset.ticker == world_asset.ticker:
                            current_priority = data_source_priority.get(world_asset.data_source, 5)
                            existing_priority = data_source_priority.get(existing_asset.data_source, 5)
                            if current_priority < existing_priority:
                                unique_assets[i] = (world_asset, type_name)
                            break
            
            result_data = []
            for world_asset, type_name in unique_assets:
                # OHLCV 데이터 조회 (has_ohlcv_data 옵션 적용)
                latest_ohlcv = None
                if has_ohlcv_data:
                    latest_ohlcv = get_latest_ohlcv(db, world_asset.asset_id)
                    if not latest_ohlcv:
                        continue  # OHLCV 데이터가 없으면 스킵
                else:
                    latest_ohlcv = get_latest_ohlcv(db, world_asset.asset_id)
                
                # 30일 전 OHLCV 데이터 가져오기 (성능 계산용)
                thirty_days_ago = datetime.now() - timedelta(days=30)
                thirty_days_ago_ohlcv = db.query(OHLCVData) \
                                         .filter(
                                             OHLCVData.asset_id == world_asset.asset_id,
                                             OHLCVData.data_interval.is_(None),
                                             OHLCVData.timestamp_utc >= thirty_days_ago
                                         ) \
                                         .order_by(OHLCVData.timestamp_utc.asc()) \
                                         .first()
                
                # 성능 계산
                performance = 0
                if latest_ohlcv and thirty_days_ago_ohlcv:
                    current_price = float(latest_ohlcv.close_price)
                    thirty_days_price = float(thirty_days_ago_ohlcv.close_price)
                    if thirty_days_price > 0:
                        performance = ((current_price - thirty_days_price) / thirty_days_price) * 100
                
                # daily_change_percent 처리 (다중 소스 검증)
                daily_change_percent = world_asset.daily_change_percent
                
                # 1단계: 현재 데이터의 daily_change_percent가 null이면 다른 소스 확인
                if daily_change_percent is None:
                    # 동일 날짜의 다른 데이터 소스 확인 (특정 데이터 소스들만)
                    other_sources = db.query(WorldAssetsRanking) \
                                    .filter(
                                        WorldAssetsRanking.ticker == world_asset.ticker,
                                        WorldAssetsRanking.ranking_date == world_asset.ranking_date,
                                        WorldAssetsRanking.daily_change_percent.isnot(None),
                                        WorldAssetsRanking.data_source.in_(target_data_sources)
                                    ) \
                                    .all()
                    
                    for other_source in other_sources:
                        if other_source.daily_change_percent is not None:
                            daily_change_percent = float(other_source.daily_change_percent)
                            break
                
                # 2단계: 그래도 null이면 이전일 데이터와 비교
                if daily_change_percent is None and world_asset.price_usd is not None:
                    today_price = float(world_asset.price_usd)
                    
                    # 이전일 데이터 조회 (최근 7일 내, 특정 데이터 소스들만)
                    yesterday_asset = db.query(WorldAssetsRanking) \
                                       .filter(
                                           WorldAssetsRanking.ticker == world_asset.ticker,
                                           WorldAssetsRanking.ranking_date < world_asset.ranking_date,
                                           WorldAssetsRanking.price_usd.isnot(None),
                                           WorldAssetsRanking.data_source.in_(target_data_sources)
                                       ) \
                                       .order_by(WorldAssetsRanking.ranking_date.desc()) \
                                       .first()
                    
                    if yesterday_asset and yesterday_asset.price_usd is not None:
                        yesterday_price = float(yesterday_asset.price_usd)
                        if yesterday_price > 0:
                            # 일일 변화율 계산
                            daily_change_percent = ((today_price - yesterday_price) / yesterday_price) * 100
                            logger.info(f"Calculated daily_change_percent for {world_asset.ticker}: {daily_change_percent:.2f}% (today: {today_price}, yesterday: {yesterday_price})")
                
                # 3단계: 그래도 null이면 None 유지 (해당 자산은 패스)
                
                asset_dict = {
                    'asset_id': world_asset.asset_id,
                    'ticker': world_asset.ticker,
                    'name': world_asset.name,
                    'type_name': type_name,
                    'exchange': None,  # world_assets_ranking에는 exchange 정보 없음
                    'currency': 'USD',  # world_assets_ranking은 USD 기준
                    'current_price': float(latest_ohlcv.close_price) if latest_ohlcv else (float(world_asset.price_usd) if world_asset.price_usd is not None else None),  # OHLCV가 없으면 world_assets_ranking의 price_usd 사용
                    'price': float(world_asset.price_usd) if world_asset.price_usd is not None else None,  # world_assets_ranking에서 직접 가져온 가격
                    'market_cap': float(world_asset.market_cap_usd),
                    'performance': performance,
                    'volume': float(latest_ohlcv.volume) if latest_ohlcv else 0,
                    'change_percent_24h': float(latest_ohlcv.change_percent) if latest_ohlcv and latest_ohlcv.change_percent else 0,
                    'daily_change_percent': float(daily_change_percent) if daily_change_percent is not None else None,  # 계산된 일일 변화율
                    'snapshot_date': world_asset.ranking_date,
                }
                result_data.append(asset_dict)
        
        return {
            "data": result_data, 
            "total_count": total_count,
            "summary": {
                "total_market_cap": sum(item['market_cap'] or 0 for item in result_data),
                "avg_performance": sum(item['performance'] for item in result_data) / len(result_data) if result_data else 0,
                "assets_with_market_cap": len([item for item in result_data if item['market_cap'] is not None])
            }
        }
    except Exception as e:
        logger.error(f"Error fetching market caps: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get market caps: {str(e)}")

@router.get("/{asset_identifier}", response_model=AssetDetailResponse)
def get_asset_detail(
    asset_identifier: str = Path(..., description="Asset ID (integer) or Ticker (string)"),
    db: Session = Depends(get_postgres_db)
):
    """단일 자산 상세 정보 조회 (실시간 가격 정보 포함)"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        from ....models import Asset, AssetType, OHLCVData
        asset_with_type = db.query(Asset, AssetType.type_name) \
                            .join(AssetType, Asset.asset_type_id == AssetType.asset_type_id) \
                            .filter(Asset.asset_id == asset_id) \
                            .first()

        if not asset_with_type:
            raise HTTPException(status_code=404, detail="Asset not found")

        asset, type_name = asset_with_type
        asset_dict = asset.__dict__
        asset_dict['type_name'] = type_name

        # 최신 OHLCV 데이터로 실시간 가격 정보 추가
        latest_ohlcv = get_latest_ohlcv(db, asset_id)
        if latest_ohlcv:
            asset_dict['current_price'] = latest_ohlcv.close_price
            asset_dict['change_percent_24h'] = latest_ohlcv.change_percent
            asset_dict['volume_24h'] = latest_ohlcv.volume
            
            # 최근 30일 OHLCV 데이터 (위젯 차트용)
            thirty_days_ago = datetime.now() - timedelta(days=30)
            recent_ohlcv = db_get_ohlcv_data(db, asset_id, thirty_days_ago.date(), None, "1d")
            asset_dict['last_month_ohlcv'] = [
                {
                    'timestamp_utc': ohlcv.timestamp_utc,
                    'close_price': ohlcv.close_price
                }
                for ohlcv in recent_ohlcv[:30]  # 최대 30개
            ]
        else:
            asset_dict['current_price'] = None
            asset_dict['change_percent_24h'] = None
            asset_dict['volume_24h'] = None
            asset_dict['last_month_ohlcv'] = []

        return asset_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get asset detail: {str(e)}")

@router.get("/ohlcv/{asset_identifier}", response_model=OHLCVResponse)
def get_ohlcv_data(
    asset_identifier: str = Path(..., description="Asset ID (integer) or Ticker (string)"),
    data_interval: str = Query("1d", description="데이터 간격 (예: 1d, 1h, 1W는 주별 마지막 거래일, 1M은 월별 마지막 거래일 데이터)"),
    start_date: Optional[date] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    limit: int = Query(50000, ge=1, le=100000, description="최대 데이터 포인트 수"),
    db: Session = Depends(get_postgres_db)
):
    """OHLCV 데이터 조회 (차트용)"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        
        # 동적 인터벌 추론 헬퍼 (DB 값을 변경하지 않고 응답에만 적용)
        def infer_interval(ts: datetime, existing: Optional[str]) -> str:
            if existing:
                return existing
            try:
                from calendar import monthrange
                last_day = monthrange(ts.year, ts.month)[1]
                if ts.day == last_day:
                    return '1M'
                # 금요일(weekday=4)을 주의 마감으로 간주
                if ts.weekday() == 4:
                    return '1W'
            except Exception:
                pass
            return '1d'
        
        # data_interval에 따른 쿼리 처리
        if data_interval.upper() == '1M':
            # 월봉 데이터 (data_interval에 '1M'이 포함된 데이터)
            query = db.query(OHLCVData).filter(
                OHLCVData.asset_id == asset_id,
                OHLCVData.data_interval.like('%1M%')
            )
            if start_date:
                query = query.filter(OHLCVData.timestamp_utc >= start_date)
            if end_date:
                query = query.filter(OHLCVData.timestamp_utc <= end_date)
            tagged_monthlies = query.order_by(OHLCVData.timestamp_utc.asc()).all()

            # 유효한 조회 범위 계산 (파라미터가 없으면 최근 12개월 기준)
            if start_date is None and end_date is None:
                from calendar import monthrange
                today = date.today()
                range_end = today
                # 12개월 전의 같은 달 1일
                range_start = (date(today.year - 1, today.month, 1))
            else:
                range_start = start_date or date(1970, 1, 1)
                range_end = end_date or date.today()

            # 기대 월 수 추정 (최소 6, 최대 24로 가드)
            expected_months = max(6, min(24, (range_end.year - range_start.year) * 12 + (range_end.month - range_start.month) + 1))

            # 태그만으로 부족하면 일봉을 월 단위로 집계하여 보완 (start_date가 있어도 적용)
            if len(tagged_monthlies) >= min(expected_months, limit or expected_months):
                ohlcv_data = tagged_monthlies[:limit] if limit else tagged_monthlies
            else:
                daily_rows = db_get_ohlcv_data(db, asset_id, range_start, range_end, '1d', 200000)
                from collections import defaultdict
                buckets = defaultdict(list)
                for r in daily_rows:
                    ym = (r.timestamp_utc.year, r.timestamp_utc.month)
                    buckets[ym].append(r)

                aggregated = []
                for (y, m) in sorted(buckets.keys()):
                    rows = sorted(buckets[(y, m)], key=lambda x: x.timestamp_utc)
                    if not rows:
                        continue
                    first = rows[0]
                    last = rows[-1]
                    open_p = float(first.open_price) if first.open_price is not None else None
                    close_p = float(last.close_price) if last.close_price is not None else None
                    highs = [float(x.high_price) for x in rows if x.high_price is not None]
                    lows = [float(x.low_price) for x in rows if x.low_price is not None]
                    high_p = max(highs) if highs else None
                    low_p = min(lows) if lows else None
                    vol_sum = sum(float(x.volume) for x in rows if x.volume is not None)

                    class _Candle:
                        pass
                    c = _Candle()
                    c.timestamp_utc = last.timestamp_utc
                    c.open_price = open_p
                    c.high_price = high_p
                    c.low_price = low_p
                    c.close_price = close_p
                    c.volume = vol_sum
                    c.change_percent = None
                    c.data_interval = '1M'
                    aggregated.append(c)

                aggregated = sorted(aggregated, key=lambda x: x.timestamp_utc)
                if limit:
                    aggregated = aggregated[-limit:]
                ohlcv_data = aggregated
            
        elif data_interval.upper() == '1W':
            # 주봉 데이터 (data_interval에 '1W'가 포함된 데이터)
            query = db.query(OHLCVData).filter(
                OHLCVData.asset_id == asset_id,
                OHLCVData.data_interval.like('%1W%')
            )
            if start_date:
                query = query.filter(OHLCVData.timestamp_utc >= start_date)
            if end_date:
                query = query.filter(OHLCVData.timestamp_utc <= end_date)
            tagged_weeklies = query.order_by(OHLCVData.timestamp_utc.asc()).all()

            # 조회 범위 계산
            if start_date is None and end_date is None:
                today = date.today()
                # 최근 52주 범위
                range_end = today
                range_start = today - timedelta(days=365)
            else:
                range_start = start_date or date(1970, 1, 1)
                range_end = end_date or date.today()

            # 기대 주 수 추정
            expected_weeks = max(12, min(104, int((range_end - range_start).days / 7) + 1))

            if len(tagged_weeklies) >= min(expected_weeks, limit or expected_weeks):
                ohlcv_data = tagged_weeklies[:limit] if limit else tagged_weeklies
            else:
                # 일봉을 주 단위로 집계 (ISO 주 기준)
                daily_rows = db_get_ohlcv_data(db, asset_id, range_start, range_end, '1d', 200000)
                from collections import defaultdict
                buckets = defaultdict(list)
                for r in daily_rows:
                    iso = r.timestamp_utc.isocalendar()
                    key = (iso[0], iso[1])  # (ISO year, ISO week)
                    buckets[key].append(r)

                aggregated = []
                for key in sorted(buckets.keys()):
                    rows = sorted(buckets[key], key=lambda x: x.timestamp_utc)
                    if not rows:
                        continue
                    first = rows[0]
                    last = rows[-1]
                    open_p = float(first.open_price) if first.open_price is not None else None
                    close_p = float(last.close_price) if last.close_price is not None else None
                    highs = [float(x.high_price) for x in rows if x.high_price is not None]
                    lows = [float(x.low_price) for x in rows if x.low_price is not None]
                    high_p = max(highs) if highs else None
                    low_p = min(lows) if lows else None
                    vol_sum = sum(float(x.volume) for x in rows if x.volume is not None)

                    class _Candle:
                        pass
                    c = _Candle()
                    c.timestamp_utc = last.timestamp_utc
                    c.open_price = open_p
                    c.high_price = high_p
                    c.low_price = low_p
                    c.close_price = close_p
                    c.volume = vol_sum
                    c.change_percent = None
                    c.data_interval = '1W'
                    aggregated.append(c)

                aggregated = sorted(aggregated, key=lambda x: x.timestamp_utc)
                if limit:
                    aggregated = aggregated[-limit:]
                ohlcv_data = aggregated
            
        else:
            # 일반적인 간격 데이터 (일봉 등)
            ohlcv_data = db_get_ohlcv_data(db, asset_id, start_date, end_date, data_interval, limit)
        
        # SQLAlchemy 모델을 Pydantic 스키마로 변환
        ohlcv_data_points = []
        for ohlcv in ohlcv_data:
            ohlcv_dict = {
                'timestamp_utc': ohlcv.timestamp_utc,
                'open_price': float(ohlcv.open_price) if ohlcv.open_price else None,
                'high_price': float(ohlcv.high_price) if ohlcv.high_price else None,
                'low_price': float(ohlcv.low_price) if ohlcv.low_price else None,
                'close_price': float(ohlcv.close_price) if ohlcv.close_price else None,
                'volume': float(ohlcv.volume) if ohlcv.volume else None,
                'change_percent': float(ohlcv.change_percent) if ohlcv.change_percent else None,
                'data_interval': infer_interval(ohlcv.timestamp_utc, ohlcv.data_interval or '1d'),
            }
            ohlcv_data_points.append(ohlcv_dict)
        
        # Asset 정보 가져오기
        asset = get_asset_by_ticker(db, asset_identifier) if not asset_identifier.isdigit() else db.query(Asset).filter(Asset.asset_id == int(asset_identifier)).first()
        
        return {
            "asset_id": asset.asset_id,
            "ticker": asset.ticker,
            "data_interval": data_interval,
            "data": ohlcv_data_points,
            "total_count": len(ohlcv_data_points)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get OHLCV data: {str(e)}")


@router.get("/price/{asset_identifier}", response_model=PriceResponse)
def get_price_data(
    asset_identifier: str = Path(..., description="Asset ID (integer) or Ticker (string)"),
    data_interval: str = Query("1d", description="데이터 간격 (예: 1d, 1h, 4h)"),
    start_date: Optional[date] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    limit: int = Query(1000, ge=1, le=10000, description="최대 데이터 포인트 수"),
    db: Session = Depends(get_postgres_db)
):
    """가격 데이터만 반환 (OHLCV 대신 최적화된 API)"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        logger.info(f"Resolved asset_id: {asset_id} for identifier: {asset_identifier}")

        # 필요한 컬럼만 조회 (성능 최적화)
        if data_interval == '1d':
            # 일봉 데이터 - 모든 데이터 조회 (주말/월말 포함)
            query = db.query(
                OHLCVData.timestamp_utc,
                OHLCVData.close_price,
                OHLCVData.change_percent
            ).filter(
                OHLCVData.asset_id == asset_id
                # data_interval 필터링 제거 - 모든 일봉 데이터 조회
            )
        elif data_interval.upper() == '1M':
            # 월봉 데이터
            query = db.query(
                OHLCVData.timestamp_utc,
                OHLCVData.close_price,
                OHLCVData.change_percent
            ).filter(
                OHLCVData.asset_id == asset_id,
                OHLCVData.data_interval.like('%1M%')
            )
        elif data_interval.upper() == '1W':
            # 주봉 데이터
            query = db.query(
                OHLCVData.timestamp_utc,
                OHLCVData.close_price,
                OHLCVData.change_percent
            ).filter(
                OHLCVData.asset_id == asset_id,
                OHLCVData.data_interval.like('%1W%')
            )
        else:
            # 다른 간격 데이터 (4h, 1h 등)
            query = db.query(
                OHLCVData.timestamp_utc,
                OHLCVData.close_price,
                OHLCVData.change_percent
            ).filter(
                OHLCVData.asset_id == asset_id,
                OHLCVData.data_interval == data_interval
            )

        if start_date:
            query = query.filter(OHLCVData.timestamp_utc >= start_date)
        if end_date:
            query = query.filter(OHLCVData.timestamp_utc <= end_date)

        data = query.order_by(OHLCVData.timestamp_utc.desc()).limit(limit).all()
        logger.info(f"Found {len(data)} price records for asset_id: {asset_id}")

        # Asset 정보 가져오기
        asset = get_asset_by_ticker(db, asset_identifier) if not asset_identifier.isdigit() else db.query(Asset).filter(Asset.asset_id == int(asset_identifier)).first()
        
        if not asset:
            raise HTTPException(status_code=404, detail=f"Asset not found: {asset_identifier}")

        return {
            "asset_id": asset_id,
            "ticker": asset.ticker,
            "data": [
                {
                    "date": item.timestamp_utc.strftime("%Y-%m-%d"),
                    "value": float(item.close_price) if item.close_price else None,
                    "change_percent": float(item.change_percent) if item.change_percent else None
                }
                for item in data
            ],
            "total_count": len(data)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting price data for {asset_identifier}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get price data: {str(e)}")


@router.get("/stock-profile/asset/{asset_identifier}", response_model=StockProfileResponse)
def get_stock_profile_for_asset(
    asset_identifier: str = Path(..., description="Asset ID (integer) or Ticker (string)"),
    db: Session = Depends(get_postgres_db)
):
    """자산의 회사 프로필 정보 조회"""
    try:
        logger.debug(f"[stock-profile] resolve start asset_identifier={asset_identifier}")
        print(f"[stock-profile] resolve start asset_identifier={asset_identifier}")
        asset_id = resolve_asset_identifier(db, asset_identifier)
        logger.debug(f"[stock-profile] resolved asset_id={asset_id}")
        print(f"[stock-profile] resolved asset_id={asset_id}")
        profile = get_stock_profile(db, asset_id)
        logger.debug(f"[stock-profile] raw profile={profile}")
        print(f"[stock-profile] raw profile={profile}")
        if not profile:
            raise HTTPException(status_code=404, detail="Stock profile not found")
        return profile
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[stock-profile] error for asset_identifier={asset_identifier}")
        print(f"[stock-profile] exception: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stock profile: {str(e)}")

@router.get("/stock-financials/asset/{asset_identifier}", response_model=StockFinancialsResponse)
def get_stock_financials_for_asset(
    asset_identifier: str = Path(..., description="Asset ID (integer) or Ticker (string)"),
    limit: int = Query(10, ge=1, le=100, description="조회할 데이터 개수"),
    db: Session = Depends(get_postgres_db)
):
    """자산의 재무 정보 조회"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        financials = get_stock_financials(db, asset_id, limit)
        return financials
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stock financials: {str(e)}")

@router.get("/stock-estimates/asset/{asset_identifier}", response_model=StockEstimatesResponse)
def get_stock_estimates_for_asset(
    asset_identifier: str = Path(..., description="Asset ID (integer) or Ticker (string)"),
    limit: int = Query(10, ge=1, le=100, description="조회할 데이터 개수"),
    db: Session = Depends(get_postgres_db)
):
    """자산의 애널리스트 예측 정보 조회"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        estimates = get_stock_estimates(db, asset_id, limit)
        return estimates
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stock estimates: {str(e)}")

@router.get("/index-info/asset/{asset_identifier}", response_model=IndexInfoResponse)
def get_index_info_for_asset(
    asset_identifier: str = Path(..., description="Asset ID (integer) or Ticker (string)"),
    limit: int = Query(10, ge=1, le=100, description="조회할 데이터 개수"),
    db: Session = Depends(get_postgres_db)
):
    """자산의 지수 정보 조회"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        index_info = get_index_info(db, asset_id, limit)
        return index_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get index info: {str(e)}")

@router.get("/etf-info/asset/{asset_identifier}", response_model=ETFInfoResponse)
def get_etf_info_for_asset(
    asset_identifier: str = Path(..., description="Asset ID (integer) or Ticker (string)"),
    db: Session = Depends(get_postgres_db)
):
    """자산의 ETF 정보 조회"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        etf_info = get_etf_info(db, asset_id)
        if not etf_info:
            raise HTTPException(status_code=404, detail="ETF info not found")
        return etf_info
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get ETF info: {str(e)}")

@router.get("/etf-sector-exposure/{etf_info_id}", response_model=ETFSectorExposureResponse)
def get_etf_sector_exposure(
    etf_info_id: int = Path(..., description="ETF Info ID"),
    db: Session = Depends(get_postgres_db)
):
    """ETF 섹터 노출도 조회"""
    try:
        from ....models.asset import ETFInfo
        etf_info = db.query(ETFInfo).filter(
            ETFInfo.etf_info_id == etf_info_id
        ).first()
        
        if not etf_info or not etf_info.sectors:
            return {"data": []}
        
        # JSON 컬럼에서 섹터 데이터 추출
        exposures_data = []
        for sector in etf_info.sectors:
            exposure_dict = {
                'sector': sector.get('sector', ''),
                'weight': sector.get('weight', 0.0),
                'updated_at': etf_info.updated_at
            }
            exposures_data.append(exposure_dict)
        
        # weight 기준으로 정렬
        exposures_data.sort(key=lambda x: x['weight'], reverse=True)
        
        return {
            'etf_info_id': etf_info_id,
            'data': exposures_data,
            'total_count': len(exposures_data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get ETF sector exposure: {str(e)}")

@router.get("/etf-holdings/{etf_info_id}", response_model=ETFHoldingsResponse)
def get_etf_holdings(
    etf_info_id: int = Path(..., description="ETF Info ID"),
    limit: int = Query(50, ge=1, le=200, description="조회할 보유 종목 개수"),
    db: Session = Depends(get_postgres_db)
):
    """ETF 보유 종목 조회"""
    try:
        from ....models.asset import ETFInfo
        etf_info = db.query(ETFInfo).filter(
            ETFInfo.etf_info_id == etf_info_id
        ).first()
        
        if not etf_info or not etf_info.holdings:
            return {"data": []}
        
        # JSON 컬럼에서 보유 종목 데이터 추출
        holdings_data = []
        for holding in etf_info.holdings:
            holding_dict = {
                'ticker': holding.get('symbol', ''),
                'name': holding.get('description', ''),
                'weight': holding.get('weight', 0.0),
                'shares': None,  # DB에 없음
                'market_value': None,  # DB에 없음
                'updated_at': etf_info.updated_at,
            }
            holdings_data.append(holding_dict)
        
        # weight 기준으로 정렬하고 limit 적용
        holdings_data.sort(key=lambda x: x['weight'], reverse=True)
        holdings_data = holdings_data[:limit]
        
        return {
            'etf_info_id': etf_info_id,
            'data': holdings_data,
            'total_count': len(holdings_data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get ETF holdings: {str(e)}")

@router.get("/crypto-metrics/asset/{asset_identifier}", response_model=CryptoMetricsResponse)
def get_crypto_metrics_for_asset(
    asset_identifier: str = Path(..., description="Asset ID (integer) or Ticker (string)"),
    db: Session = Depends(get_postgres_db)
):
    """암호화폐 메트릭 정보 조회"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        from ....models.asset import CryptoData, Asset
        
        # asset_id로 자산 정보 조회
        asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
        
        # CryptoData에서 시장 데이터 조회
        crypto_data = db.query(CryptoData).filter(CryptoData.asset_id == asset_id).first()
        
        if not crypto_data:
            raise HTTPException(status_code=404, detail=f"Crypto data not found for {asset_identifier}")
        
        # 24시간 가격 변화 계산 (OHLCV 데이터에서)
        from ....models import OHLCVData
        from datetime import datetime, timedelta
        
        # 24시간 전 데이터 조회
        yesterday = datetime.now() - timedelta(days=1)
        old_ohlcv = db.query(OHLCVData).filter(
            OHLCVData.asset_id == asset_id,
            OHLCVData.data_interval.is_(None),
            OHLCVData.timestamp_utc <= yesterday
        ).order_by(OHLCVData.timestamp_utc.desc()).first()
        
        # 최신 데이터 조회
        latest_ohlcv = db.query(OHLCVData).filter(
            OHLCVData.asset_id == asset_id,
            OHLCVData.data_interval.is_(None)
        ).order_by(OHLCVData.timestamp_utc.desc()).first()
        
        # 24시간 가격 변화 계산
        price_change_24h = None
        price_change_percent_24h = None
        if old_ohlcv and latest_ohlcv and old_ohlcv.close_price and latest_ohlcv.close_price:
            old_price = float(old_ohlcv.close_price)
            current_price = float(latest_ohlcv.close_price)
            price_change_24h = current_price - old_price
            if old_price > 0:
                price_change_percent_24h = (price_change_24h / old_price) * 100
        
        return {
            'asset_id': asset_id,
            'ticker': asset.ticker if asset else None,
            'market_cap': float(crypto_data.market_cap) if crypto_data.market_cap else None,
            'circulating_supply': float(crypto_data.circulating_supply) if crypto_data.circulating_supply else None,
            'total_supply': float(crypto_data.total_supply) if crypto_data.total_supply else None,
            'max_supply': float(crypto_data.max_supply) if crypto_data.max_supply else None,
            'volume_24h': float(crypto_data.volume_24h) if crypto_data.volume_24h else None,
            'price_change_24h': price_change_24h,
            'price_change_percent_24h': price_change_percent_24h,
            'updated_at': crypto_data.last_updated,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get crypto metrics: {str(e)}")

@router.get("/technical-indicators/asset/{asset_identifier}", response_model=TechnicalIndicatorsResponse)
  # 10분 캐시 (기술적 지표는 자주 변경되지 않음)
def get_technical_indicators_for_asset(
    asset_identifier: str = Path(..., description="Asset ID (integer) or Ticker (string)"),
    indicator_type: Optional[str] = Query(None, description="Filter by indicator type (e.g., SMA, EMA)"),
    data_interval: str = Query("1d", description="Data interval (e.g., 1d, 1h)"),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_postgres_db)
):
    """기술적 지표 데이터 조회"""
    try:
        asset_id = resolve_asset_identifier(db, asset_identifier)
        # TODO: 실제 기술적 지표 계산 로직 구현
        # 현재는 빈 응답 반환
        return TechnicalIndicatorsResponse(data=[])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get technical indicators: {str(e)}")

@router.get("/widgets/ticker-summary", response_model=TickerSummaryResponse)
def get_ticker_summary(
    tickers: str = Query(..., description="쉼표로 구분된 티커 목록"),
    db: Session = Depends(get_postgres_db)
):
    """대시보드 위젯용 티커 요약 데이터 조회"""
    try:
        ticker_list = [ticker.strip() for ticker in tickers.split(',') if ticker.strip()]
        if not ticker_list:
            raise HTTPException(status_code=400, detail="At least one ticker is required")
        
        result_data = []
        for ticker in ticker_list:
            try:
                # 자산 정보 조회
                asset = db.query(Asset).filter(Asset.ticker == ticker).first()
                if not asset:
                    result_data.append({
                        'ticker': ticker,
                        'name': f'{ticker} (Not Found)',
                        'current_price': None,
                        'change_percent_7m': None,
                        'monthly_prices_7m': [None] * 7,
                        'error': True
                    })
                    continue
                
                # 최신 OHLCV 데이터 조회
                latest_ohlcv = db.query(OHLCVData).filter(
                    OHLCVData.asset_id == asset.asset_id,
                    OHLCVData.data_interval.is_(None)
                ).order_by(OHLCVData.timestamp_utc.desc()).first()
                
                if not latest_ohlcv:
                    result_data.append({
                        'ticker': ticker,
                        'name': asset.name,
                        'current_price': None,
                        'change_percent_7m': None,
                        'monthly_prices_7m': [None] * 7,
                        'error': True
                    })
                    continue
                
                # 7개월 전 데이터 조회
                seven_months_ago = datetime.now() - timedelta(days=210)
                old_ohlcv = db.query(OHLCVData).filter(
                    OHLCVData.asset_id == asset.asset_id,
                    OHLCVData.data_interval.is_(None),
                    OHLCVData.timestamp_utc <= seven_months_ago
                ).order_by(OHLCVData.timestamp_utc.desc()).first()
                
                # 7개월 변화율 계산
                change_percent_7m = None
                if old_ohlcv and latest_ohlcv.close_price and old_ohlcv.close_price:
                    old_price = float(old_ohlcv.close_price)
                    current_price = float(latest_ohlcv.close_price)
                    if old_price > 0:
                        change_percent_7m = ((current_price - old_price) / old_price) * 100
                
                # 최적화: 한 번의 쿼리로 7개월 데이터 조회
                seven_months_ago = datetime.now() - timedelta(days=210)
                monthly_data = db.query(OHLCVData).filter(
                    OHLCVData.asset_id == asset.asset_id,
                    OHLCVData.data_interval.is_(None),
                    OHLCVData.timestamp_utc >= seven_months_ago
                ).order_by(OHLCVData.timestamp_utc.desc()).all()
                
                # 월별 데이터 그룹화
                monthly_prices = [None] * 7
                for i in range(7):
                    month_start = datetime.now() - timedelta(days=30 * (i + 1))
                    month_end = datetime.now() - timedelta(days=30 * i)
                    
                    # 해당 월의 데이터 찾기
                    month_data = next(
                        (data for data in monthly_data 
                         if month_start <= data.timestamp_utc <= month_end), 
                        None
                    )
                    
                    if month_data and month_data.close_price:
                        monthly_prices[i] = float(month_data.close_price)
                
                # 결과 데이터 구성
                result_data.append({
                    'ticker': ticker,
                    'name': asset.name,
                    'current_price': float(latest_ohlcv.close_price) if latest_ohlcv.close_price else None,
                    'change_percent_7m': change_percent_7m,
                    'monthly_prices_7m': monthly_prices[::-1],  # 최신 순서로 정렬
                    'error': False
                })
                
            except Exception as e:
                logger.error(f"Error processing ticker {ticker}: {str(e)}")
                result_data.append({
                    'ticker': ticker,
                    'name': f'{ticker} (Error)',
                    'current_price': None,
                    'change_percent_7m': None,
                    'monthly_prices_7m': [None] * 7,
                    'error': True
                })
        
        return TickerSummaryResponse(data=result_data)
        
    except Exception as e:
        logger.error(f"Error in get_ticker_summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get ticker summary: {str(e)}")

# Helper functions
def get_latest_ohlcv(db: Session, asset_id: int):
    """최신 OHLCV 데이터 조회 (일봉 데이터)"""
    return db.query(OHLCVData).filter(
        OHLCVData.asset_id == asset_id
        # data_interval 필터링 제거 - 모든 일봉 데이터 조회
    ).order_by(OHLCVData.timestamp_utc.desc()).first()

def db_get_ohlcv_data(db: Session, asset_id: int, start_date: Optional[date], end_date: Optional[date], data_interval: str, limit: int = 50000):
    """OHLCV 데이터 조회 (데이터베이스 함수)"""
    from sqlalchemy import or_
    # 일봉 데이터 - 모든 데이터 조회 (주말/월말 포함)
    if data_interval == '1d':
        query = db.query(OHLCVData).filter(
            OHLCVData.asset_id == asset_id,
            or_(OHLCVData.data_interval == '1d', OHLCVData.data_interval.is_(None))
        )
    else:
        # 다른 간격 데이터 (4h, 1h 등)
        query = db.query(OHLCVData).filter(
            OHLCVData.asset_id == asset_id,
            OHLCVData.data_interval == data_interval
        )
    
    if start_date:
        query = query.filter(OHLCVData.timestamp_utc >= start_date)
    if end_date:
        query = query.filter(OHLCVData.timestamp_utc <= end_date)
    
    return query.order_by(OHLCVData.timestamp_utc.desc()).limit(limit).all()

def get_stock_profile(db: Session, asset_id: int):
    """주식 프로필 조회"""
    from ....models import StockProfile
    # 명시적으로 필요한 컬럼만 선택하여 legacy 'description' 컬럼 참조를 회피
    profile_row = db.query(
        StockProfile.profile_id,
        StockProfile.asset_id,
        StockProfile.company_name,
        StockProfile.sector,
        StockProfile.industry,
        StockProfile.description_en,
        StockProfile.description_ko,
        StockProfile.website,
        StockProfile.employees_count,
        StockProfile.country,
        StockProfile.city,
        StockProfile.address,
        StockProfile.phone,
        StockProfile.ceo,
        StockProfile.ipo_date,
        StockProfile.logo_image_url,
        StockProfile.updated_at,
    ).filter(StockProfile.asset_id == asset_id).first()
    
    if not profile_row:
        return None
    
    # SQLAlchemy 모델을 딕셔너리로 변환
    profile_dict = {
        'profile_id': profile_row.profile_id,
        'asset_id': profile_row.asset_id,
        'company_name': profile_row.company_name,
        'sector': profile_row.sector,
        'industry': profile_row.industry,
        # Prefer English description; fallback to Korean; else None
        'description': getattr(profile_row, 'description_en', None) or getattr(profile_row, 'description_ko', None),
        'website': profile_row.website,
        'employees_count': profile_row.employees_count,
        'country': profile_row.country,
        'city': profile_row.city,
        'address': profile_row.address,
        'phone': profile_row.phone,
        'ceo': profile_row.ceo,
        'ipo_date': profile_row.ipo_date,
        'logo_image_url': profile_row.logo_image_url,
        'updated_at': profile_row.updated_at,
    }
    logger.debug(f"[stock-profile] profile_dict={profile_dict}")
    print(f"[stock-profile] profile_dict={profile_dict}")
    return profile_dict


# ============================================================================
# Treemap Live View Endpoint
# ============================================================================

TREEMAP_VIEW_SQL = """
CREATE OR REPLACE VIEW treemap_live_view AS
SELECT
    a.asset_id,
    a.ticker,
    a.name,
    at.type_name AS asset_type,
    COALESCE(war.market_cap_usd, ohlcv_daily.market_cap_usd, ohlcv_intraday.market_cap_usd) AS market_cap,
    COALESCE(sp.logo_image_url, cd.logo_url) AS logo_url,
    COALESCE(
        CASE WHEN war.last_updated > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour' THEN war.price_usd END,
        CASE WHEN rq.timestamp_utc > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour' THEN rq.price END,
        war.price_usd,
        rq.price,
        ohlcv_daily.close_price,
        ohlcv_intraday.close_price
    ) AS current_price,
    COALESCE(
        CASE WHEN war.last_updated > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour' THEN war.daily_change_percent END,
        CASE WHEN rq.timestamp_utc > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour' THEN rq.change_percent END,
        war.daily_change_percent,
        rq.change_percent,
        ohlcv_daily.change_percent,
        ohlcv_intraday.change_percent
    ) AS price_change_percentage_24h,
    CASE
        WHEN war.last_updated IS NOT NULL AND war.last_updated > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour' THEN 'WORLD_ASSETS'
        WHEN rq.timestamp_utc IS NOT NULL AND rq.timestamp_utc > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour' THEN 'REALTIME'
        WHEN ohlcv_daily.timestamp_utc IS NOT NULL AND ohlcv_daily.timestamp_utc > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour' THEN 'DAILY_DATA'
        WHEN ohlcv_intraday.timestamp_utc IS NOT NULL AND ohlcv_intraday.timestamp_utc > (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour' THEN 'INTRADAY_DATA'
        WHEN at.type_name = 'Crypto' THEN 'STATIC_24H'
        ELSE 'STATIC_CLOSED'
    END AS market_status,
    rq.timestamp_utc AS realtime_updated_at,
    ohlcv_daily.timestamp_utc AS daily_data_updated_at
FROM assets a
JOIN asset_types at ON a.asset_type_id = at.asset_id
LEFT JOIN LATERAL (
    SELECT r.timestamp_utc, r.price, r.change_percent
    FROM realtime_quotes r
    WHERE r.asset_id = a.asset_id
    ORDER BY r.timestamp_utc DESC
    LIMIT 1
) rq ON true
LEFT JOIN LATERAL (
    SELECT w.market_cap_usd, w.price_usd, w.daily_change_percent, w.last_updated
    FROM world_assets_ranking w
    WHERE w.asset_id = a.asset_id
    ORDER BY w.ranking_date DESC, w.last_updated DESC NULLS LAST
    LIMIT 1
) war ON true
LEFT JOIN LATERAL (
    SELECT o.timestamp_utc, o.close_price, o.change_percent, o.market_cap_usd
    FROM ohlcv_day_data o
    WHERE o.asset_id = a.asset_id
    ORDER BY o.timestamp_utc DESC
    LIMIT 1
) ohlcv_daily ON true
LEFT JOIN LATERAL (
    SELECT o.timestamp_utc, o.close_price, o.change_percent, o.market_cap_usd
    FROM ohlcv_intraday_data o
    WHERE o.asset_id = a.asset_id
    ORDER BY o.timestamp_utc DESC
    LIMIT 1
) ohlcv_intraday ON true
LEFT JOIN stock_profiles sp ON sp.asset_id = a.asset_id
LEFT JOIN crypto_data cd ON cd.asset_id = a.asset_id
WHERE a.is_active = true AND (war.market_cap_usd IS NOT NULL OR ohlcv_daily.close_price IS NOT NULL OR ohlcv_intraday.close_price IS NOT NULL OR rq.price IS NOT NULL);
"""


@router.get("/treemap/live", response_model=TreemapLiveResponse)
def get_treemap_live(
    db: Session = Depends(get_postgres_db)
):
    """트리맵 실시간 뷰 데이터 조회 (뷰 없으면 생성 후 조회)"""
    try:
        # 먼저 조회 시도
        rows = db.execute(text(
            """
            SELECT asset_id, ticker, name, asset_type, market_cap, logo_url,
                   price_change_percentage_24h, current_price,
                   market_status, realtime_updated_at, daily_data_updated_at
            FROM treemap_live_view
            """
        )).fetchall()
    except Exception as e:
        # 뷰가 없거나 스키마 이슈일 수 있으므로 생성 후 1회 재시도
        logger.warning(f"treemap_live_view select failed, creating view. error={e}")
        try:
            db.execute(text(TREEMAP_VIEW_SQL))
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Failed to create treemap_live_view")
            raise HTTPException(status_code=500, detail="Failed to create treemap view")
        # 재조회
        try:
            rows = db.execute(text(
                """
                SELECT asset_id, ticker, name, asset_type, market_cap, logo_url,
                       price_change_percentage_24h, current_price,
                       market_status, realtime_updated_at, daily_data_updated_at
                FROM treemap_live_view
                """
            )).fetchall()
        except Exception as e2:
            logger.exception("treemap_live_view select failed after create")
            raise HTTPException(status_code=500, detail=f"Failed to query treemap view: {str(e2)}")

    items = [
        TreemapLiveItem(
            asset_id=r.asset_id,
            ticker=r.ticker,
            name=r.name,
            asset_type=r.asset_type,
            market_cap=float(r.market_cap) if r.market_cap is not None else None,
            logo_url=r.logo_url,
            price_change_percentage_24h=float(r.price_change_percentage_24h) if r.price_change_percentage_24h is not None else None,
            current_price=float(r.current_price) if r.current_price is not None else None,
            market_status=r.market_status,
            realtime_updated_at=r.realtime_updated_at,
            daily_data_updated_at=r.daily_data_updated_at,
        ) for r in rows
    ]

    return TreemapLiveResponse(data=items, total_count=len(items))

def get_stock_financials(db: Session, asset_id: int, limit: int):
    """주식 재무 정보 조회"""
    from ....models import StockFinancial
    financials = db.query(StockFinancial).filter(
        StockFinancial.asset_id == asset_id
    ).order_by(StockFinancial.snapshot_date.desc()).limit(limit).all()
    
    # SQLAlchemy 모델을 딕셔너리로 변환
    financial_data = []
    for financial in financials:
        financial_dict = {
            'financial_id': financial.financial_id,
            'asset_id': financial.asset_id,
            'snapshot_date': financial.snapshot_date,
            'currency': financial.currency,
            'market_cap': float(financial.market_cap) if financial.market_cap else None,
            'ebitda': float(financial.ebitda) if financial.ebitda else None,
            'shares_outstanding': float(financial.shares_outstanding) if financial.shares_outstanding else None,
            'pe_ratio': float(financial.pe_ratio) if financial.pe_ratio else None,
            'peg_ratio': float(financial.peg_ratio) if financial.peg_ratio else None,
            'beta': float(financial.beta) if financial.beta else None,
            'eps': float(financial.eps) if financial.eps else None,
            'dividend_yield': float(financial.dividend_yield) if financial.dividend_yield else None,
            'dividend_per_share': float(financial.dividend_per_share) if financial.dividend_per_share else None,
            'profit_margin_ttm': float(financial.profit_margin_ttm) if financial.profit_margin_ttm else None,
            'return_on_equity_ttm': float(financial.return_on_equity_ttm) if financial.return_on_equity_ttm else None,
            'revenue_ttm': float(financial.revenue_ttm) if financial.revenue_ttm else None,
            'price_to_book_ratio': float(financial.price_to_book_ratio) if financial.price_to_book_ratio else None,
            'week_52_high': float(financial.week_52_high) if financial.week_52_high else None,
            'week_52_low': float(financial.week_52_low) if financial.week_52_low else None,
            'day_50_moving_avg': float(financial.day_50_moving_avg) if financial.day_50_moving_avg else None,
            'day_200_moving_avg': float(financial.day_200_moving_avg) if financial.day_200_moving_avg else None,
            'updated_at': financial.updated_at,
        }
        financial_data.append(financial_dict)
    
    # asset_id로 자산 정보 조회
    from ....models import Asset
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    
    return {
        "asset_id": asset_id,
        "ticker": asset.ticker if asset else None,
        "data": financial_data,
        "total_count": len(financial_data)
    }

def get_stock_estimates(db: Session, asset_id: int, limit: int):
    """주식 예측 정보 조회"""
    from ....models import StockAnalystEstimate
    estimates = db.query(StockAnalystEstimate).filter(
        StockAnalystEstimate.asset_id == asset_id
    ).order_by(StockAnalystEstimate.fiscal_date.desc()).limit(limit).all()
    
    # SQLAlchemy 모델을 딕셔너리로 변환
    estimate_data = []
    for estimate in estimates:
        estimate_dict = {
            'estimate_id': estimate.estimate_id,
            'asset_id': estimate.asset_id,
            'fiscal_date': estimate.fiscal_date,
            'revenue_avg': float(estimate.revenue_avg) if estimate.revenue_avg else None,
            'revenue_low': float(estimate.revenue_low) if estimate.revenue_low else None,
            'revenue_high': float(estimate.revenue_high) if estimate.revenue_high else None,
            'revenue_analysts_count': estimate.revenue_analysts_count,
            'eps_avg': float(estimate.eps_avg) if estimate.eps_avg else None,
            'eps_low': float(estimate.eps_low) if estimate.eps_low else None,
            'eps_high': float(estimate.eps_high) if estimate.eps_high else None,
            'eps_analysts_count': estimate.eps_analysts_count,
            'ebitda_avg': float(estimate.ebitda_avg) if estimate.ebitda_avg else None,
            'updated_at': estimate.updated_at,
        }
        estimate_data.append(estimate_dict)
    
    # asset_id로 자산 정보 조회
    from ....models import Asset
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    
    return {
        "asset_id": asset_id,
        "ticker": asset.ticker if asset else None,
        "data": estimate_data,
        "total_count": len(estimate_data)
    }

def get_index_info(db: Session, asset_id: int, limit: int):
    """지수 정보 조회"""
    from ....models import IndexInfo
    index_infos = db.query(IndexInfo).filter(
        IndexInfo.asset_id == asset_id
    ).order_by(IndexInfo.snapshot_date.desc()).limit(limit).all()
    
    # SQLAlchemy 모델을 딕셔너리로 변환
    index_data = []
    for index_info in index_infos:
        index_dict = {
            'index_info_id': index_info.index_info_id,
            'asset_id': index_info.asset_id,
            'snapshot_date': index_info.snapshot_date,
            'index_name': index_info.index_name,
            'index_value': float(index_info.index_value) if index_info.index_value else None,
            'change_percent': float(index_info.change_percent) if index_info.change_percent else None,
            'volume': float(index_info.volume) if index_info.volume else None,
            'market_cap': float(index_info.market_cap) if index_info.market_cap else None,
            'pe_ratio': float(index_info.pe_ratio) if index_info.pe_ratio else None,
            'pb_ratio': float(index_info.pb_ratio) if index_info.pb_ratio else None,
            'dividend_yield': float(index_info.dividend_yield) if index_info.dividend_yield else None,
            'created_at': index_info.created_at,
            'updated_at': index_info.updated_at,
        }
        index_data.append(index_dict)
    
    return {"data": index_data}

def get_etf_info(db: Session, asset_id: int):
    """ETF 정보 조회"""
    from ....models.asset import ETFInfo, Asset
    etf_info = db.query(ETFInfo).filter(
        ETFInfo.asset_id == asset_id
    ).order_by(ETFInfo.snapshot_date.desc()).first()
    
    if not etf_info:
        return None
    
    # asset_id로 자산 정보 조회
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    
    # SQLAlchemy 모델을 딕셔너리로 변환 (스키마 필드명에 맞춤)
    etf_info_dict = {
        'etf_info_id': etf_info.etf_info_id,
        'asset_id': etf_info.asset_id,
        'ticker': asset.ticker if asset else None,
        'name': asset.name if asset else None,
        'description': asset.description if asset else None,
        'issuer': None,  # DB에 없음
        'expense_ratio': float(etf_info.net_expense_ratio) if etf_info.net_expense_ratio else None,
        'aum': int(etf_info.net_assets) if etf_info.net_assets else None,
        'inception_date': etf_info.inception_date,
        'category': None,  # DB에 없음
        'asset_class': None,  # DB에 없음
        'updated_at': etf_info.updated_at,
    }
    
    return etf_info_dict

def resolve_asset_identifier(db: Session, asset_identifier: str) -> int:
    """Asset ID 또는 Ticker를 Asset ID로 해석"""
    try:
        # 먼저 정수로 변환 시도 (Asset ID)
        asset_id = int(asset_identifier)
        return asset_id
    except ValueError:
        # 정수가 아니면 Ticker로 처리
        from ....models import Asset
        asset = get_asset_by_ticker(db, asset_identifier)
        if not asset:
            raise HTTPException(status_code=404, detail=f"Asset not found with ticker: {asset_identifier}")
        return asset.asset_id

def get_asset_by_ticker(db: Session, ticker: str):
    """Ticker로 자산 조회"""
    from ....models import Asset
    return db.query(Asset).filter(Asset.ticker == ticker).first()
