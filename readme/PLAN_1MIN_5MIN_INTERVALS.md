# 1분/5분 간격 데이터 수집 구현 계획

## 목표
- 1분 간격: TwelveData 사용, limit 4320 (3일치)
- 5분 간격: Polygon 사용, limit 8640 (30일치)
- `self.ohlcv_intraday_clients`에 추가

## 현재 상태 분석

### 1. 현재 코드 구조
- `api_strategy_manager.py`의 `get_ohlcv()` 메서드에서 간격별 클라이언트 선택
- `ohlcv_intraday_clients`는 `["4h", "1h", "30m", "15m", "5m", "1m"]` 간격 지원
- 현재 `ohlcv_intraday_clients` 순서: `[TwelveDataClient, PolygonClient, TiingoClient]`

### 2. Limit 계산 로직
- 현재 `get_ohlcv()` 메서드에서 `historical_days` 기반으로 limit 계산
- 1h: `historical_days * 24`
- 4h: `historical_days * 6`

## 구현 계획

### 1. 간격별 클라이언트 우선순위 설정 추가
**위치**: `api_strategy_manager.py`의 `__init__` 메서드

```python
# 간격별 클라이언트 우선순위 매핑
self.interval_client_priority = {
    "1m": ["TwelveDataClient"],      # 1분: TwelveData만 사용
    "5m": ["PolygonClient"],         # 5분: Polygon만 사용
    "15m": ["TwelveDataClient", "PolygonClient", "TiingoClient"],  # 기존 순서 유지
    "30m": ["TwelveDataClient", "PolygonClient", "TiingoClient"],
    "1h": ["TwelveDataClient", "PolygonClient", "TiingoClient"],
    "4h": ["TwelveDataClient", "PolygonClient", "TiingoClient"],
}
```

### 2. 간격별 Limit 계산 로직 추가
**위치**: `api_strategy_manager.py`의 `get_ohlcv()` 메서드

```python
# 간격별 limit 계산 (1분/5분 추가)
if interval == '1m':
    # 1분: 3일치 = 3 * 24 * 60 = 4320
    adjusted_limit = 4320
elif interval == '5m':
    # 5분: 30일치 = 30 * 24 * 12 = 8640
    adjusted_limit = 8640
elif interval == '1h':
    adjusted_limit = historical_days * 24
elif interval == '4h':
    adjusted_limit = historical_days * 6
else:
    adjusted_limit = limit
```

### 3. 간격별 클라이언트 필터링 로직 추가
**위치**: `api_strategy_manager.py`의 `get_ohlcv()` 메서드 (클라이언트 선택 부분)

```python
# 간격별 클라이언트 우선순위 적용
if interval in self.interval_client_priority:
    priority_clients = self.interval_client_priority[interval]
    # 우선순위에 따라 클라이언트 재정렬
    filtered_clients = []
    for priority_name in priority_clients:
        for client in clients_to_use:
            if client.__class__.__name__ == priority_name:
                filtered_clients.append(client)
                break
    # 우선순위에 없는 클라이언트는 제외
    if filtered_clients:
        clients_to_use = filtered_clients
```

### 4. 로깅 추가
- 간격별 클라이언트 선택 로그
- Limit 계산 로그

## 수정 파일
1. `backend/app/services/api_strategy_manager.py`
   - `__init__` 메서드: 간격별 클라이언트 우선순위 설정 추가
   - `get_ohlcv()` 메서드: 
     - 1분/5분 간격 limit 계산 추가
     - 간격별 클라이언트 필터링 로직 추가

## 테스트 계획
1. 1분 간격 데이터 수집 테스트
   - TwelveData 클라이언트만 사용되는지 확인
   - Limit 4320이 적용되는지 확인
2. 5분 간격 데이터 수집 테스트
   - Polygon 클라이언트만 사용되는지 확인
   - Limit 8640이 적용되는지 확인

## 주의사항
1. TwelveData와 Polygon의 API 제한 확인 필요
2. 1분/5분 간격은 데이터량이 많으므로 수집 주기 조정 필요
3. 기존 간격(15m, 30m, 1h, 4h)의 동작은 변경하지 않음

