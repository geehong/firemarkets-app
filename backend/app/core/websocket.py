# app/core/websocket.py
import socketio
import time
from datetime import datetime, timezone
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.memory import MemoryJobStore

# Socket.IO 설정 - 모든 도메인 허용

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins="*",  # 모든 도메인 허용
    logger=True,
    engineio_logger=True,
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
        print(f"Broadcasted price update for {symbol}: ${price_data.get('price')}")
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
        data_source = quote_data.get('data_source', 'unknown')
        
        print(f"📊 Broadcasting realtime quote 시작: asset_id={asset_id} - ${price}")
        print(f"🔍 브로드캐스트 데이터 상세: {quote_data}")
        print(f"📈 가격 정보: {ticker} = ${price} ({change_percent:+.2f}%) - 소스: {data_source}")
        
        # 연결된 클라이언트 수 확인
        connected_clients = len(sio.manager.rooms.get('/', {}))
        print(f"👥 현재 연결된 클라이언트 수: {connected_clients}")
        
        # 연결된 클라이언트 ID 목록 출력
        if connected_clients > 0:
            client_ids = list(sio.manager.rooms.get('/', {}).keys())
            print(f"🔗 연결된 클라이언트 ID: {client_ids}")
        else:
            print("⚠️ 연결된 클라이언트가 없습니다 - 데이터가 전송되지 않습니다")
        
        # record_data를 그대로 브로드캐스트 (ticker 필드는 data_processor에서 이미 추가됨)
        print(f"📡 브로드캐스트 데이터 구성 완료: {quote_data}")
        
        # 모든 클라이언트에게 브로드캐스트
        print(f"🚀 WebSocket emit 시작: realtime_quote 이벤트")
        await sio.emit('realtime_quote', quote_data)
        
        print(f"✅ Broadcasted realtime quote 성공: asset_id={asset_id} - ${price}")
        print(f"📤 전송된 이벤트: realtime_quote")
        print(f"📤 전송된 데이터: {quote_data}")
        print(f"🎯 수신 대상: {connected_clients}명의 클라이언트")
        
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
        # DataProcessor에서 백업 데이터 가져오기 (import 오류 방지)
        try:
            from ...services.data_processor import DataProcessor
            processor = DataProcessor()
            backup_data = await processor.get_backup_data(symbols)
        except ImportError as import_error:
            print(f"⚠️ DataProcessor import 실패: {import_error}")
            backup_data = None
        
        if backup_data:
            await sio.emit('backup_data_response', {
                'data': backup_data,
                'source': processor.get_current_source(),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }, to=sid)
        else:
            await sio.emit('backup_data_error', {
                'message': 'No backup data available',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }, to=sid)
    except Exception as e:
        await sio.emit('backup_data_error', {
            'message': f'Backup data request failed: {str(e)}',
            'timestamp': datetime.now(timezone.utc).isoformat()
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

# 주기적 하드코딩 테스트 데이터 전송 (30초마다)
def send_periodic_test_data():
    """주기적으로 하드코딩된 테스트 데이터 전송"""
    import asyncio
    
    async def _send_test_data():
        test_data = {
            'asset_id': 1,
            'ticker': 'BTCUSDT',
            'price': 50000.0 + (time.time() % 1000),  # 시간에 따라 변하는 가격
            'change_amount': 1000.0,
            'change_percent': 2.0,
            'timestamp_utc': datetime.now(timezone.utc).isoformat(),
            'data_source': 'periodic_hardcoded_test'
        }
        
        print(f"🔄 주기적 하드코딩 테스트 데이터 전송: {test_data['ticker']} - ${test_data['price']}")
        await sio.emit('realtime_quote', test_data)
        print(f"✅ 주기적 하드코딩 테스트 데이터 전송 완료")
    
    # 비동기 함수 실행
    asyncio.create_task(_send_test_data())

# 스케줄러에 주기적 테스트 작업 추가
try:
    scheduler.add_job(
        send_periodic_test_data,
        'interval',
        seconds=30,
        id='hardcoded_test_data',
        replace_existing=True
    )
    print("✅ 주기적 하드코딩 테스트 스케줄러 등록 완료 (30초마다)")
except Exception as e:
    print(f"❌ 주기적 하드코딩 테스트 스케줄러 등록 실패: {e}")

# APScheduler 설정 - MemoryJobStore를 사용하되 daemon=True로 설정하여 독립 실행
from apscheduler.jobstores.memory import MemoryJobStore

jobstores = {
    'default': MemoryJobStore()
}

scheduler = BackgroundScheduler(
    daemon=True,  # 메인 프로세스와 독립적으로 실행
    jobstores=jobstores,
    job_defaults={
        'coalesce': True,
        'max_instances': 1,
        'misfire_grace_time': 300,
    },
    timezone='UTC'
)



