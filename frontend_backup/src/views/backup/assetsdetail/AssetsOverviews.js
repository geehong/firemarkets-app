import React from 'react'
import { useParams } from 'react-router-dom'
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import OverViewHeader from '../../components/overviews/OverViewHeader'
import OverViewTabs from '../../components/overviews/OverViewTabs'
import OHLCVChart from '../../components/charts/OHLCVChart'
import useAssetData from '../../hooks/useAssetData'

const AssetsOverviews = () => {
  const { assetId } = useParams()

  console.log('🔍 AssetsOverviews rendered with assetId:', assetId)

  const {
    asset: assetData,
    ohlcvData,
    stockProfile,
    stockFinancials,
    stockEstimates,
    cryptoMetrics: cryptoData,
    etfInfo: etfData,
    loading: isLoading,
    error,
  } = useAssetData(assetId)

  console.log('📊 AssetsOverviews data:', {
    assetId,
    assetData,
    stockProfile,
    stockFinancials,
    stockEstimates,
    cryptoData,
    etfData,
    isLoading,
    error,
  })

  // Determine asset type based on data availability
  const getAssetType = () => {
    if (assetData?.type_name === 'Stocks') return 'stock'
    if (assetData?.type_name === 'Crypto') return 'crypto'
    if (assetData?.type_name === 'ETFs') return 'etf'
    if (assetData?.type_name === 'Commodities') return 'commodity'
    return 'unknown'
  }

  const assetType = getAssetType()

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        Error loading asset data: {error.message}
      </div>
    )
  }

  if (!assetData || assetType === 'unknown') {
    return (
      <div className="alert alert-warning" role="alert">
        No data available for symbol: {assetId}
      </div>
    )
  }

  return (
    <div className="assets-overviews">
      <CRow>
        <CCol xs={12}>
          {/* Header Section */}
          <OverViewHeader
            asset={assetData}
            ohlcvData={ohlcvData}
            stockProfile={stockProfile}
            stockFinancials={stockFinancials}
            etfInfo={etfData}
            cryptoMetrics={cryptoData}
          />
        </CCol>
      </CRow>

      <CRow>
        <CCol xs={12}>
          {/* Chart Section */}
          <CCard className="mb-4">
            <CCardHeader>
              <h5 className="mb-0">Price Chart</h5>
            </CCardHeader>
            <CCardBody>
              <OHLCVChart
                assetIdentifier={assetData?.ticker}
                externalOhlcvData={ohlcvData}
                height={400}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CRow>
        <CCol xs={12}>
          {/* Tabs Section */}
          <OverViewTabs
            assetId={assetId}
            asset={assetData}
            stockProfile={stockProfile}
            stockFinancials={stockFinancials}
            stockEstimates={stockEstimates}
            etfInfo={etfData}
            cryptoMetrics={cryptoData}
            ohlcvData={ohlcvData}
          />
        </CCol>
      </CRow>
    </div>
  )
}

export default AssetsOverviews
