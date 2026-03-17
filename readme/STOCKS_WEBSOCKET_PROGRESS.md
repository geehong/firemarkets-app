# 🚀 주식/ETF 실시간 데이터 수신 개선 작업 보고서 (2026-03-17)

## 📋 현재까지의 작업 결과 (Summary)

현재 Alpaca와 Finnhub으로부터 주식/ETF 데이터를 수신하여 백엔드/프론트엔드로 전달하는 핵심 파이프라인의 오류를 대부분 해결했습니다.

### 1. Alpaca Consumer (backend/app/services/websocket/alpaca_consumer.py) 개선
*   **나노초 타임스탬프 파싱 오류 해결**: Alpaca가 보내는 나노초(ns) 단위 데이터를 Python의 `datetime`이 지원하는 마이크로초(ms) 단위로 절삭하여 파싱 시 발생하던 크래시를 차단했습니다.
*   **호가(Quote) 데이터 처리 로직 도입**: 거래가 활발하지 않은 시간(애프터마켓 등)에도 데이터가 끊기지 않도록, 실시간 거래(Trade)뿐만 아니라 호가(Quote) 데이터의 **Bid Price**를 현재가로 취급하여 처리하도록 수정했습니다.
*   **구독 채널 확장 (최신)**: 기존에 `trades` 채널만 구독하던 로직을 `trades`, `quotes`, `bars` 세 채널 모두 구독하도록 변경하여 데이터 수신 범위를 공식적으로 넓혔습니다. (**※ 오케스트레이터 재시작 필요**)

### 2. WebSocket Broadcaster (backend/app/services/run_websocket_broadcaster.py) 개선
*   **자산 타입 및 ID 캐싱 최적화**: Stocks/ETFs 자산들이 `Unknown`으로 분류되던 문제를 해결하여, 이제 DB의 `asset_type` 정보를 토대로 정확한 카테고리로 매핑됩니다.
*   **유연한 심볼 매칭 로직**: `QQQ`, `SPY` 등의 티커가 소문자/대문자 및 `USDT`, `-USD` 등의 변형 접미사가 붙어도 내부 Asset ID(`216`, `4` 등)로 완벽히 매핑되도록 처리했습니다.
*   **매핑 트레이스 로그 추가**: `[MAPPING-TRACE]` 로그를 통해 어떤 데이터 공급원(Alpaca, Finnhub 등)이 어떤 내부 자산으로 연결되는지 실시간 모니터링이 가능해졌습니다.

### 3. Backend Socket.IO (backend/app/core/websocket.py) 호환성 확보
*   **다중 룸(Room) 브로드캐스트**: 프론트엔드가 '티커(prices_QQQ)'로 구독하든 '자산ID(prices_216)'로 구독하든 데이터를 전달받을 수 있도록, **양쪽 룸에 동시에 데이터를 쏘도록** 수정하여 호환성을 확보했습니다.

### 4. 기타 원천 데이터 공급 복구
*   **Binance Consumer**: 임포트 경로 에러를 수정하여 가동을 시작했습니다. 현재 Crypto 데이터는 Binance와 Coinbase 양쪽에서 탄탄하게 수집되고 있습니다.

---

## ✅ 검증된 사항 (Logs 확인 결과)

- **데이터 수집**: `stored: SPY = $668.68`, `stored: QQQ = $600.1` 로그가 찍히며 Alpaca로부터 데이터가 정상적으로 Redis Streams에 유입되고 있습니다.
- **브로드캐스터 매핑**: `alpaca | SPY -> Internal: SPY (ID: 4)` 와 같이 매핑이 정상 동작합니다.
- **방송 통계**: 지난 1분간 `Stocks: ~20개`, `ETFs: 수시` 성공 로그를 통해 백엔드에서 소켓으로 데이터 가공/전송이 이뤄지고 있습니다.

---

## 🛠️ 남은 할 일 (Next Steps) - (본인이 시간이 없으실 때 처리해야 할 항목)

1.  **오케스트레이터 서비스 재시작 (필수)**
    *   Alpaca의 채널 구독(quotes, bars 추가) 변경 사항을 적용하려면 반드시 다음 명령어를 실행해 주세요:
    ```bash
    docker restart fire_markets_websocket_orchestrator
    ```
    이 작업을 완료해야 거래가 없는 시간에도 호가 데이터가 본격적으로 수신됩니다.

2.  **프론트엔드 심볼 매칭 로직(useSocket.ts) 보강**
    *   Alpaca가 보내는 심볼(예: `SPY`)과 프론트엔드에서 요구하는 심볼(`SPY-USD` 등) 사이에 `isMatch` 필터링에서 걸러지는 경우가 있는지 추가 확인이 필요합니다.

3.  **애프터마켓 시간대 필터링 체크 (AssetDetailedView.tsx)**
    *   상세 페이지의 `isMarketHours` 로직이 시장 외 시간대에 실시간 데이터(WebSocket)를 API 데이터로 교체하면서 생기는 업데이트 지연 현상이 있는지 검토해야 합니다.

4.  **로그 모니터링**
    *   브로드캐스터 로그(`docker logs fire_markets_websocket_broadcaster`)에서 `MAPPING-TRACE` 중 `Failure`가 발생하는 티커가 있는지 확인하여 누락된 자산 매핑을 추가해야 합니다.
