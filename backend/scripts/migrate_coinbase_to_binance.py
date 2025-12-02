#!/usr/bin/env python3
"""
realtime_quotes_time_delay 테이블에서 최근 5일 이내의 coinbase 데이터를 binance로 변경하는 스크립트
동일한 (asset_id, timestamp_utc)에 binance 레코드가 있으면 coinbase 레코드를 삭제
"""

import os
import sys
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# 데이터베이스 연결 설정 (commands_organized.md에서 가져온 정보)
DB_HOSTNAME_PG = os.getenv("DB_HOSTNAME_PG", "db_postgres")
DB_PORT_PG = os.getenv("DB_PORT_PG", "5432")
DB_DATABASE_PG = os.getenv("DB_DATABASE_PG", "markets")
DB_USERNAME_PG = os.getenv("DB_USERNAME_PG", "geehong")
DB_PASSWORD_PG = os.getenv("DB_PASSWORD_PG", "Power6100")

DATABASE_URL = f"postgresql+psycopg2://{DB_USERNAME_PG}:{DB_PASSWORD_PG}@{DB_HOSTNAME_PG}:{DB_PORT_PG}/{DB_DATABASE_PG}"

def get_database_connection():
    """데이터베이스 연결 생성"""
    engine = create_engine(DATABASE_URL)
    return engine

def migrate_coinbase_to_binance():
    """coinbase 데이터를 binance로 변경"""
    engine = get_database_connection()
    
    # 최근 5일 계산
    five_days_ago = datetime.utcnow() - timedelta(days=5)
    
    try:
        with engine.connect() as conn:
            trans = conn.begin()
            
            try:
                # 최근 5일 이내의 coinbase 레코드 조회
                result = conn.execute(text("""
                    SELECT id, asset_id, timestamp_utc, price, volume, 
                           change_amount, change_percent, data_interval
                    FROM realtime_quotes_time_delay
                    WHERE data_source = 'coinbase'
                      AND timestamp_utc >= :five_days_ago
                    ORDER BY timestamp_utc DESC;
                """), {'five_days_ago': five_days_ago})
                
                coinbase_records = result.fetchall()
                total_count = len(coinbase_records)
                
                if total_count == 0:
                    print("✅ 최근 5일 이내의 coinbase 레코드가 없습니다.")
                    trans.commit()
                    return
                
                print(f"📊 총 {total_count}개의 coinbase 레코드를 처리합니다.")
                
                updated_count = 0
                deleted_count = 0
                
                for record in coinbase_records:
                    record_id, asset_id, timestamp_utc, price, volume, change_amount, change_percent, data_interval = record
                    
                    # 동일한 (asset_id, timestamp_utc)에 binance 레코드가 있는지 확인
                    binance_check = conn.execute(text("""
                        SELECT id FROM realtime_quotes_time_delay
                        WHERE asset_id = :asset_id
                          AND timestamp_utc = :timestamp_utc
                          AND data_source = 'binance'
                        LIMIT 1;
                    """), {
                        'asset_id': asset_id,
                        'timestamp_utc': timestamp_utc
                    })
                    
                    binance_exists = binance_check.fetchone()
                    
                    if binance_exists:
                        # binance 레코드가 있으면 coinbase 레코드 삭제
                        conn.execute(text("""
                            DELETE FROM realtime_quotes_time_delay
                            WHERE id = :record_id;
                        """), {'record_id': record_id})
                        deleted_count += 1
                        print(f"  🗑️  삭제: asset_id={asset_id}, timestamp_utc={timestamp_utc} (binance 레코드 존재)")
                    else:
                        # binance 레코드가 없으면 coinbase를 binance로 변경
                        conn.execute(text("""
                            UPDATE realtime_quotes_time_delay
                            SET data_source = 'binance'
                            WHERE id = :record_id;
                        """), {'record_id': record_id})
                        updated_count += 1
                        print(f"  ✏️  업데이트: asset_id={asset_id}, timestamp_utc={timestamp_utc} (coinbase → binance)")
                
                trans.commit()
                
                print(f"\n✅ 마이그레이션 완료!")
                print(f"   - 총 처리: {total_count}개")
                print(f"   - 업데이트: {updated_count}개")
                print(f"   - 삭제: {deleted_count}개")
                
            except Exception as e:
                trans.rollback()
                print(f"❌ 오류 발생: {e}")
                raise
                
    except Exception as e:
        print(f"❌ 데이터베이스 연결 오류: {e}")
        raise

if __name__ == "__main__":
    print("=" * 60)
    print("Coinbase → Binance 마이그레이션 시작")
    print("=" * 60)
    print(f"대상: realtime_quotes_time_delay 테이블")
    print(f"조건: 최근 5일 이내, data_source='coinbase'")
    print(f"시간: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print("=" * 60)
    print()
    
    try:
        migrate_coinbase_to_binance()
    except Exception as e:
        print(f"\n❌ 마이그레이션 실패: {e}")
        sys.exit(1)

