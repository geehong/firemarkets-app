# app/core/websocket.py
import socketio
import time
import asyncio
import json
import redis.asyncio as redis
from datetime import datetime, timezone
from app.core.config import GLOBAL_APP_CONFIGS
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.memory import MemoryJobStore
from collections import defaultdict

# DataProcessor를 모듈 레벨에서 한 번만 임포트하여 재사용합니다.
try:
    from app.services.data_processor import data_processor as processor
except ImportError:
    processor = None
    print("⚠️ [초기화 경고] DataProcessor 모듈을 찾을 수 없습니다. 백업 데이터 기능이 비활성화됩니다.")

# Socket.IO 설정 - 모든 도메인 허용

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins="*",  # 모든 도메인 허용
    logger=False,
    engineio_logger=False,
    ping_timeout=60,
    ping_interval=25,
    max_http_buffer_size=1e6,
    allow_upgrades=True,
    transports=['websocket', 'polling']
)

# WebSocket 이벤트 핸들러
@sio.event
async def connect(sid, environ):
    """클라이언트 연결 시 호출"""
    print(f"🔗 Client connected: {sid}")
    print(f"🔍 연결 정보: {environ.get('REMOTE_ADDR', 'unknown')}")
    
    # 현재 연결된 클라이언트 수 확인
    connected_clients = len(sio.manager.rooms.get('/', {}))
    print(f"👥 총 연결된 클라이언트 수: {connected_clients}")
    
    await sio.emit('scheduler_log', {
        'message': '백엔드와 실시간 연결 성공',
        'type': 'success'
    }, to=sid)
    print(f"✅ 연결 확인 메시지 전송 완료: {sid}")

@sio.event
async def disconnect(sid):
    """클라이언트 연결 해제 시 호출"""
    print(f"🔌 Client disconnected: {sid}")
    
    # 현재 연결된 클라이언트 수 확인
    connected_clients = len(sio.manager.rooms.get('/', {}))
    print(f"👥 남은 연결된 클라이언트 수: {connected_clients}")

# (신규) Broadcaster 서비스로부터 이벤트를 받아 처리
# 통계 집계용 변수
broadcast_stats = defaultdict(lambda: 0)
last_stat_log_time = time.time()

@sio.event
async def broadcast_quote(sid, data):
    """websocket_broadcaster 서비스로부터 받은 단일 데이터를 클라이언트에게 브로드캐스트합니다."""
    await broadcast_realtime_quote(data)

@sio.event
async def broadcast_quotes_batch(sid, data_list):
    """websocket_broadcaster 서비스로부터 받은 배치 데이터를 처리합니다."""
    if not isinstance(data_list, list):
        return
    
    # print(f"📦 [BACKEND←BROADCASTER] 배치 수신: {len(data_list)}건")
    # 병렬 브로드캐스트 (속도 최적화)
    tasks = [broadcast_realtime_quote(item) for item in data_list]
    if tasks:
        await asyncio.gather(*tasks)

# 실시간 가격 데이터 구독 이벤트
@sio.event
async def subscribe_prices(sid, data):
    """가격 구독 요청"""
    symbols = data.get('symbols', [])
    print(f"📡 Client {sid} subscribing to prices: {symbols}")
    
    # 각 심볼에 대해 룸에 추가
    for symbol in symbols:
        await sio.enter_room(sid, f"prices_{symbol}")
        print(f"🏠 Added client {sid} to room: prices_{symbol}")
    
    await sio.emit('subscription_confirmed', {
        'message': f'Subscribed to {len(symbols)} symbols',
        'symbols': symbols
    }, to=sid)
    print(f"✅ Subscription confirmed sent to {sid}")

@sio.event
async def unsubscribe_prices(sid, data):
    """가격 구독 해제"""
    symbols = data.get('symbols', [])
    print(f"Client {sid} unsubscribing from prices: {symbols}")
    
    # 각 심볼에 대해 룸에서 제거
    for symbol in symbols:
        await sio.leave_room(sid, f"prices_{symbol}")

@sio.event
async def subscribe_sparkline(sid, data):
    """스파크라인 데이터 구독 요청"""
    symbols = data.get('symbols', [])
    interval = data.get('interval', '15m')
    print(f"Client {sid} subscribing to sparkline: {symbols} ({interval})")
    
    # 각 심볼에 대해 스파크라인 룸에 추가
    for symbol in symbols:
        await sio.enter_room(sid, f"sparkline_{symbol}_{interval}")
    
    await sio.emit('sparkline_subscription_confirmed', {
        'message': f'Subscribed to sparkline for {len(symbols)} symbols',
        'symbols': symbols,
        'interval': interval
    }, to=sid)

