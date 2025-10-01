import React, { useEffect, useMemo } from 'react'
import { CContainer, CRow, CCol } from '@coreui/react'
import WebSocketWidgetE from '../../components/widgets/WebSocketWidgetE'
import useWebSocketStore from '../../store/websocketStore'

const Test01 = () => {
  // WebSocketWidgetE에서 사용하는 심볼들 정의
  const symbols = useMemo(() => [
    'BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'BNB', 'SOL', 'USDC', 'DOGEUSDT', 'TRX', 
    'ADAUSDT', 'LINK', 'AVAX', 'WBTC', 'XLM', 'BCHUSDT', 'HBAR', 'LTCUSDT', 
    'CRO', 'SHIB', 'TON', 'DOTUSDT'
  ], [])

  // WebSocket 연결 상태 가져오기
  const connected = useWebSocketStore((state) => state.connected)
  const loading = useWebSocketStore((state) => state.loading)
  const error = useWebSocketStore((state) => state.error)

  // WebSocket 연결 및 재연결 로직 (MainDashboard와 동일)
  useEffect(() => {
    const { connect, disconnect, subscribeSymbols } = useWebSocketStore.getState();

    if (symbols.length > 0) {
      console.log('[Test01] Initializing WebSocket connection for symbols:', symbols);
      connect();
      subscribeSymbols(symbols);
    }

    // 컴포넌트가 언마운트될 때 WebSocket 연결을 해제합니다.
    return () => {
      console.log('[Test01] Cleaning up WebSocket connection');
      disconnect();
    };
  }, [symbols]);

  // WebSocket 연결 상태 모니터링 및 자동 재연결
  useEffect(() => {
    if (!connected && symbols.length > 0) {
      console.log('[Test01] WebSocket disconnected, attempting reconnection...');
      const { connect, subscribeSymbols } = useWebSocketStore.getState();
      
      // 3초 후 재연결 시도
      const reconnectTimer = setTimeout(() => {
        connect();
        setTimeout(() => {
          subscribeSymbols(symbols);
        }, 1000);
      }, 3000);

      return () => clearTimeout(reconnectTimer);
    }
  }, [connected, symbols]);

  return (
    <CContainer fluid>
      <CRow>
        <CCol>
          <h2 className="mb-4">🚀 실시간 암호화폐 가격 (WebSocket)</h2>
          <p className="text-muted mb-4">
            비트코인과 이더리움의 실시간 가격을 WebSocket을 통해 수신합니다.
          </p>
          
          {/* WebSocket 연결 상태 표시 */}
          <div className="mb-3">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-secondary">WebSocket 상태:</span>
              <span className={`badge ${connected ? 'bg-success' : 'bg-danger'}`}>
                {connected ? '연결됨' : '연결 끊김'}
              </span>
              {loading && <span className="badge bg-warning">로딩 중...</span>}
              {error && <span className="badge bg-danger">에러: {error}</span>}
            </div>
          </div>

          <WebSocketWidgetE />
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default Test01
