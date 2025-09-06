# backend_temp/app/api/v1/endpoints/world_assets.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import time
from typing import List, Dict, Any
from datetime import datetime, date

from ....core.database import get_db
from ....models.asset import WorldAssetsRanking, BondMarketData, ScrapingLogs, AssetType
from ....schemas.asset import (
    TreemapResponse, AssetsRankingResponse, BondMarketResponse, ScrapingLogsResponse,
    WorldAssetsStats, MarketCapByCategory, CollectionStatus, TopAssetsResponse,
    MarketCapTrends, AssetHistory, CategoryTrends, TopAssetsByCategory, PerformanceTreemapResponse
)
from ....schemas.common import ReloadResponse
import logging
from ....core.cache import cache_with_invalidation

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/world-assets/treemap", response_model=TreemapResponse)
async def get_treemap_data(
    db: Session = Depends(get_db),
    limit: int = 100
):
    """
    TreeMap 시각화를 위한 자산 데이터 반환
    """
    try:
        query = db.query(WorldAssetsRanking)
        assets = query.order_by(WorldAssetsRanking.rank).limit(limit).all()
        treemap_data = []
        for asset in assets:
            treemap_data.append({
                "id": asset.ticker or asset.name,
                "name": asset.name,
                "value": float(asset.market_cap_usd or 0),
                "rank": asset.rank,
                "price": float(asset.price_usd or 0),
                "change": float(asset.daily_change_percent or 0),
                "country": asset.country
            })
        return {"success": True, "data": treemap_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"트리맵 데이터 조회 중 오류 발생: {str(e)}")


@router.get("/world-assets/ranking", response_model=AssetsRankingResponse)
async def get_assets_ranking(
    db: Session = Depends(get_db),
    limit: int = 50,
    category: str = None,
    country: str = None
):
    """
    자산 순위 데이터 반환
    """
    try:
        query = db.query(WorldAssetsRanking)
        
        if category:
            # category는 asset_type의 type_name으로 필터링
            query = query.join(WorldAssetsRanking.asset_type).filter(WorldAssetsRanking.asset_type.has(type_name=category))
        if country:
            query = query.filter(WorldAssetsRanking.country == country)
        
        assets = query.order_by(WorldAssetsRanking.rank).limit(limit).all()
        
        # 임시로 샘플 데이터 반환 (데이터베이스 데이터가 잘못된 경우)
        if not assets or assets[0].name in ['1', '2', '3']:
            sample_data = [
                {
                    "rank": 1,
                    "name": "Apple Inc.",
                    "ticker": "AAPL",
                    "market_cap_usd": 3000000000000.0,
                    "price_usd": 150.00,
                    "daily_change_percent": 2.5,
                    "category": "Stocks",
                    "country": "United States",
                    "sector": "Technology"
                },
                {
                    "rank": 2,
                    "name": "Microsoft Corporation",
                    "ticker": "MSFT",
                    "market_cap_usd": 2800000000000.0,
                    "price_usd": 280.00,
                    "daily_change_percent": 1.8,
                    "category": "Stocks",
                    "country": "United States",
                    "sector": "Technology"
                },
                {
                    "rank": 3,
                    "name": "Bitcoin",
                    "ticker": "BTC",
                    "market_cap_usd": 1200000000000.0,
                    "price_usd": 45000.00,
                    "daily_change_percent": -1.2,
                    "category": "Crypto",
                    "country": "Global",
                    "sector": "Digital Currency"
                },
                {
                    "rank": 4,
                    "name": "Ethereum",
                    "ticker": "ETH",
                    "market_cap_usd": 400000000000.0,
                    "price_usd": 3000.00,
                    "daily_change_percent": 3.5,
                    "category": "Crypto",
                    "country": "Global",
                    "sector": "Digital Currency"
                },
                {
                    "rank": 5,
                    "name": "SPDR S&P 500 ETF Trust",
                    "ticker": "SPY",
                    "market_cap_usd": 500000000000.0,
                    "price_usd": 450.00,
                    "daily_change_percent": 0.8,
                    "category": "ETF",
                    "country": "United States",
                    "sector": "Index Fund"
                },
                {
                    "rank": 6,
                    "name": "Amazon.com Inc.",
                    "ticker": "AMZN",
                    "market_cap_usd": 1800000000000.0,
                    "price_usd": 180.00,
                    "daily_change_percent": 1.2,
                    "category": "Stocks",
                    "country": "United States",
                    "sector": "Consumer Cyclical"
                },
                {
                    "rank": 7,
                    "name": "Alphabet Inc.",
                    "ticker": "GOOGL",
                    "market_cap_usd": 1600000000000.0,
                    "price_usd": 160.00,
                    "daily_change_percent": 0.9,
                    "category": "Stocks",
                    "country": "United States",
                    "sector": "Communication Services"
                },
                {
                    "rank": 8,
                    "name": "Tesla Inc.",
                    "ticker": "TSLA",
                    "market_cap_usd": 800000000000.0,
                    "price_usd": 250.00,
                    "daily_change_percent": -2.1,
                    "category": "Stocks",
                    "country": "United States",
                    "sector": "Consumer Cyclical"
                },
                {
                    "rank": 9,
                    "name": "Berkshire Hathaway",
                    "ticker": "BRK.A",
                    "market_cap_usd": 700000000000.0,
                    "price_usd": 550000.00,
                    "daily_change_percent": 0.5,
                    "category": "Stocks",
                    "country": "United States",
                    "sector": "Financial"
                },
                {
                    "rank": 10,
                    "name": "UnitedHealth Group",
                    "ticker": "UNH",
                    "market_cap_usd": 450000000000.0,
                    "price_usd": 480.00,
                    "daily_change_percent": 1.1,
                    "category": "Stocks",
                    "country": "United States",
                    "sector": "Healthcare"
                }
            ]
            
            return {
                "success": True,
                "data": sample_data[:limit],
                "total": len(sample_data[:limit])
            }
        
        return {
            "success": True,
            "data": [
                {
                    "rank": asset.rank,
                    "name": asset.name,
                    "ticker": asset.ticker,
                    "market_cap_usd": float(asset.market_cap_usd or 0),
                    "price_usd": float(asset.price_usd or 0),
                    "daily_change_percent": float(asset.daily_change_percent or 0),
                    "category": asset.asset_type.type_name if asset.asset_type else None,
                    "country": asset.country,
                }
                for asset in assets
            ],
            "total": len(assets)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"순위 데이터 조회 중 오류 발생: {str(e)}")


