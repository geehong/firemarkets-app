# app/core/config.py
import os
import logging
from datetime import datetime, date
from typing import Optional, Any

from dotenv import load_dotenv
from pydantic import BaseModel, Field, AliasChoices

# Global dictionary to store application configurations
GLOBAL_APP_CONFIGS = {}

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# SQLAlchemy 로깅 레벨 조정 (너무 많은 로그 방지)
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

# .env 파일 로드 (프로젝트 루트에서 로드)
load_dotenv(dotenv_path='.env')

# External API Keys
ALPHA_VANTAGE_API_KEY_1 = os.getenv("ALPHA_VANTAGE_API_KEY_1")
ALPHA_VANTAGE_API_KEY_2 = os.getenv("ALPHA_VANTAGE_API_KEY_2")
ALPHA_VANTAGE_API_KEY_3 = os.getenv("ALPHA_VANTAGE_API_KEY_3")
FMP_API_KEY = os.getenv("FMP_API_KEY")
COINMARKETCAP_API_KEY = os.getenv("COINMARKETCAP_API_KEY")

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
    from ..models import AppConfiguration
    
    # First, load environment variables
    GLOBAL_APP_CONFIGS.update({
        "ALPHA_VANTAGE_API_KEY_1": ALPHA_VANTAGE_API_KEY_1,
        "ALPHA_VANTAGE_API_KEY_2": ALPHA_VANTAGE_API_KEY_2,
        "ALPHA_VANTAGE_API_KEY_3": ALPHA_VANTAGE_API_KEY_3,
        "ALPHA_VANTAGE_API_KEYS": [ALPHA_VANTAGE_API_KEY_1, ALPHA_VANTAGE_API_KEY_2, ALPHA_VANTAGE_API_KEY_3],
        "FMP_API_KEY": FMP_API_KEY,
        "COINMARKETCAP_API_KEY": COINMARKETCAP_API_KEY,
        "API_REQUEST_TIMEOUT_SECONDS": API_REQUEST_TIMEOUT_SECONDS,
        "MAX_API_RETRY_ATTEMPTS": MAX_API_RETRY_ATTEMPTS,
        "BITCOIN_ASSET_ID": BITCOIN_ASSET_ID
    })
    
    # Then load from database (database values will override environment variables)
    db = SessionLocal()
    try:
        app_configs = db.query(AppConfiguration).filter(AppConfiguration.is_active == True).all()
        for config in app_configs:
            # Convert value based on data_type
            if config.data_type == 'int':
                GLOBAL_APP_CONFIGS[config.config_key] = int(config.config_value) if config.config_value else 0
            elif config.data_type == 'float':
                GLOBAL_APP_CONFIGS[config.config_key] = float(config.config_value) if config.config_value else 0.0
            elif config.data_type == 'boolean':
                GLOBAL_APP_CONFIGS[config.config_key] = config.config_value.lower() == 'true' if config.config_value else False
            else: # string or other types
                GLOBAL_APP_CONFIGS[config.config_key] = config.config_value
        logger.info(f"Loaded {len(GLOBAL_APP_CONFIGS)} configurations from database and environment.")
    except Exception as e:
        logger.critical(f"Failed to load global configurations from DB: {e}", exc_info=True)
        raise # Re-raise to prevent app from starting with incomplete configs
    finally:
        db.close()

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

