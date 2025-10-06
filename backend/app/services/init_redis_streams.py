#!/usr/bin/env python3
"""
Redis Streams 초기화 스크립트
- Redis 스트림과 Consumer Group을 미리 생성
- WebSocket Broadcaster가 시작되기 전에 실행
"""

import asyncio
import logging
import os
import sys
from pathlib import Path

import redis.asyncio as redis
from redis import exceptions

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

from app.core.config import GLOBAL_APP_CONFIGS, load_and_set_global_configs

# 로깅 설정
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("RedisStreamInitializer")

async def initialize_redis_streams():
    """Redis 스트림과 Consumer Group을 초기화합니다."""
    
    # 전역 설정 로드
    try:
        load_and_set_global_configs()
        logger.info("✅ Global configurations loaded.")
    except Exception as e:
        logger.error(f"❌ Failed to load global configurations: {e}")
        return False

    # Redis 연결 설정
    redis_host = GLOBAL_APP_CONFIGS.get("REDIS_HOST", "redis")
    redis_port = GLOBAL_APP_CONFIGS.get("REDIS_PORT", 6379)
    redis_db = GLOBAL_APP_CONFIGS.get("REDIS_DB", 0)
    redis_password = GLOBAL_APP_CONFIGS.get("REDIS_PASSWORD")
    
    try:
        redis_db_int = int(redis_db) if redis_db is not None else 0
    except Exception:
        redis_db_int = 0

    redis_url = f"redis://{redis_host}:{redis_port}/{redis_db_int}"
    if redis_password:
        redis_url = f"redis://:{redis_password}@{redis_host}:{redis_port}/{redis_db_int}"

    logger.info(f"🔗 Redis 연결: {redis_url}")

    # 기본 스트림 목록
    default_streams = ["binance:realtime", "coinbase:realtime", "finnhub:realtime", "alpaca:realtime", "swissquote:realtime"]
    stream_names = GLOBAL_APP_CONFIGS.get("REALTIME_STREAMS", default_streams)
    
    # Consumer Group 이름 매핑
    realtime_streams = {
        stream: f"{stream.split(':')[0]}_broadcaster_group" for stream in stream_names
    }
    
    redis_client = None
    try:
        # Redis 연결
        redis_client = await redis.from_url(redis_url)
        await redis_client.ping()
        logger.info("✅ Redis 연결 성공")
        
        # 각 스트림과 Consumer Group 초기화
        for stream_name, group_name in realtime_streams.items():
            logger.info(f"🔧 스트림 '{stream_name}' 초기화 중...")
            
            try:
                # 스트림 존재 여부 확인
                stream_exists = await redis_client.exists(stream_name)
                
                if not stream_exists:
                    logger.info(f"📝 스트림 '{stream_name}' 생성 중...")
                    # 빈 스트림 생성 (더미 데이터로)
                    await redis_client.xadd(stream_name, {"init": "stream_created"}, maxlen=1, approximate=True)
                    logger.info(f"✅ 스트림 '{stream_name}' 생성 완료")
                else:
                    logger.info(f"ℹ️ 스트림 '{stream_name}'이 이미 존재합니다.")
                
                # Consumer Group 생성
                try:
                    await redis_client.xgroup_create(name=stream_name, groupname=group_name, id="0", mkstream=True)
                    logger.info(f"✅ Consumer Group '{group_name}' 생성 완료")
                except exceptions.ResponseError as e:
                    if "BUSYGROUP" in str(e):
                        logger.info(f"ℹ️ Consumer Group '{group_name}'가 이미 존재합니다.")
                    else:
                        logger.error(f"❌ Consumer Group '{group_name}' 생성 실패: {e}")
                        return False
                        
            except Exception as e:
                logger.error(f"❌ 스트림 '{stream_name}' 초기화 실패: {e}")
                return False
        
        logger.info("🎉 모든 Redis 스트림과 Consumer Group 초기화 완료!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Redis 초기화 중 오류: {e}")
        return False
    finally:
        if redis_client:
            try:
                await redis_client.close()
            except Exception as e:
                logger.error(f"Redis 클라이언트 정리 중 오류: {e}")

async def main():
    """메인 함수"""
    logger.info("🚀 Redis Streams 초기화 시작...")
    
    success = await initialize_redis_streams()
    
    if success:
        logger.info("✅ 초기화 완료!")
        sys.exit(0)
    else:
        logger.error("❌ 초기화 실패!")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
