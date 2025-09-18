# backend_temp/app/api/v1/endpoints/world_assets.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import time
from typing import List, Dict, Any
from datetime import datetime, date

from ....core.database import get_db
from ....models.asset import WorldAssetsRanking, BondMarketData, AssetType
from ....schemas.asset import (
    CollectionStatus, PerformanceTreemapResponse
)
from ....schemas.common import ReloadResponse
import logging
from ....core.cache import cache_with_invalidation
from ....utils.asset_mapper import update_asset_mappings, get_missing_asset_info

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/world-assets/collection-status", response_model=CollectionStatus)
async def get_world_assets_collection_status(db: Session = Depends(get_db)):
    """
    World Assets 수집 상태 조회
    """
    try:
        from sqlalchemy import func
        from datetime import datetime, timedelta
        # 마지막 수집 시간 조회
        last_collection = db.query(func.max(WorldAssetsRanking.last_updated)).scalar()
        # 다음 수집 시간 계산 (설정에서 간격 가져오기)
        from ....core.config import GLOBAL_APP_CONFIGS
        collection_interval_hours = GLOBAL_APP_CONFIGS.get("WORLD_ASSETS_COLLECTION_INTERVAL_HOURS", 6)
        next_collection = None
        if last_collection:
            next_collection = last_collection + timedelta(hours=collection_interval_hours)
        # 수집 통계
        total_assets = db.query(func.count(WorldAssetsRanking.id)).scalar() or 0
        matched_assets = db.query(func.count(WorldAssetsRanking.id)).filter(
            WorldAssetsRanking.asset_id.isnot(None)
        ).scalar() or 0
        unmatched_assets = total_assets - matched_assets
        failed_assets = 0  # 실제 실패 수집 자산 수를 계산하려면 별도 로직 필요
        # 수집 상태 결정
        status = 'idle'
        if last_collection:
            time_since_last = datetime.now() - last_collection
            if time_since_last.total_seconds() < 3600:  # 1시간 이내
                status = 'completed'
            elif time_since_last.total_seconds() > collection_interval_hours * 3600:
                status = 'overdue'
        # 진행률 계산
        collected_assets = matched_assets
        progress_percentage = (collected_assets / total_assets * 100) if total_assets > 0 else 0.0
        return {
            "status": status,
            "last_run": last_collection,
            "next_run": next_collection,
            "total_assets": total_assets,
            "collected_assets": collected_assets,
            "failed_assets": failed_assets,
            "progress_percentage": progress_percentage
        }
    except Exception as e:
        import traceback
        logger.error(f"수집 상태 조회 중 오류 발생: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"수집 상태 조회 중 오류 발생: {str(e)}")


@router.post("/world-assets/collect-data", response_model=ReloadResponse)
async def collect_world_assets_data(db: Session = Depends(get_db)):
    """
    World Assets 데이터 수집 실행
    """
    try:
        from ....collectors import WorldAssetsCollector
        from ....core.config_manager import ConfigManager
        from ....services.api_strategy_manager import ApiStrategyManager
        from ....utils.redis_queue_manager import RedisQueueManager
        
        # 필요한 매니저들 초기화
        config_manager = ConfigManager()
        api_manager = ApiStrategyManager()
        redis_queue_manager = RedisQueueManager(config_manager)
        
        collector = WorldAssetsCollector(
            db=db,
            config_manager=config_manager,
            api_manager=api_manager,
            redis_queue_manager=redis_queue_manager
        )
        result = await collector.collect_with_settings()
        
        return {
            "success": True,
            "message": "World Assets 데이터 수집이 완료되었습니다.",
            "data": result,
            "timestamp": datetime.now()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"World Assets 데이터 수집 중 오류 발생: {str(e)}")


@router.get("/world-assets/top-assets-by-category")
async def get_top_assets_by_category(
    db: Session = Depends(get_db),
    limit: int = 30
):
    """
    카테고리별 상위 N개 자산 반환 (채권 시장 데이터 포함)
    """
    try:
        logger.info(f"[top-assets-by-category] start, limit={limit}")
        from sqlalchemy import func
        
        # 1. 카테고리별로 그룹화하여 상위 N개 자산 조회
        result = []
        
        # 최신 날짜의 데이터 조회 (오늘 데이터가 없으면 최신 데이터 사용)
        latest_date_query = db.query(func.max(WorldAssetsRanking.ranking_date)).scalar()
        logger.info(f"[top-assets-by-category] latest_ranking_date={latest_date_query}")
        if not latest_date_query:
            latest_date_query = datetime.now().date()
        
        # 카테고리별로 그룹화 (asset_type의 type_name 사용)
        categories_query = db.query(WorldAssetsRanking.asset_type_id).filter(
            WorldAssetsRanking.ranking_date == latest_date_query,
            WorldAssetsRanking.asset_type_id.isnot(None)
        ).distinct().all()
        logger.info(f"[top-assets-by-category] categories_count={len(categories_query)}")
        
        for (asset_type_id,) in categories_query:
            # 해당 카테고리의 상위 N개 자산 조회
            assets = (
                db.query(WorldAssetsRanking)
                .filter(
                    WorldAssetsRanking.ranking_date == latest_date_query,
                    WorldAssetsRanking.asset_type_id == asset_type_id,
                    WorldAssetsRanking.market_cap_usd.isnot(None)
                )
                .order_by(WorldAssetsRanking.market_cap_usd.desc())
                .limit(limit)
                .all()
            )
            
            # 카테고리명 가져오기
            category_name = None
            if asset_type_id:
                asset_type = db.query(AssetType).filter(AssetType.asset_type_id == asset_type_id).first()
                category_name = asset_type.type_name if asset_type else f"Type_{asset_type_id}"
            
            for asset in assets:
                result.append({
                    "category": category_name,
                    "rank": asset.rank,
                    "name": asset.name,
                    "ticker": asset.ticker,
                    "market_cap_usd": float(asset.market_cap_usd or 0),
                    "price_usd": float(asset.price_usd or 0),
                    "daily_change_percent": float(asset.daily_change_percent or 0),
                    "country": asset.country,
                    "asset_type_id": asset.asset_type_id,
                    "asset_id": asset.asset_id,
                    "ranking_date": asset.ranking_date.isoformat() if asset.ranking_date else None,
                    "data_source": asset.data_source,
                    "is_bond": False
                })
        
        # 2. 카테고리가 없는 자산들도 포함 (Unknown 카테고리)
        unknown_assets = (
            db.query(WorldAssetsRanking)
            .filter(
                WorldAssetsRanking.ranking_date == latest_date_query,
                WorldAssetsRanking.asset_type_id.is_(None),
                WorldAssetsRanking.market_cap_usd.isnot(None)
            )
            .order_by(WorldAssetsRanking.market_cap_usd.desc())
            .limit(limit)
            .all()
        )
        
        for asset in unknown_assets:
            result.append({
                "category": "Unknown",
                "rank": asset.rank,
                "name": asset.name,
                "ticker": asset.ticker,
                "market_cap_usd": float(asset.market_cap_usd or 0),
                "price_usd": float(asset.price_usd or 0),
                "daily_change_percent": float(asset.daily_change_percent or 0),
                "country": asset.country,
                "asset_type_id": asset.asset_type_id,
                "asset_id": asset.asset_id,
                "ranking_date": asset.ranking_date.isoformat() if asset.ranking_date else None,
                "data_source": asset.data_source,
                "is_bond": False
            })
        
        # 3. 채권 시장 데이터 추가 (bond_market_data 테이블에서)
        bond_data = db.query(BondMarketData).order_by(BondMarketData.collection_date.desc()).all()
        logger.info(f"[top-assets-by-category] bond_rows={len(bond_data)}")
        
        for bond in bond_data:
            # name을 category로 사용하고, asset_type_id는 이미 설정되어 있음
            result.append({
                "category": bond.name,  # Government Bonds, Corporate Bonds, Global Bond Market
                "rank": 999,  # 채권은 별도 순위
                "name": bond.name,  # name 필드 사용
                "ticker": bond.name.replace(' ', '').upper(),  # 공백 제거하여 티커 생성
                "market_cap_usd": float(bond.market_size_usd or 0),
                "price_usd": 0,  # 채권은 가격 정보 없음
                "daily_change_percent": 0,  # 채권은 일일 변동률 없음
                "country": "Global",
                "asset_type_id": bond.asset_type_id or 6,  # 데이터베이스의 asset_type_id 사용
                "asset_id": None,
                "ranking_date": bond.collection_date.isoformat() if bond.collection_date else None,
                "data_source": bond.data_source,
                "quarter": bond.quarter,
                "is_bond": True
            })
        
        # 카테고리별로 데이터 그룹화
        categories_dict = {}
        for item in result:
            category = item["category"]
            if category not in categories_dict:
                categories_dict[category] = []
            categories_dict[category].append(item)
        logger.info(f"[top-assets-by-category] result_items={len(result)}, categories={len(categories_dict)}")
        
        return {
            "success": True,
            "data": result,
            "total": len(result),
            "limit": limit,
            "categories": categories_dict
        }
        
    except Exception as e:
        import traceback
        logger.error(f"[top-assets-by-category] ERROR: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to get top assets by category: {str(e)}")


@router.get("/world-assets/performance-treemap", response_model=PerformanceTreemapResponse)
@cache_with_invalidation(expire=300)  # 5분 캐시 (성과 데이터는 자주 변경되지 않음)
async def get_performance_treemap_data(
    db: Session = Depends(get_db),
    performance_period: str = Query("1d", description="성과 계산 기간 (1d, 1w, 1m, 3m, 6m, 1y, 2y, 3y, 5y, 10y)"),
    limit: int = Query(100, description="최대 자산 개수")
):
    """
    성과 트리맵용 데이터 반환 (OHLCV 데이터가 있는 자산만) - 최적화된 버전
    """
    start_time = time.time()
    logger.info(f"Performance treemap request started - period: {performance_period}, limit: {limit}")
    
    try:
        from sqlalchemy import func, and_, case, text
        from datetime import datetime, timedelta
        from ....models.asset import Asset, AssetType, OHLCVData
        
        # 1. 최신 ranking_date를 찾기
        latest_ranking_date = (
            db.query(WorldAssetsRanking.ranking_date)
            .order_by(WorldAssetsRanking.ranking_date.desc())
            .first()
        )
        
        if not latest_ranking_date:
            logger.warning("No ranking data found")
            return {
                "success": True,
                "data": [],
                "total": 0,
                "performance_period": performance_period,
                "categories": []
            }
        
        # 2. 성과 계산을 위한 기간 설정
        end_date = datetime.now()
        if performance_period == "1d":
            start_date = end_date - timedelta(days=1)
        elif performance_period == "1w":
            start_date = end_date - timedelta(weeks=1)
        elif performance_period == "1m":
            start_date = end_date - timedelta(days=30)
        elif performance_period == "3m":
            start_date = end_date - timedelta(days=90)
        elif performance_period == "6m":
            start_date = end_date - timedelta(days=180)
        elif performance_period == "1y":
            start_date = end_date - timedelta(days=365)
        elif performance_period == "2y":
            start_date = end_date - timedelta(days=730)
        elif performance_period == "3y":
            start_date = end_date - timedelta(days=1095)
        elif performance_period == "5y":
            start_date = end_date - timedelta(days=1825)
        elif performance_period == "10y":
            start_date = end_date - timedelta(days=3650)
        else:
            start_date = end_date - timedelta(days=1)
        
        # 3. 최적화된 단일 쿼리로 모든 데이터 조회
        # 각 asset_id별로 최고 시가총액을 가진 레코드만 선택하는 서브쿼리
        max_market_cap_subquery = (
            db.query(
                WorldAssetsRanking.asset_id,
                func.max(WorldAssetsRanking.market_cap_usd).label('max_market_cap')
            )
            .filter(
                WorldAssetsRanking.asset_id.isnot(None),
                WorldAssetsRanking.market_cap_usd.isnot(None),
                WorldAssetsRanking.market_cap_usd > 0,
                WorldAssetsRanking.ranking_date == latest_ranking_date[0]
            )
            .group_by(WorldAssetsRanking.asset_id)
            .subquery()
        )
        
        # OHLCV 데이터가 있는 자산만 필터링하는 서브쿼리
        assets_with_ohlcv_subquery = (
            db.query(OHLCVData.asset_id)
            .filter(OHLCVData.data_interval.is_(None))  # 일봉 데이터는 data_interval이 NULL
            .group_by(OHLCVData.asset_id)
            .subquery()
        )
        
        # 메인 쿼리: 모든 필요한 데이터를 한번에 조회
        query = (
            db.query(
                WorldAssetsRanking,
                Asset,
                AssetType.type_name,
                # OHLCV 데이터도 함께 조회
                func.min(OHLCVData.timestamp_utc).label('min_date'),
                func.max(OHLCVData.timestamp_utc).label('max_date'),
                func.count(OHLCVData.ohlcv_id).label('data_points')
            )
            .join(Asset, WorldAssetsRanking.asset_id == Asset.asset_id)
            .join(AssetType, Asset.asset_type_id == AssetType.asset_type_id)
            .join(max_market_cap_subquery, 
                and_(
                    WorldAssetsRanking.asset_id == max_market_cap_subquery.c.asset_id,
                    WorldAssetsRanking.market_cap_usd == max_market_cap_subquery.c.max_market_cap
                )
            )
            .join(assets_with_ohlcv_subquery, 
                WorldAssetsRanking.asset_id == assets_with_ohlcv_subquery.c.asset_id
            )
            .outerjoin(OHLCVData, 
                and_(
                    WorldAssetsRanking.asset_id == OHLCVData.asset_id,
                    OHLCVData.data_interval.is_(None),  # 일봉 데이터는 data_interval이 NULL
                    OHLCVData.timestamp_utc >= start_date,
                    OHLCVData.timestamp_utc <= end_date
                )
            )
            .filter(
                WorldAssetsRanking.ranking_date == latest_ranking_date[0]
            )
            .group_by(
                WorldAssetsRanking.id,
                Asset.asset_id,
                AssetType.type_name
            )
            .order_by(WorldAssetsRanking.market_cap_usd.desc())
            .limit(limit)
        )
        
        assets_data = query.all()
        logger.info(f"Found {len(assets_data)} assets with OHLCV data")
        
        result = []
        
        # 동기 방식으로 성과 계산 처리
        for ranking, asset, type_name, min_date, max_date, data_points in assets_data:
            try:
                # 4. 성과 계산을 위한 OHLCV 데이터 조회 (최적화된 버전)
                if performance_period == "1d":
                    # 1일 성과: 최근 2일 데이터만 조회
                    ohlcv_query = (
                        db.query(OHLCVData)
                        .filter(
                            OHLCVData.asset_id == asset.asset_id,
                            OHLCVData.data_interval.is_(None)  # 일봉 데이터는 data_interval이 NULL
                        )
                        .order_by(OHLCVData.timestamp_utc.desc())
                        .limit(2)
                    )
                else:
                    # 다른 기간: 기간 내 데이터 조회
                    ohlcv_query = (
                        db.query(OHLCVData)
                        .filter(
                            OHLCVData.asset_id == asset.asset_id,
                            OHLCVData.data_interval.is_(None),  # 일봉 데이터는 data_interval이 NULL
                            OHLCVData.timestamp_utc >= start_date,
                            OHLCVData.timestamp_utc <= end_date
                        )
                        .order_by(OHLCVData.timestamp_utc.asc())
                    )
                
                ohlcv_data = ohlcv_query.all()
                
                if len(ohlcv_data) < 2:
                    continue
                
                # 5. 성과 계산
                if performance_period == "1d":
                    # 최신 데이터가 마지막, 이전 데이터가 첫 번째
                    end_price = float(ohlcv_data[0].close_price)
                    start_price = float(ohlcv_data[1].close_price)
                    latest_ohlcv = ohlcv_data[0]
                else:
                    start_price = float(ohlcv_data[0].close_price)
                    end_price = float(ohlcv_data[-1].close_price)
                    latest_ohlcv = ohlcv_data[-1]
                
                performance = ((end_price - start_price) / start_price) * 100 if start_price > 0 else 0
                
                result.append({
                    "asset_id": asset.asset_id,
                    "name": asset.name,
                    "ticker": asset.ticker,
                    "category": type_name,
                    "market_cap_usd": float(ranking.market_cap_usd),
                    "current_price": float(latest_ohlcv.close_price),
                    "performance": performance,
                    "performance_period": performance_period,
                    "volume_24h": float(latest_ohlcv.volume) if latest_ohlcv.volume else 0,
                    "change_percent_24h": float(latest_ohlcv.change_percent) if latest_ohlcv.change_percent else 0,
                    "country": ranking.country,
                    "data_points": len(ohlcv_data),
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                })
            except Exception as e:
                logger.error(f"Error calculating performance for asset {asset.asset_id}: {e}")
                continue
        
        # 카테고리명 추출
        categories = list(set(item["category"] for item in result))
        
        execution_time = time.time() - start_time
        logger.info(f"Performance treemap request completed in {execution_time:.2f} seconds - {len(result)} assets processed")
        
        return {
            "success": True,
            "data": result,
            "total": len(result),
            "performance_period": performance_period,
            "categories": categories,
            "execution_time": execution_time,
            "performance_metric": "percentage_change",
            "last_updated": datetime.now()
        }
        
    except Exception as e:
        execution_time = time.time() - start_time
        logger.error(f"Error getting performance treemap data after {execution_time:.2f}s: {e}")
        raise HTTPException(status_code=500, detail=f"성과 트리맵 데이터 조회 중 오류 발생: {str(e)}")


@router.get("/world-assets/missing-mappings")
async def get_missing_asset_mappings(
    db: Session = Depends(get_db),
    ranking_date: str = None
):
    """
    매핑이 필요한 자산 정보 조회 (나라명, asset_id가 비어있는 자산들)
    """
    try:
        missing_info = get_missing_asset_info(db, ranking_date)
        
        return {
            "success": True,
            "data": missing_info,
            "total": len(missing_info),
            "ranking_date": ranking_date or "latest"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"매핑 정보 조회 중 오류 발생: {str(e)}")


@router.post("/world-assets/update-mappings")
async def update_asset_mappings_endpoint(
    db: Session = Depends(get_db),
    ranking_date: str = None
):
    """
    JSON 매핑 파일을 사용하여 비어있는 나라명과 asset_id 업데이트
    """
    try:
        result = update_asset_mappings(db, ranking_date)
        
        return {
            "success": True,
            "message": "자산 매핑 업데이트가 완료되었습니다.",
            "data": result,
            "timestamp": datetime.now()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"자산 매핑 업데이트 중 오류 발생: {str(e)}")


@router.get("/assets/market-caps/today")
@cache_with_invalidation(expire=10)  # 10초 TTL (시가총액은 자주 변경됨)
async def get_today_market_caps(
    type_name: str = Query(None, description="필터링할 자산 유형 이름"),
    has_asset_id: bool = Query(False, description="asset_id가 있는 자산만 필터링합니다."),
    limit: int = Query(1000, ge=1, description="페이지당 자산 개수"),
    offset: int = Query(0, ge=0, description="데이터 시작 오프셋"),
    db: Session = Depends(get_db)
):
    """오늘 날짜의 world_assets_ranking 데이터만 조회 (TreeMap용) - 중복 제거 및 크기 조정"""
    try:
        from sqlalchemy import func, and_
        from ....models.asset import WorldAssetsRanking, AssetType, OHLCVData
        from datetime import datetime, timedelta
        
        # 오늘 날짜의 특정 데이터 소스들만 조회 (메인 데이터 소스)
        today = datetime.now().date()
        main_data_sources = ['8marketcap_companies', '8marketcap_cryptos', '8marketcap_etfs', '8marketcap_metals']
        fallback_data_sources = ['8marketcap', 'companiesmarketcap']  # daily_change_percent null 처리용
        
        base_query = db.query(WorldAssetsRanking, AssetType.type_name) \
                       .outerjoin(AssetType, WorldAssetsRanking.asset_type_id == AssetType.asset_type_id) \
                       .filter(
                           WorldAssetsRanking.market_cap_usd.isnot(None),
                           WorldAssetsRanking.ranking_date == today,  # 오늘 날짜만
                           WorldAssetsRanking.data_source.in_(main_data_sources)  # 메인 데이터 소스만
                       )

        if type_name:
            base_query = base_query.filter(AssetType.type_name == type_name)
            
        if has_asset_id:
            base_query = base_query.filter(WorldAssetsRanking.asset_id.isnot(None))

        total_count = base_query.count()
        
        # limit이 1000 이상이면 모든 데이터를 가져옴 (중복 제거를 위해)
        if limit >= 1000:
            world_assets = base_query.all()
        else:
            world_assets = base_query.offset(offset).limit(limit).all()
        
        # 중복 제거: 동일한 ticker에 대해 하나만 선택 (우선순위: companies > cryptos > etfs > metals)
        seen_tickers = set()
        unique_assets = []
        data_source_priority = {
            '8marketcap_companies': 1, 
            '8marketcap_cryptos': 2, 
            '8marketcap_etfs': 3, 
            '8marketcap_metals': 4
        }
        
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
            # OHLCV 데이터 조회 (asset_id가 있는 경우만)
            latest_ohlcv = None
            if world_asset.asset_id is not None:
                latest_ohlcv = db.query(OHLCVData) \
                                .filter(
                                    OHLCVData.asset_id == world_asset.asset_id,
                                    OHLCVData.data_interval.is_(None)
                                ) \
                                .order_by(OHLCVData.timestamp_utc.desc()) \
                                .first()
            
            # 30일 전 OHLCV 데이터 가져오기 (성능 계산용, asset_id가 있는 경우만)
            thirty_days_ago_ohlcv = None
            if world_asset.asset_id is not None:
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
                # 동일 날짜의 다른 데이터 소스 확인 (fallback 데이터 소스들 포함)
                all_data_sources = main_data_sources + fallback_data_sources
                other_sources = db.query(WorldAssetsRanking) \
                                .filter(
                                    WorldAssetsRanking.ticker == world_asset.ticker,
                                    WorldAssetsRanking.ranking_date == world_asset.ranking_date,
                                    WorldAssetsRanking.daily_change_percent.isnot(None),
                                    WorldAssetsRanking.data_source.in_(all_data_sources)
                                ) \
                                .all()
                
                for other_source in other_sources:
                    if other_source.daily_change_percent is not None:
                        daily_change_percent = float(other_source.daily_change_percent)
                        break
            
            # 2단계: 그래도 null이면 이전일 데이터와 비교
            if daily_change_percent is None and world_asset.price_usd is not None:
                today_price = float(world_asset.price_usd)
                
                # 이전일 데이터 조회 (최근 7일 내, fallback 데이터 소스들 포함)
                all_data_sources = main_data_sources + fallback_data_sources
                yesterday_asset = db.query(WorldAssetsRanking) \
                                   .filter(
                                       WorldAssetsRanking.ticker == world_asset.ticker,
                                       WorldAssetsRanking.ranking_date < world_asset.ranking_date,
                                       WorldAssetsRanking.price_usd.isnot(None),
                                       WorldAssetsRanking.data_source.in_(all_data_sources)
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
            
            # 주식을 제외한 상품들은 나라명을 "Global"로 설정
            country = world_asset.country
            if type_name and type_name.lower() not in ['stocks', 'stock']:
                country = 'Global'
            
            asset_dict = {
                'asset_id': world_asset.asset_id,
                'ticker': world_asset.ticker,
                'name': world_asset.name,
                'type_name': type_name or 'Unknown',  # type_name이 None인 경우 'Unknown'으로 설정
                'country': country,  # 주식이 아닌 경우 "Global"로 설정
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
        logger.error(f"Error fetching today's market caps: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get today's market caps: {str(e)}")


