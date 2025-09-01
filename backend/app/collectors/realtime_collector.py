"""
Realtime Data Collector - 전문 저장자 역할
Redis Stream에서 실시간 데이터를 주기적으로 가져와 영구 데이터베이스에 저장
"""
import logging
import asyncio
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

import redis.asyncio as redis
from sqlalchemy.orm import Session

from .base_collector import BaseCollector
from ..core.config import GLOBAL_APP_CONFIGS
from ..core.database import SessionLocal
from ..models.realtime import RealtimeQuote
from ..models.asset import Asset

logger = logging.getLogger(__name__)

# Redis Stream Key for real-time data
REDIS_STREAM_KEY = "tiingo_realtime_stream"

class RealtimeCollector(BaseCollector):
    """
    실시간 데이터 수집기 - 전문 저장자 역할
    - 스케줄러에 의해 주기적으로 실행 (예: 1분마다)
    - Redis Stream에서 데이터를 가져와 MySQL에 저장
    - 배치 처리로 데이터베이스 부하 최소화
    """

    def __init__(self, db: Session = None):
        super().__init__(db)
        self.redis_client = None
        
        # Redis 설정
        self.redis_host = GLOBAL_APP_CONFIGS.get("REDIS_HOST", "redis")  # Docker Compose에서는 'redis' 서비스명 사용
        self.redis_port = GLOBAL_APP_CONFIGS.get("REDIS_PORT", 6379)
        self.redis_db = GLOBAL_APP_CONFIGS.get("REDIS_DB", 0)
        self.redis_password = GLOBAL_APP_CONFIGS.get("REDIS_PASSWORD")
        
        # 수집 설정
        self.default_tickers = {
            "Stocks": ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"],
            "Crypto": ["BTCUSDT", "ETHUSDT", "SOLUSDT", "ADAUSDT", "DOTUSDT"],
            "ETFs": ["SPY", "QQQ", "IWM", "VTI", "VEA"],
            "Funds": ["VTSAX", "VTIAX", "VBTLX", "VBMFX", "VGSIX"],
            "Commodities": ["GC", "SI", "CL", "NG", "ZC"]
        }
        
        # 수집 간격 (초)
        self.intervals = {
            "Crypto": 5 * 60,      # 5분
            "Stocks": 15 * 60,     # 15분
            "ETFs": 30 * 60,       # 30분
            "Funds": 30 * 60,      # 30분
            "Commodities": 4 * 60 * 60  # 4시간
        }

    async def _connect_redis(self):
        """Redis 연결 초기화"""
        if not self.redis_client:
            try:
                redis_url = f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"
                if self.redis_password:
                    redis_url = f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
                
                self.redis_client = await redis.from_url(redis_url)
                logger.info(f"Redis에 연결되었습니다: {self.redis_host}:{self.redis_port}")
            except redis.RedisError as e:
                logger.error(f"Redis 연결 실패: {e}")
                self.redis_client = None

    async def _collect_data(self) -> Dict[str, Any]:
        """
        BaseCollector 요구사항을 충족하는 추상 메서드 구현
        Redis Stream에서 데이터를 가져와 MySQL에 저장
        """
        try:
            await self._connect_redis()
            if not self.redis_client:
                return {
                    "success": False,
                    "message": "Redis 연결 실패",
                    "processed_records": 0
                }

            db = self.get_db_session()
            try:
                # 1. 모든 티커를 asset_id로 매핑하여 빠른 조회
                assets = db.query(Asset.ticker, Asset.asset_id, Asset.asset_type).all()
                ticker_to_asset = {
                    ticker: {"asset_id": asset_id, "asset_type": asset_type} 
                    for ticker, asset_id, asset_type in assets
                }

                # 2. Redis Stream에서 사용 가능한 모든 데이터 읽기
                # XREAD with BLOCK 0은 대기하지만, collector는 즉시 가져옴
                stream_data = await self.redis_client.xread(
                    {REDIS_STREAM_KEY: '0-0'}, 
                    count=1000  # 최대 1000개 레코드 읽기
                )
                
                if not stream_data:
                    logger.info("Redis Stream에 새로운 실시간 데이터가 없습니다.")
                    return {
                        "success": True,
                        "message": "새로운 데이터 없음",
                        "processed_records": 0
                    }

                messages = stream_data[0][1]  # (stream_name, messages)
                records_to_save = []
                last_message_id = None

                # 3. 메시지 처리
                for message_id, message_data in messages:
                    try:
                        trade_data_str = message_data.get(b'data')
                        if not trade_data_str:
                            continue

                        trade_data = json.loads(trade_data_str)
                        ticker = trade_data.get('ticker')
                        asset_info = ticker_to_asset.get(ticker)

                        if asset_info:
                            # RealtimeQuote에 저장할 데이터 준비
                            quote_data = {
                                "ticker": ticker,
                                "asset_type": asset_info["asset_type"],
                                "price": float(trade_data.get('price', 0)),
                                "volume_today": float(trade_data.get('volume', 0)),
                                "change_percent_today": float(trade_data.get('change_percent', 0)),
                                "data_source": trade_data.get('data_source', 'tiingo_ws'),
                                "currency": "USD",
                                "fetched_at": datetime.fromisoformat(
                                    trade_data['timestamp'].replace('Z', '+00:00')
                                ) if trade_data.get('timestamp') else datetime.utcnow()
                            }
                            
                            records_to_save.append(quote_data)
                            
                        last_message_id = message_id
                        
                    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
                        logger.warning(f"스트림 메시지 {message_id} 처리 실패: {e}")

                # 4. 데이터베이스에 저장할 것이 있으면 저장
                if records_to_save:
                    await self._bulk_save_realtime_quotes(db, records_to_save)
                    logger.info(f"데이터베이스에 {len(records_to_save)}개의 실시간 레코드를 성공적으로 저장했습니다.")

                    # 5. 처리된 메시지를 제거하기 위해 스트림 트림
                    if last_message_id:
                        await self.redis_client.xtrim(REDIS_STREAM_KEY, minid=last_message_id)
                        logger.info(f"Redis Stream이 메시지 ID {last_message_id.decode()}까지 트림되었습니다.")

                    return {
                        "success": True,
                        "message": "데이터 처리 완료",
                        "processed_records": len(records_to_save)
                    }

                return {
                    "success": True,
                    "message": "저장할 새로운 유효한 데이터 없음",
                    "processed_records": 0
                }
            
            except Exception as e:
                logger.error(f"RealtimeCollector에서 오류 발생: {e}")
                return {
                    "success": False,
                    "message": f"오류: {e}",
                    "processed_records": 0
                }
            finally:
                if self.redis_client:
                    await self.redis_client.close()
                db.close()
        
        except Exception as e:
            logger.error(f"RealtimeCollector 실행 중 예상치 못한 오류: {e}")
            return {
                "success": False,
                "message": f"예상치 못한 오류: {e}",
                "processed_records": 0
            }

    async def _bulk_save_realtime_quotes(self, db: Session, records: List[Dict[str, Any]]):
        """실시간 인용 데이터를 배치로 저장"""
        try:
            for record in records:
                # Upsert 로직: 기존 데이터가 있으면 업데이트, 없으면 새로 생성
                existing = db.query(RealtimeQuote).filter(
                    RealtimeQuote.ticker == record["ticker"],
                    RealtimeQuote.asset_type == record["asset_type"]
                ).first()
                
                if existing:
                    # 기존 레코드 업데이트
                    existing.price = record["price"]
                    existing.volume_today = record["volume_today"]
                    existing.change_percent_today = record["change_percent_today"]
                    existing.data_source = record["data_source"]
                    existing.fetched_at = record["fetched_at"]
                else:
                    # 새 레코드 생성
                    quote = RealtimeQuote(**record)
                    db.add(quote)
            
            db.commit()
            logger.info(f"배치 저장 완료: {len(records)}개 레코드")
            
        except Exception as e:
            db.rollback()
            logger.error(f"배치 저장 실패: {e}")
            raise

    async def collect_with_settings(self) -> Dict[str, Any]:
        """설정에 따른 실시간 데이터 수집 (기존 호환성 유지)"""
        try:
            self.log_progress("실시간 데이터 수집 시작")
            
            # Redis Stream에서 데이터 수집 및 저장
            result = await self._collect_data()
            
            if result["success"]:
                return {
                    'success': True,
                    'message': f'실시간 데이터 수집 완료: {result["processed_records"]}개 레코드 처리',
                    'total_added_records': result["processed_records"]
                }
            else:
                return {
                    'success': False,
                    'message': f'실시간 데이터 수집 실패: {result["message"]}',
                    'total_added_records': 0
                }
                
        except Exception as e:
            logger.error(f"설정 기반 실시간 데이터 수집 실패: {e}")
            return {
                'success': False,
                'message': f'설정 기반 실시간 데이터 수집 실패: {str(e)}',
                'total_added_records': 0
            }

    async def get_redis_stream_info(self) -> Dict[str, Any]:
        """Redis Stream 정보 조회"""
        try:
            await self._connect_redis()
            if not self.redis_client:
                return {"error": "Redis 연결 실패"}
            
            # Stream 정보 조회
            stream_info = await self.redis_client.xinfo_stream(REDIS_STREAM_KEY)
            stream_length = await self.redis_client.xlen(REDIS_STREAM_KEY)
            
            return {
                "stream_name": REDIS_STREAM_KEY,
                "length": stream_length,
                "info": stream_info,
                "redis_connected": True
            }
            
        except Exception as e:
            logger.error(f"Redis Stream 정보 조회 실패: {e}")
            return {"error": str(e)}

    def get_status(self) -> Dict[str, Any]:
        """수집기 상태 조회"""
        try:
            return {
                'redis': {
                    'host': self.redis_host,
                    'port': self.redis_port,
                    'connected': self.redis_client is not None
                },
                'collection_settings': {
                    'intervals': self.intervals,
                    'default_tickers': self.default_tickers
                },
                'last_run': getattr(self, '_last_run', None)
            }
            
        except Exception as e:
            logger.error(f"상태 조회 실패: {e}")
            return {
                'error': str(e)
            }

    async def cleanup(self):
        """리소스 정리"""
        try:
            if self.redis_client:
                await self.redis_client.close()
                logger.info("Redis 연결이 종료되었습니다")
        except Exception as e:
            logger.error(f"Redis 연결 종료 중 오류: {e}")
