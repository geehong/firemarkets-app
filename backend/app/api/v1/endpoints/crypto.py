# backend_temp/app/api/v1/endpoints/crypto.py
import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date, timedelta

from ....core.database import get_postgres_db
from ....models import Asset, OHLCVData
from ....collectors import CryptoDataCollector
from ....schemas.asset import (
    BitcoinHalvingPeriodDataResponse, BitcoinHalvingSummary, NextHalvingInfo,
    CryptoDataResponse, TopCryptosResponse, GlobalCryptoMetrics
    # CryptoMetricsResponse,  # Commented out - duplicate API
)
from ....schemas.common import ReloadResponse

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models
class OHLCVPoint(BaseModel):
    timestamp_utc: date
    open_price: float
    high_price: float
    low_price: float
    close_price: float
    volume: float
    change_percent: Optional[float] = None
    days: Optional[int] = None  # 반감기 후 경과일수

class ClosePricePoint(BaseModel):
    timestamp_utc: date
    close_price: float
    change_percent: Optional[float] = None
    days: Optional[int] = None  # 반감기 후 경과일수

class BitcoinHalvingPeriodDataResponse(BaseModel):
    period_number: int
    start_date: date
    end_date: date
    ohlcv_data: List[OHLCVPoint]
    metadata: dict

class BitcoinHalvingClosePriceResponse(BaseModel):
    period_number: int
    start_date: date
    end_date: date
    close_price_data: List[ClosePricePoint]
    metadata: dict

# 비트코인 반감기 기간 정의
HALVING_DATES = {
    1: {"start": "2012-11-28", "end": "2016-07-08"},
    2: {"start": "2016-07-09", "end": "2020-05-10"},
    3: {"start": "2020-05-11", "end": "2024-04-19"},
    4: {"start": "2024-04-20", "end": date.today().strftime('%Y-%m-%d')},
}

# 비트코인 사이클 ERA 정의 (시작일+4년)
CYCLE_ERA_DATES = {
    1: {"start": "2011-11-28", "end": "2015-11-28"},
    2: {"start": "2015-01-14", "end": "2019-01-14"},
    3: {"start": "2018-12-15", "end": "2022-12-15"},
    4: {"start": "2022-11-21", "end": date.today().strftime('%Y-%m-%d')},  # 현재까지
}

