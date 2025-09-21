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
        print(f"DEBUG: _get_config called for key: '{key}'")
        logger.debug(f"_get_config called for key: '{key}'")
        cached = self._get_cached(key)
        if cached is not None:
            print(f"DEBUG: Returning cached value for '{key}': {cached}")
            logger.debug(f"Returning cached value for '{key}': {cached}")
            return cached

        # First, try to get from GLOBAL_APP_CONFIGS (which already has parsed JSON configs)
        try:
            import app.core.config as config_module
            global_configs = config_module.GLOBAL_APP_CONFIGS
            print(f"DEBUG: Checking GLOBAL_APP_CONFIGS for key: '{key}'")
            print(f"DEBUG: GLOBAL_APP_CONFIGS keys: {list(global_configs.keys())[:5]}")
            if key in global_configs:
                value = global_configs[key]
                print(f"DEBUG: Found '{key}' in GLOBAL_APP_CONFIGS: {value}")
                try:
                    casted_value = cast(value)
                    self._set_cache(key, casted_value)
                    logger.debug(f"Found '{key}' in GLOBAL_APP_CONFIGS: {casted_value}")
                    return casted_value
                except (ValueError, TypeError, json.JSONDecodeError) as e:
                    logger.warning(f"Failed to cast GLOBAL_APP_CONFIGS value for '{key}'. Using default. Error: {e}")
            else:
                print(f"DEBUG: Key '{key}' not found in GLOBAL_APP_CONFIGS")
        except ImportError:
            logger.warning("Could not import GLOBAL_APP_CONFIGS, falling back to database query")

        # Fallback to database query if not found in GLOBAL_APP_CONFIGS
        db = SessionLocal()
        try:
            # First, try to find the key directly (legacy individual configs)
            row = db.query(AppConfiguration).filter(
                AppConfiguration.config_key == key,
                AppConfiguration.is_active == True
            ).first()
            
            if row is not None and row.config_value is not None:
                try:
                    value = cast(row.config_value)
                    self._set_cache(key, value)
                    logger.debug(f"Found '{key}' as direct config: {value}")
                    return value
                except (ValueError, TypeError, json.JSONDecodeError) as e:
                    logger.warning(f"Failed to cast config value for '{key}'. Using default. Error: {e}")
                    self._set_cache(key, default)
                    return default
            
            # If not found anywhere, use default
            self._set_cache(key, default)
            return default
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

        # First, try to get from GLOBAL_APP_CONFIGS
        try:
            import app.core.config as config_module
            global_configs = config_module.GLOBAL_APP_CONFIGS
            if 'api_keys' in global_configs:
                api_keys_data = global_configs['api_keys']
                if isinstance(api_keys_data, dict):
                    keys = {}
                    for key_name, value_info in api_keys_data.items():
                        if isinstance(value_info, dict) and 'value' in value_info:
                            keys[key_name] = str(value_info['value'])
                    if keys:  # Only cache if we found keys
                        self._set_cache("ALL_API_KEYS", keys)
                        logger.debug(f"Found {len(keys)} API keys in GLOBAL_APP_CONFIGS")
                        return keys
        except ImportError:
            logger.warning("Could not import GLOBAL_APP_CONFIGS, falling back to database query")

        # Fallback to database query
        db = SessionLocal()
        try:
            # First, try to get from grouped JSON config
            api_keys_config = db.query(AppConfiguration).filter(
                AppConfiguration.config_key == 'api_keys',
                AppConfiguration.data_type == 'json',
                AppConfiguration.is_active == True
            ).first()
            
            if api_keys_config and api_keys_config.config_value:
                try:
                    json_data = json.loads(api_keys_config.config_value)
                    if isinstance(json_data, dict):
                        keys = {}
                        for key_name, value_info in json_data.items():
                            if isinstance(value_info, dict) and 'value' in value_info:
                                keys[key_name] = str(value_info['value'])
                        if keys:  # Only cache if we found keys
                            self._set_cache("ALL_API_KEYS", keys)
                            return keys
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse API keys JSON: {e}")
            
            # Fallback to legacy individual API key configs
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

    def get_scheduler_config(self) -> Optional[str]:
        """Returns raw JSON string for unified scheduler configuration, if any.

        The value is stored under config_key 'SCHEDULER_CONFIG'. When absent,
        returns None so callers can safely fallback to legacy interval scheduling.
        """
        value = self._get_config("SCHEDULER_CONFIG", None, str)
        return value

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
        # API 제한 고려: 시간당 3개, 일일 40개
        # 우선순위별 메트릭 그룹 (하루 2-3회 수집 가능)
        priority_metrics = {
            "high": ["mvrv_z_score", "nupl", "sopr"],  # 핵심 메트릭 (3개)
            "medium": ["realized_price", "hashrate", "difficulty"],  # 네트워크 메트릭 (3개)
            "low": ["etf_btc_total", "etf_btc_flow", "open_interest_futures"]  # 시장 메트릭 (3개)
        }
        
        # 기본적으로 high 우선순위만 활성화 (시간당 3개 제한 고려)
        default_metrics = priority_metrics["high"]
        
        # 설정에서 활성화된 메트릭들을 확인
        enabled_metrics = []
        for metric in default_metrics:
            if self.is_onchain_metric_enabled(metric):
                enabled_metrics.append(metric)
        
        # 활성화된 메트릭이 없으면 기본값 반환
        if not enabled_metrics:
            logger.warning("No onchain metrics enabled, using default high priority metrics")
            return default_metrics
        
        return enabled_metrics

