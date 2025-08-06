"""
데이터베이스 연결 및 설정 관리 모듈
모든 데이터베이스 관련 설정과 연결을 이 파일에서 통합 관리합니다.
"""
import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# 로깅 설정
logger = logging.getLogger(__name__)

# .env 파일 로드
load_dotenv()

# 데이터베이스 URL 설정
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://geehong:Power6100@db:3306/markets"
)

if not DATABASE_URL:
    raise ValueError("DATABASE_URL 환경 변수가 설정되지 않았습니다.")

# 엔진 생성 - 연결 풀 및 성능 최적화 설정
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # 연결 유효성 검사
    pool_size=20,            # 기본 연결 풀 크기 증가 (10 → 20)
    max_overflow=40,         # 최대 추가 연결 수 증가 (20 → 40)
    pool_recycle=600,        # 연결 재사용 시간 증가 (300초 → 600초)
    echo=False,              # SQL 로그 출력 여부
    pool_timeout=60,         # 연결 대기 시간 증가 (30초 → 60초)
    pool_reset_on_return='commit',  # 연결 반환 시 커밋
    # 추가 성능 최적화 설정
    pool_use_lifo=True,      # LIFO 방식으로 연결 재사용 (더 효율적)
    poolclass=None,          # 기본 연결 풀 클래스 사용
    # MySQL 특화 설정
    connect_args={
        "charset": "utf8mb4",
        "autocommit": False,
        "sql_mode": "STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO",
        "init_command": "SET SESSION sql_mode='STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'"
    }
)

# SQLAlchemy Base 클래스 생성
Base = declarative_base()

# 세션 팩토리 생성
SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine
)

# 데이터베이스 의존성 주입 함수
def get_db():
    """
    FastAPI 의존성 주입을 위한 데이터베이스 세션 생성 함수
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
