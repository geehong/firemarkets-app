from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_postgres_db
from app.services.asset_identity_service import asset_identity_service

router = APIRouter()

@router.get("/core/identity")
def check_asset_identity(
    ticker: str = Query(..., description="Asset Ticker to identify"),
    db: Session = Depends(get_postgres_db)
):
    """
    Identify asset by ticker.
    Checks DB and internal mappings to determine validity, name, and category.
    """
    return asset_identity_service.identify_asset(db, ticker)
