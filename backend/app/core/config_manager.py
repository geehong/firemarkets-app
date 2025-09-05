import time
import json
from typing import Any, Callable, Optional, List, Dict

from app.core.database import SessionLocal
from app.models.asset import AppConfiguration
from app.utils.logger import logger

def _str_to_bool(s: Any) -> bool:
    """Safely convert a string or other types to a boolean."""
    if isinstance(s, bool):
        return s
    if not isinstance(s, str):
        return bool(s)
    return s.lower() in ('true', '1', 't', 'y', 'yes')

class ConfigManager:
    """
    Centralized configuration manager backed by the DB with a simple TTL cache.
    It provides type-safe methods to access application-wide settings.
    """

    def __init__(self, default_ttl_seconds: int = 300):
        self._cache: dict[str, tuple[float, Any]] = {}
        self._ttl = default_ttl_seconds

    def _now(self) -> float:
        return time.time()

    def _get_cached(self, key: str) -> Optional[Any]:
        item = self._cache.get(key)
        if not item:
            return None
        ts, value = item
        if self._now() - ts <= self._ttl:
            return value
        # Expired
        self._cache.pop(key, None)
        return None

    def _set_cache(self, key: str, value: Any) -> None:
        self._cache[key] = (self._now(), value)
        logger.debug(f"Cached configuration for '{key}': {value}")

    def _get_config(self, key: str, default: Any, cast: Callable[[Any], Any]) -> Any:
        cached = self._get_cached(key)
        if cached is not None:
            return cached

        db = SessionLocal()
        try:
            row = db.query(AppConfiguration).filter(
                AppConfiguration.config_key == key,
                AppConfiguration.is_active == True
            ).first()
            
            if row is None or row.config_value is None:
                self._set_cache(key, default)
                return default
            
            try:
                value = cast(row.config_value)
            except (ValueError, TypeError, json.JSONDecodeError) as e:
                logger.warning(f"Failed to cast config value for '{key}'. Using default. Error: {e}")
                value = default
                
            self._set_cache(key, value)
            return value
        finally:
            db.close()

    # --- General Settings ---
    def get_batch_size(self) -> int:
        return self._get_config("BATCH_SIZE", 1000, int)

    # --- API Client Settings ---
    def get_api_timeout(self) -> int:
        return self._get_config("API_REQUEST_TIMEOUT_SECONDS", 30, int)

    def get_retry_attempts(self) -> int:
        return self._get_config("MAX_API_RETRY_ATTEMPTS", 3, int)
        
    def get_semaphore_limit(self) -> int:
        return self._get_config("SEMAPHORE_LIMIT", 8, int)
    
    def is_semaphore_enabled(self) -> bool:
        """Enable/disable use of semaphore in collectors."""
        return self._get_config("ENABLE_SEMAPHORE", True, _str_to_bool)
    
    def get_api_keys(self) -> Dict[str, str]:
        """Dynamically fetches all active API keys from the database."""
        cached = self._get_cached("ALL_API_KEYS")
        if cached is not None:
            return cached

        db = SessionLocal()
        try:
            rows = db.query(AppConfiguration).filter(
                AppConfiguration.category == 'api_keys',
                AppConfiguration.is_active == True
            ).all()
            
            keys = {row.config_key: row.config_value for row in rows}
            self._set_cache("ALL_API_KEYS", keys)
            return keys
        finally:
            db.close()

    # --- Scheduler Settings ---
    def is_scheduler_enabled(self) -> bool:
        return self._get_config("scheduler_enabled", True, _str_to_bool)
        
    def is_immediate_execution_enabled(self) -> bool:
        return self._get_config("ENABLE_IMMEDIATE_EXECUTION", False, _str_to_bool)

    # --- Data Collection Enable/Disable Flags ---
    def is_stock_collection_enabled(self) -> bool:
        return self._get_config("ENABLE_STOCK_COLLECTION", True, _str_to_bool)
        
    def is_etf_collection_enabled(self) -> bool:
        return self._get_config("ENABLE_ETF_COLLECTION", True, _str_to_bool)
        
    def is_crypto_collection_enabled(self) -> bool:
        return self._get_config("ENABLE_CRYPTO_COLLECTION", True, _str_to_bool)
        
    def is_onchain_collection_enabled(self) -> bool:
        return self._get_config("ENABLE_ONCHAIN_COLLECTION", True, _str_to_bool)
        
    def is_index_collection_enabled(self) -> bool:
        return self._get_config("ENABLE_INDEX_COLLECTION", True, _str_to_bool)
        
    def is_ohlcv_collection_enabled(self) -> bool:
        return self._get_config("ENABLE_OHLCV_COLLECTION", True, _str_to_bool)
        
    def is_world_assets_collection_enabled(self) -> bool:
        return self._get_config("ENABLE_WORLD_ASSETS_COLLECTION", True, _str_to_bool)

    # --- OHLCV Specific Settings ---
    def get_historical_days_per_run(self) -> int:
        return self._get_config("HISTORICAL_DATA_DAYS_PER_RUN", 165, int)
        
    def get_max_historical_days(self) -> int:
        return self._get_config("MAX_HISTORICAL_DAYS", 10950, int)

    def is_historical_backfill_enabled(self) -> bool:
        return self._get_config("ENABLE_HISTORICAL_BACKFILL", True, _str_to_bool)
        
    def is_multiple_intervals_enabled(self) -> bool:
        return self._get_config("ENABLE_MULTIPLE_INTERVALS", True, _str_to_bool)
        
    def get_ohlcv_intervals(self) -> List[str]:
        intervals_str = self._get_config("OHLCV_DATA_INTERVALS", '["1d","4h"]', str)
        try:
            intervals = json.loads(intervals_str)
            return [str(item) for item in intervals]
        except json.JSONDecodeError:
            logger.warning(f"Could not parse OHLCV_DATA_INTERVALS JSON: {intervals_str}. Using default.")
            return ["1d", "4h"]
    
    def is_4h_collection_enabled(self) -> bool:
        """4시간 데이터 수집이 활성화되어 있는지 확인"""
        intervals = self.get_ohlcv_intervals()
        return "4h" in intervals

    # --- On-chain Specific Settings ---
    def get_onchain_api_delay(self) -> int:
        return self._get_config("ONCHAIN_API_DELAY_SECONDS", 480, int)

    def get_onchain_semaphore_limit(self) -> int:
        return self._get_config("ONCHAIN_SEMAPHORE_LIMIT", 1, int)

    def get_onchain_collection_interval_hours(self) -> int:
        return self._get_config("ONCHAIN_COLLECTION_INTERVAL_HOURS", 24, int)
        
    def get_onchain_api_priority(self) -> List[str]:
        priority_str = self._get_config("ONCHAIN_API_PRIORITY", "coingecko,coinmarketcap,bitcoin-data", str)
        return [api.strip() for api in priority_str.split(',')]
        
    def is_onchain_metric_enabled(self, metric_key: str) -> bool:
        """Dynamically checks if a specific on-chain metric collection is enabled."""
        # e.g., metric_key = "MVRV_ZSCORE" -> config_key = "ONCHAIN_COLLECT_MVRV_ZSCORE"
        config_key = f"ONCHAIN_COLLECT_{metric_key.upper()}"
        return self._get_config(config_key, True, _str_to_bool)
    
    def get_enabled_onchain_metrics(self) -> List[str]:
        """Returns a list of enabled on-chain metrics for collection."""
        # 기본적으로 MVRV-Z-Score를 활성화
        default_metrics = ["mvrv_z_score"]
        
        # 설정에서 활성화된 메트릭들을 확인
        enabled_metrics = []
        for metric in default_metrics:
            if self.is_onchain_metric_enabled(metric):
                enabled_metrics.append(metric)
        
        # 활성화된 메트릭이 없으면 기본값 반환
        if not enabled_metrics:
            logger.warning("No onchain metrics enabled, using default: mvrv_z_score")
            return default_metrics
        
        return enabled_metrics

