import React, { lazy, Suspense, useEffect, useMemo } from 'react'
import { CRow, CCol, CCard, CCardHeader, CCardBody, CCardTitle } from '@coreui/react'
import useWebSocketStore from '../../store/websocketStore'

// 지연 로딩으로 번들 크기 감소 (TreeMap은 모듈 의존성 때문에 즉시 로드)
import { PerformanceTreeMapToday } from 'src/components/charts/threemap'
const DefaultChart = lazy(() => import('src/components/charts/defaultchart/DefaultChart'))
const HistoryTableDefault = lazy(() => import('src/components/tables/HistoryTableDefault'))
const RealTimeWidgetsTypeA = lazy(() => import('src/components/widgets/RealTimeWidgetsTypeA'))
const MiniPriceChart = lazy(() => import('src/components/charts/MiniPriceChart'))

const MainDashboard = () => {
  // 차트 그룹별 심볼 정의
  const chartGroups = [
    {
      title: '핵심 시장',
      symbols: ['BTCUSDT', 'ETHUSDT', 'GCUSD', 'SPY']
    }
  ];

  // 모든 심볼을 하나의 배열로 추출 (정적 배열로 변경)
  const allSymbols = useMemo(() => 
    ['BTCUSDT', 'ETHUSDT', 'GCUSD', 'SPY'], 
    []
  );

  // WebSocket 연결 상태 가져오기
  const connected = useWebSocketStore((state) => state.connected);
  const loading = useWebSocketStore((state) => state.loading);
  const error = useWebSocketStore((state) => state.error);

  // WebSocket 연결 및 재연결 로직 (Test01.js와 동일)
  useEffect(() => {
    const { connect, disconnect, subscribeSymbols } = useWebSocketStore.getState();

    if (allSymbols.length > 0) {
      console.log('[MainDashboard] Initializing WebSocket connection for symbols:', allSymbols);
      connect();
      subscribeSymbols(allSymbols);
    }

    // 컴포넌트가 언마운트될 때 WebSocket 연결을 해제합니다.
    return () => {
      console.log('[MainDashboard] Cleaning up WebSocket connection');
      disconnect();
    };
  }, [allSymbols]);

  // WebSocket 연결 상태 모니터링 및 자동 재연결 (Test01.js와 동일)
  useEffect(() => {
    if (!connected && allSymbols.length > 0) {
      console.log('[MainDashboard] WebSocket disconnected, attempting reconnection...');
      const { connect, subscribeSymbols } = useWebSocketStore.getState();
      
      // 3초 후 재연결 시도
      const reconnectTimer = setTimeout(() => {
        connect();
        setTimeout(() => {
          subscribeSymbols(allSymbols);
        }, 1000);
      }, 3000);

      return () => clearTimeout(reconnectTimer);
    }
  }, [connected, allSymbols]);

  return (
    <>
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

      {/* 시장 상태에 따른 차트 표시 */}
      <CCard className="mb-4">
        <CCardHeader>
          <CCardTitle className="card-title">실시간 가격 차트</CCardTitle>
        </CCardHeader>
        <CCardBody style={{ padding: '8px' }}>
          <CRow>
            {chartGroups.flatMap((group, groupIndex) => 
              group.symbols.map((symbol, index) => (
                <CCol 
                  key={`${group.title}-${symbol}-${index}`} 
                  xs={12} sm={12} md={6} lg={6} xl={6} 
                  className="mb-3"
                >
                  <div style={{ height: '300px', minHeight: '300px', width: '100%' }}>
                    <Suspense fallback={<div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading {symbol} chart...</div>}>
                      <MiniPriceChart 
                        assetIdentifier={symbol}
                      />
                    </Suspense>
                  </div>
                </CCol>
              ))
            )}
          </CRow>
        </CCardBody>
      </CCard>

      {/* Real-time Widgets */}
      <Suspense fallback={<div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Real-time Widgets...</div>}>
        <RealTimeWidgetsTypeA />
      </Suspense>

      {/* Performance TreeMap */}
      <div className="card mb-4">
        <div className="card-body">
          <PerformanceTreeMapToday />
        </div>
      </div>

      {/* Default Chart */}
      <Suspense fallback={<div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Chart...</div>}>
        <DefaultChart />
      </Suspense>
      
      {/* History Table */}
      <Suspense fallback={<div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Table...</div>}>
        <HistoryTableDefault />
      </Suspense>
    </>
  )
}

export default MainDashboard
