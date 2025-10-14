"""
API Key Fallback Manager
웹소켓 컨슈머에서 API 키 실패시 자동으로 다음 키로 전환하는 매니저
"""
import logging
from typing import List, Dict, Optional, Any
from app.core.config import GLOBAL_APP_CONFIGS

logger = logging.getLogger(__name__)

class APIKeyFallbackManager:
    """API 키 Fallback 관리자"""
    
    def __init__(self, provider: str):
        self.provider = provider
        self.current_key_index = 0
        self.failed_keys = set()
        
    def get_api_keys_config(self) -> Optional[List[Dict]]:
        """websocket_config에서 해당 provider의 API 키 배열 조회"""
        websocket_config = GLOBAL_APP_CONFIGS.get('websocket_config', {})
        api_keys_key = f"WEBSOCKET_{self.provider.upper()}_API_KEYS"
        
        if api_keys_key in websocket_config:
            api_keys_info = websocket_config[api_keys_key]
            if isinstance(api_keys_info, dict) and 'value' in api_keys_info:
                return api_keys_info['value']
        
        return None
    
    def get_current_key(self) -> Optional[Dict]:
        """현재 사용할 API 키 정보 반환"""
        api_keys = self.get_api_keys_config()
        if not api_keys:
            # Fallback: 기존 방식으로 환경변수에서 읽기
            logger.info(f"Using fallback API key method for {self.provider}")
            return self._get_fallback_key()
        
        # 활성화된 키들만 필터링하고 우선순위 순으로 정렬
        active_keys = [
            key for key in api_keys 
            if key.get('is_active', True) and key.get('key') not in self.failed_keys
        ]
        
        if not active_keys:
            logger.error(f"No active API keys available for {self.provider}")
            return None
        
        # 우선순위 순으로 정렬
        active_keys.sort(key=lambda x: x.get('priority', 999))
        
        # 현재 인덱스의 키 반환
        if self.current_key_index < len(active_keys):
            return active_keys[self.current_key_index]
        
        return None
    
    def mark_key_failed(self, key_info: Dict):
        """키 실패 기록 및 다음 키로 전환"""
        if key_info and 'key' in key_info:
            failed_key = key_info['key']
            self.failed_keys.add(failed_key)
            logger.warning(f"API key failed for {self.provider}: {failed_key[:10]}...")
            
            # 다음 키로 전환
            self.current_key_index += 1
            
            # 다음 키가 있는지 확인
            next_key = self.get_current_key()
            if next_key:
                logger.info(f"Switching to next API key for {self.provider}: {next_key.get('key', '')[:10]}...")
            else:
                logger.error(f"No more API keys available for {self.provider}")
    
    def reset_failures(self):
        """실패 기록 초기화 (재시작시 사용)"""
        self.failed_keys.clear()
        self.current_key_index = 0
        logger.info(f"Reset API key failures for {self.provider}")
    
    def _get_fallback_key(self) -> Optional[Dict]:
        """기존 방식으로 환경변수에서 키 읽기 (하위 호환성)"""
        # Tiingo의 경우 여러 키 지원
        if self.provider.lower() == "tiingo":
            tiingo_keys = GLOBAL_APP_CONFIGS.get("TIINGO_API_KEYS", [])
            if tiingo_keys and len(tiingo_keys) > 0:
                # 현재 인덱스의 키 반환
                if self.current_key_index < len(tiingo_keys):
                    return {"key": tiingo_keys[self.current_key_index], "priority": 1, "is_active": True}
                # 인덱스가 범위를 벗어나면 첫 번째 키 반환
                return {"key": tiingo_keys[0], "priority": 1, "is_active": True}
        
        # 기본 방식: 단일 키
        key_name = f"{self.provider.upper()}_API_KEY"
        secret_name = f"{self.provider.upper()}_SECRET_KEY"
        
        api_key = GLOBAL_APP_CONFIGS.get(key_name)
        secret_key = GLOBAL_APP_CONFIGS.get(secret_name)
        
        if api_key:
            key_info = {"key": api_key, "priority": 1, "is_active": True}
            if secret_key:
                key_info["secret"] = secret_key
            return key_info
        
        return None
    
    def get_key_info_for_logging(self) -> str:
        """로깅용 키 정보 반환 (보안을 위해 일부만 표시)"""
        current_key = self.get_current_key()
        if current_key and 'key' in current_key:
            return f"{current_key['key'][:10]}... (priority: {current_key.get('priority', 1)})"
        return "No key available"