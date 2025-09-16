#!/usr/bin/env python3
"""
Redis 연결 테스트 스크립트
"""
import asyncio
import redis.asyncio as redis
import json
from datetime import datetime

async def test_redis_connection():
    """Redis 연결 및 기본 기능 테스트"""
    print("=== Redis 연결 테스트 시작 ===")
    
    try:
        # Redis 연결
        redis_client = await redis.from_url("redis://localhost:6379")
        print("✅ Redis에 연결되었습니다")
        
        # 기본 ping 테스트
        pong = await redis_client.ping()
        print(f"✅ Ping 응답: {pong}")
        
        # Stream 생성 테스트
        stream_key = "tiingo_realtime_stream"
        
        # 테스트 데이터 추가
        test_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "ticker": "AAPL",
            "price": 150.50,
            "volume": 1000000,
            "data_source": "test"
        }
        
        message_id = await redis_client.xadd(
            stream_key, 
            {"data": json.dumps(test_data)}
        )
        print(f"✅ Stream에 테스트 데이터 추가됨: {message_id}")
        
        # Stream 길이 확인
        stream_length = await redis_client.xlen(stream_key)
        print(f"✅ Stream 길이: {stream_length}")
        
        # Stream에서 데이터 읽기
        stream_data = await redis_client.xread({stream_key: '0-0'}, count=10)
        print(f"✅ Stream 데이터 읽기 성공: {len(stream_data[0][1]) if stream_data else 0}개 메시지")
        
        # Stream 정보 조회
        stream_info = await redis_client.xinfo_stream(stream_key)
        print(f"✅ Stream 정보: {stream_info}")
        
        # 연결 종료
        await redis_client.close()
        print("✅ Redis 연결 종료")
        
        print("=== 모든 테스트 통과! ===")
        
    except Exception as e:
        print(f"❌ 테스트 실패: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(test_redis_connection())




