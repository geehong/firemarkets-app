# /home/geehong/financeWebApp02/backend/seed_data.py
import os
import time
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
from dotenv import load_dotenv

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# .env 파일 로드 (backend 폴더 내에 .env가 있다고 가정)
# 실제 .env 파일 위치에 따라 경로 조정 필요
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if not os.path.exists(dotenv_path):
    # backend 폴더 상위에 .env 파일이 있는 경우 (프로젝트 루트)
    dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')

if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    logger.info(f".env file loaded from: {dotenv_path}")
else:
    logger.warning(".env file not found. Relying on environment variables set elsewhere.")


DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.error("DATABASE_URL environment variable is not set. Cannot proceed with seeding.")
    exit(1)

# Docker 컨테이너 내에서 실행될 것이므로, 'db' 호스트명 사용
# DATABASE_URL이 이미 'mysql+mysqlconnector://${DB_USERNAME}:${DB_PASSWORD}@db:3306/${DB_DATABASE}' 형태로
# docker-compose.yml에서 backend 서비스로 전달되므로, 여기서는 수정 없이 사용합니다.

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_database():
    db = None
    max_retries = 15  # DB 연결 재시도 횟수 증가
    retry_delay = 10  # 재시도 간격 (초)

    logger.info("Attempting to connect to the database for seeding...")
    for attempt in range(max_retries):
        try:
            db = SessionLocal()
            # 간단한 쿼리로 연결 테스트
            db.execute(text("SELECT 1"))
            logger.info(f"Successfully connected to the database (Attempt {attempt + 1}/{max_retries}).")
            break  # 연결 성공
        except OperationalError as e:
            logger.warning(f"Database connection failed (Attempt {attempt + 1}/{max_retries}): {e}")
            if db:
                db.close()
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                logger.error("Failed to connect to the database after multiple retries. Aborting seed.")
                return False # 실패 반환
        except Exception as e: # 다른 예외 처리
            logger.error(f"An unexpected error occurred while connecting to DB (Attempt {attempt + 1}/{max_retries}): {e}")
            if db:
                db.close()
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                logger.error("Failed to connect to the database due to an unexpected error. Aborting seed.")
                return False # 실패 반환

    if not db or db.is_active == False : # db가 None이거나 세션이 닫힌 경우
         logger.error("Database session is not active. Aborting seed.")
         if db: db.close() # 확실히 닫기
         return False # 실패 반환

    try:
        logger.info("Starting initial data insertion (this may take a while)...")

        # ========================================================================
        # 여기에 40만 건의 데이터를 삽입하는 로직을 구현합니다.
        # 예시:
        #   1. 만약 INSERT 문들이 포함된 별도의 .sql 파일이 있다면, 해당 파일을 읽어 실행
        #   2. Python 코드로 데이터를 생성하여 SQLAlchemy ORM 또는 Core를 사용해 삽입
        #
        # --- SQL 파일 실행 ---
        # 이 방법을 사용하려면 아래 주석을 해제하고, initial_data_inserts.sql 파일을
        # backend 폴더에 위치시키거나, Dockerfile에서 /app 폴더로 복사해야 합니다.
        # Docker 컨테이너 내의 /app 디렉토리는 호스트의 ./backend 디렉토리에 해당합니다.
        # 따라서 /app/data/initial_data_inserts.sql 경로를 사용합니다.
        sql_insert_file_path = '/app/data/initial_data_inserts.sql' 
        if os.path.exists(sql_insert_file_path):
            logger.info(f"Found SQL insert file at {sql_insert_file_path}. Attempting to execute...")
            with open(sql_insert_file_path, 'r', encoding='utf-8') as f:
                # SQL 문들을 세미콜론 기준으로 분리합니다.
                # 주의: 이 방식은 SQL 파일 내에 세미콜론으로 끝나는 주석이나 문자열이 있을 경우 문제가 될 수 있습니다.
                # 더 견고한 파싱을 위해서는 sqlparse와 같은 라이브러리 사용을 고려할 수 있습니다.
                sql_script = f.read()
                # 빈 문장이나 주석만 있는 문장을 걸러내기 위해 split 후 strip 및 필터링
                sql_statements = [s.strip() for s in sql_script.split(';') if s.strip()]
                
                for i, stmt in enumerate(sql_statements):
                    if stmt: # 비어있지 않은 문장만 실행
                        try:
                            db.execute(text(stmt))
                            if (i + 1) % 1000 == 0: # 1000개 문장 실행 후 로그 (진행 상황 확인용)
                                logger.info(f"Executed {i+1} SQL statements from file...")
                        except Exception as insert_err:
                            logger.error(f"Error executing statement: {stmt[:200]}... Error: {insert_err}")
                            # 오류 발생 시 전체 롤백 후 함수 종료
                            db.rollback()
                            return False 
            db.commit()
            logger.info("Data insertion from SQL file complete.")
        else:
            logger.warning(f"SQL insert file not found at {sql_insert_file_path}. Skipping SQL file seeding.")
            # SQL 파일이 없으면 시딩 실패로 간주할 수도 있습니다. 여기서는 경고만 하고 성공으로 처리합니다.
            # 만약 파일이 필수라면 return False로 변경하세요.


        logger.info("Initial data seeding process finished.")
        return True # 성공 반환

    except Exception as e:
        logger.error(f"An error occurred during data seeding: {e}", exc_info=True)
        if db:
            db.rollback()
        return False # 실패 반환
    finally:
        if db:
            db.close()
            logger.info("Database session closed.")
    return False # 예외 없이 끝났으나 명시적 성공 반환이 없는 경우

if __name__ == "__main__":
    # 스크립트 실행 시 약간의 대기 시간을 두어 다른 서비스들이 안정화될 시간을 줍니다.
    # docker compose up -d 실행 후 충분한 시간이 지났다면 이 대기는 짧거나 필요 없을 수 있습니다.
    wait_before_seeding = 15 # 초
    logger.info(f"Waiting for {wait_before_seeding} seconds before starting seeding process...")
    time.sleep(wait_before_seeding)
    seed_database()
