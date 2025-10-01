import React from 'react'
import {
  CWidgetStatsE,
  CCol,
  CRow,
  CCard,
  CCardBody,
  CCardHeader,
  CCardTitle,
  CSpinner,
  CBadge,
} from '@coreui/react'
import { CChartLine } from '@coreui/react-chartjs'
import useWebSocketStore from '../../store/websocketStore'

// 비트코인과 이더리움만 표시 - 컴포넌트 외부에서 정의하여 참조 안정성 확보
const TOP_20_CRYPTO_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'BNB', 'SOL', 'USDC', 'DOGEUSDT', 'TRX', 'ADAUSDT', 'LINK', 'AVAX', 'WBTC', 'XLM', 'BCHUSDT', 'HBAR', 'LTCUSDT', 'CRO', 'SHIB', 'TON', 'DOTUSDT']

const WebSocketWidgetE = () => {
  // MainDashboard에서 이미 구독하고 있으므로 직접 store에서 데이터만 읽어옴
  // 중복 구독을 방지하여 무한 루프 방지
  const prices = useWebSocketStore((state) => state.prices)
  const loading = useWebSocketStore((state) => state.loading)
  const connected = useWebSocketStore((state) => state.connected)
  const backupMode = useWebSocketStore((state) => state.backupMode)
  const dataSource = useWebSocketStore((state) => state.dataSource)
  const lastUpdate = useWebSocketStore((state) => state.lastUpdate)
  const requestBackupData = useWebSocketStore((state) => state.requestBackupData)

  // 가격 변화에 따른 색상 결정
  const getPriceColor = (changePercent) => {
    if (changePercent > 0) return 'success'
    if (changePercent < 0) return 'danger'
    return 'secondary'
  }

  // 가격 변화 아이콘
  const getPriceIcon = (changePercent) => {
    if (changePercent > 0) return 'cil-arrow-top'
    if (changePercent < 0) return 'cil-arrow-bottom'
    return 'cil-minus'
  }

  // 데이터 소스별 배지 색상
  const getDataSourceBadge = (source) => {
    if (!source) return 'dark'
    if (source.includes('websocket')) {
      return 'primary'
    } else if (source.includes('fallback')) {
      return 'warning'
    } else if (source.includes('api')) {
      return 'info'
    } else {
      return 'secondary'
    }
  }

  return (
    <CCard>
      <CCardHeader>
        <CCardTitle className="d-flex justify-content-between align-items-center">
          <span>🚀 실시간 비트코인 & 이더리움 (WebSocket)</span>
          <div className="d-flex align-items-center gap-2">
            {loading && !connected && <CSpinner size="sm" />}
            <CBadge color={connected ? 'success' : 'danger'} className="me-2">
              {connected ? '연결됨' : '연결 끊김'}
            </CBadge>
            {backupMode && <CBadge color="warning">백업 모드: {dataSource}</CBadge>}
            {lastUpdate && (
              <small className="text-muted">
                마지막 업데이트: {new Date(lastUpdate).toLocaleTimeString()}
              </small>
            )}
          </div>
        </CCardTitle>
      </CCardHeader>
      <CCardBody>
        {loading && Object.keys(prices).length === 0 ? (
          <div className="text-center py-4">
            <CSpinner />
            <div className="mt-3">
              <h5>🔄 실시간 데이터 로딩 중...</h5>
              <div className="mt-3">
                <p>
                  <strong>WebSocket 연결 상태:</strong> {connected ? '✅ 연결됨' : '❌ 연결 끊김'}
                </p>
                <p>
                  <strong>데이터 소스:</strong> {dataSource}
                </p>
                <p>
                  <strong>백업 모드:</strong> {backupMode ? '🟡 활성화' : '🟢 정상'}
                </p>
                {lastUpdate && <p><strong>마지막 업데이트:</strong> {new Date(lastUpdate).toLocaleString()}</p>}
              </div>
              <div className="mt-3">
                <small className="text-muted">
                  💡 WebSocket 연결이 안 되면 자동으로 API 백업 모드로 전환됩니다.
                </small>
              </div>
            </div>
          </div>
        ) : (
          <CRow>
            {TOP_20_CRYPTO_SYMBOLS.map((symbol) => {
              const coin = prices[symbol] || {}
              const name = symbol.replace('USDT', '')
              const price = coin.price || 0
              const changePercent = coin.change_percent || 0
              const changeAmount = coin.change_amount || 0
              
              return (
                <CCol key={symbol} xs={6}>
                  <CWidgetStatsE
                    className="mb-3"
                    chart={
                      <CChartLine
                        className="mx-auto"
                        style={{ height: '40px', width: '80px' }}
                        data={{
                          labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S', 'M', 'T', 'W', 'T', 'F', 'S', 'S', 'M'],
                          datasets: [
                            {
                              backgroundColor: 'transparent',
                              borderColor: changePercent > 0 ? '#28a745' : changePercent < 0 ? '#dc3545' : '#6c757d',
                              borderWidth: 2,
                              data: [41, 78, 51, 66, 74, 42, 89, 97, 87, 84, 78, 88, 67, 45, 47],
                            },
                          ],
                        }}
                        options={{
                          maintainAspectRatio: false,
                          elements: {
                            line: {
                              tension: 0.4,
                            },
                            point: {
                              radius: 0,
                            },
                          },
                          plugins: {
                            legend: {
                              display: false,
                            },
                          },
                          scales: {
                            x: {
                              display: false,
                            },
                            y: {
                              display: false,
                            },
                          },
                        }}
                      />
                    }
                    title={name}
                    value={`${price.toLocaleString()} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}% ${changeAmount > 0 ? '+' : ''}${changeAmount.toLocaleString()})`}
                  />
                </CCol>
              )
            })}
          </CRow>
        )}

        {!connected && (
          <div className="text-center py-4">
            <p className="text-danger">WebSocket 연결이 끊어졌습니다.</p>
            <p className="text-muted small">자동으로 재연결을 시도하고 있습니다...</p>
            <button className="btn btn-outline-primary btn-sm" onClick={requestBackupData}>
              백업 데이터 요청
            </button>
          </div>
        )}

        {Object.keys(prices).length === 0 && !loading && (
          <div className="text-center py-4">
            <p className="text-muted">데이터를 불러오는 중입니다...</p>
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default WebSocketWidgetE