@router.get("/bitcoin/halving-data/{period_number}")
async def get_bitcoin_halving_data(
    period_number: int = Path(..., ge=1, le=len(HALVING_DATES), description=f"Bitcoin halving period (1-{len(HALVING_DATES)})"),
    normalize_to_price: Optional[float] = Query(None, description="정규화할 기준 가격 (null이면 4차 반감기 시작가격 사용)"),
    include_ohlcv: bool = Query(True, description="OHLCV 데이터 포함 여부 (False면 close_price만 포함)"),
    db: Session = Depends(get_postgres_db)
):
    """비트코인 반감기 기간별 OHLCV 데이터를 조회합니다."""
    try:
        if period_number not in HALVING_DATES:
            raise HTTPException(status_code=404, detail="Invalid halving period number.")

        period_info = HALVING_DATES[period_number]
        start_date_obj = datetime.strptime(period_info["start"], "%Y-%m-%d").date()
        end_date_obj = datetime.strptime(period_info["end"], "%Y-%m-%d").date()

        # 비트코인 자산 ID 조회 (BTC 또는 BTCUSDT 지원) - 실제 데이터가 존재하는 자산을 선택
        candidate_assets = db.query(Asset).filter(
            Asset.ticker.in_(["BTC", "BTCUSDT"])
        ).all()
        if not candidate_assets:
            raise HTTPException(status_code=503, detail="Bitcoin asset not found (BTC or BTCUSDT). Cannot fetch halving data.")

        # 기간 내 OHLCV 데이터가 존재하는 자산을 우선 선택 (BTCUSDT 우선)
        bitcoin_asset = None
        for preferred_ticker in ["BTCUSDT", "BTC"]:
            asset = next((a for a in candidate_assets if a.ticker == preferred_ticker), None)
            if not asset:
                continue
            count = db.query(OHLCVData).filter(
                OHLCVData.asset_id == asset.asset_id,
                OHLCVData.timestamp_utc >= start_date_obj,
                OHLCVData.timestamp_utc < (end_date_obj + timedelta(days=1))
            ).count()
            if count > 0:
                bitcoin_asset = asset
                break
        # 둘 다 데이터가 없으면 첫 번째 자산 사용 (기존 동작 유지)
        if bitcoin_asset is None:
            bitcoin_asset = candidate_assets[0]
        
        # OHLCV 데이터 조회 (모든 일봉 데이터 - 주말/월말 포함)
        ohlcv_records = db.query(OHLCVData).filter(
            OHLCVData.asset_id == bitcoin_asset.asset_id,
            OHLCVData.timestamp_utc >= start_date_obj,
            OHLCVData.timestamp_utc < (end_date_obj + timedelta(days=1))
            # data_interval 필터링 제거 - 모든 일봉 데이터 조회
        ).order_by(OHLCVData.timestamp_utc).all()

        # 데이터 변환
        if include_ohlcv:
            ohlcv_data = []
            for i, record in enumerate(ohlcv_records):
                change_percent = None
                if i > 0 and record.close_price and ohlcv_records[i-1].close_price:
                    prev_close = ohlcv_records[i-1].close_price
                    change_percent = ((record.close_price - prev_close) / prev_close) * 100

                ohlcv_data.append(OHLCVPoint(
                    timestamp_utc=record.timestamp_utc.date(),
                    open_price=record.open_price,
                    high_price=record.high_price,
                    low_price=record.low_price,
                    close_price=record.close_price,
                    volume=record.volume,
                    change_percent=change_percent
                ))
        else:
            # close_price만 포함하는 간소화된 데이터
            close_price_data = []
            for i, record in enumerate(ohlcv_records):
                change_percent = None
                if i > 0 and record.close_price and ohlcv_records[i-1].close_price:
                    prev_close = ohlcv_records[i-1].close_price
                    change_percent = ((record.close_price - prev_close) / prev_close) * 100

                close_price_data.append(ClosePricePoint(
                    timestamp_utc=record.timestamp_utc.date(),
                    close_price=record.close_price,
                    change_percent=change_percent
                ))

        # normalize_to_price가 None이면 4차 반감기 시작가격을 가져와서 설정
        if normalize_to_price is None:
            # 4차 반감기 데이터를 가져와서 시작가격 설정
            fourth_period_info = HALVING_DATES[4]
            fourth_start_date = datetime.strptime(fourth_period_info["start"], "%Y-%m-%d").date()
            
            fourth_ohlcv = db.query(OHLCVData).filter(
                OHLCVData.asset_id == bitcoin_asset.asset_id,
                OHLCVData.timestamp_utc >= fourth_start_date,
                OHLCVData.timestamp_utc < (fourth_start_date + timedelta(days=1))
                # data_interval 필터링 제거 - 모든 일봉 데이터 조회
            ).order_by(OHLCVData.timestamp_utc).first()
            
            if fourth_ohlcv:
                normalize_to_price = fourth_ohlcv.close_price
            else:
                normalize_to_price = 1000  # 기본값

        # 모든 가격을 정규화
        if include_ohlcv:
            normalized_ohlcv_data = []
            if ohlcv_data:
                original_start_price = float(ohlcv_data[0].close_price)
                adjustment_factor = float(normalize_to_price) / original_start_price
                
                for i, point in enumerate(ohlcv_data):
                    # 모든 가격을 정규화
                    normalized_point = OHLCVPoint(
                        timestamp_utc=point.timestamp_utc,
                        open_price=float(point.open_price) * adjustment_factor,
                        high_price=float(point.high_price) * adjustment_factor,
                        low_price=float(point.low_price) * adjustment_factor,
                        close_price=float(point.close_price) * adjustment_factor,
                        volume=float(point.volume),
                        change_percent=point.change_percent,
                        days=i  # 반감기 후 경과일수 추가
                    )
                    normalized_ohlcv_data.append(normalized_point)
            else:
                normalized_ohlcv_data = ohlcv_data
        else:
            normalized_close_price_data = []
            if close_price_data:
                original_start_price = float(close_price_data[0].close_price)
                adjustment_factor = float(normalize_to_price) / original_start_price
                
                for i, point in enumerate(close_price_data):
                    # close_price만 정규화
                    normalized_point = ClosePricePoint(
                        timestamp_utc=point.timestamp_utc,
                        close_price=float(point.close_price) * adjustment_factor,
                        change_percent=point.change_percent,
                        days=i  # 반감기 후 경과일수 추가
                    )
                    normalized_close_price_data.append(normalized_point)
            else:
                normalized_close_price_data = close_price_data

        # 메타데이터
        metadata = {
            "period_name": f"Halving Period {period_number}",
            "total_days": len(normalized_ohlcv_data) if include_ohlcv else len(normalized_close_price_data),
            "start_date": start_date_obj.isoformat(),
            "end_date": end_date_obj.isoformat(),
            "block_reward": {
                1: 25,
                2: 12.5,
                3: 6.25,
                4: 3.125
            }.get(period_number, "Unknown"),
            "normalize_to_price": normalize_to_price,
            "original_start_price": original_start_price if (ohlcv_data if include_ohlcv else close_price_data) else None,
            "adjustment_factor": adjustment_factor if (ohlcv_data if include_ohlcv else close_price_data) else None
        }

        if include_ohlcv:
            return BitcoinHalvingPeriodDataResponse(
                period_number=period_number,
                start_date=start_date_obj,
                end_date=end_date_obj,
                ohlcv_data=normalized_ohlcv_data,
                metadata=metadata
            )
        else:
            return BitcoinHalvingClosePriceResponse(
                period_number=period_number,
                start_date=start_date_obj,
                end_date=end_date_obj,
                close_price_data=normalized_close_price_data,
                metadata=metadata
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting halving data for period {period_number}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get halving data: {str(e)}")

@router.get("/bitcoin/halving-summary", response_model=BitcoinHalvingSummary)
async def get_halving_summary(db: Session = Depends(get_postgres_db)):
    """모든 반감기 기간의 요약 정보를 조회합니다."""
    try:
        summary = []
        
        for period_num in HALVING_DATES.keys():
            try:
                period_data = await get_bitcoin_halving_data(period_num, db)
                
                if period_data.ohlcv_data:
                    # 가격 통계 계산
                    prices = [point.close_price for point in period_data.ohlcv_data if point.close_price]
                    if prices:
                        price_stats = {
                            "start_price": prices[0],
                            "end_price": prices[-1],
                            "min_price": min(prices),
                            "max_price": max(prices),
                            "avg_price": sum(prices) / len(prices),
                            "total_return": ((prices[-1] - prices[0]) / prices[0]) * 100 if prices[0] > 0 else 0
                        }
                    else:
                        price_stats = {}
                    
                    summary.append({
                        "period_number": period_num,
                        "start_date": period_data.start_date.isoformat(),
                        "end_date": period_data.end_date.isoformat(),
                        "total_days": len(period_data.ohlcv_data),
                        "price_stats": price_stats,
                        "block_reward": period_data.metadata["block_reward"]
                    })
            except Exception as e:
                logger.warning(f"Error getting summary for period {period_num}: {e}")
                continue
        
        return {
            "halving_periods": summary,
            "total_periods": len(HALVING_DATES),
            "current_period": 4
        }
        
    except Exception as e:
        logger.error(f"Error getting halving summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get halving summary: {str(e)}")

@router.get("/bitcoin/next-halving", response_model=NextHalvingInfo)
async def get_next_halving_info():
    """다음 반감기 정보를 조회합니다."""
    try:
        # 현재 반감기 기간 (4기)
        current_period = 4
        current_period_info = HALVING_DATES[current_period]
        
        # 다음 반감기 예상 날짜 (약 4년 후)
        current_start = datetime.strptime(current_period_info["start"], "%Y-%m-%d").date()
        next_halving_date = current_start + timedelta(days=4*365)  # 약 4년
        
        days_until_next = (next_halving_date - date.today()).days
        
        return {
            "current_period": current_period,
            "current_period_start": current_period_info["start"],
            "next_halving_date": next_halving_date.isoformat(),
            "days_until_next": days_until_next,
            "current_block_reward": 3.125,
            "next_block_reward": 1.5625
        }
        
    except Exception as e:
        logger.error(f"Error getting next halving info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get next halving info: {str(e)}")

@router.get("/data/asset/{asset_identifier}", response_model=CryptoDataResponse)
async def get_crypto_data_by_asset(
    asset_identifier: str = Path(..., description="Asset ID (integer) or Ticker (string)"),
    db: Session = Depends(get_postgres_db)
):
    """Get cryptocurrency data by asset ID or ticker"""
    try:
        # Resolve asset identifier to asset_id
        if asset_identifier.isdigit():
            asset_id = int(asset_identifier)
            asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
        else:
            asset = db.query(Asset).filter(Asset.ticker == asset_identifier.upper()).first()
            if asset:
                asset_id = asset.asset_id
            else:
                raise HTTPException(status_code=404, detail=f"Asset not found: {asset_identifier}")
        
        if not asset:
            raise HTTPException(status_code=404, detail=f"Asset not found: {asset_identifier}")
        
        # Check if it's a cryptocurrency
        if asset.asset_type.type_name != 'Crypto':
            raise HTTPException(status_code=400, detail=f"Asset {asset_identifier} is not a cryptocurrency")
        
        # Get crypto data from database
        from ....models.asset import CryptoData
        crypto_data = db.query(CryptoData).filter(CryptoData.asset_id == asset_id).first()
        
        if not crypto_data:
            raise HTTPException(status_code=404, detail=f"Crypto data not found for {asset_identifier}")
        
        # 가격 처리 (current_price 우선, 없으면 price 사용)
        price_value = 0.0
        if crypto_data.current_price is not None:
            price_value = float(crypto_data.current_price)
        elif hasattr(crypto_data, 'price') and crypto_data.price is not None:
            price_value = float(crypto_data.price)
        
        # name이 비어있으면 symbol 사용
        name_value = crypto_data.name if crypto_data.name else crypto_data.symbol
        
        # Format the response to match CryptoDataResponse
        return {
            "symbol": crypto_data.symbol,
            "name": name_value,
            "price": price_value,
            "market_cap": float(crypto_data.market_cap) if crypto_data.market_cap else None,
            "volume_24h": float(crypto_data.volume_24h) if crypto_data.volume_24h else None,
            "price_change_24h": 0.0,  # TODO: Calculate from OHLCV data
            "price_change_percent_24h": float(crypto_data.percent_change_24h) if crypto_data.percent_change_24h else None,
            "circulating_supply": float(crypto_data.circulating_supply) if crypto_data.circulating_supply else None,
            "total_supply": float(crypto_data.total_supply) if crypto_data.total_supply else None,
            "max_supply": float(crypto_data.max_supply) if crypto_data.max_supply else None,
            "rank": crypto_data.cmc_rank if crypto_data.cmc_rank else None,
            "last_updated": crypto_data.last_updated,
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Error getting crypto data for asset {asset_identifier}: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to get crypto data: {str(e)}")



@router.get("/top", response_model=TopCryptosResponse)
async def get_top_cryptos(limit: int = 100, db: Session = Depends(get_postgres_db)):
    """Get top cryptocurrencies by market cap"""
    try:
        if limit > 1000:
            limit = 1000  # Prevent excessive requests
        
        # Get crypto data from database ordered by market cap
        from ....models.asset import CryptoData
        crypto_data_list = db.query(CryptoData).join(Asset).filter(
            Asset.asset_type.has(type_name="Crypto"),
            CryptoData.market_cap.isnot(None)
        ).order_by(CryptoData.market_cap.desc()).limit(limit).all()
        
        cryptos = []
        for crypto_data in crypto_data_list:
            try:
                # 가격 처리 (current_price 우선, 없으면 price 사용)
                price_value = 0.0
                if crypto_data.current_price is not None:
                    price_value = float(crypto_data.current_price)
                elif hasattr(crypto_data, 'price') and crypto_data.price is not None:
                    price_value = float(crypto_data.price)
                
                # name이 비어있으면 symbol 사용
                name_value = crypto_data.name if crypto_data.name else crypto_data.symbol
                
                cryptos.append({
                    "symbol": crypto_data.symbol,
                    "name": name_value,
                    "price": price_value,
                    "market_cap": float(crypto_data.market_cap) if crypto_data.market_cap else 0.0,
                    "volume_24h": float(crypto_data.volume_24h) if crypto_data.volume_24h else 0.0,
                    "price_change_24h": 0.0,  # TODO: Calculate from OHLCV data
                    "price_change_percent_24h": float(crypto_data.percent_change_24h) if crypto_data.percent_change_24h else 0.0,
                    "circulating_supply": float(crypto_data.circulating_supply) if crypto_data.circulating_supply else None,
                    "total_supply": float(crypto_data.total_supply) if crypto_data.total_supply else None,
                    "max_supply": float(crypto_data.max_supply) if crypto_data.max_supply else None,
                    "rank": crypto_data.cmc_rank if crypto_data.cmc_rank else 0,
                    "last_updated": crypto_data.last_updated
                })
            except Exception as row_error:
                logger.warning(f"Error processing crypto row {crypto_data.symbol}: {row_error}")
                continue
        
        return {
            "data": cryptos,
            "total_count": len(cryptos)
        }
    except Exception as e:
        import traceback
        logger.error(f"Error getting top cryptos: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to get top cryptos: {str(e)}")

# @router.get("/metrics/{symbol}", response_model=CryptoMetricsResponse)
# async def get_crypto_metrics(symbol: str, days: int = 30, db: Session = Depends(get_postgres_db)):
#     """Get cryptocurrency metrics history from OHLCV data"""
#     try:
#         if days > 365:
#             days = 365  # Limit to 1 year
#         
#         # Find asset by ticker
#         asset = db.query(Asset).filter(Asset.ticker == symbol.upper()).first()
#         if not asset:
#             raise HTTPException(status_code=404, detail=f"Asset not found: {symbol}")
#         
#         # Check if it's a cryptocurrency
#         if asset.asset_type.type_name != 'Crypto':
#             raise HTTPException(status_code=400, detail=f"Asset {symbol} is not a cryptocurrency")
#         
#         # Get OHLCV data for the specified period
#         from datetime import timedelta
#         end_date = datetime.now()
#         start_date = end_date - timedelta(days=days)
#         
#         ohlcv_data = db.query(OHLCVData).filter(
#             OHLCVData.asset_id == asset.asset_id,
#             OHLCVData.data_interval == '1d',
#             OHLCVData.timestamp_utc >= start_date,
#             OHLCVData.timestamp_utc <= end_date
#         ).order_by(OHLCVData.timestamp_utc).all()
#         
#         metrics = []
#         for record in ohlcv_data:
#             metrics.append({
#                 "date": record.timestamp_utc.isoformat(),
#                 "open": float(record.open_price) if record.open_price else None,
#                 "high": float(record.high_price) if record.high_price else None,
#                 "low": float(record.low_price) if record.low_price else None,
#                 "close": float(record.close_price) if record.close_price else None,
#                 "volume": float(record.volume) if record.volume else None
#             })
#         
#         return {
#             "symbol": symbol.upper(),
#             "volatility": None,  # TODO: Calculate volatility
#             "sharpe_ratio": None,  # TODO: Calculate Sharpe ratio
#             "beta": None,  # TODO: Calculate beta
#             "correlation_btc": None,  # TODO: Calculate correlation with BTC
#             "correlation_eth": None,  # TODO: Calculate correlation with ETH
#             "market_dominance": None,  # TODO: Calculate market dominance
#             "price_data": metrics,
#             "updated_at": datetime.now()
#         }
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error getting crypto metrics for {symbol}: {e}")
#         raise HTTPException(status_code=500, detail=f"Failed to get crypto metrics: {str(e)}")

@router.post("/update/{symbol}", response_model=ReloadResponse)
async def update_crypto_data(symbol: str, db: Session = Depends(get_postgres_db)):
    """Update cryptocurrency data using CryptoDataCollector"""
    try:
        # Find asset by ticker
        asset = db.query(Asset).filter(Asset.ticker == symbol.upper()).first()
        if not asset:
            raise HTTPException(status_code=404, detail=f"Asset not found: {symbol}")
        
        # Check if it's a cryptocurrency
        if asset.asset_type.type_name != 'Crypto':
            raise HTTPException(status_code=400, detail=f"Asset {symbol} is not a cryptocurrency")
        
        # Use CryptoDataCollector to update data
        collector = CryptoDataCollector()
        async with httpx.AsyncClient() as client:
            result = await collector._collect_crypto_data_for_asset(client, asset, db)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=f"Failed to update crypto data for {symbol}: {result['message']}")
        
        return {
            "message": f"Successfully updated crypto data for {symbol}",
            "symbol": symbol.upper(),
            "timestamp": datetime.now().isoformat(),
            "updated_count": result["updated_count"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating crypto data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update crypto data: {str(e)}")

@router.get("/global-metrics", response_model=GlobalCryptoMetrics)
async def get_global_crypto_metrics(db: Session = Depends(get_postgres_db)):
    """Get global cryptocurrency market metrics from database"""
    try:
        from ....models.asset import CryptoData
        from sqlalchemy import func
        
        # Get global metrics from database
        total_market_cap = db.query(func.sum(CryptoData.market_cap)).filter(
            CryptoData.market_cap.isnot(None)
        ).scalar() or 0
        
        total_volume_24h = db.query(func.sum(CryptoData.volume_24h)).filter(
            CryptoData.volume_24h.isnot(None)
        ).scalar() or 0
        
        total_cryptocurrencies = db.query(func.count(CryptoData.asset_id)).scalar() or 0
        
        # Get market cap dominance for top 10
        top_10_cryptos = db.query(CryptoData).join(Asset).filter(
            Asset.asset_type.has(type_name="Crypto"),
            CryptoData.market_cap.isnot(None)
        ).order_by(CryptoData.market_cap.desc()).limit(10).all()
        
        market_cap_dominance = []
        for crypto in top_10_cryptos:
            if total_market_cap > 0:
                dominance = (float(crypto.market_cap) / float(total_market_cap)) * 100
            else:
                dominance = 0
            market_cap_dominance.append({
                "symbol": crypto.symbol,
                "name": crypto.name,
                "market_cap": float(crypto.market_cap) if crypto.market_cap else 0,
                "dominance": round(dominance, 2)
            })
        
        # Calculate Bitcoin and Ethereum dominance
        bitcoin_dominance = 0.0
        ethereum_dominance = 0.0
        
        for crypto in market_cap_dominance:
            if crypto["symbol"] == "BTCUSDT":
                bitcoin_dominance = crypto["dominance"]
            elif crypto["symbol"] == "ETHUSDT":
                ethereum_dominance = crypto["dominance"]
        
        return {
            "total_market_cap": float(total_market_cap),
            "total_volume_24h": float(total_volume_24h),
            "bitcoin_dominance": bitcoin_dominance,
            "ethereum_dominance": ethereum_dominance,
            "total_cryptocurrencies": total_cryptocurrencies,
            "active_cryptocurrencies": total_cryptocurrencies,  # Assuming all are active
            "market_cap_change_24h": 0.0,  # TODO: Calculate from historical data
            "volume_change_24h": 0.0,  # TODO: Calculate from historical data
            "last_updated": datetime.now()
        }
    except Exception as e:
        logger.error(f"Error getting global crypto metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get global crypto metrics: {str(e)}")

# Comparison Cycle Data Response Models
class ComparisonCycleDataPoint(BaseModel):
    timestamp_utc: date
    close_price: float
    normalized_price: float
    change_percent: Optional[float] = None
    days: int  # ERA 시작일 기준 경과일수

class ComparisonCycleAssetData(BaseModel):
    asset_id: int
    ticker: str
    name: Optional[str] = None
    data: List[ComparisonCycleDataPoint]

class ComparisonCycleDataResponse(BaseModel):
    era_number: int
    start_date: date
    end_date: date
    normalize_to_price: float
    assets: List[ComparisonCycleAssetData]
    metadata: dict

@router.get("/bitcoin/comparison-cycle-data/{era_number}", response_model=ComparisonCycleDataResponse)
async def get_comparison_cycle_data(
    era_number: int = Path(..., ge=1, le=4, description="Bitcoin cycle ERA number (1-4)"),
    normalize_to_price: Optional[float] = Query(None, description="정규화할 기준 가격 (null이면 4차 ERA 시작가격 사용)"),
    asset_identifiers: Optional[str] = Query(None, description="비교할 자산 목록 (쉼표로 구분, 예: BTC,AAPL,MSFT)"),
    db: Session = Depends(get_postgres_db)
):
    """비트코인 사이클 ERA별 비교 데이터를 조회합니다. 여러 자산을 동시에 비교할 수 있습니다."""
    try:
        # ERA 정의
        CYCLE_ERA_DATES = {
            1: {"start": "2011-11-28", "end": "2015-11-28"},
            2: {"start": "2015-01-14", "end": "2019-01-14"},
            3: {"start": "2018-12-15", "end": "2022-12-15"},
            4: {"start": "2022-11-21", "end": date.today().strftime('%Y-%m-%d')},
        }
        
        if era_number not in CYCLE_ERA_DATES:
            raise HTTPException(status_code=404, detail="Invalid ERA number.")
        
        era_info = CYCLE_ERA_DATES[era_number]
        start_date_obj = datetime.strptime(era_info["start"], "%Y-%m-%d").date()
        
        # 종료일 계산 (시작일+4년 또는 현재 날짜 중 작은 값)
        end_date_obj = datetime.strptime(era_info["end"], "%Y-%m-%d").date()
        calculated_end = start_date_obj + timedelta(days=4*365)
        if calculated_end > date.today():
            end_date_obj = date.today()
        else:
            end_date_obj = calculated_end
        
        # 자산 목록 파싱 (기본값: BTC만)
        asset_tickers = ["BTC", "BTCUSDT"]  # 기본값
        if asset_identifiers:
            asset_tickers = [ticker.strip().upper() for ticker in asset_identifiers.split(",")]
        
        # 자산 ID 해석 함수
        def resolve_asset_id(identifier: str) -> Optional[int]:
            try:
                asset_id = int(identifier)
                asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
                return asset.asset_id if asset else None
            except ValueError:
                asset = db.query(Asset).filter(Asset.ticker == identifier.upper()).first()
                return asset.asset_id if asset else None
        
        # 자산 ID 목록 생성
        asset_ids = []
        for ticker in asset_tickers:
            asset_id = resolve_asset_id(ticker)
            if asset_id:
                asset_ids.append(asset_id)
        
        if not asset_ids:
            raise HTTPException(status_code=404, detail="No valid assets found.")
        
        # 4차 ERA 시작가격 가져오기 (정규화 기준)
        if normalize_to_price is None:
            fourth_era_info = CYCLE_ERA_DATES[4]
            fourth_start_date = datetime.strptime(fourth_era_info["start"], "%Y-%m-%d").date()
            
            # BTC 자산 찾기
            btc_assets = db.query(Asset).filter(Asset.ticker.in_(["BTC", "BTCUSDT"])).all()
            btc_asset = None
            for preferred_ticker in ["BTCUSDT", "BTC"]:
                asset = next((a for a in btc_assets if a.ticker == preferred_ticker), None)
                if asset:
                    btc_asset = asset
                    break
            if not btc_asset and btc_assets:
                btc_asset = btc_assets[0]
            
            if btc_asset:
                fourth_ohlcv = db.query(OHLCVData).filter(
                    OHLCVData.asset_id == btc_asset.asset_id,
                    OHLCVData.timestamp_utc >= fourth_start_date,
                    OHLCVData.timestamp_utc < (fourth_start_date + timedelta(days=1))
                ).order_by(OHLCVData.timestamp_utc).first()
                
                if fourth_ohlcv:
                    normalize_to_price = float(fourth_ohlcv.close_price)
                else:
                    normalize_to_price = 64940  # 기본값
            else:
                normalize_to_price = 64940  # 기본값
        
        # 각 자산별 데이터 조회 및 정규화
        assets_data = []
        for asset_id in asset_ids:
            asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
            if not asset:
                continue
            
            # OHLCV 데이터 조회
            ohlcv_records = db.query(OHLCVData).filter(
                OHLCVData.asset_id == asset_id,
                OHLCVData.timestamp_utc >= start_date_obj,
                OHLCVData.timestamp_utc <= end_date_obj
            ).order_by(OHLCVData.timestamp_utc).all()
            
            if not ohlcv_records:
                continue
            
            # 첫 번째 가격을 기준으로 정규화
            first_price = float(ohlcv_records[0].close_price)
            adjustment_factor = float(normalize_to_price) / first_price if first_price > 0 else 1.0
            
            # 데이터 변환 및 정규화
            data_points = []
            for i, record in enumerate(ohlcv_records):
                days = (record.timestamp_utc.date() - start_date_obj).days
                normalized_price = float(record.close_price) * adjustment_factor
                
                change_percent = None
                if i > 0 and record.close_price and ohlcv_records[i-1].close_price:
                    prev_close = ohlcv_records[i-1].close_price
                    change_percent = ((record.close_price - prev_close) / prev_close) * 100
                
                data_points.append(ComparisonCycleDataPoint(
                    timestamp_utc=record.timestamp_utc.date(),
                    close_price=float(record.close_price),
                    normalized_price=normalized_price,
                    change_percent=change_percent,
                    days=days
                ))
            
            assets_data.append(ComparisonCycleAssetData(
                asset_id=asset.asset_id,
                ticker=asset.ticker,
                name=asset.name,
                data=data_points
            ))
        
        # 메타데이터
        metadata = {
            "era_name": f"ERA {era_number}",
            "total_days": (end_date_obj - start_date_obj).days,
            "normalize_to_price": normalize_to_price,
            "asset_count": len(assets_data)
        }
        
        return ComparisonCycleDataResponse(
            era_number=era_number,
            start_date=start_date_obj,
            end_date=end_date_obj,
            normalize_to_price=normalize_to_price,
            assets=assets_data,
            metadata=metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting comparison cycle data for ERA {era_number}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get comparison cycle data: {str(e)}")