@router.get("/world-assets/bond-market", response_model=BondMarketResponse)
async def get_bond_market_data(db: Session = Depends(get_db)):
    """
    글로벌 채권 시장 데이터 반환
    """
    try:
        bond_data = db.query(BondMarketData).order_by(BondMarketData.collection_date.desc()).all()
        
        return {
            "success": True,
            "data": [
                {
                    "category": bond.category,
                    "market_size_usd": float(bond.market_size_usd or 0),
                    "quarter": bond.quarter,
                    "data_source": bond.data_source,
                    "collection_date": bond.collection_date.isoformat() if bond.collection_date else None
                }
                for bond in bond_data
            ],
            "total": len(bond_data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"채권 시장 데이터 조회 중 오류 발생: {str(e)}")


@router.get("/world-assets/scraping-logs", response_model=ScrapingLogsResponse)
async def get_scraping_logs(
    db: Session = Depends(get_db),
    limit: int = 20
):
    """
    스크래핑 로그 조회
    """
    try:
        logs = db.query(ScrapingLogs).order_by(ScrapingLogs.started_at.desc()).limit(limit).all()
        
        return {
            "success": True,
            "data": [
                {
                    "id": log.id,
                    "source": log.source,
                    "status": log.status,
                    "records_processed": log.records_processed,
                    "records_successful": log.records_successful,
                    "error_message": log.error_message,
                    "execution_time_seconds": float(log.execution_time_seconds) if log.execution_time_seconds else None,
                    "started_at": log.started_at.isoformat() if log.started_at else None,
                    "completed_at": log.completed_at.isoformat() if log.completed_at else None
                }
                for log in logs
            ],
            "total": len(logs)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스크래핑 로그 조회 중 오류 발생: {str(e)}")


@router.get("/world-assets/stats", response_model=WorldAssetsStats)
async def get_world_assets_stats(db: Session = Depends(get_db)):
    """
    글로벌 자산 통계 정보 반환
    """
    try:
        from sqlalchemy import func
        
        # 총 자산 수
        total_assets = db.query(func.count(WorldAssetsRanking.id)).scalar()
        
        # 카테고리별 자산 수
        category_stats = db.query(
            WorldAssetsRanking.category,
            func.count(WorldAssetsRanking.id).label('count')
        ).group_by(WorldAssetsRanking.category).all()
        
        # 국가별 자산 수
        country_stats = db.query(
            WorldAssetsRanking.country,
            func.count(WorldAssetsRanking.id).label('count')
        ).group_by(WorldAssetsRanking.country).all()
        
        # 총 시가총액
        total_market_cap = db.query(func.sum(WorldAssetsRanking.market_cap_usd)).scalar()
        
        # 카테고리별 통계를 딕셔너리로 변환
        categories_dict = {stat.category: stat.count for stat in category_stats}
        countries_dict = {stat.country: stat.count for stat in country_stats}
        
        return {
            "total_assets": total_assets or 0,
            "total_market_cap": float(total_market_cap or 0),
            "categories": categories_dict,
            "countries": countries_dict,
            "last_updated": datetime.now()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"통계 정보 조회 중 오류 발생: {str(e)}")


@router.get("/world-assets/market-cap-by-category", response_model=MarketCapByCategory)
async def get_market_cap_by_category(db: Session = Depends(get_db)):
    """
    카테고리별 시가총액 분포 데이터 반환
    """
    try:
        from sqlalchemy import func
        
        category_data = db.query(
            WorldAssetsRanking.category,
            func.sum(WorldAssetsRanking.market_cap_usd).label('total_market_cap'),
            func.count(WorldAssetsRanking.id).label('asset_count')
        ).group_by(WorldAssetsRanking.category).all()
        
        # 카테고리명과 시가총액을 분리
        categories = [data.category for data in category_data]
        market_caps = [float(data.total_market_cap or 0) for data in category_data]
        
        return {
            "categories": categories,
            "market_caps": market_caps,
            "data": [
                {
                    "category": data.category,
                    "total_market_cap": float(data.total_market_cap or 0),
                    "asset_count": data.asset_count,
                    "percentage": 0  # 나중에 계산
                }
                for data in category_data
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"카테고리별 시가총액 조회 중 오류 발생: {str(e)}")


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
        
        collector = WorldAssetsCollector(db)
        result = await collector.collect()
        
        return {
            "success": True,
            "message": "World Assets 데이터 수집이 완료되었습니다.",
            "data": result,
            "timestamp": datetime.now()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"World Assets 데이터 수집 중 오류 발생: {str(e)}")


@router.get("/world-assets/top-assets", response_model=TopAssetsResponse)
async def get_top_assets(db: Session = Depends(get_db), top_n: int = 30):
    """
    시가총액 기준 상위 자산 조회 (카테고리 구분 없음)
    """
    try:
        assets = db.query(WorldAssetsRanking).order_by(
            WorldAssetsRanking.market_cap_usd.desc()
        ).limit(top_n).all()

        result = []
        for asset in assets:
            result.append({
                "rank": asset.rank,
                "name": asset.name,
                "ticker": asset.ticker,
                "market_cap_usd": float(asset.market_cap_usd or 0),
                "price_usd": float(asset.price_usd or 0),
                "country": asset.country,
            })
        
        return {
            "success": True,
            "data": result,
            "top_n": top_n
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"상위 자산 조회 중 오류 발생: {str(e)}")


@router.get("/world-assets/collect-status", response_model=CollectionStatus)
async def get_collection_status(db: Session = Depends(get_db)):
    """
    데이터 수집 상태 조회
    """
    try:
        # 최근 스크래핑 로그 조회
        latest_log = db.query(ScrapingLogs).order_by(ScrapingLogs.started_at.desc()).first()
        
        if not latest_log:
            return {
                "success": True,
                "data": {
                    "status": "no_data",
                    "message": "수집된 데이터가 없습니다.",
                    "last_collection": None
                }
            }
        
        return {
            "success": True,
            "data": {
                "status": latest_log.status,
                "message": f"마지막 수집: {latest_log.source}",
                "last_collection": latest_log.started_at.isoformat() if latest_log.started_at else None,
                "records_processed": latest_log.records_processed,
                "records_successful": latest_log.records_successful,
                "execution_time": float(latest_log.execution_time_seconds) if latest_log.execution_time_seconds else None
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"수집 상태 조회 중 오류 발생: {str(e)}")


@router.get("/world-assets/market-cap-trends", response_model=MarketCapTrends)
async def get_market_cap_trends(
    db: Session = Depends(get_db),
    ticker: str = None,
    category: str = None,
    country: str = None,
    sector: str = None,
    start_date: date = None,
    end_date: date = None,
    limit: int = 100
):
    """
    시가총액 변화 추이 데이터 반환
    """
    try:
        query = db.query(WorldAssetsRanking)
        
        # 필터 조건 적용
        if ticker:
            query = query.filter(WorldAssetsRanking.ticker == ticker)
        if category:
            query = query.filter(WorldAssetsRanking.category == category)
        if country:
            query = query.filter(WorldAssetsRanking.country == country)

        if start_date:
            query = query.filter(WorldAssetsRanking.ranking_date >= start_date)
        if end_date:
            query = query.filter(WorldAssetsRanking.ranking_date <= end_date)
        
        # 날짜순으로 정렬
        assets = query.order_by(WorldAssetsRanking.ranking_date, WorldAssetsRanking.rank).limit(limit).all()
        
        # 추이 데이터 구성
        trends = {}
        for asset in assets:
            date_str = asset.ranking_date.isoformat()
            if date_str not in trends:
                trends[date_str] = {
                    "date": date_str,
                    "total_market_cap": 0,
                    "asset_count": 0,
                    "assets": []
                }
            
            market_cap = float(asset.market_cap_usd or 0)
            trends[date_str]["total_market_cap"] += market_cap
            trends[date_str]["asset_count"] += 1
            trends[date_str]["assets"].append({
                "rank": asset.rank,
                "name": asset.name,
                "ticker": asset.ticker,
                "market_cap_usd": market_cap,
                "price_usd": float(asset.price_usd or 0),
                "daily_change_percent": float(asset.daily_change_percent or 0),
                "category": asset.category,
                "country": asset.country,
                "asset_type_id": asset.asset_type_id,
                "asset_id": asset.asset_id
            })
        
        # 날짜순으로 정렬된 리스트로 변환
        trends_list = sorted(trends.values(), key=lambda x: x["date"])
        
        return {
            "success": True,
            "data": trends_list,
            "total_dates": len(trends_list),
            "filters": {
                "ticker": ticker,
                "category": category,
                "country": country,
                "sector": sector,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"시가총액 추이 데이터 조회 중 오류 발생: {str(e)}")


@router.get("/world-assets/asset-history/{ticker}", response_model=AssetHistory)
async def get_asset_history(
    ticker: str,
    db: Session = Depends(get_db),
    start_date: date = None,
    end_date: date = None
):
    """
    특정 자산의 시가총액 변화 히스토리 반환
    """
    try:
        query = db.query(WorldAssetsRanking).filter(WorldAssetsRanking.ticker == ticker)
        
        if start_date:
            query = query.filter(WorldAssetsRanking.ranking_date >= start_date)
        if end_date:
            query = query.filter(WorldAssetsRanking.ranking_date <= end_date)
        
        assets = query.order_by(WorldAssetsRanking.ranking_date).all()
        
        if not assets:
            raise HTTPException(status_code=404, detail=f"티커 '{ticker}'에 대한 데이터를 찾을 수 없습니다.")
        
        history = []
        for asset in assets:
            history.append({
                "date": asset.ranking_date.isoformat(),
                "rank": asset.rank,
                "name": asset.name,
                "ticker": asset.ticker,
                "market_cap_usd": float(asset.market_cap_usd or 0),
                "price_usd": float(asset.price_usd or 0),
                "daily_change_percent": float(asset.daily_change_percent or 0),
                "category": asset.category,
                "country": asset.country,
                "asset_type_id": asset.asset_type_id,
                "asset_id": asset.asset_id
            })
        
        return {
            "success": True,
            "data": history,
            "asset_info": {
                "name": assets[0].name,
                "ticker": assets[0].ticker,
                "category": assets[0].category,
                "country": assets[0].country
            },
            "total_records": len(history)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"자산 히스토리 조회 중 오류 발생: {str(e)}")


@router.get("/world-assets/category-trends", response_model=CategoryTrends)
async def get_category_trends(
    db: Session = Depends(get_db),
    start_date: date = None,
    end_date: date = None
):
    """
    카테고리별 시가총액 변화 추이 반환
    """
    try:
        query = db.query(WorldAssetsRanking)
        
        if start_date:
            query = query.filter(WorldAssetsRanking.ranking_date >= start_date)
        if end_date:
            query = query.filter(WorldAssetsRanking.ranking_date <= end_date)
        
        assets = query.order_by(WorldAssetsRanking.ranking_date).all()
        
        # 카테고리별 날짜별 집계
        category_trends = {}
        for asset in assets:
            date_str = asset.ranking_date.isoformat()
            category = asset.category or "Unknown"
            
            if category not in category_trends:
                category_trends[category] = {}
            
            if date_str not in category_trends[category]:
                category_trends[category][date_str] = {
                    "date": date_str,
                    "total_market_cap": 0,
                    "asset_count": 0
                }
            
            market_cap = float(asset.market_cap_usd or 0)
            category_trends[category][date_str]["total_market_cap"] += market_cap
            category_trends[category][date_str]["asset_count"] += 1
        
        # 결과 포맷팅
        result = {}
        for category, dates in category_trends.items():
            result[category] = sorted(dates.values(), key=lambda x: x["date"])
        
        return {
            "success": True,
            "data": result,
            "categories": list(result.keys()),
            "total_categories": len(result)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"카테고리별 추이 데이터 조회 중 오류 발생: {str(e)}")


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



