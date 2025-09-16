"""
Configuration loader for external config.json and global app configs.
"""
import json
import os
import logging
from typing import Any, Dict, Optional
from pathlib import Path

from .config import GLOBAL_APP_CONFIGS

logger = logging.getLogger(__name__)


class ConfigLoader:
    """하이브리드 설정 로더 - 외부 config.json 우선, 없으면 기존 설정 사용"""
    
    def __init__(self, config_path: str = "config.json"):
        self.config_path = Path(config_path)
        self.external_config = self._load_external_config()
        self.global_configs = GLOBAL_APP_CONFIGS
    
    def _load_external_config(self) -> Dict[str, Any]:
        """외부 설정 파일 로드"""
        try:
            if self.config_path.exists():
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                logger.info(f"External config loaded from {self.config_path}")
                return config
            else:
                logger.warning(f"External config file not found: {self.config_path}")
                return {}
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Failed to load external config: {e}")
            return {}
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        설정 값 조회 (데이터베이스 우선, 외부 설정은 기본값)
        
        Args:
            key: 설정 키 (점 표기법 지원: "data_collection.interval_minutes")
            default: 기본값
        
        Returns:
            설정 값
        """
        keys = key.split('.')
        
        # 데이터베이스 설정에서 먼저 조회
        value = self.global_configs
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                value = None
                break
        
        if value is not None:
            return value
        
        # 데이터베이스에 없으면 외부 설정에서 조회
        value = self.external_config
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value if value is not None else default
    
    def reload(self) -> Dict[str, Any]:
        """설정 재로드"""
        self.external_config = self._load_external_config()
        return self.external_config
    
    def get_all(self) -> Dict[str, Any]:
        """모든 설정 반환 (외부 설정 + 기존 설정 병합)"""
        merged = self.global_configs.copy()
        
        def merge_dicts(target: Dict, source: Dict, prefix: str = ""):
            for key, value in source.items():
                full_key = f"{prefix}.{key}" if prefix else key
                if isinstance(value, dict) and key in target and isinstance(target[key], dict):
                    merge_dicts(target[key], value, full_key)
                else:
                    target[key] = value
        
        merge_dicts(merged, self.external_config)
        return merged
    
    def update_external_config(self, updates: Dict[str, Any]) -> bool:
        """외부 설정 파일 업데이트"""
        try:
            # 기존 설정 로드
            current_config = self._load_external_config()
            
            # 업데이트 적용
            def update_nested_dict(target: Dict, source: Dict):
                for key, value in source.items():
                    if isinstance(value, dict) and key in target and isinstance(target[key], dict):
                        update_nested_dict(target[key], value)
                    else:
                        target[key] = value
            
            update_nested_dict(current_config, updates)
            
            # 파일에 저장
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(current_config, f, indent=2, ensure_ascii=False)
            
            # 메모리 업데이트
            self.external_config = current_config
            
            logger.info(f"External config updated: {self.config_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update external config: {e}")
            return False
    
    def update_database_config(self, key: str, value: Any, data_type: str = 'string') -> bool:
        """데이터베이스 설정 업데이트 및 config.json 동기화"""
        try:
            from ..models import AppConfiguration
            from ..core.database import SessionLocal
            
            db = SessionLocal()
            
            # 데이터베이스 업데이트
            config = db.query(AppConfiguration).filter(
                AppConfiguration.config_key == key
            ).first()
            
            if config:
                config.config_value = str(value)
                config.data_type = data_type
            else:
                config = AppConfiguration(
                    config_key=key,
                    config_value=str(value),
                    data_type=data_type,
                    is_active=True
                )
                db.add(config)
            
            db.commit()
            
            # GLOBAL_APP_CONFIGS 업데이트
            if data_type == 'int':
                GLOBAL_APP_CONFIGS[key] = int(value) if value else 0
            elif data_type == 'float':
                GLOBAL_APP_CONFIGS[key] = float(value) if value else 0.0
            elif data_type == 'boolean':
                GLOBAL_APP_CONFIGS[key] = str(value).lower() == 'true' if value else False
            else:
                GLOBAL_APP_CONFIGS[key] = str(value)
            
            # config.json에서 해당 키 제거 (데이터베이스 우선순위 보장)
            self._remove_from_external_config(key)
            
            logger.info(f"Database config updated: {key} = {value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update database config: {e}")
            return False
        finally:
            db.close()
    
    def _remove_from_external_config(self, key: str):
        """config.json에서 특정 키 제거"""
        try:
            keys = key.split('.')
            config = self.external_config.copy()
            
            # 중첩된 키 제거
            current = config
            for k in keys[:-1]:
                if isinstance(current, dict) and k in current:
                    current = current[k]
                else:
                    return
            
            if isinstance(current, dict) and keys[-1] in current:
                del current[keys[-1]]
                
                # 파일에 저장
                with open(self.config_path, 'w', encoding='utf-8') as f:
                    json.dump(config, f, indent=2, ensure_ascii=False)
                
                self.external_config = config
                logger.info(f"Removed {key} from external config")
                
        except Exception as e:
            logger.error(f"Failed to remove from external config: {e}")
    
    def sync_database_to_config(self) -> bool:
        """데이터베이스 설정을 config.json에 동기화 (백업용)"""
        try:
            from ..models import AppConfiguration
            from ..core.database import SessionLocal
            
            db = SessionLocal()
            app_configs = db.query(AppConfiguration).filter(
                AppConfiguration.is_active == True
            ).all()
            
            # config.json에 데이터베이스 설정 추가
            for config in app_configs:
                if config.data_type == 'int':
                    value = int(config.config_value) if config.config_value else 0
                elif config.data_type == 'float':
                    value = float(config.config_value) if config.config_value else 0.0
                elif config.data_type == 'boolean':
                    value = config.config_value.lower() == 'true' if config.config_value else False
                else:
                    value = config.config_value
                
                self._set_nested_value(self.external_config, config.config_key, value)
            
            # 파일에 저장
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(self.external_config, f, indent=2, ensure_ascii=False)
            
            logger.info("Database configs synced to config.json")
            return True
            
        except Exception as e:
            logger.error(f"Failed to sync database to config: {e}")
            return False
        finally:
            db.close()
    
    def _set_nested_value(self, config: Dict, key: str, value: Any):
        """중첩된 키로 값을 설정"""
        keys = key.split('.')
        current = config
        
        for k in keys[:-1]:
            if k not in current:
                current[k] = {}
            current = current[k]
        
        current[keys[-1]] = value


# 전역 설정 로더 인스턴스
config_loader = ConfigLoader()


def get_config(key: str, default: Any = None) -> Any:
    """전역 설정 조회 함수"""
    return config_loader.get(key, default)


def reload_config() -> Dict[str, Any]:
    """전역 설정 재로드"""
    return config_loader.reload()


def update_config(updates: Dict[str, Any]) -> bool:
    """전역 설정 업데이트"""
    return config_loader.update_external_config(updates)


def update_database_config(key: str, value: Any, data_type: str = 'string') -> bool:
    """데이터베이스 설정 업데이트 (프론트엔드용)"""
    return config_loader.update_database_config(key, value, data_type)


def sync_database_to_config() -> bool:
    """데이터베이스 설정을 config.json에 동기화"""
    return config_loader.sync_database_to_config() 