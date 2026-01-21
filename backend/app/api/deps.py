# app/api/deps.py
from typing import Generator
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.database import get_postgres_db
from ..core.config import GLOBAL_APP_CONFIGS

def get_current_db() -> Generator[Session, None, None]:
    """데이터베이스 세션 의존성"""
    yield from get_postgres_db()

def get_global_configs():
    """전역 설정 의존성"""
    return GLOBAL_APP_CONFIGS