@sio.event
async def unsubscribe_sparkline(sid, data):
    """스파크라인 구독 해제"""
    symbols = data.get('symbols', [])
    interval = data.get('interval', '15m')
    print(f"Client {sid} unsubscribing from sparkline: {symbols} ({interval})")
    
    # 각 심볼에 대해 스파크라인 룸에서 제거
    for symbol in symbols:
        await sio.leave_room(sid, f"sparkline_{symbol}_{interval}")

async def safe_emit(event, data):
    """안전한 WebSocket 이벤트 전송"""
    try:
        await sio.emit(event, data)
    except Exception as e:
        print(f"Failed to emit {event}: {e}")

# 실시간 가격 데이터 브로드캐스트 함수들
async def broadcast_price_update(symbol, price_data):
    """특정 심볼의 가격 업데이트를 구독자들에게 브로드캐스트"""
    try:
        await sio.emit('price_update', {
            'symbol': symbol,
            'price': price_data.get('price'),
            'change_amount': price_data.get('change_amount'),
            'change_percent': price_data.get('change_percent'),
            'timestamp_utc': price_data.get('timestamp_utc'),
            'data_source': price_data.get('data_source')
        }, room=f"prices_{symbol}")
        # print(f"Broadcasted price update for {symbol}: ${price_data.get('price')}")
    except Exception as e:
        print(f"Failed to broadcast price update for {symbol}: {e}")

async def broadcast_sparkline_update(symbol, interval, sparkline_data):
    """특정 심볼의 스파크라인 데이터를 구독자들에게 브로드캐스트"""
    try:
        await sio.emit('sparkline_update', {
            'symbol': symbol,
            'interval': interval,
            'quotes': sparkline_data
        }, room=f"sparkline_{symbol}_{interval}")
        print(f"Broadcasted sparkline update for {symbol} ({interval}): {len(sparkline_data)} points")
    except Exception as e:
        print(f"Failed to broadcast sparkline update for {symbol}: {e}")

async def broadcast_realtime_quote(quote_data):
    """실시간 인용 데이터를 모든 연결된 클라이언트에게 브로드캐스트"""
    try:
        asset_id = quote_data.get('asset_id')
        price = quote_data.get('price')
        ticker = quote_data.get('ticker', f'ASSET_{asset_id}')
        change_percent = quote_data.get('change_percent', 0)
        
        if not ticker:
            print(f"⚠️ 브로드캐스트 건너뜀: ticker 정보가 없습니다. data={quote_data}")
            return

        # 로그 출력 시 None 값 안전하게 처리
        change_percent_str = f"{change_percent:+.2f}%" if change_percent is not None else "N/A"

        # 데이터를 전송할 룸 이름 지정
        target_room = f"prices_{ticker}"
        
        # print(f"🚀 Broadcasting 'realtime_quote' to room '{target_room}': ${price} ({change_percent_str})")
        
        # 특정 룸으로만 이벤트 전송
        # logger.debug(f"📤 [ROOM BROADCAST] {ticker} -> {target_room}")
        await sio.emit('realtime_quote', quote_data, room=target_room)
        # print(f"✅ Broadcasted to room '{target_room}' successfully.")
        
        # 통계 집계
        global last_stat_log_time
        asset_type = quote_data.get('asset_type', 'Unknown')
        broadcast_stats[asset_type] += 1
        
        current_time = time.time()
        if current_time - last_stat_log_time >= 60:
            stats_str = ", ".join([f"{k}: {v}개 성공" for k, v in broadcast_stats.items()])
            print(f"✅ [WebSocket 통계] 지난 1분간 방송 성공: {stats_str}")
            broadcast_stats.clear()
            last_stat_log_time = current_time
        
    except Exception as e:
        print(f"❌ Failed to broadcast realtime quote: {e}")
        import traceback
        print(f"🔍 브로드캐스트 오류 상세: {traceback.format_exc()}")

# 외부 WebSocket 연결 상태 모니터링
@sio.event
async def check_connection_health(sid, data):
    """연결 상태 확인"""
    try:
        await sio.emit('health_check_response', {
            'status': 'healthy',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'server_time': time.time()
        }, to=sid)
    except Exception as e:
        print(f"Health check failed: {e}")

