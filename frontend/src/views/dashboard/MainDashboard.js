import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { CRow, CCol, CCard, CCardHeader, CCardBody, CCardTitle } from '@coreui/react'
import useWebSocketStore from '../../store/websocketStore'

// 지연 로딩으로 번들 크기 감소 (TreeMap은 모듈 의존성 때문에 즉시 로드)
import { PerformanceTreeMapToday } from 'src/components/charts/threemap'
const DefaultChart = lazy(() => import('src/components/charts/defaultchart/DefaultChart'))
const HistoryTableDefault = lazy(() => import('src/components/tables/HistoryTableDefault'))
const RealTimeWidgetsTypeA = lazy(() => import('src/components/widgets/RealTimeWidgetsTypeA'))

// 각 심볼별 미니차트 임포트
const MiniPriceCryptoChart = lazy(() => import('src/components/charts/minicharts/MiniPriceCryptoChart'))
const MiniPriceCommoditiesChart = lazy(() => import('src/components/charts/minicharts/MiniPriceCommoditiesChart'))
const MiniPriceStocksEtfChart = lazy(() => import('src/components/charts/minicharts/MiniPriceStocksEtfChart'))

// chartGroups를 컴포넌트 외부로 이동시켜 렌더링 시 재생성 방지
// 선택 심볼만 노출: BTC, NVDA, SPY, GOLD
const chartGroups = [
  {
    title: 'Selected',
    symbols: [
      // { symbol: 'BTCUSDT', chartType: 'crypto' },
      // { symbol: 'NVDA', chartType: 'stocks' },
      // { symbol: 'SPY', chartType: 'stocks' },
      // { symbol: 'GCUSD', chartType: 'commodities' }
    ]
  }
];

// 모든 심볼을 하나의 배열로 추출 (연결용 참조)
const allSymbols = chartGroups.flatMap(group => group.symbols.map(item => item.symbol));

const MainDashboard = () => {
  // 모바일 전용 UI 설정 제거: 고정 레이아웃 사용

  // WebSocket 연결 상태 가져오기
  const connected = useWebSocketStore((state) => state.connected);
  const loading = useWebSocketStore((state) => state.loading);
  const error = useWebSocketStore((state) => state.error);

  // 모바일 여부 감지 (뷰포트 기준)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // 초기 연결만 수행 (구독은 하위 미니차트가 자체적으로 처리)
  useEffect(() => {
    const { connect } = useWebSocketStore.getState();
    if (allSymbols.length > 0) {
      console.log('[MainDashboard] Initializing WebSocket connection for symbols:', allSymbols);
      connect();
    }
  }, []);

  // 연결 끊기면 재시도 타이머로 재연결 (구독은 하위가 처리)
  useEffect(() => {
    if (!connected && allSymbols.length > 0) {
      console.log('[MainDashboard] Disconnected. Scheduling reconnect...');
      const { connect } = useWebSocketStore.getState();
      const reconnectTimer = setTimeout(() => {
        connect();
      }, 3000);
      return () => clearTimeout(reconnectTimer);
    }
  }, [connected]);

  return (
    <>
      {/* WebSocket 연결 상태 표시 */}
      {/* <div className="mb-3">
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-secondary">WebSocket 상태:</span>
          <span className={`badge ${connected ? 'bg-success' : 'bg-danger'}`}>
            {connected ? '연결됨' : '연결 끊김'}
          </span>
          {loading && <span className="badge bg-warning">로딩 중...</span>}
          {error && <span className="badge bg-danger">에러: {error}</span>}
        </div>
      </div> */}


      {/* 시장 상태에 따른 차트 표시 */}
      <div className="card mb-4">
      <div className="card-body">
        {(() => {
          const flattened = chartGroups.flatMap(group => group.symbols.map((item, index) => ({ ...item, title: group.title, key: `${group.title}-${item.symbol}-${index}`})));
          const symbolsToRender = flattened; // 모바일에서도 전체 표시
          const gridTemplateColumns = isMobile ? '1fr' : 'repeat(2, 1fr)';
          return (
            <div style={{ display: 'grid', gridTemplateColumns, gap: '16px' }}>
              {symbolsToRender.map(({ symbol, chartType, key }) => {
                const ChartComponent = (() => {
                  switch (chartType) {
                    case 'crypto':
                      return MiniPriceCryptoChart;
                    case 'commodities':
                      return MiniPriceCommoditiesChart;
                    case 'stocks':
                      return MiniPriceStocksEtfChart;
                    default:
                      return MiniPriceCryptoChart;
                  }
                })();
                return (
                  <div key={key}>
                    <CCard>
                      <CCardBody className="p-0">
                        <div style={{ 
                          height: '300px',
                          minHeight: '300px',
                          width: '100%',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <Suspense fallback={<div className="d-flex align-items-center justify-content-center h-100" style={{ height: '300px' }}>Loading {symbol} chart...</div>}>
                            <ChartComponent 
                              assetIdentifier={symbol}
                              containerId={`mini-chart-${symbol}`}
                            />
                          </Suspense>
                        </div>
                      </CCardBody>
                    </CCard>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
      </div>

      {/* Real-time Widgets */}
      {/* <Suspense fallback={<div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Real-time Widgets...</div>}>
        <RealTimeWidgetsTypeA />
      </Suspense> */}

      {/* Performance TreeMap */}
      <div className="card mb-4">
        <div className="card-body p-0">
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
