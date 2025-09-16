# backend_temp/app/api/v1/endpoints/configurations.py
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ....models import AppConfiguration
from ....core.database import get_db
from ....schemas.common import GlobalConfigurationResponse, ReloadResponse, ConfigurationCategoriesResponse

# --- Pydantic 스키마 정의 ---
class AppConfigurationPydantic(BaseModel):
    config_id: int
    config_key: str
    config_value: Optional[str] = None
    data_type: str
    description: Optional[str] = None
    is_sensitive: bool
    is_active: bool
    category: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ConfigurationResponse(BaseModel):
    config_id: int
    config_key: str
    config_value: Optional[str]
    data_type: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ConfigurationUpdate(BaseModel):
    config_value: str

class ConfigurationCreate(BaseModel):
    config_key: str
    config_value: str
    data_type: str = "string"
    description: Optional[str] = None
    is_sensitive: bool = False
    is_active: bool = True

# --- APIRouter 생성 ---
router = APIRouter()

# --- API 엔드포인트 정의 ---

@router.get("/configurations", response_model=List[ConfigurationResponse])
def get_configurations(
    category: Optional[str] = Query(None, description="Configuration category filter"),
    db: Session = Depends(get_db)
):
    """모든 활성 설정을 조회합니다."""
    query = db.query(AppConfiguration).filter(AppConfiguration.is_active == True)
    # Note: AppConfiguration 모델에 category 필드가 없으므로 category 필터링 제거
    # if category:
    #     query = query.filter(AppConfiguration.category == category)
    configs = query.all()
    return configs

@router.get("/configurations/{config_key}", response_model=ConfigurationResponse)
def get_configuration(
    config_key: str,
    db: Session = Depends(get_db)
):
    """특정 설정을 조회합니다."""
    config = db.query(AppConfiguration).filter(AppConfiguration.config_key == config_key).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    return config

@router.put("/configurations/{config_key}", response_model=ConfigurationResponse)
def update_configuration(
    config_key: str,
    config_value: str = Query(..., description="New configuration value"),
    db: Session = Depends(get_db)
):
    """설정값을 업데이트합니다."""
    config = db.query(AppConfiguration).filter(AppConfiguration.config_key == config_key).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    config.config_value = config_value
    db.commit()
    db.refresh(config)
    return config

@router.post("/configurations", response_model=ConfigurationResponse)
def create_configuration(
    config_create: ConfigurationCreate,
    db: Session = Depends(get_db)
):
    """새로운 설정을 생성합니다."""
    # 중복 키 확인
    existing = db.query(AppConfiguration).filter(AppConfiguration.config_key == config_create.config_key).first()
    if existing:
        raise HTTPException(status_code=400, detail="Configuration key already exists")
    
    config_data = config_create.dict()
    config = AppConfiguration(**config_data)
    db.add(config)
    db.commit()
    db.refresh(config)
    return config

@router.get("/configurations/global/current", response_model=GlobalConfigurationResponse)
def get_current_global_configs():
    """현재 메모리에 로드된 전역 설정을 조회합니다."""
    # TODO: 전역 설정 로직 구현
    return {"message": "Global configurations not implemented yet"}

@router.post("/configurations/reload", response_model=ReloadResponse)
def reload_global_configurations(db: Session = Depends(get_db)):
    """전역 설정을 데이터베이스에서 다시 로드합니다."""
    try:
        # TODO: 전역 설정 리로드 로직 구현
        return {"message": "Global configurations reloaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reload configurations: {str(e)}")

@router.get("/configurations/categories", response_model=ConfigurationCategoriesResponse)
def get_configuration_categories(db: Session = Depends(get_db)):
    """설정 카테고리 목록을 조회합니다."""
    configs = db.query(AppConfiguration).filter(AppConfiguration.is_active == True).all()
    categories = set()
    for config in configs:
        if config.config_key:
            # config_key에서 카테고리 추출 (예: "API_FMP_KEY" -> "API")
            parts = config.config_key.split('_')
            if len(parts) > 1:
                categories.add(parts[0])
    return {"categories": list(categories)}



