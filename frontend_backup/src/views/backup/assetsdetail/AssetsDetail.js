import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'

// Import the new components
import StockInfos from '../assetsinfos/StockInfos'
import EtfInfos from '../assetsinfos/EtfInfos'
import DefaultCharts from '../assetscharts/DefaultCharts'
import WidgetsAssetsPrice from '../widgets/WidgetsAssetsPrice' // Import the price widget
import AssetsTables from '../assetstables/AssetsTables'

const AssetDetail = () => {
  const { assetId } = useParams() // This can be an ID or a ticker
  const [asset, setAsset] = useState(null)
  const [ohlcvData, setOhlcvData] = useState([])
  const [stockFundamentals, setStockFundamentals] = useState([])
  const [etfInfo, setEtfInfo] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch all data concurrently
        const [assetResponse, ohlcvResponse] = await Promise.all([
          axios.get(`/api/assets/${assetId}`),
          axios.get(`/api/ohlcv/${assetId}?data_interval=1d&limit=1000`), // Fetch daily data with limit
        ])

        const fetchedAsset = assetResponse.data
        setAsset(fetchedAsset)

        // 새로운 OHLCV API 구조에 맞게 처리
        const ohlcvData = ohlcvResponse.data.data || ohlcvResponse.data
        setOhlcvData(
          ohlcvData.sort((a, b) => new Date(b.timestamp_utc) - new Date(a.timestamp_utc)),
        ) // Sort descending

        // Fetch additional data based on asset type
        if (fetchedAsset.type_name === 'Stocks') {
          const fundamentalsUrl = `/api/stock-fundamentals/asset/${assetId}`

          try {
            const fundamentalsResponse = await axios.get(fundamentalsUrl)
            setStockFundamentals(fundamentalsResponse.data)
          } catch (err) {
            console.error('Error fetching stock fundamentals:', err)
            setStockFundamentals([])
          }
        } else if (fetchedAsset.type_name === 'ETFs') {
          const etfInfoUrl = `/api/etf-info/asset/${assetId}`

          try {
            const etfInfoResponse = await axios.get(etfInfoUrl)
            setEtfInfo(etfInfoResponse.data)
          } catch (err) {
            console.error('Error fetching ETF info:', err)
            setEtfInfo([])
          }
        }
        // else if (fetchedAsset.type_name === 'Crypto') { ... }
      } catch (err) {
        setError('Failed to load asset details.')
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (assetId) {
      fetchData()
    }
  }, [assetId])

  const renderAssetInfoComponent = () => {
    if (!asset) return null

    switch (asset.type_name) {
      case 'Stocks':
        return <StockInfos fundamentals={stockFundamentals} />
      case 'ETFs':
        return <EtfInfos etfInfo={etfInfo} />
      // case 'Crypto':
      //   return <CryptoInfos cryptoMetrics={cryptoMetricsData} />;
      default:
        return (
          <CCard className="mb-4">
            <CCardHeader>Asset Information</CCardHeader>
            <CCardBody>
              <p>Detailed information for this asset type is not yet available.</p>
            </CCardBody>
          </CCard>
        )
    }
  }

  if (loading) return <div>Loading asset details...</div>
  if (error) return <div style={{ color: 'red' }}>{error}</div>
  if (!asset) return <div>Asset not found.</div>

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <h2>
              {asset.name} ({asset.ticker})
            </h2>
            <div className="small text-body-secondary">
              {asset.type_name} | {asset.exchange}
            </div>
          </CCardHeader>
          <CCardBody>
            {/* Render the real-time price widget */}
            <WidgetsAssetsPrice asset={asset} ohlcvData={ohlcvData} />
            {/* Render the default chart */}
            <DefaultCharts ohlcvData={ohlcvData} assetTicker={asset.ticker} />
            {/* Render the specific info component based on asset type */}
            {renderAssetInfoComponent()}

            {/* Render the price data table */}
            <AssetsTables assetId={assetId} />
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default AssetDetail
