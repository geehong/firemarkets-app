"""
데이터베이스 연결 및 설정 관리 모듈
모든 데이터베이스 관련 설정과 연결을 이 파일에서 통합 관리합니다.
"""
import os
import logging
from sqlalchemy import create_engine, text
import time
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from dotenv import load_dotenv
import greenlet

# greenlet 초기화 (SQLAlchemy 비동기 지원을 위해 필요)
greenlet.greenlet()

# 로깅 설정
logger = logging.getLogger(__name__)

# .env 파일 로드
load_dotenv()

# MySQL 데이터베이스 URL 설정
MYSQL_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://geehong:Power6100@db:3306/markets"
)

# PostgreSQL 데이터베이스 URL 설정
POSTGRES_DATABASE_URL = os.getenv(
    "POSTGRES_DATABASE_URL",
    "postgresql+psycopg2://geehong:Power6100@db_postgres:5432/markets"
)

# 비동기 데이터베이스 URL 설정 (aiomysql 사용)
ASYNC_DATABASE_URL = MYSQL_DATABASE_URL.replace("mysql+pymysql://", "mysql+aiomysql://")

if not MYSQL_DATABASE_URL:
    raise ValueError("MYSQL_DATABASE_URL 환경 변수가 설정되지 않았습니다.")

# 엔진 생성 - 연결 풀 및 성능 최적화 설정
def _create_engine_with_retry(url: str, attempts: int = 12, delay_seconds: int = 5):
    last_err = None
    for i in range(attempts):
        try:
            # MySQL과 PostgreSQL에 따라 다른 connect_args 설정
            if "mysql" in url:
                connect_args = {
                    "charset": "utf8mb4",
                    "autocommit": False,
                    "connect_timeout": 10,
                    "sql_mode": "STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO",
                    "init_command": "SET SESSION sql_mode='STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'",
                }
            else:  # PostgreSQL
                connect_args = {
                    "connect_timeout": 10,
                }
            
            eng = create_engine(
                url,
                pool_pre_ping=True,
                pool_size=20,
                max_overflow=40,
                pool_recycle=600,
                echo=False,
                pool_timeout=60,
                pool_reset_on_return='commit',
                pool_use_lifo=True,
                connect_args=connect_args,
            )
            # probe
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("DB engine created and probed successfully")
            return eng
        except Exception as e:
            last_err = e
            logger.warning(f"DB not ready (attempt {i+1}/{attempts}): {e}")
            time.sleep(delay_seconds)
    logger.error(f"Failed to create DB engine after {attempts} attempts: {last_err}")
    raise last_err

# MySQL 엔진
mysql_engine = _create_engine_with_retry(MYSQL_DATABASE_URL)
MySQLSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=mysql_engine)

# PostgreSQL 엔진
postgres_engine = _create_engine_with_retry(POSTGRES_DATABASE_URL)
PostgreSQLSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=postgres_engine)

# 기본 엔진 (MySQL - 호환성을 위해)
engine = mysql_engine
SessionLocal = MySQLSessionLocal

# SQLAlchemy Base 클래스 생성
Base = declarative_base()

def get_session_local():
    """동기 세션 팩토리 반환"""
    return SessionLocal

# 비동기 엔진과 세션 팩토리는 필요할 때 생성
async_engine = None
AsyncSessionLocal = None

def get_async_engine():
    """비동기 엔진을 지연 생성"""
    global async_engine
    if async_engine is None:
        async_engine = create_async_engine(
            ASYNC_DATABASE_URL,
            pool_pre_ping=True,
            pool_size=20,
            max_overflow=40,
            pool_recycle=600,
            echo=False,
            pool_timeout=60,
            pool_reset_on_return='commit',
            pool_use_lifo=True,
        )
    return async_engine

def get_async_session_local():
    """비동기 세션 팩토리를 지연 생성"""
    global AsyncSessionLocal
    if AsyncSessionLocal is None:
        engine = get_async_engine()
        AsyncSessionLocal = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
    return AsyncSessionLocal

# 데이터베이스 의존성 주입 함수
def get_db():
    """
    FastAPI 의존성 주입을 위한 데이터베이스 세션 생성 함수 (기본: MySQL)
    """
    db = MySQLSessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_mysql_db():
    """
    FastAPI 의존성 주입을 위한 MySQL 데이터베이스 세션 생성 함수
    """
    db = MySQLSessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_postgres_db():
    """
    FastAPI 의존성 주입을 위한 PostgreSQL 데이터베이스 세션 생성 함수
    """
    db = PostgreSQLSessionLocal()
    try:
        yield db
    finally:
        db.close()

# 비동기 데이터베이스 의존성 주입 함수
async def get_async_session():
    """
    비동기 데이터베이스 세션 생성 함수
    """
    session_local = get_async_session_local()
    async with session_local() as session:
        try:
            yield session
        finally:
            await session.close()

# 데이터베이스 연결 테스트 함수
def test_database_connection():
    """
    데이터베이스 연결을 테스트합니다.
    """
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.info("데이터베이스 연결 성공")
        return True
    except Exception as e:
        logger.error(f"데이터베이스 연결 실패: {e}")
        return False

# 데이터베이스 초기화 함수
def init_database():
    """
    데이터베이스 테이블을 생성합니다.
    """
    try:
        from ..models import Base
        Base.metadata.create_all(bind=engine)
        logger.info("데이터베이스 테이블 생성 완료")
    except Exception as e:
        logger.error(f"데이터베이스 테이블 생성 실패: {e}")
        raise
