import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow, CWidgetStatsB } from '@coreui/react'
import axios from 'axios'
import CIcon from '@coreui/icons-react'
import { cilArrowTop, cilArrowBottom } from '@coreui/icons'
import CardTools from '../common/CardTools'
import '../common/CardTools.css'

const AssetPriceWidget = ({
  title = 'Top Assets - Real Time Prices',
  limit = 8,
  showProgress = true,
  colorPattern = ['primary', 'info'],
  onDataLoad,
  onError,
}) => {
  const [topAssets, setTopAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const fetchTopAssets = async () => {
      try {
        setLoading(true)
        setError(null)

        // 1. 자산 목록 가져오기
        const response = await axios.get(`/api/v1/assets?limit=${limit * 2}&has_ohlcv_data=true`)
        const assets = response.data.data || []
        const selectedAssets = assets.slice(0, limit)

        // 2. 각 자산의 최신 가격 데이터 가져오기
        const assetsWithPrices = await Promise.all(
          selectedAssets.map(async (asset) => {
            try {
              // 최신 2일 데이터 가져오기 (현재가와 24시간 전 가격 비교용)
              const today = new Date()
              const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
              const startDate = yesterday.toISOString().split('T')[0]
              const endDate = today.toISOString().split('T')[0]

              const priceResponse = await axios.get(
                `/api/v1/ohlcv/${asset.ticker}?data_interval=1d&start_date=${startDate}&end_date=${endDate}&limit=2`,
              )

              const priceData = priceResponse.data.data || []
              const latestPrice = priceData.length > 0 ? parseFloat(priceData[0].close_price) : null
              const previousPrice =
                priceData.length > 1 ? parseFloat(priceData[1].close_price) : null

              // 24시간 변화율 계산
              let changePercent24h = null
              if (latestPrice && previousPrice && previousPrice !== 0) {
                changePercent24h = ((latestPrice - previousPrice) / previousPrice) * 100
              }

              return {
                ...asset,
                current_price: latestPrice,
                change_percent_24h: changePercent24h,
              }
            } catch (err) {
              console.warn(`Error fetching price data for ${asset.ticker}:`, err)
              return {
                ...asset,
                current_price: null,
                change_percent_24h: null,
              }
            }
          }),
        )

        setTopAssets(assetsWithPrices)

        if (onDataLoad) {
          onDataLoad(assetsWithPrices)
        }
      } catch (error) {
        console.error('Error fetching top assets:', error)
        setError(error.message)
        if (onError) {
          onError(error.message)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchTopAssets()
  }, [limit, onDataLoad, onError])

  const handleCollapse = (collapsed) => {
    setIsCollapsed(collapsed)
  }

  const handleRemove = (symbol) => {
    // Implement the remove logic here
    console.log('Removing asset:', symbol)
  }

  const handleAction = (action) => {
    // Implement the action logic here
    console.log('Action:', action)
  }

  // 자산별 고유 색상 매핑
  const assetColorMap = {
    BTCUSDT: '#F7931A', // 비트코인 오렌지
    GCUSD: '#FFD700', // 금색
    MSFT: '#0078D4', // 마이크로소프트 파랑
    SPY: '#006400', // SPY 짙은 녹색
  }

  if (loading) {
    return (
      <CCard className={`mb-4 ${isCollapsed ? 'collapsed' : ''}`}>
        <CCardHeader>
          <div className="card-title">
            <strong>{title}</strong>
          </div>
          <CardTools
            onCollapse={handleCollapse}
            onRemove={handleRemove}
            onAction={handleAction}
            dropdownItems={[
              { label: 'View Details', action: 'details' },
              { label: 'Add to Watchlist', action: 'watchlist' },
              { label: 'Export Data', action: 'export' },
            ]}
          />
        </CCardHeader>
        <CCardBody>
          <p>Loading assets...</p>
        </CCardBody>
      </CCard>
    )
  }

  if (error) {
    return (
      <CCard className={`mb-4 ${isCollapsed ? 'collapsed' : ''}`}>
        <CCardHeader>
          <div className="card-title">
            <strong>{title}</strong>
          </div>
          <CardTools
            onCollapse={handleCollapse}
            onRemove={handleRemove}
            onAction={handleAction}
            dropdownItems={[
              { label: 'View Details', action: 'details' },
              { label: 'Add to Watchlist', action: 'watchlist' },
              { label: 'Export Data', action: 'export' },
            ]}
          />
        </CCardHeader>
        <CCardBody>
          <p className="text-danger">Error loading assets: {error}</p>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <CCard className={`mb-4 ${isCollapsed ? 'collapsed' : ''}`}>
      <CCardHeader>
        <div className="card-title">
          <strong>{title}</strong>
        </div>
        <CardTools
          onCollapse={handleCollapse}
          onRemove={handleRemove}
          onAction={handleAction}
          dropdownItems={[
            { label: 'View Details', action: 'details' },
            { label: 'Add to Watchlist', action: 'watchlist' },
            { label: 'Export Data', action: 'export' },
          ]}
        />
      </CCardHeader>
      <CCardBody>
        <CRow xs={{ gutter: 4 }}>
          {topAssets.map((asset, index) => (
            <CCol key={asset.asset_id} xs={12} sm={6} xl={3}>
              <CWidgetStatsB
                style={{ backgroundColor: assetColorMap[asset.ticker] || '#888888', color: '#fff' }}
                value={asset.current_price ? `$${asset.current_price.toFixed(2)}` : 'N/A'}
                title={asset.ticker}
                text={asset.name}
                progress={
                  showProgress && asset.change_percent_24h !== null
                    ? {
                        color: asset.change_percent_24h >= 0 ? 'success' : 'danger',
                        value: Math.abs(asset.change_percent_24h),
                      }
                    : undefined
                }
              />
            </CCol>
          ))}
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default AssetPriceWidget
