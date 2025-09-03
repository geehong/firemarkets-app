#!/usr/bin/env python3
"""
간단한 Redis Stream 테스트 스크립트
백엔드 컨테이너 내에서 실행
"""
import asyncio
import json
from datetime import datetime

async def test_redis_streams():
    """Redis Streams 기본 기능 테스트"""
    print("=== Redis Streams 테스트 시작 ===")
    
    try:
        # Redis 연결
        import redis.asyncio as redis
        redis_client = await redis.from_url("redis://redis:6379")
        print("✅ Redis에 연결되었습니다")
        
        # Stream 키
        stream_key = "tiingo_realtime_stream"
        
        # 1. 테스트 데이터 추가
        test_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "ticker": "AAPL",
            "price": 150.50,
            "volume": 1000000,
            "change_percent": 2.5,
            "data_source": "test"
        }
        
        message_id = await redis_client.xadd(
            stream_key, 
            {"data": json.dumps(test_data)}
        )
        print(f"✅ 테스트 데이터 추가됨: {message_id}")
        
        # 2. Stream 길이 확인
        stream_length = await redis_client.xlen(stream_key)
        print(f"✅ Stream 길이: {stream_length}")
        
        # 3. Stream에서 데이터 읽기
        stream_data = await redis_client.xread({stream_key: '0-0'}, count=10)
        if stream_data:
            messages = stream_data[0][1]  # (stream_name, messages)
            print(f"✅ {len(messages)}개 메시지 읽기 성공")
            
            # 첫 번째 메시지 내용 확인
            for msg_id, msg_data in messages:
                data_str = msg_data.get(b'data')
                if data_str:
                    data = json.loads(data_str)
                    print(f"   메시지 ID: {msg_id.decode()}")
                    print(f"   티커: {data.get('ticker')}")
                    print(f"   가격: ${data.get('price')}")
                    print(f"   볼륨: {data.get('volume'):,}")
                    break
        
        # 4. Stream 정보 조회
        stream_info = await redis_client.xinfo_stream(stream_key)
        print(f"✅ Stream 정보: {stream_info}")
        
        # 5. 연결 종료
        await redis_client.close()
        print("✅ Redis 연결 종료")
        
        print("=== 모든 테스트 통과! ===")
        
    except Exception as e:
        print(f"❌ 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_redis_streams())




