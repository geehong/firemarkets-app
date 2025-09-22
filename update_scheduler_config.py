#!/usr/bin/env python3
import psycopg2
import json

# 데이터베이스 연결
conn = psycopg2.connect(
    host="db_postgres",
    port="5432",
    database="markets",
    user="geehong",
    password="Power6100"
)

# 새로운 스케줄러 설정 (14:00에 stock_profiles_clients 실행)
new_config = {
    "timezone": "Asia/Seoul",
    "schedules": [
        {
            "hour": 14,
            "minute": 0,
            "collectors": ["stock_profiles_clients"],
            "day_of_week": "mon"
        }
    ]
}

try:
    cursor = conn.cursor()
    
    # 기존 설정 확인
    cursor.execute("SELECT value FROM app_configurations WHERE key = 'SCHEDULER_CONFIG'")
    result = cursor.fetchone()
    
    if result:
        print("기존 설정:")
        print(json.dumps(json.loads(result[0]), indent=2, ensure_ascii=False))
    
    # 새 설정으로 업데이트
    cursor.execute(
        "UPDATE app_configurations SET value = %s WHERE key = 'SCHEDULER_CONFIG'",
        (json.dumps(new_config),)
    )
    
    conn.commit()
    print("\n새 설정으로 업데이트 완료:")
    print(json.dumps(new_config, indent=2, ensure_ascii=False))
    
except Exception as e:
    print(f"오류 발생: {e}")
    conn.rollback()
finally:
    cursor.close()
    conn.close()