def setup_scheduler_jobs():
    """스케줄러 작업들을 설정에 따라 등록합니다."""
    from ..collectors import OHLCVCollector, OnchainCollector, StockCollector, ETFCollector, TechnicalCollector, CryptoDataCollector, WorldAssetsCollector
    from .websocket import scheduler
    import asyncio
    
    # 비동기 함수를 동기적으로 실행하는 래퍼 함수들
    def run_ohlcv_collection_sync():
        """OHLCV 데이터 수집 작업을 동기적으로 실행"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            collector = OHLCVCollector()
            loop.run_until_complete(collector.collect_with_settings())
        except Exception as e:
            logger.error(f"Error in OHLCV data collection: {e}", exc_info=True)
        finally:
            loop.close()
    
    def run_stock_collection_sync():
        """주식 데이터 수집 작업을 동기적으로 실행"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            collector = StockCollector()
            loop.run_until_complete(collector.collect_with_settings())
        except Exception as e:
            logger.error(f"Error in stock data collection: {e}", exc_info=True)
        finally:
            loop.close()
    
    def run_etf_collection_sync():
        """ETF 데이터 수집 작업을 동기적으로 실행"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            collector = ETFCollector()
            loop.run_until_complete(collector.collect_with_settings())
        except Exception as e:
            logger.error(f"Error in ETF data collection: {e}", exc_info=True)
        finally:
            loop.close()
    
    def run_onchain_collection_sync():
        """온체인 데이터 수집 작업을 동기적으로 실행"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            collector = OnchainCollector()
            loop.run_until_complete(collector.collect_with_settings())
        except Exception as e:
            logger.error(f"Error in onchain data collection: {e}", exc_info=True)
        finally:
            loop.close()
    
    def run_crypto_collection_sync():
        """크립토 데이터 수집 작업을 동기적으로 실행"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            collector = CryptoDataCollector()
            loop.run_until_complete(collector.collect_with_settings())
        except Exception as e:
            logger.error(f"Error in crypto data collection: {e}", exc_info=True)
        finally:
            loop.close()
    
    def run_world_assets_collection_sync():
        """세계 자산 데이터 수집 작업을 동기적으로 실행"""
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            collector = WorldAssetsCollector()
            loop.run_until_complete(collector.collect_with_settings())
        except Exception as e:
            logger.error(f"Error in world assets collection: {e}", exc_info=True)
        finally:
            loop.close()
    
    # 메인 데이터 수집 작업 등록 (데이터베이스 설정 사용)
    schedule_interval_minutes = GLOBAL_APP_CONFIGS.get("DATA_COLLECTION_INTERVAL_MINUTES", 240)
    
    try:
        # 설정에서 수집 주기 가져오기
        frequent_interval_minutes = GLOBAL_APP_CONFIGS.get("DATA_COLLECTION_INTERVAL_MINUTES", 240)
        daily_interval_days = GLOBAL_APP_CONFIGS.get("DATA_COLLECTION_INTERVAL_DAILY", 30)
        
        # 즉시 실행 작업 제거 - 주기적 실행 작업만 등록
        # OHLCV 데이터 수집 (자주 수집)
        scheduler.add_job(
            run_ohlcv_collection_sync,
            'interval',
            minutes=frequent_interval_minutes,
            id='periodic_ohlcv_fetch',
            replace_existing=True,
            misfire_grace_time=300
        )
        
        # 세계 자산 데이터 수집 (자주 수집)
        scheduler.add_job(
            run_world_assets_collection_sync,
            'interval',
            minutes=frequent_interval_minutes,
            id='periodic_world_assets_fetch',
            replace_existing=True,
            misfire_grace_time=300
        )
        
        # 온체인 데이터 수집 (자주 수집)
        scheduler.add_job(
            run_onchain_collection_sync,
            'interval',
            minutes=frequent_interval_minutes,
            id='periodic_onchain_fetch',
            replace_existing=True,
            misfire_grace_time=300
        )
        
        # 주식 데이터 수집 (덜 자주 수집)
        scheduler.add_job(
            run_stock_collection_sync,
            'interval',
            days=daily_interval_days,
            id='periodic_stock_fetch',
            replace_existing=True,
            misfire_grace_time=300
        )
        
        # ETF 데이터 수집 (덜 자주 수집)
        scheduler.add_job(
            run_etf_collection_sync,
            'interval',
            days=daily_interval_days,
            id='periodic_etf_fetch',
            replace_existing=True,
            misfire_grace_time=300
        )
        
        # 크립토 데이터 수집 (덜 자주 수집)
        scheduler.add_job(
            run_crypto_collection_sync,
            'interval',
            days=daily_interval_days,
            id='periodic_crypto_fetch',
            replace_existing=True,
            misfire_grace_time=300
        )
        
        logger.info(f"Scheduler jobs configured with {frequent_interval_minutes} minute intervals for frequent jobs and {daily_interval_days} days for daily jobs")
        
    except Exception as e:
        logger.error(f"Error setting up scheduler jobs: {e}", exc_info=True)

# Utility functions
def safe_float(value, default=None):
    """안전한 float 변환"""
    if value is None or value == "None" or value == "N/A" or value == "":
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default

def safe_date_parse(date_str, fmt='%Y-%m-%d', default=None):
    """안전한 날짜 파싱"""
    if not date_str or date_str == "None" or date_str == "N/A":
        return default
    try:
        return datetime.strptime(date_str, fmt).date()
    except (ValueError, TypeError):
        return default

def safe_int(value: Any, default: Optional[int] = None) -> Optional[int]:
    """안전한 정수 변환"""
    if value is None or value == "None" or value == "N/A" or value == "":
        return default
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return default

def safe_datetime_parse(datetime_str: Any, fmt: str = '%Y-%m-%d %H:%M:%S', default: Optional[datetime] = None) -> Optional[datetime]:
    """안전한 datetime 파싱"""
    if not datetime_str or datetime_str == "None" or datetime_str == "N/A":
        return default
    try:
        return datetime.strptime(str(datetime_str), fmt)
    except (ValueError, TypeError):
        return default

def safe_string(value: Any, default: str = "") -> str:
    """안전한 문자열 변환"""
    if value is None or value == "None" or value == "N/A":
        return default
    return str(value)

def safe_boolean(value: Any, default: bool = False) -> bool:
    """안전한 boolean 변환"""
    if value is None or value == "None" or value == "N/A":
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ['true', '1', 'yes', 'on']
    if isinstance(value, (int, float)):
        return bool(value)
    return default

def format_number(value: float, decimal_places: int = 2) -> str:
    """숫자 포맷팅"""
    try:
        return f"{value:,.{decimal_places}f}"
    except (ValueError, TypeError):
        return "0.00"

def format_percentage(value: float, decimal_places: int = 2) -> str:
    """퍼센트 포맷팅"""
    try:
        return f"{value:.{decimal_places}f}%"
    except (ValueError, TypeError):
        return "0.00%"

def format_currency(value: float, currency: str = "USD", decimal_places: int = 2) -> str:
    """통화 포맷팅"""
    try:
        return f"{currency} {value:,.{decimal_places}f}"
    except (ValueError, TypeError):
        return f"{currency} 0.00"

def truncate_string(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """문자열 자르기"""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix

def validate_email(email: str) -> bool:
    """이메일 검증"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_url(url: str) -> bool:
    """URL 검증"""
    import re
    pattern = r'^https?://(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?)?$'
    return re.match(pattern, url) is not None

async def safe_emit(event, data):
    """안전한 Socket.IO 이벤트 전송"""
    try:
        await sio.emit(event, data)
    except Exception as e:
        logger.error(f"Socket.IO emit error: {e}")
