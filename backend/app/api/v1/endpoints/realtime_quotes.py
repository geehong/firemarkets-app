"""
RealtimeQuote API 엔드포인트
PostgreSQL 전용 API
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from ....core.database import get_postgres_db
from ....crud.realtime_quotes import (
    create_realtime_quote,
    update_realtime_quote,
    bulk_upsert_realtime_quotes,
    get_realtime_quote,
    get_realtime_quotes,
    delete_realtime_quote
)
from ....schemas.realtime_quotes import (
    RealtimeQuoteCreate,
    RealtimeQuoteUpdate,
    RealtimeQuoteResponse,
    RealtimeQuoteListResponse
)

router = APIRouter()

@router.post("/realtime-quotes/", response_model=RealtimeQuoteResponse)
async def create_realtime_quote_endpoint(
    quote_data: RealtimeQuoteCreate,
    postgres_db: Session = Depends(get_postgres_db)
):
    """RealtimeQuote 데이터 생성 (PostgreSQL)"""
    try:
        result = create_realtime_quote(postgres_db, quote_data)
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
async def update_realtime_quote_endpoint(
    asset_id: int,
    quote_data: RealtimeQuoteUpdate,
    postgres_db: Session = Depends(get_postgres_db)
):
    """RealtimeQuote 데이터 업데이트 (PostgreSQL)"""
    try:
        result = update_realtime_quote(postgres_db, asset_id, quote_data)
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
    postgres_db: Session = Depends(get_postgres_db)
):
    """RealtimeQuote 데이터 일괄 생성 (PostgreSQL)"""
    try:
        # 스키마를 딕셔너리로 변환
        quotes_dict_list = [quote.dict() for quote in quotes_list]
        
        count = bulk_upsert_realtime_quotes(postgres_db, quotes_dict_list)
        
        return {
            "success": True,
            "message": f"Bulk realtime quotes created successfully",
            "count": count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to bulk create realtime quotes: {str(e)}")

@router.get("/realtime-quotes/{asset_id}", response_model=RealtimeQuoteResponse)
async def get_realtime_quote_endpoint(
    asset_id: int,
    postgres_db: Session = Depends(get_postgres_db)
):
    """RealtimeQuote 데이터 조회 (PostgreSQL)"""
    try:
        result = get_realtime_quote(postgres_db, asset_id)
        
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
async def get_realtime_quotes_endpoint(
    asset_ids: Optional[List[int]] = Query(None, description="Asset IDs to filter"),
    limit: int = Query(100, description="Maximum number of records to return"),
    postgres_db: Session = Depends(get_postgres_db)
):
    """RealtimeQuote 목록 조회 (PostgreSQL)"""
    try:
        results = get_realtime_quotes(postgres_db, asset_ids, limit)
        
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
async def delete_realtime_quote_endpoint(
    asset_id: int,
    postgres_db: Session = Depends(get_postgres_db)
):
    """RealtimeQuote 데이터 삭제 (PostgreSQL)"""
    try:
        delete_realtime_quote(postgres_db, asset_id)
        return {
            "success": True,
            "message": f"RealtimeQuote for asset_id {asset_id} deleted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete realtime quote: {str(e)}")

@router.get("/realtime-quotes/test/postgresql", response_model=dict)
async def test_postgresql_write(
    postgres_db: Session = Depends(get_postgres_db)
):
    """PostgreSQL 쓰기 테스트"""
    try:
        # 테스트 데이터 생성
        test_quote = RealtimeQuoteCreate(
            asset_id=999,  # 테스트용 asset_id
            timestamp_utc=datetime.utcnow(),
            price=Decimal("50000.00"),
            volume=Decimal("100.0"),
            change_amount=Decimal("1000.00"),
            change_percent=Decimal("2.04"),
            data_source="test_postgresql"
        )
        
        # PostgreSQL 쓰기 실행
        result = create_realtime_quote(postgres_db, test_quote)
        
        # PostgreSQL에서 데이터 확인
        postgres_result = get_realtime_quote(postgres_db, 999)
        
        return {
            "success": True,
            "message": "PostgreSQL write test completed successfully",
            "postgres_found": postgres_result is not None,
            "created_quote": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PostgreSQL write test failed: {str(e)}")