@sio.event
async def request_backup_data(sid, data):
    """백업 데이터 요청"""
    symbols = data.get('symbols', [])
    print(f"Client {sid} requesting backup data for: {symbols}")
    
    try:
        if processor:
            backup_data = await processor.get_backup_data(symbols)
        else:
            backup_data = None
            print("⚠️ DataProcessor 인스턴스가 없어 백업 데이터를 가져올 수 없습니다.")
        
        if backup_data:
            await sio.emit('backup_data_response', {
                'data': backup_data,
                'source': processor.get_current_source(),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }, to=sid)
        else:
            await sio.emit('backup_data_error', {
                'message': '백업 데이터를 사용할 수 없습니다.',
                'timestamp': datetime.now(timezone.utc).isoformat() # ISO 문자열로 변환
            }, to=sid)
    except Exception as e:
        await sio.emit('backup_data_error', {
            'message': f'Backup data request failed: {str(e)}',
            'timestamp': datetime.now(timezone.utc).isoformat() # ISO 문자열로 변환
        }, to=sid)

@sio.event
async def test_websocket(sid, data):
    """WebSocket 수신 테스트"""
    print(f"🧪 WebSocket 테스트 요청 from {sid}")
    print(f"🔍 받은 데이터: {data}")
    
    # 즉시 테스트 데이터 전송
    test_data = {
        'asset_id': 1,
        'ticker': 'BTCUSDT',
        'price': 50000.0,
        'change_amount': 1000.0,
        'change_percent': 2.0,
        'timestamp_utc': datetime.now(timezone.utc).isoformat(),
        'data_source': 'websocket_test'
    }
    
    print(f"📡 테스트 데이터 준비: {test_data}")
    
    try:
        await sio.emit('realtime_quote', test_data, to=sid)
        print(f"✅ 테스트 데이터 전송 완료: {test_data['ticker']} - ${test_data['price']}")
    except Exception as e:
        print(f"❌ 테스트 데이터 전송 실패: {e}")
        import traceback
        print(f"🔍 오류 상세: {traceback.format_exc()}")

# 하드코딩된 테스트 데이터 구독 및 수신 기능
@sio.event
async def test_hardcoded_subscription(sid, data):
    """하드코딩된 비트코인과 이더리움 데이터 구독 테스트"""
    print(f"🧪 하드코딩 테스트 요청 from {sid}")
    
    # 하드코딩된 구독 심볼
    test_symbols = ['BTCUSDT', 'ETHUSDT']
    
    # 각 심볼에 대해 룸에 추가
    for symbol in test_symbols:
        await sio.enter_room(sid, f"prices_{symbol}")
        print(f"🏠 하드코딩 테스트 - Added client {sid} to room: prices_{symbol}")
    
    # 구독 확인 메시지 전송
    await sio.emit('subscription_confirmed', {
        'message': f'하드코딩 테스트 구독 완료: {len(test_symbols)}개 심볼',
        'symbols': test_symbols
    }, to=sid)
    print(f"✅ 하드코딩 테스트 구독 확인 전송: {test_symbols}")

@sio.event
async def test_hardcoded_data(sid, data):
    """하드코딩된 테스트 데이터 전송"""
    print(f"📡 하드코딩 테스트 데이터 전송 요청 from {sid}")
    
    # 하드코딩된 테스트 데이터
    test_data = [
        {
            'asset_id': 1,
            'ticker': 'BTCUSDT',
            'price': 50000.0,
            'change_amount': 1000.0,
            'change_percent': 2.0,
            'timestamp_utc': datetime.now(timezone.utc).isoformat(),
            'data_source': 'hardcoded_test'
        },
        {
            'asset_id': 2,
            'ticker': 'ETHUSDT',
            'price': 3000.0,
            'change_amount': 50.0,
            'change_percent': 1.7,
            'timestamp_utc': datetime.now(timezone.utc).isoformat(),
            'data_source': 'hardcoded_test'
        }
    ]
    
    # 각 테스트 데이터를 realtime_quote 이벤트로 전송
    for data_item in test_data:
        try:
            print(f"📤 하드코딩 테스트 데이터 전송: {data_item['ticker']} - ${data_item['price']}")
            await sio.emit('realtime_quote', data_item, to=sid)
            print(f"✅ 하드코딩 테스트 데이터 전송 완료: {data_item['ticker']}")
        except Exception as e:
            print(f"❌ 하드코딩 테스트 데이터 전송 실패: {e}")
