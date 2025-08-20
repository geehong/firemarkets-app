import React from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import useAssetData from '../../hooks/useAssetData'

// Import the new modular components
import ResponsiveOverView from '../../components/overviews/ResponsiveOverView'
import AssetsList from '../../components/list/AssetsList'

const AssetsOverviews = () => {
  const { assetId } = useParams()
  const [searchParams] = useSearchParams()
  const typeName = searchParams.get('type_name')

  const {
    asset,
    ohlcvData,
    stockProfile,
    stockFinancials,
    stockEstimates,
    etfInfo,
    cryptoMetrics,
    cryptoData,
    loading,
    error,
    isError,
    isSuccess,
  } = useAssetData(assetId)


  // type_name이 있는 경우 자산 목록을 표시
  if (typeName && !assetId) {
    return (
      <div className="container-fluid px-0 px-sm-2 px-md-3 px-lg-4 my-2 my-sm-3 my-md-4">
        <div className="row g-2 g-sm-3 g-md-4">
          <div className="col-lg-12">
            <h2>{typeName} Overview</h2>
            <p>Select an asset from the list below to view detailed information.</p>
          </div>
          <div className="col-lg-12">
            <AssetsList />
          </div>
        </div>
      </div>
    )
  }

  // assetId가 있는 경우 개별 자산 상세 정보를 표시
  if (loading)
    return (
      <div className="container-lg my-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading asset details...</p>
        </div>
      </div>
    )

  if (error)
    return (
      <div className="container-lg my-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error!</h4>
          <p>{error.message || error.toString()}</p>
          <hr />
          <p className="mb-0">Please try refreshing the page or contact support.</p>
        </div>
      </div>
    )

  if (!asset)
    return (
      <div className="container-lg my-4">
        <div className="alert alert-warning" role="alert">
          Asset not found. Please check the URL and try again.
        </div>
      </div>
    )

  if (!ohlcvData || ohlcvData.length === 0)
    return (
      <div className="container-lg my-4">
        <div className="alert alert-info" role="alert">
          No price data available for this asset.
        </div>
      </div>
    )

  return (
    <div className="container-fluid px-0 px-sm-2 px-md-3 px-lg-4 my-2 my-sm-3 my-md-4">
      <div className="row g-2 g-sm-3 g-md-4">
        {/* 반응형 오버뷰 (헤더 + 차트 + 탭) */}
        <div className="col-12">
          <ResponsiveOverView
            assetId={assetId}
            asset={asset}
            ohlcvData={ohlcvData}
            stockProfile={stockProfile}
            stockFinancials={stockFinancials}
            stockEstimates={stockEstimates}
            etfInfo={etfInfo}
            cryptoMetrics={cryptoMetrics}
            cryptoData={cryptoData}
          />
        </div>
      </div>
    </div>
  )
}

export default AssetsOverviews
