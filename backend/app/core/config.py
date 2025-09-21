# app/core/config.py
import os
import json
import logging
from datetime import datetime, date
from typing import Optional, Any, Dict

from dotenv import load_dotenv
 

# Global dictionary to store application configurations
GLOBAL_APP_CONFIGS: Dict[str, Any] = {} 

# ConfigLoader import (나중에 초기화)
config_loader = None

# Centralized ConfigManager
try:
    from .config_manager import ConfigManager
    config_manager = ConfigManager()
except Exception:
    # Fallback for early import stages; will be set during app init
    config_manager = None

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# SQLAlchemy 로깅 레벨 조정 (너무 많은 로그 방지)
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

# .env 파일 로드 (프로젝트 루트에서 로드)
import pathlib
project_root = pathlib.Path(__file__).parent.parent.parent.parent
load_dotenv(dotenv_path=project_root / '.env')

# External API Keys
ALPHA_VANTAGE_API_KEY_1 = os.getenv("ALPHA_VANTAGE_API_KEY_1")
ALPHA_VANTAGE_API_KEY_2 = os.getenv("ALPHA_VANTAGE_API_KEY_2")
ALPHA_VANTAGE_API_KEY_3 = os.getenv("ALPHA_VANTAGE_API_KEY_3")
FMP_API_KEY = os.getenv("FMP_API_KEY")
COINMARKETCAP_API_KEY = os.getenv("COINMARKETCAP_API_KEY")

# 추가 API Keys
BINANCE_API_KEY = os.getenv("BINANCE_API_KEY")
BINANCE_SECRET_KEY = os.getenv("BINANCE_SECRET_KEY")
COINBASE_API_KEY = os.getenv("COINBASE_API_KEY")
COINBASE_SECRET_KEY = os.getenv("COINBASE_SECRET_KEY")
COIN_GECKO_API_KEY = os.getenv("COIN_GECKO_API_KEY")
COIN_MARKET_API_KEY = os.getenv("COIN_MARKET_API_KEY")
EODHD_API_KEY = os.getenv("EODHD_API_KEY")
TIINGO_API_KEY = os.getenv("TIINGO_API_KEY")
TOKEN_METRICS_API_KEY = os.getenv("TOKEN_METRICS_API_KEY")
TWELVEDATA_API_KEY = os.getenv("TWELVEDATA_API_KEY")

# Alpaca API 설정
ALPACA_API_KEY = os.getenv("ALPACA_API_KEY")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")
ALPACA_PAPER = os.getenv("ALPACA_PAPER", "true").lower() == "true"

# Redis 설정
REDIS_HOST = os.getenv("REDIS_HOST", "redis")  # Docker Compose에서는 'redis' 서비스명 사용
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

# API Request Settings
API_REQUEST_TIMEOUT_SECONDS = int(os.getenv("API_REQUEST_TIMEOUT_SECONDS", "30"))
MAX_API_RETRY_ATTEMPTS = int(os.getenv("MAX_API_RETRY_ATTEMPTS", "3"))

# 데이터베이스 설정
from .database import SessionLocal

# 비트코인 Asset ID 전역 변수
BITCOIN_ASSET_ID = 1

