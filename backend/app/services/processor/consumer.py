import logging
import asyncio
import redis.asyncio as redis
from typing import Dict, List, Any, Optional
import time
import pytz
from ...utils.trading_calendar import is_regular_market_hours

logger = logging.getLogger(__name__)

class StreamConsumer:
    """Redis Stream 소비 및 처리를 담당하는 클래스"""

    def __init__(self, redis_url: str, adapter_factory, repository, bucket_manager=None, batch_size: int = 100):
        self.redis_url = redis_url
        self.redis_client = None
        self.adapter_factory = adapter_factory
        self.repository = repository
        self.bucket_manager = bucket_manager
        self.batch_size = batch_size
        self.realtime_streams = {
            # Highest priority: Stocks (Finnhub)
            "finnhub:realtime": "finnhub_group",
            "alpaca:realtime": "alpaca_group",
            # Crypto
            "binance:realtime": "binance_group",
            "coinbase:realtime": "coinbase_group",
            # FX/Other
            "swissquote:realtime": "swissquote_group",
            "polygon:realtime": "polygon_group",
            "twelvedata:realtime": "twelvedata_group",
            "kis:realtime": "kis_group",
        }
        self.last_heartbeat = 0
        self.consecutive_errors = 0

    async def connect(self) -> bool:
        """Redis 연결 초기화"""
        try:
            if self.redis_client:
                try:
                    await self.redis_client.ping()
                    return True
                except Exception:
                    logger.warning("Existing Redis connection failed ping, closing...")
                    await self.close()
                
            self.redis_client = await redis.from_url(
                self.redis_url, 
                decode_responses=False, # We handle decoding manually for robustness
                socket_connect_timeout=5,
                socket_keepalive=True,
                retry_on_timeout=True
            )
            await self.redis_client.ping()
            logger.info(f"✅ Redis 연결 성공: {self.redis_url}")
            self.consecutive_errors = 0
            return True
        except Exception as e:
            logger.error(f"❌ Redis 연결 실패: {e}")
            return False

    async def close(self):
        """Redis 연결 종료"""
        if self.redis_client:
            try:
                await self.redis_client.close()
            except Exception:
                pass
            self.redis_client = None

    async def _reconnect(self):
        """재연결 시도"""
        logger.info("🔄 Redis 재연결 시도...")
        await self.close()
        await asyncio.sleep(1) # 잠시 대기
        return await self.connect()

    async def process_streams(self) -> int:
        """실시간 스트림 데이터 처리"""
        # 연결 확인
        if not self.redis_client:
            if not await self.connect():
                return 0

        processed_count = 0
        records_to_save = []
        ack_items = []

        try:
            # Heartbeat logging (every 60s)
            now = time.time()
            if now - self.last_heartbeat > 60:
                logger.info(f"💓 StreamConsumer Heartbeat - Connected: {bool(self.redis_client)}")
                self.last_heartbeat = now

            # Consumer Group 생성
            for stream_name, group_name in self.realtime_streams.items():
                try:
                    # mkstream=True ensures stream exists
                    await self.redis_client.xgroup_create(
                        name=stream_name, groupname=group_name, id="0", mkstream=True
                    )
                except Exception as e:
                    if "BUSYGROUP" not in str(e):
                        logger.warning(f"xgroup_create error {stream_name}: {e}")

            # Pending 메시지 먼저 처리
            for stream_name, group_name in self.realtime_streams.items():
                try:
                    pending_info = await self.redis_client.xpending(stream_name, group_name)
                    if pending_info and pending_info.get('pending', 0) > 0:
                        pending_data = await self.redis_client.xreadgroup(
                            groupname=group_name,
                            consumername="processor_worker",
                            streams={stream_name: "0"},
                            count=min(self.batch_size, pending_info['pending']),
                            block=0 
                        )
                        if pending_data:
                            await self._process_messages(pending_data, records_to_save, ack_items)
                except Exception as e:
                    # Connection errors should propagate to trigger reconnect
                    if "Connection" in str(e) or "reset by peer" in str(e):
                        raise e
                    logger.debug(f"Pending 처리 실패 {stream_name}: {e}")

            # 각 스트림별로 개별 처리
            for stream_name, group_name in self.realtime_streams.items():
                try:
                    block_time = 100 
                    
                    new_data = await self.redis_client.xreadgroup(
                        groupname=group_name,
                        consumername="processor_worker",
                        streams={stream_name: ">"},
                        count=self.batch_size,
                        block=block_time
                    )
                    
                    if new_data:
                        total_messages = sum(len(msgs) for _, msgs in new_data)
                        if total_messages > 0:
                            # logger.info(f"📨 스트림 {stream_name}에서 {total_messages}개 메시지 읽음")
                            pass
                        await self._process_messages(new_data, records_to_save, ack_items)
                        
                except Exception as stream_error:
                    if "Connection" in str(stream_error) or "reset by peer" in str(stream_error):
                        raise stream_error
                    logger.debug(f"스트림 {stream_name} 읽기 실패: {stream_error}")
            
            # 데이터가 없으면 추가 대기로 CPU 부하 완화
            if not records_to_save:
                await asyncio.sleep(0.1)
            else:
                logger.debug(f"📥 처리할 레코드: {len(records_to_save)}개")

            # DB 저장 및 Redis Bucket 집계
            if records_to_save:
                tickers_in_batch = [r.get('ticker') for r in records_to_save]
                logger.info(f"💾 DB 저장 시도: {len(records_to_save)}개 레코드 (Tickers: {tickers_in_batch[:5]}...)")
                
                # 1. DB 저장 (RT, Delay)
                success = await self.repository.bulk_save_realtime_quotes(records_to_save)
                
                # 2. Redis Bucket 집계 (OHLCV Bars)
                if self.bucket_manager:
                    for r in records_to_save:
                        try:
                            # Ticks are aggregated into 1m and 5m bars
                            await self.bucket_manager.aggregate_tick(
                                asset_id=r['asset_id'],
                                interval="1m",
                                price=r['price'],
                                volume=r.get('volume') or 0,
                                timestamp_utc=r['timestamp_utc']
                            )
                            await self.bucket_manager.aggregate_tick(
                                asset_id=r['asset_id'],
                                interval="5m",
                                price=r['price'],
                                volume=r.get('volume') or 0,
                                timestamp_utc=r['timestamp_utc']
                            )
                        except Exception as aggregation_error:
                            logger.error(f"❌ Aggregation tick failed for {r.get('ticker')}: {aggregation_error}")

                if success:
                    processed_count = len(records_to_save)
                    # logger.info(f"✅ DB 저장 성공: {processed_count}개")
                else:
                    logger.error("❌ DB 저장 실패")

            # ACK 처리
            if ack_items:
                for stream_name, group_name, message_id in ack_items:
                    try:
                        await self.redis_client.xack(stream_name, group_name, message_id)
                    except Exception as e:
                        logger.warning(f"ACK 실패 {stream_name}:{message_id}: {e}")

            # 성공적으로 실행되면 에러 카운트 리셋
            self.consecutive_errors = 0

        except Exception as e:
            self.consecutive_errors += 1
            logger.error(f"스트림 처리 중 오류 (시도 {self.consecutive_errors}): {e}")
            
            # 재연결 로직
            if self.consecutive_errors >= 3 or "Connection" in str(e) or "reset by peer" in str(e):
                logger.warning("⚠️ 연속 에러 또는 연결 에러 감지, 재연결 시도...")
                await self._reconnect()
                
            await asyncio.sleep(1)

        return processed_count

    async def _process_messages(self, stream_data, records_to_save, ack_items):
        """메시지 처리 및 파싱"""
        for stream_name_bytes, messages in stream_data:
            stream_name = stream_name_bytes.decode('utf-8') if isinstance(stream_name_bytes, bytes) else stream_name_bytes
            group_name = self.realtime_streams.get(stream_name)
            provider = stream_name.split(':')[0]

            adapter = self.adapter_factory.get_adapter(provider)

            for message_id, message_data in messages:
                try:
                    # Adapter expects raw bytes (it handles decoding internally)
                    parsed_data = adapter.parse_message(message_data)
                    if parsed_data:
                        ticker = parsed_data.get('ticker')
                        if not ticker:
                            # 메시지 ID는 ACK하여 스킵
                            ack_items.append((stream_name, group_name, message_id))
                            continue
                        
                        # Ticker resolution logic
                        asset_info = None
                        if hasattr(self, 'ticker_to_asset_id'):
                            # 1. Exact match
                            if ticker in self.ticker_to_asset_id:
                                asset_info = self.ticker_to_asset_id[ticker]
                            # 2. Try removing 'USDT' (e.g. BTCUSDT -> BTC)
                            elif ticker.endswith('USDT') and len(ticker) > 4:
                                normalized = ticker[:-4]
                                if normalized in self.ticker_to_asset_id:
                                    asset_info = self.ticker_to_asset_id[normalized]
                             # 3. Try removing '-USD' (e.g. SOL-USD -> SOL)
                            elif ticker.endswith('-USD') and len(ticker) > 4:
                                normalized = ticker[:-4]
                                if normalized in self.ticker_to_asset_id:
                                    asset_info = self.ticker_to_asset_id[normalized]
                            # 4. Try removing '-USDT' (e.g. BTC-USDT -> BTC)
                            elif ticker.endswith('-USDT') and len(ticker) > 5:
                                normalized = ticker[:-5]
                                if normalized in self.ticker_to_asset_id:
                                    asset_info = self.ticker_to_asset_id[normalized]
                            # 5. Handle slash (e.g. XAU/USD -> XAU)
                            elif '/USD' in ticker:
                                normalized = ticker.split('/')[0]
                                if normalized in self.ticker_to_asset_id:
                                    asset_info = self.ticker_to_asset_id[normalized]
                        
                        if asset_info is not None:
                            asset_id = asset_info['id']
                            asset_type = asset_info['type']
                            
                            # 정규장 외 시간 필터링 (주식/ETF 전용)
                            # is_regular_market_hours()는 현재 시간을 기준으로 판단
                            if asset_type and asset_type.lower() in ('stocks', 'etfs'):
                                if not is_regular_market_hours():
                                    # 정규장 시간이 아니면 필터링 (저장하지 않음)
                                    # ACK는 하여 스트림에서 제거
                                    ack_items.append((stream_name, group_name, message_id))
                                    continue
                            
                            parsed_data['asset_id'] = asset_id
                            records_to_save.append(parsed_data)
                            ack_items.append((stream_name, group_name, message_id))
                        else:
                            # 매핑 실패 - 가끔 로그 출력
                            if not hasattr(self, '_missing_ticker_counts'):
                                self._missing_ticker_counts = {}
                            count = self._missing_ticker_counts.get(ticker, 0) + 1
                            self._missing_ticker_counts[ticker] = count
                            
                            if count == 1 or count % 100 == 0:
                                logger.warning(f"⚠️ Asset ID 못찾음: {ticker} (발생: {count}회)")
                            
                            # 실패해도 ACK하여 재처리 방지
                            ack_items.append((stream_name, group_name, message_id))

                except Exception as e:
                    logger.error(f"메시지 파싱 실패 ({stream_name}:{message_id}): {e}")
                    # 파싱 실패 시에도 ACK (DLQ가 없으므로)
                    ack_items.append((stream_name, group_name, message_id))

    def set_asset_map(self, asset_map: Dict[str, int]):
        self.ticker_to_asset_id = asset_map
