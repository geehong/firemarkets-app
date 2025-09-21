# backend_temp/app/api/v1/endpoints/configurations.py
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ....models import AppConfiguration
from ....core.database import get_db

# --- Pydantic 스키마 정의 ---

class GroupedConfigurationItem(BaseModel):
    value: Any
    type: str
    description: Optional[str] = None
    is_sensitive: bool = False
    is_active: bool = True

class GroupedConfigurationResponse(BaseModel):
    config_id: int
    config_key: str
    config_value: Dict[str, GroupedConfigurationItem]
    data_type: str
    description: Optional[str] = None
    is_sensitive: bool
    is_active: bool
    category: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GroupedConfigurationUpdate(BaseModel):
    config_value: Dict[str, GroupedConfigurationItem]

# --- APIRouter 생성 ---
router = APIRouter()

# --- API 엔드포인트 정의 ---



@router.get("/configurations/grouped/{config_key}", response_model=GroupedConfigurationResponse)
def get_grouped_configuration(
    config_key: str,
    db: Session = Depends(get_db)
):
    """그룹화된 JSON 설정을 조회합니다."""
    import json
    
    print(f"DEBUG: Looking for config_key: {config_key}")
    
    config = db.query(AppConfiguration).filter(
        AppConfiguration.config_key == config_key,
        AppConfiguration.data_type == 'json',
        AppConfiguration.is_active == True
    ).first()
    
    print(f"DEBUG: Config found: {config is not None}")
    if config:
        print(f"DEBUG: Config details - key: {config.config_key}, type: {config.data_type}, active: {config.is_active}")
    
    if not config:
        # 모든 JSON 설정 확인
        all_json_configs = db.query(AppConfiguration).filter(
            AppConfiguration.data_type == 'json'
        ).all()
        print(f"DEBUG: All JSON configs: {[c.config_key for c in all_json_configs]}")
        print(f"DEBUG: Database engine: {db.bind}")
        raise HTTPException(status_code=404, detail=f"Grouped configuration not found. Available JSON configs: {[c.config_key for c in all_json_configs]}")
    
    try:
        # JSON 파싱
        json_data = json.loads(config.config_value)
        
        # GroupedConfigurationItem 형태로 변환
        grouped_items = {}
        for key, value_info in json_data.items():
            if isinstance(value_info, dict) and 'value' in value_info:
                grouped_items[key] = GroupedConfigurationItem(
                    value=value_info['value'],
                    type=value_info.get('type', 'string'),
                    description=value_info.get('description'),
                    is_sensitive=value_info.get('is_sensitive', False),
                    is_active=value_info.get('is_active', True)
                )
        
        return GroupedConfigurationResponse(
            config_id=config.config_id,
            config_key=config.config_key,
            config_value=grouped_items,
            data_type=config.data_type,
            description=config.description,
            is_sensitive=config.is_sensitive,
            is_active=config.is_active,
            category=config.category,
            created_at=config.created_at,
            updated_at=config.updated_at
        )
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON configuration")

@router.put("/configurations/grouped/{config_key}", response_model=GroupedConfigurationResponse)
def update_grouped_configuration(
    config_key: str,
    update_data: GroupedConfigurationUpdate,
    db: Session = Depends(get_db)
):
    """그룹화된 JSON 설정을 업데이트합니다."""
    import json
    
    config = db.query(AppConfiguration).filter(
        AppConfiguration.config_key == config_key,
        AppConfiguration.data_type == 'json',
        AppConfiguration.is_active == True
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Grouped configuration not found")
    
    try:
        # GroupedConfigurationItem을 JSON 형태로 변환
        json_data = {}
        for key, item in update_data.config_value.items():
            json_data[key] = {
                'value': item.value,
                'type': item.type,
                'description': item.description,
                'is_sensitive': item.is_sensitive,
                'is_active': item.is_active
            }
        
        # JSON 문자열로 변환하여 저장
        config.config_value = json.dumps(json_data, indent=2)
        config.updated_at = datetime.now()
        
        db.commit()
        db.refresh(config)
        
        # 응답용 데이터 재구성
        grouped_items = {}
        for key, item in update_data.config_value.items():
            grouped_items[key] = item
        
        return GroupedConfigurationResponse(
            config_id=config.config_id,
            config_key=config.config_key,
            config_value=grouped_items,
            data_type=config.data_type,
            description=config.description,
            is_sensitive=config.is_sensitive,
            is_active=config.is_active,
            category=config.category,
            created_at=config.created_at,
            updated_at=config.updated_at
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update configuration: {str(e)}")

@router.get("/configurations/grouped", response_model=List[GroupedConfigurationResponse])
def get_all_grouped_configurations(db: Session = Depends(get_db)):
    """모든 그룹화된 JSON 설정을 조회합니다."""
    import json
    
    configs = db.query(AppConfiguration).filter(
        AppConfiguration.data_type == 'json',
        AppConfiguration.is_active == True
    ).all()
    
    result = []
    for config in configs:
        try:
            json_data = json.loads(config.config_value)
            grouped_items = {}
            for key, value_info in json_data.items():
                if isinstance(value_info, dict) and 'value' in value_info:
                    grouped_items[key] = GroupedConfigurationItem(
                        value=value_info['value'],
                        type=value_info.get('type', 'string'),
                        description=value_info.get('description'),
                        is_sensitive=value_info.get('is_sensitive', False),
                        is_active=value_info.get('is_active', True)
                    )
            
            result.append(GroupedConfigurationResponse(
                config_id=config.config_id,
                config_key=config.config_key,
                config_value=grouped_items,
                data_type=config.data_type,
                description=config.description,
                is_sensitive=config.is_sensitive,
                is_active=config.is_active,
                category=config.category,
                created_at=config.created_at,
                updated_at=config.updated_at
            ))
        except json.JSONDecodeError:
            continue  # 잘못된 JSON은 건너뛰기
    
    return result



