import React from 'react'
import { CRow, CCol, CWidgetStatsE, CCard, CCardHeader, CCardBody, CCardTitle } from '@coreui/react'
import { CChartLine } from '@coreui/react-chartjs'
import { useMultipleRealtimeAssets } from 'src/hooks/useRealtimePrices'
import CardTools from 'src/components/common/CardTools'
import 'src/components/common/CardTools.css'

/**
 * RealTimeWidgets
 * - Left: title (ticker) and value (current price)
 * - Right: 30-day sparkline line chart
 * - Data source: /api/v1/realtime/table (backend enriches with sparkline_data)
 */
const RealTimeWidgets = ({ tickers = [], responsive = { sm: 6, md: 4, xl: 2 } }) => {
  // 테스트용 자산 목록 (모든 자산 표시)
  const testTickers = [
    // 주식 (World Assets Ranking 1-10위, 커머디티/아람코 제외)
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'AMD', 'INTC',
    // ETF
    'SPY', 'VOO', 'VTI', 'IVV', 'QQQ', 'VB', 'IDFA',
    // 코인 (등록된 모든 코인)
    'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'BCHUSDT', 'DOGEUSDT', 'DOTUSDT', 'LTCUSDT', 'XRPUSDT'
  ]
  
  // tickers가 비어있으면 테스트 데이터 사용
  const finalTickers = tickers.length > 0 ? tickers : testTickers
  
  // 디버깅용 로그
  console.log('🔍 RealTimeWidgets Debug:', {
    tickers: tickers,
    testTickers: testTickers,
    finalTickers: finalTickers,
    finalTickersLength: finalTickers.length
  })
  
  // 훅을 사용해서 실시간 데이터 가져오기
  const {
    data: items = [],
    isLoading: loading,
    error,
    refetch
  } = useMultipleRealtimeAssets(finalTickers, {
    refetchInterval: 15000, // 15초마다 자동 갱신
  })
  
  // 데이터 로딩 상태 디버깅
  console.log('🔍 Data Loading Debug:', {
    items: items,
    itemsLength: items.length,
    loading: loading,
    error: error,
    finalTickersLength: finalTickers.length
  })
  
  const [displayPrices, setDisplayPrices] = React.useState({})
  const [isBlinking, setIsBlinking] = React.useState(false)
  const [lastUpdateTime, setLastUpdateTime] = React.useState(null)
  const [priceChanges, setPriceChanges] = React.useState({}) // 가격 변화 추적
  const [blinkingItems, setBlinkingItems] = React.useState({}) // 개별 아이템 깜빡임 상태
  const [collapsedCards, setCollapsedCards] = React.useState({}) // 카드 접기/펼치기 상태

  // 실시간 데이터 업데이트 시 가격 변화 감지 및 개별 깜빡임 효과 처리
  React.useEffect(() => {
    if (items && items.length > 0) {
      setDisplayPrices(prevPrices => {
        const newDisplayPrices = {}
        const newPriceChanges = {}
        const newBlinkingItems = {}
        
        items.forEach(item => {
          if (item.price !== null) {
            const previousPrice = prevPrices[item.id]
            const currentPrice = item.price
            
            // 가격 변화 감지
            if (previousPrice !== undefined && previousPrice !== currentPrice) {
              const changeDirection = currentPrice > previousPrice ? 'up' : 'down'
              newPriceChanges[item.id] = changeDirection
              
              // 개별 아이템 깜빡임 효과 시작
              newBlinkingItems[item.id] = true
              console.log(`💰 ${item.title}: ${previousPrice} → ${currentPrice} (${changeDirection})`)
              
              // 1초 후 깜빡임 효과 종료
              setTimeout(() => {
                setBlinkingItems(prev => ({
                  ...prev,
                  [item.id]: false
                }))
              }, 1000)
            }
            
            newDisplayPrices[item.id] = currentPrice
          }
        })
        
        // 상태 업데이트
        setPriceChanges(prev => ({ ...prev, ...newPriceChanges }))
        setBlinkingItems(prev => ({ ...prev, ...newBlinkingItems }))
        setLastUpdateTime(new Date())
        
        return newDisplayPrices
      })
    }
  }, [items])

  // 카드 접기/펼치기 핸들러
  const handleCardCollapse = (ticker) => (isCollapsed) => {
    setCollapsedCards(prev => ({
      ...prev,
      [ticker]: isCollapsed
    }))
  }

  // 카드 제거 핸들러
  const handleCardRemove = (ticker) => () => {
    console.log(`카드 제거: ${ticker}`)
    // 실제로는 부모 컴포넌트에서 처리하거나 상태에서 제거
  }

  // 카드 액션 핸들러
  const handleCardAction = (ticker) => (action) => {
    console.log(`카드 액션: ${ticker} - ${action}`)
    switch (action) {
      case 'refresh':
        refetch()
        break
      case 'settings':
        console.log(`${ticker} 설정 열기`)
        break
      default:
        break
    }
  }

  const makeChart = (values) => {
    const dataPoints = Array.isArray(values) ? values.slice(-30) : []
    return (
      <CChartLine
        data={{
          labels: dataPoints.map((_, i) => i),
          datasets: [
            {
              label: 'Price',
              data: dataPoints,
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.1)',
              borderWidth: 1,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 3,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 2,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              enabled: false
            }
          },
          scales: {
            x: {
              display: false,
            },
            y: {
              display: false,
            },
          },
          interaction: {
            intersect: false,
            mode: 'index'
          },
          elements: {
            point: {
              hoverRadius: 4
            }
          }
        }}
      />
    )
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <h4>실시간 데이터 로드 실패</h4>
        <p>데이터를 불러오는 중 오류가 발생했습니다.</p>
        <button className="btn btn-primary" onClick={() => refetch()}>
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* 상태 표시 */}
      {lastUpdateTime && (
        <div className="mb-3 text-center">
          <span className="badge bg-info me-2">
            마지막 업데이트: {lastUpdateTime.toLocaleTimeString()}
          </span>
          {loading ? (
            <span className="text-success">🔄 업데이트 중...</span>
          ) : (
            <span className="text-muted">⏱️ 대기 중</span>
          )}
        </div>
      )}
      
      {/* 카테고리별 그룹핑 (Stocks, ETFs, Crypto 등) */}
      {(() => {
        // 그룹핑
        const grouped = items.reduce((acc, it) => {
          const group = it.typeName || 'Others'
          if (!acc[group]) acc[group] = []
          acc[group].push(it)
          return acc
        }, {})

        const renderWidget = (it) => {
          const displayPrice = displayPrices[it.id] || it.price
          const isRealtime = it.isRealtime
          const priceChange = priceChanges[it.id]
          const isBlinkingItem = blinkingItems[it.id]
          const isCollapsed = collapsedCards[it.id] || false
          
          // PerformanceTreeMap 색상 체계 적용
          const getPriceColor = () => {
            const changePercent = it.changePercent || 0
            
            if (changePercent > 0) return 'price-up'
            if (changePercent < 0) return 'price-down'
            return 'price-neutral'
          }

          // 변동액 계산 (가정: 변동액 ≈ 현재가 * 변동%)
          const changeAmount = (displayPrice != null && it.changePercent != null)
            ? displayPrice * (it.changePercent / 100)
            : null
          
          const formattedPrice = displayPrice != null ? `$${displayPrice.toLocaleString()}` : 'N/A'
          const isStock = (it.typeName || '').toLowerCase().includes('stock')
          return (
            <div key={it.id} className={`realtime-widget col-xl-2 col-md-4 col-sm-6 mb-3 ${isBlinkingItem ? 'blink' : ''}`}>
              <div className="widget-box p-2">
                {isStock ? (
                  <div className="row justify-content-md-center align-items-center gx-2">
                    {/* 아이콘 */}
                    <div className="col-6 col-lg-2 d-flex justify-content-start">
                      {(() => {
                        const fallbackLogo = `https://images.financialmodelingprep.com/symbol/${it.title}.png`
                        const src = it.logoUrl || fallbackLogo
                        return (
                          <img
                            src={src}
                            alt={it.title}
                            className="logo"
                            onError={(e) => { e.currentTarget.src = fallbackLogo }}
                          />
                        )
                      })()}
                    </div>
                    {/* 티커 / 이름 */}
                    <div className="col-6 col-lg-2">
                      <div className="item-title">{it.title}{isRealtime && <span className="badge bg-success ms-2">LIVE</span>}</div>
                      <div className="text-muted small text-truncate" title={it.name || ''}>{it.name || ''}</div>
                    </div>
                    {/* 그래프 */}
                    <div className="col-md-auto">
                      <div className="chart-container">{makeChart(it.chartData)}</div>
                    </div>
                    {/* 변동액 / 변동% */}
                    <div className="col-6 col-lg-2 text-end">
                      <div className={`item-change ${getPriceColor()}`}>
                        {changeAmount != null ? `${changeAmount >= 0 ? '+' : ''}${changeAmount.toFixed(2)}` : ''}
                      </div>
                      <div className={`item-change ${getPriceColor()}`}>
                        ({it.changePercent != null ? `${it.changePercent >= 0 ? '+' : ''}${it.changePercent.toFixed(2)}%` : 'N/A'})
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="d-flex justify-content-between align-items-center realtime-row">
                    <div className="left flex-grow-1">
                      {/* 1행: 타이틀(가격) */}
                      <div className="d-flex align-items-center mb-2">
                        <span className="item-title me-2">{it.title} ({formattedPrice})</span>
                        {isRealtime && <span className="badge bg-success">LIVE</span>}
                      </div>
                      {/* 2행: 변동액(변동%) */}
                      {it.changePercent != null && (
                        <div className={`item-change ${getPriceColor()}`}>
                          {changeAmount != null ? `${changeAmount >= 0 ? '+' : ''}${changeAmount.toFixed(2)}` : ''}
                          {changeAmount != null ? ' ' : ''}
                          ({it.changePercent >= 0 ? '+' : ''}{it.changePercent?.toFixed(2)}%)
                        </div>
                      )}
                    </div>
                    {/* 우측: 차트 */}
                    <div className="right chart-container">
                      {makeChart(it.chartData)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        }

        return (
          <div key="grouped-cards">
            {Object.entries(grouped)
              .sort(([aName],[bName]) => {
                const priority = (name) => {
                  const n = (name || '').toString().toLowerCase()
                  if (n.includes('crypto')) return 0
                  if (n.includes('stock')) return 1
                  if (n.includes('etf')) return 2
                  return 3
                }
                return priority(aName) - priority(bName)
              })
              .map(([groupName, groupItems]) => (
              <CCard key={groupName} className="mb-4">
                <CCardHeader className="card-header">
                  <CCardTitle className="card-title d-flex align-items-center justify-content-between">
                    <span>{groupName}</span>
                    <CardTools
                      onCollapse={(isCollapsed) => {}}
                      onRemove={() => {}}
                      onAction={() => {}}
                      showCollapse={false}
                      showRemove={false}
                      showRefresh={false}
                      showDropdown={false}
                    />
                  </CCardTitle>
                </CCardHeader>
                <CCardBody className="p-3">
                  <CRow>
                    {groupItems.map(renderWidget)}
                  </CRow>
                </CCardBody>
              </CCard>
            ))}
          </div>
        )
      })()}

      <style>
        {`
          /* Blink 효과 (텍스트만) */
          .blink .item-price, .blink .item-change { animation: textBlink 1s ease-in-out; }
          @keyframes textBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

          /* PerformanceTreeMap 색상 체계 */
          .price-up { color: #2ecc59; }
          .price-down { color: #f73539; }
          .price-neutral { color: #414555; }

          /* 레이아웃: 타이틀 1행, 아래 가격/차트 좌우 정렬 */
          .realtime-item { padding: 6px 8px; border-bottom: 1px solid rgba(0,0,0,0.06); }
          .item-title { font-weight: 600; }
          .realtime-row {
            min-height: 60px;
            display: grid;
            grid-template-columns: minmax(0,1fr) auto;
            align-items: center;
            gap: 8px;
          }
          .left { min-width: 0; }
          .left .item-title,
          .left .item-price,
          .left .item-change {
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          }
          .item-price { font-size: 1.05rem; font-weight: 600; }
          .item-change { font-size: 0.9rem; display: inline-block; margin-left: 8px; white-space: nowrap; }

          /* widget column min width */
          .realtime-widget { min-width: 300px; }

          .chart-container {
            position: relative;
            overflow: hidden;
            width: clamp(120px, 22vw, 180px);
            aspect-ratio: 2 / 1;
          }
          .chart-container canvas {
            width: 100% !important;
            height: 100% !important;
          }

          /* 단순 그리드 (아이콘 | 티커 | 차트 | 변동율) */
          .simple-grid {
            display: grid;
            grid-template-columns: 32px minmax(0,1fr) minmax(120px, 22vw) minmax(max-content, auto);
            grid-template-rows: auto;
            gap: 6px 10px;
            align-items: center;
            min-height: 30px;
          }
          .simple-grid .s-icon { display: flex; align-items: center; justify-content: center; }
          .simple-grid .s-ticker { min-width: 0; }
          .simple-grid .s-chart { }
          .simple-grid .s-change { }
          .asset-icon { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
          .logo { width: 24px; height: 24px; object-fit: contain; }
          .item-title { font-weight: 600; }
        `}
      </style>
    </div>
  )
}

export default RealTimeWidgets