# Function to load application configurations from DB and environment variables
def load_and_set_global_configs():
    """Loads application configurations from the database and environment variables into GLOBAL_APP_CONFIGS."""
    global config_loader
    
    # ConfigLoader 초기화
    from .config_loader import config_loader as cl
    config_loader = cl
    
    # First, load environment variables
    GLOBAL_APP_CONFIGS.update({
        "ALPHA_VANTAGE_API_KEY_1": ALPHA_VANTAGE_API_KEY_1,
        "ALPHA_VANTAGE_API_KEY_2": ALPHA_VANTAGE_API_KEY_2,
        "ALPHA_VANTAGE_API_KEY_3": ALPHA_VANTAGE_API_KEY_3,
        "ALPHA_VANTAGE_API_KEYS": [ALPHA_VANTAGE_API_KEY_1, ALPHA_VANTAGE_API_KEY_2, ALPHA_VANTAGE_API_KEY_3],
        "FMP_API_KEY": FMP_API_KEY,
        "COINMARKETCAP_API_KEY": COINMARKETCAP_API_KEY,
        "BINANCE_API_KEY": BINANCE_API_KEY,
        "BINANCE_SECRET_KEY": BINANCE_SECRET_KEY,
        "COINBASE_API_KEY": COINBASE_API_KEY,
        "COINBASE_SECRET_KEY": COINBASE_SECRET_KEY,
        "COIN_GECKO_API_KEY": COIN_GECKO_API_KEY,
        "COIN_MARKET_API_KEY": COIN_MARKET_API_KEY,
        "EODHD_API_KEY": EODHD_API_KEY,
        "TIINGO_API_KEY": TIINGO_API_KEY,
        "TOKEN_METRICS_API_KEY": TOKEN_METRICS_API_KEY,
        "TWELVEDATA_API_KEY": TWELVEDATA_API_KEY,
        "ALPACA_API_KEY": ALPACA_API_KEY,
        "ALPACA_SECRET_KEY": ALPACA_SECRET_KEY,
        "ALPACA_PAPER": ALPACA_PAPER,
        "API_REQUEST_TIMEOUT_SECONDS": API_REQUEST_TIMEOUT_SECONDS,
        "MAX_API_RETRY_ATTEMPTS": MAX_API_RETRY_ATTEMPTS,
        "BITCOIN_ASSET_ID": BITCOIN_ASSET_ID,
        "REDIS_HOST": REDIS_HOST,
        "REDIS_PORT": REDIS_PORT,
        "REDIS_DB": REDIS_DB,
        "REDIS_PASSWORD": REDIS_PASSWORD
    })
    
    # ConfigLoader에서 추가 설정 로드
    GLOBAL_APP_CONFIGS.update({
        "ENABLE_SEMAPHORE": config_loader.get("concurrency.enable_semaphore", True),
        "SEMAPHORE_LIMIT": config_loader.get("concurrency.semaphore_limit", 3),
        "BATCH_SIZE": config_loader.get("concurrency.batch_size", 5),
        "MAX_API_RETRY_ATTEMPTS": config_loader.get("retry.max_retry_attempts", 3),
        "RETRY_BASE_DELAY": config_loader.get("retry.base_delay", 1.0),
        "RETRY_MAX_DELAY": config_loader.get("retry.max_delay", 30.0),
        "ENABLE_JITTER": config_loader.get("retry.enable_jitter", True),
        "RATE_LIMIT_DELAY": config_loader.get("api_limits.rate_limit_delay", 0.5),
        "HISTORICAL_DATA_DAYS_PER_RUN": config_loader.get("historical_data.days_per_run", 500),
        "MAX_HISTORICAL_DAYS": config_loader.get("historical_data.max_historical_days", 10950),
        "ENABLE_HISTORICAL_BACKFILL": config_loader.get("historical_data.enable_backfill", True),
        "MIN_HISTORICAL_DATE": config_loader.get("historical_data.min_historical_date", "1999-11-01"),
        "ENABLE_IMMEDIATE_EXECUTION": config_loader.get("data_collection.enable_immediate_execution", True),
        "DATA_COLLECTION_INTERVAL_MINUTES": config_loader.get("data_collection.interval_minutes", 240),
        "DATA_COLLECTION_INTERVAL_DAILY": config_loader.get("data_collection.interval_days", 30),
    })
    
    # Then load from database (database values will override environment variables)
    from ..models import AppConfiguration
    
    db = SessionLocal()
    try:
        app_configs = db.query(AppConfiguration).filter(AppConfiguration.is_active == True).all()
        for config in app_configs:
            # Handle JSON type configurations (grouped configs)
            if config.data_type == 'json' and config.config_value:
                try:
                    # Parse JSON and extract individual settings
                    json_config = json.loads(config.config_value)
                    if isinstance(json_config, dict):
                        # Store the entire JSON config
                        GLOBAL_APP_CONFIGS[config.config_key] = json_config
                        
                        # Also extract individual settings for backward compatibility
                        for key, value_info in json_config.items():
                            if isinstance(value_info, dict) and 'value' in value_info:
                                # Extract the actual value and convert based on type
                                actual_value = value_info['value']
                                value_type = value_info.get('type', 'string')
                                
                                if value_type == 'int':
                                    GLOBAL_APP_CONFIGS[key] = int(actual_value) if actual_value is not None else 0
                                elif value_type == 'float':
                                    GLOBAL_APP_CONFIGS[key] = float(actual_value) if actual_value is not None else 0.0
                                elif value_type == 'boolean':
                                    GLOBAL_APP_CONFIGS[key] = bool(actual_value) if actual_value is not None else False
                                elif value_type == 'json':
                                    GLOBAL_APP_CONFIGS[key] = actual_value  # Already parsed JSON
                                else:  # string or other types
                                    GLOBAL_APP_CONFIGS[key] = str(actual_value) if actual_value is not None else ""
                    else:
                        # If it's not a dict, store as is
                        GLOBAL_APP_CONFIGS[config.config_key] = json_config
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse JSON config for {config.config_key}: {e}")
                    GLOBAL_APP_CONFIGS[config.config_key] = config.config_value
            else:
                # Handle non-JSON configurations (legacy individual configs)
                if config.data_type == 'int':
                    GLOBAL_APP_CONFIGS[config.config_key] = int(config.config_value) if config.config_value else 0
                elif config.data_type == 'float':
                    GLOBAL_APP_CONFIGS[config.config_key] = float(config.config_value) if config.config_value else 0.0
                elif config.data_type == 'boolean':
                    GLOBAL_APP_CONFIGS[config.config_key] = config.config_value.lower() == 'true' if config.config_value else False
                else: # string or other types
                    GLOBAL_APP_CONFIGS[config.config_key] = config.config_value
        logger.info(f"Loaded {len(GLOBAL_APP_CONFIGS)} configurations from database, environment, and config.json.")
    except Exception as e:
        logger.critical(f"Failed to load global configurations from DB: {e}", exc_info=True)
        raise # Re-raise to prevent app from starting with incomplete configs
    finally:
        db.close()

    # Optionally seed frequently used dynamic values via ConfigManager cache
    if config_manager is not None:
        try:
            GLOBAL_APP_CONFIGS.setdefault("HISTORICAL_DAYS", config_manager.get_historical_days())
            GLOBAL_APP_CONFIGS.setdefault("SEMAPHORE_LIMIT", config_manager.get_semaphore_limit())
        except Exception:
            pass

