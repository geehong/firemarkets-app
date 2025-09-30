import React, { useState, useEffect } from 'react'
import {
  CWidgetStatsE,
  CCol,
  CRow,
  CCard,
  CCardBody,
  CCardHeader,
  CCardTitle,
  CSpinner,
  CBadge
} from '@coreui/react'
import { useRealtimePricesWebSocket } from '../../hooks/useWebSocket'

// 비트코인과 이더리움만 표시
const TOP_20_CRYPTO_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT'
]

const CWidgetStatsEWebSocket = () => {
  const [displayData, setDisplayData] = useState([])
  const {
    prices,
    loading,
    connected,
    backupMode,
    dataSource,
    lastUpdate,
    requestBackupData
  } = useRealtimePricesWebSocket(TOP_20_CRYPTO_SYMBOLS)

  // 데이터 포맷팅 및 상태 업데이트
  useEffect(() => {
    if (Object.keys(prices).length > 0) {
      const formattedData = TOP_20_CRYPTO_SYMBOLS.map(symbol => {
        const priceData = prices[symbol]
        if (priceData) {
          return {
            symbol,
            name: symbol.replace('USDT', ''),
            price: priceData.price,
            change_amount: priceData.change_amount,
            change_percent: priceData.change_percent,
            timestamp: priceData.timestamp_utc,
            data_source: priceData.data_source
          }
        }
        return null
      }).filter(Boolean)

      setDisplayData(formattedData)
    }
  }, [prices])

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
    switch (source) {
      case 'websocket': return 'primary'
      case 'binance_api_fallback': return 'warning'
      case 'coinbase_websocket': return 'info'
      case 'kraken_websocket': return 'secondary'
      default: return 'dark'
    }
  }

  return (
    <CCard>
      <CCardHeader>
        <CCardTitle className="d-flex justify-content-between align-items-center">
          <span>🚀 실시간 비트코인 & 이더리움 (WebSocket)</span>
          <div className="d-flex align-items-center gap-2">
            {loading && <CSpinner size="sm" />}
            <CBadge 
              color={connected ? 'success' : 'danger'}
              className="me-2"
            >
              {connected ? '연결됨' : '연결 끊김'}
            </CBadge>
            {backupMode && (
              <CBadge color="warning">
                백업 모드: {dataSource}
              </CBadge>
            )}
            {lastUpdate && (
              <small className="text-muted">
                마지막 업데이트: {new Date(lastUpdate).toLocaleTimeString()}
              </small>
            )}
          </div>
        </CCardTitle>
      </CCardHeader>
      <CCardBody>
        {loading && displayData.length === 0 ? (
          <div className="text-center py-4">
            <CSpinner />
            <div className="mt-3">
              <h5>🔄 비트코인 & 이더리움 실시간 데이터 로딩 중...</h5>
              <div className="mt-3">
                <p><strong>WebSocket 연결 상태:</strong> {connected ? '✅ 연결됨' : '❌ 연결 끊김'}</p>
                <p><strong>데이터 소스:</strong> {dataSource}</p>
                <p><strong>백업 모드:</strong> {backupMode ? '🟡 활성화' : '🟢 정상'}</p>
                <p><strong>구독 심볼:</strong> {TOP_20_CRYPTO_SYMBOLS.length}개</p>
                <p><strong>수신된 데이터:</strong> {Object.keys(prices).length}개</p>
                {lastUpdate && (
                  <p><strong>마지막 업데이트:</strong> {new Date(lastUpdate).toLocaleString()}</p>
                )}
                         <div className="mt-3">
                           <small className="text-muted">
                             💡 WebSocket 연결이 안 되면 자동으로 API 백업 모드로 전환됩니다.
                           </small>
                           <div className="mt-3">
                             <div className="d-flex gap-2">
                               <button 
                                 className="btn btn-warning btn-sm"
                                 onClick={() => {
                                   console.log('🧪 WebSocket 테스트 요청')
                                   console.log('🔍 연결 상태:', connected)
                                   console.log('🔍 WebSocket 객체:', window.socket)
                                   
                                   // WebSocket 연결 확인
                                   if (connected && window.socket) {
                                     window.socket.emit('test_websocket', {})
                                     console.log('✅ 테스트 이벤트 전송 완료')
                                   } else {
                                     console.warn('❌ WebSocket 연결이 없습니다')
                                     console.warn('연결 상태:', connected)
                                     console.warn('Socket 객체:', window.socket)
                                   }
                                 }}
                                 disabled={!connected}
                               >
                                 🧪 WebSocket 수신 테스트
                               </button>
                               
                               <button 
                                 className="btn btn-info btn-sm"
                                 onClick={() => {
                                   console.log('🧪 하드코딩 구독 테스트 요청')
                                   if (connected && window.socket) {
                                     window.socket.emit('test_hardcoded_subscription', {})
                                     console.log('✅ 하드코딩 구독 테스트 전송 완료')
                                   } else {
                                     console.warn('❌ WebSocket 연결이 없습니다')
                                   }
                                 }}
                                 disabled={!connected}
                               >
                                 🔧 하드코딩 구독 테스트
                               </button>
                               
                               <button 
                                 className="btn btn-success btn-sm"
                                 onClick={() => {
                                   console.log('📡 하드코딩 데이터 테스트 요청')
                                   if (connected && window.socket) {
                                     window.socket.emit('test_hardcoded_data', {})
                                     console.log('✅ 하드코딩 데이터 테스트 전송 완료')
                                   } else {
                                     console.warn('❌ WebSocket 연결이 없습니다')
                                   }
                                 }}
                                 disabled={!connected}
                               >
                                 📡 하드코딩 데이터 테스트
                               </button>
                             </div>
                           </div>
                         </div>
              </div>
            </div>
          </div>
        ) : (
          <CRow>
            {displayData.map((coin, index) => (
              <CCol key={coin.symbol} xs={12} sm={6} md={4} lg={3} xl={2} className="mb-3">
                <CWidgetStatsE
                  className="h-100"
                  color={getPriceColor(coin.change_percent)}
                  value={`$${coin.price?.toLocaleString() || 'N/A'}`}
                  title={coin.name}
                  icon={getPriceIcon(coin.change_percent)}
                  footer={
                    <div className="d-flex justify-content-between align-items-center">
                      <span className={`text-${getPriceColor(coin.change_percent)}`}>
                        {coin.change_percent > 0 ? '+' : ''}{coin.change_percent?.toFixed(2)}%
                      </span>
                      <CBadge 
                        color={getDataSourceBadge(coin.data_source)}
                        size="sm"
                      >
                        {coin.data_source?.split('_')[0] || 'Unknown'}
                      </CBadge>
                    </div>
                  }
                />
              </CCol>
            ))}
          </CRow>
        )}
        
        {!connected && (
          <div className="text-center py-4">
            <p className="text-danger">WebSocket 연결이 끊어졌습니다.</p>
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={requestBackupData}
            >
              백업 데이터 요청
            </button>
          </div>
        )}

        {displayData.length === 0 && !loading && (
          <div className="text-center py-4">
            <p className="text-muted">데이터를 불러오는 중입니다...</p>
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default CWidgetStatsEWebSocket
