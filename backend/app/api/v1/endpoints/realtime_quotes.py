"""
RealtimeQuote API 엔드포인트
이중 쓰기 테스트를 위한 API
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from ....core.database import get_mysql_db, get_postgres_db
from ....crud.realtime_quotes import (
    create_realtime_quote_dual,
    update_realtime_quote_dual,
    bulk_upsert_realtime_quotes_dual,
    get_realtime_quote_mysql,
    get_realtime_quote_postgres,
    get_realtime_quotes_postgres,
    delete_realtime_quote_dual
)
from ....schemas.realtime_quotes import (
    RealtimeQuoteCreate,
    RealtimeQuoteUpdate,
    RealtimeQuoteResponse,
    RealtimeQuoteListResponse
)

router = APIRouter()

@router.post("/realtime-quotes/", response_model=RealtimeQuoteResponse)
async def create_realtime_quote(
    quote_data: RealtimeQuoteCreate,
    mysql_db: Session = Depends(get_mysql_db),
    postgres_db: Session = Depends(get_postgres_db)
):
    """RealtimeQuote 데이터 생성 (이중 쓰기)"""
    try:
        result = create_realtime_quote_dual(mysql_db, postgres_db, quote_data)
        return RealtimeQuoteResponse(
            id=result.id,
            asset_id=result.asset_id,
            timestamp_utc=result.timestamp_utc,
            price=result.price,
            volume=result.volume,
            change_amount=result.change_amount,
            change_percent=result.change_percent,
            data_source=result.data_source,
            updated_at=result.updated_at
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create realtime quote: {str(e)}")

@router.put("/realtime-quotes/{asset_id}", response_model=RealtimeQuoteResponse)
async def update_realtime_quote(
    asset_id: int,
    quote_data: RealtimeQuoteUpdate,
    mysql_db: Session = Depends(get_mysql_db),
    postgres_db: Session = Depends(get_postgres_db)
):
    """RealtimeQuote 데이터 업데이트 (이중 쓰기)"""
    try:
        result = update_realtime_quote_dual(mysql_db, postgres_db, asset_id, quote_data)
        if not result:
            raise HTTPException(status_code=404, detail="RealtimeQuote not found")
        
        return RealtimeQuoteResponse(
            id=result.id,
            asset_id=result.asset_id,
            timestamp_utc=result.timestamp_utc,
            price=result.price,
            volume=result.volume,
            change_amount=result.change_amount,
            change_percent=result.change_percent,
            data_source=result.data_source,
            updated_at=result.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update realtime quote: {str(e)}")

@router.post("/realtime-quotes/bulk", response_model=dict)
async def bulk_create_realtime_quotes(
    quotes_list: List[RealtimeQuoteCreate],
    mysql_db: Session = Depends(get_mysql_db),
    postgres_db: Session = Depends(get_postgres_db)
):
    """RealtimeQuote 데이터 일괄 생성 (이중 쓰기)"""
    try:
        # 스키마를 딕셔너리로 변환
        quotes_dict_list = [quote.dict() for quote in quotes_list]
        
        count = bulk_upsert_realtime_quotes_dual(mysql_db, postgres_db, quotes_dict_list)
        
        return {
            "success": True,
            "message": f"Bulk realtime quotes created successfully",
            "count": count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to bulk create realtime quotes: {str(e)}")

@router.get("/realtime-quotes/{asset_id}", response_model=RealtimeQuoteResponse)
async def get_realtime_quote(
    asset_id: int,
    db_type: str = Query("postgres", description="Database type: mysql or postgres"),
    mysql_db: Session = Depends(get_mysql_db),
    postgres_db: Session = Depends(get_postgres_db)
):
    """RealtimeQuote 데이터 조회"""
    try:
        if db_type == "mysql":
            result = get_realtime_quote_mysql(mysql_db, asset_id)
        else:
            result = get_realtime_quote_postgres(postgres_db, asset_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="RealtimeQuote not found")
        
        return RealtimeQuoteResponse(
            id=result.id,
            asset_id=result.asset_id,
            timestamp_utc=result.timestamp_utc,
            price=result.price,
            volume=result.volume,
            change_amount=result.change_amount,
            change_percent=result.change_percent,
            data_source=result.data_source,
            updated_at=result.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get realtime quote: {str(e)}")

@router.get("/realtime-quotes/", response_model=RealtimeQuoteListResponse)
async def get_realtime_quotes(
    asset_ids: Optional[List[int]] = Query(None, description="Asset IDs to filter"),
    limit: int = Query(100, description="Maximum number of records to return"),
    postgres_db: Session = Depends(get_postgres_db)
):
    """RealtimeQuote 목록 조회 (PostgreSQL)"""
    try:
        results = get_realtime_quotes_postgres(postgres_db, asset_ids, limit)
        
        quote_responses = [
            RealtimeQuoteResponse(
                id=quote.id,
                asset_id=quote.asset_id,
                timestamp_utc=quote.timestamp_utc,
                price=quote.price,
                volume=quote.volume,
                change_amount=quote.change_amount,
                change_percent=quote.change_percent,
                data_source=quote.data_source,
                updated_at=quote.updated_at
            )
            for quote in results
        ]
        
        return RealtimeQuoteListResponse(
            success=True,
            message=f"Retrieved {len(quote_responses)} realtime quotes",
            data=quote_responses,
            count=len(quote_responses)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get realtime quotes: {str(e)}")

@router.delete("/realtime-quotes/{asset_id}", response_model=dict)
async def delete_realtime_quote(
    asset_id: int,
    mysql_db: Session = Depends(get_mysql_db),
    postgres_db: Session = Depends(get_postgres_db)
):
    """RealtimeQuote 데이터 삭제 (이중 쓰기)"""
    try:
        delete_realtime_quote_dual(mysql_db, postgres_db, asset_id)
        return {
            "success": True,
            "message": f"RealtimeQuote for asset_id {asset_id} deleted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete realtime quote: {str(e)}")

@router.get("/realtime-quotes/test/dual-write", response_model=dict)
async def test_dual_write(
    mysql_db: Session = Depends(get_mysql_db),
    postgres_db: Session = Depends(get_postgres_db)
):
    """이중 쓰기 테스트"""
    try:
        # 테스트 데이터 생성
        test_quote = RealtimeQuoteCreate(
            asset_id=999,  # 테스트용 asset_id
            timestamp_utc=datetime.utcnow(),
            price=Decimal("50000.00"),
            volume=Decimal("100.0"),
            change_amount=Decimal("1000.00"),
            change_percent=Decimal("2.04"),
            data_source="test_dual_write"
        )
        
        # 이중 쓰기 실행
        result = create_realtime_quote_dual(mysql_db, postgres_db, test_quote)
        
        # 양쪽 DB에서 데이터 확인
        mysql_result = get_realtime_quote_mysql(mysql_db, 999)
        postgres_result = get_realtime_quote_postgres(postgres_db, 999)
        
        return {
            "success": True,
            "message": "Dual write test completed successfully",
            "mysql_found": mysql_result is not None,
            "postgres_found": postgres_result is not None,
            "data_consistent": (
                mysql_result.price == postgres_result.price if 
                mysql_result and postgres_result else False
            )
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dual write test failed: {str(e)}")
