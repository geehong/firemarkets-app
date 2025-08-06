# app/core/websocket.py
import socketio
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
    print(f"Client connected: {sid}")
    await sio.emit('scheduler_log', {
        'message': '백엔드와 실시간 연결 성공',
        'type': 'success'
    }, to=sid)

@sio.event
async def disconnect(sid):
    """클라이언트 연결 해제 시 호출"""
    print(f"Client disconnected: {sid}")

async def safe_emit(event, data):
    """안전한 WebSocket 이벤트 전송"""
    try:
        await sio.emit(event, data)
    except Exception as e:
        print(f"Failed to emit {event}: {e}")

# APScheduler 설정 - MemoryJobStore를 명시하여 파일 시스템 접근 방지
jobstores = {
    'default': MemoryJobStore()
}

scheduler = BackgroundScheduler(
    daemon=False,
    job_defaults={
        'coalesce': True,
        'max_instances': 1,
        'misfire_grace_time': 300,
    },
    timezone='UTC'
)



