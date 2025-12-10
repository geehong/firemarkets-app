import logging
import asyncio
import redis.asyncio as redis
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class StreamConsumer:
    """Redis Stream 소비 및 처리를 담당하는 클래스"""

    def __init__(self, redis_url: str, adapter_factory, repository, batch_size: int = 100):
        self.redis_url = redis_url
        self.redis_client = None
        self.adapter_factory = adapter_factory
        self.repository = repository
        self.batch_size = batch_size
        self.realtime_streams = {
            # High priority: Active WebSocket streams with frequent updates
            "binance:realtime": "binance_group",
            "coinbase:realtime": "coinbase_group",
            "swissquote:realtime": "swissquote_group",
            # Lower priority: May have timeouts or less frequent updates
            "alpaca:realtime": "alpaca_group",
            "finnhub:realtime": "finnhub_group",
        }

    async def connect(self) -> bool:
        """Redis 연결 초기화"""
        try:
            if self.redis_client:
                await self.redis_client.ping()
                return True
                
            self.redis_client = await redis.from_url(self.redis_url)
            await self.redis_client.ping()
            logger.info(f"Redis 연결 성공: {self.redis_url}")
            return True
        except Exception as e:
            logger.error(f"Redis 연결 실패: {e}")
            return False

    async def process_streams(self) -> int:
        """실시간 스트림 데이터 처리"""
        if not self.redis_client:
            return 0

        processed_count = 0
        records_to_save = []
        ack_items = []

        try:
            # Consumer Group 생성
            for stream_name, group_name in self.realtime_streams.items():
                try:
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
                            block=0  # Non-blocking to prevent infinite wait
                        )
                        if pending_data:
                            await self._process_messages(pending_data, records_to_save, ack_items)
                except Exception as e:
                    logger.error(f"Pending 처리 실패 {stream_name}: {e}")

            # 각 스트림별로 개별 처리 (각 스트림마다 다른 consumer group 사용)
            # 고우선순위 스트림(binance, coinbase)은 짧은 blocking으로 처리
            high_priority_streams = {"binance:realtime", "coinbase:realtime"}
            for stream_name, group_name in self.realtime_streams.items():
                try:
                    # 고우선순위 스트림은 50ms blocking, 나머지는 non-blocking
                    block_time = 50 if stream_name in high_priority_streams else 0
                    
                    # Timeout 보호 (최대 500ms)
                    new_data = await asyncio.wait_for(
                        self.redis_client.xreadgroup(
                            groupname=group_name,
                            consumername="processor_worker",
                            streams={stream_name: ">"},
                            count=self.batch_size,
                            block=block_time
                        ),
                        timeout=0.5
                    )
                    if new_data:
                        total_messages = sum(len(msgs) for _, msgs in new_data)
                        if total_messages > 0:
                            logger.info(f"📨 스트림 {stream_name}에서 {total_messages}개 메시지 읽음")
                        await self._process_messages(new_data, records_to_save, ack_items)
                except asyncio.TimeoutError:
                    logger.warning(f"스트림 {stream_name} 읽기 timeout")
                except Exception as stream_error:
                    # 에러 발생해도 다음 스트림 처리 계속
                    logger.warning(f"스트림 {stream_name} 읽기 실패: {stream_error}")
            
            # 데이터가 없으면 추가 대기로 CPU 부하 완화
            if not records_to_save:
                await asyncio.sleep(0.2)
            else:
                logger.debug(f"📥 처리할 레코드: {len(records_to_save)}개")

            # DB 저장
            if records_to_save:
                logger.info(f"💾 DB 저장 시도: {len(records_to_save)}개 레코드")
                success = await self.repository.bulk_save_realtime_quotes(records_to_save)
                if success:
                    processed_count = len(records_to_save)
                    logger.info(f"✅ DB 저장 성공: {processed_count}개")
                else:
                    logger.error("❌ DB 저장 실패")

            # ACK 처리
            if ack_items:
                for stream_name, group_name, message_id in ack_items:
                    try:
                        await self.redis_client.xack(stream_name, group_name, message_id)
                    except Exception as e:
                        logger.warning(f"ACK 실패 {stream_name}:{message_id}: {e}")

        except Exception as e:
            logger.error(f"스트림 처리 중 오류: {e}")

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
                    parsed_data = adapter.parse_message(message_data)
                    if parsed_data:
                        # asset_id 조회 로직이 필요함. 
                        # 현재 Adapter는 ticker만 반환하므로, 여기서 asset_id를 매핑해야 함.
                        # 성능을 위해 캐싱된 매핑을 사용하는 것이 좋음.
                        # 하지만 리팩토링 단계에서는 일단 DB에서 조회하거나 캐시를 주입받아야 함.
                        # 여기서는 임시로 asset_id를 None으로 두고 Repository나 Validator에서 처리하게 하거나,
                        # DataProcessor가 가지고 있던 ticker_to_asset_id 맵을 주입받아야 함.
                        
                        # TODO: Resolve asset_id efficiently. 
                        # For now, let's assume we can get it from a cache passed in or similar.
                        # Or better, let the repository handle it if it caches?
                        # No, repository saves. Validator validates.
                        # Let's add a method to inject asset_map.
                        
                        ticker = parsed_data.get('ticker')
                        if not ticker:
                            logger.warning(f"⚠️ Ticker가 없는 메시지: {stream_name}:{message_id}")
                            ack_items.append((stream_name, group_name, message_id))
                            continue
                        
                        # Ticker normalization: try original first, then try without USDT suffix
                        asset_id = None
                        if hasattr(self, 'ticker_to_asset_id'):
                            # Try original ticker first (e.g., BTCUSDT, ETH, SOL-USD)
                            if ticker in self.ticker_to_asset_id:
                                asset_id = self.ticker_to_asset_id[ticker]
                            # If not found and has USDT suffix, try without it (e.g., SOLUSDT -> SOL)
                            elif ticker.endswith('USDT') and len(ticker) > 4:
                                normalized_ticker = ticker[:-4]  # Remove 'USDT'
                                if normalized_ticker in self.ticker_to_asset_id:
                                    asset_id = self.ticker_to_asset_id[normalized_ticker]
                            # Coinbase format: SOL-USD -> SOL
                            elif ticker.endswith('-USD') and len(ticker) > 4:
                                normalized_ticker = ticker[:-4]  # Remove '-USD'
                                if normalized_ticker in self.ticker_to_asset_id:
                                    asset_id = self.ticker_to_asset_id[normalized_ticker]
                            # Some exchanges use XXX-USDT format (e.g., BTC-USDT -> BTC)
                            elif ticker.endswith('-USDT') and len(ticker) > 5:
                                normalized_ticker = ticker[:-5]  # Remove '-USDT'
                                if normalized_ticker in self.ticker_to_asset_id:
                                    asset_id = self.ticker_to_asset_id[normalized_ticker]
                            # Swissquote format: XAU/USD -> XAU
                            elif '/USD' in ticker:
                                normalized_ticker = ticker.split('/')[0]
                                if normalized_ticker in self.ticker_to_asset_id:
                                    asset_id = self.ticker_to_asset_id[normalized_ticker]
                        
                        if asset_id is not None:
                            parsed_data['asset_id'] = asset_id
                            records_to_save.append(parsed_data)
                            ack_items.append((stream_name, group_name, message_id))
                        else:
                            # 매핑 실패 시 로그
                            if not hasattr(self, 'ticker_to_asset_id'):
                                logger.warning(f"⚠️ Asset 맵이 설정되지 않음. Ticker: {ticker}")
                            else:
                                # Only log periodically to reduce log spam (every 100th occurrence)
                                if not hasattr(self, '_missing_ticker_counts'):
                                    self._missing_ticker_counts = {}
                                count = self._missing_ticker_counts.get(ticker, 0) + 1
                                self._missing_ticker_counts[ticker] = count
                                if count == 1 or count % 100 == 0:
                                    logger.warning(f"⚠️ Asset ID를 찾을 수 없음. Ticker: {ticker} (맵 크기: {len(self.ticker_to_asset_id)}, 발생: {count}회)")
                            # ACK는 해야 하나? 실패한 메시지는 ACK해서 넘어가야 함.
                            ack_items.append((stream_name, group_name, message_id))

                except Exception as e:
                    logger.error(f"메시지 파싱 실패 ({stream_name}:{message_id}): {e}")
                    # 파싱 실패한 메시지도 ACK 처리하여 무한 루프 방지 (또는 DLQ로 이동)
                    ack_items.append((stream_name, group_name, message_id))

    def set_asset_map(self, asset_map: Dict[str, int]):
        self.ticker_to_asset_id = asset_map