def initialize_bitcoin_asset_id():
    """비트코인 Asset ID를 초기화합니다."""
    global BITCOIN_ASSET_ID
    
    # 먼저 설정에서 가져오기 시도
    if "BITCOIN_ASSET_ID" in GLOBAL_APP_CONFIGS:
        BITCOIN_ASSET_ID = GLOBAL_APP_CONFIGS["BITCOIN_ASSET_ID"]
        logger.info(f"Loaded BITCOIN_ASSET_ID from config: {BITCOIN_ASSET_ID}")
        return
    
    # 설정에 없으면 데이터베이스에서 동적으로 찾기 (BTC 또는 BTCUSDT 지원)
    from ..models import Asset
    
    db = SessionLocal()
    try:
        # 먼저 BTC로 시도
        bitcoin_asset = db.query(Asset).filter(Asset.ticker == "BTC").first()
        if bitcoin_asset:
            BITCOIN_ASSET_ID = bitcoin_asset.asset_id
            logger.info(f"Dynamically set BITCOIN_ASSET_ID to: {BITCOIN_ASSET_ID} (BTC)")
            return
        
        # BTC가 없으면 BTCUSDT로 시도
        bitcoin_asset = db.query(Asset).filter(Asset.ticker == "BTCUSDT").first()
        if bitcoin_asset:
            BITCOIN_ASSET_ID = bitcoin_asset.asset_id
            logger.info(f"Dynamically set BITCOIN_ASSET_ID to: {BITCOIN_ASSET_ID} (BTCUSDT)")
        else:
            logger.warning("Could not find Bitcoin asset (BTC or BTCUSDT) in the database. Halving API might not work correctly.")
    except Exception as e:
        logger.error(f"Error initializing Bitcoin Asset ID: {e}", exc_info=True)
    finally:
        db.close()

 

 
