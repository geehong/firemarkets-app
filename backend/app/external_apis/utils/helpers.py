"""
Common helper functions for API clients.
"""
import logging
from typing import Optional, Any, List, Dict
from datetime import datetime

logger = logging.getLogger(__name__)


def safe_float(value: Any, default: float = None) -> Optional[float]:
    """Safely convert value to float, treating 0 values as invalid"""
    if value is None:
        return default
    
    # 0, "0", 0.0 등은 None으로 처리 (가격 데이터에서 0은 유효하지 않음)
    if value == 0 or value == "0" or value == 0.0:
        return None
        
    try:
        result = float(value)
        # 변환된 결과가 0이면 None 반환
        if result == 0:
            return None
        return result
    except (ValueError, TypeError):
        return default


def safe_int(value: Any, default: int = None) -> Optional[int]:
    """Safely convert value to integer"""
    if value is None:
        return default
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return default


def safe_date_parse(date_str: str) -> Optional[datetime]:
    """Safely parse date string with multiple format support"""
    if not date_str:
        return None
    
    # 여러 날짜 형식 지원
    formats = [
        '%Y-%m-%d',  # 2025-08-22
        '%Y-%m-%dT%H:%M:%S.%fZ',  # 2025-08-22T00:00:00.000Z (Tiingo)
        '%Y-%m-%dT%H:%M:%SZ',     # 2025-08-22T00:00:00Z
        '%Y-%m-%d %H:%M:%S',      # 2025-08-22 00:00:00
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    
    # 모든 형식 실패 시 None 반환
    logger.warning(f"Unable to parse date: {date_str}")
    return None


def safe_timestamp_parse(timestamp_ms: int) -> Optional[datetime]:
    """Safely parse Unix timestamp (milliseconds) to datetime"""
    if not timestamp_ms:
        return None
    try:
        # 밀리초 단위 Unix timestamp를 사용
        return datetime.fromtimestamp(timestamp_ms / 1000)
    except (ValueError, TypeError):
        return None


def calculate_change_percent(close: float, open_price: float) -> Optional[float]:
    """Calculate percentage change"""
    if close is None or open_price is None or open_price == 0:
        return None
    
    return ((close - open_price) / open_price) * 100


def normalize_symbol(symbol: str) -> str:
    """Normalize symbol to uppercase"""
    return symbol.upper() if symbol else ""


def validate_symbol(symbol: str) -> bool:
    """Validate if symbol is not empty and properly formatted"""
    if not symbol or not isinstance(symbol, str):
        return False
    return len(symbol.strip()) > 0


def standardize_dataframe(data: List[Dict[str, Any]], source: str) -> List[Dict[str, Any]]:
    """
    Standardize multiple API responses to common DataFrame format.
    
    Args:
        data: List of data dictionaries from API
        source: Source API name for identification
        
    Returns:
        Standardized list of data dictionaries
    """
    if not data:
        return []
    
    standardized = []
    for item in data:
        # Add source information
        item['source'] = source
        item['timestamp_utc'] = item.get('timestamp_utc') or item.get('timestamp') or item.get('date')
        
        # Ensure all required fields exist
        required_fields = ['open_price', 'high_price', 'low_price', 'close_price', 'volume']
        for field in required_fields:
            if field not in item:
                item[field] = None
        
        standardized.append(item)
    
    return standardized
