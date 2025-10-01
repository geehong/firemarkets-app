import React, { useMemo, useEffect, lazy, Suspense } from 'react'
import { CRow, CCol, CCard, CCardHeader, CCardBody, CCardTitle } from '@coreui/react'
import { useAPI } from 'src/hooks/useAPI'
import useWebSocketStore from 'src/store/websocketStore'

// 지연 로딩으로 번들 크기 감소 (TreeMap은 모듈 의존성 때문에 즉시 로드)
import { PerformanceTreeMapToday } from 'src/components/charts/threemap'
const DefaultChart = lazy(() => import('src/components/charts/defaultchart/DefaultChart'))
const HistoryTableDefault = lazy(() => import('src/components/tables/HistoryTableDefault'))
const RealTimeWidgetsTypeA = lazy(() => import('src/components/widgets/RealTimeWidgetsTypeA'))
const MiniPriceChart = lazy(() => import('src/components/charts/MiniPriceChart'))

const MainDashboard = () => {
  // 시장 개장/폐장 로직 제거됨

  // 차트 그룹별 심볼 정의
  const chartGroups = useMemo(() => ([
    {
      title: '핵심 시장',
      symbols: ['BTCUSDT', 'ETHUSDT', 'GCUSD', 'SPY']
    }
  ]), []);

  // --- 데이터 중앙집중식 요청 ---
  // 1. 모든 심볼 목록을 한 번에 계산 (의존성 안정화)
  const allSymbols = useMemo(() => {
    const symbols = chartGroups.flatMap(g => g.symbols);
    return Array.from(new Set(symbols));
  }, [chartGroups]);

  // 2. 모든 심볼에 대한 과거 데이터를 단일 API 호출로 가져오기
  const { data: delayData, isLoading: isDelayDataLoading } = useAPI.realtime.sparkline(allSymbols, '15m', 1);
  
  // 3. 모든 심볼에 대한 실시간 데이터를 직접 store에서 가져오기 (중복 구독 방지)
  const wsPrices = useWebSocketStore((state) => state.prices)
  const wsConnected = useWebSocketStore((state) => state.connected)
  
  // WebSocket 연결 및 재연결 로직을 관리하는 useEffect (중복 제거)
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
    // allSymbols가 변경될 때만 이 effect를 재실행합니다.
  }, [allSymbols]);

  // WebSocket 연결 상태 모니터링 및 자동 재연결
  useEffect(() => {
    if (!wsConnected && allSymbols.length > 0) {
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
  }, [wsConnected, allSymbols]);


  // 웹소켓 데이터 로깅 (필요시 주석 해제)
  // useEffect(() => {
  //   console.log('[MainDashboard] === WebSocket Status ===')
  //   console.log('[MainDashboard] wsConnected:', wsConnected)
  //   console.log('[MainDashboard] wsPrices keys:', wsPrices ? Object.keys(wsPrices) : 'null')
  //   console.log('[MainDashboard] wsPrices count:', wsPrices ? Object.keys(wsPrices).length : 0)
  // }, [wsPrices, wsConnected])

  return (
    <>
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
                        delayData={delayData?.[symbol]} // 개별 심볼 데이터 전달
                        wsPrices={wsPrices} // 전체 실시간 가격 객체 전달
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
