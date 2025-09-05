# backend_temp/app/api/v1/endpoints/etf.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from ....core.database import get_db
from ....models.asset import ETFInfo
from ....schemas.common import ETFInfoListResponse

router = APIRouter()

# TODO: ETF 관련 API 엔드포인트 구현
@router.get("/etf/info", response_model=ETFInfoListResponse)
def get_etf_info(db: Session = Depends(get_db)):
    """ETF 정보 조회"""
    return {"message": "ETF endpoints not implemented yet"}






