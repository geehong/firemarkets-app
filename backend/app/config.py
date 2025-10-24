# app/config.py
import os
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """애플리케이션 설정"""
    
    # 기본 설정
    app_name: str = "Market Analyzer API"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # 데이터베이스 설정
    database_url: str = "mysql+pymysql://root:password@market_analyzer_db:3306/market_analyzer"
    
    # API 키 설정
    alpha_vantage_api_key_1: Optional[str] = None
    alpha_vantage_api_key_2: Optional[str] = None
    alpha_vantage_api_key_3: Optional[str] = None
    fmp_api_key: Optional[str] = None
    coinmarketcap_api_key: Optional[str] = None
    
    # SEC EDGAR API 설정
    edgar_user_agent_email: Optional[str] = None
    
    # 스케줄러 설정
    data_collection_interval_minutes: int = 60
    enable_ohlcv_collection: bool = True
    enable_onchain_collection: bool = True
    enable_company_info_collection: bool = True
    enable_etf_info_collection: bool = True
    enable_technical_indicators_collection: bool = False
    enable_world_assets_collection: bool = True
    
    # API 설정
    max_api_retry_attempts: int = 3
    api_request_timeout_seconds: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Allow extra fields from environment

# 전역 설정 인스턴스
settings = Settings()






