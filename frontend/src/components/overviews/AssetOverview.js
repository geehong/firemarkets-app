import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAPI } from '../../hooks/useAPI'
import AssetOverviewHeader from './AssetOverviewHeader'
import AssetOverviewTabs from './tab/AssetOverviewTabs'
import HistoryTable from '../tables/HistoryTable'

/**
 * 자산 개요 메인 컨테이너 컴포넌트
 * 모든 자산 유형(주식, ETF, 암호화폐, 상품)에 대한 통합 개요 페이지
 */
const AssetOverview = () => {
  const { assetId } = useParams()
  const [isMobile, setIsMobile] = useState(false)

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // useAPI를 통한 데이터 fetching (assetId는 ticker로 사용)
  // 개별 자산 상세 정보는 임시로 기본값 사용 (실제 API가 구현되면 교체)
  const asset = { 
    ticker: assetId, 
    name: assetId, 
    type_name: 'stock' 
  }
  const assetLoading = false
  const assetError = null
  
  const { data: ohlcvData, loading: ohlcvLoading, error: ohlcvError } = useAPI.assets.ohlcv(assetId, '1d', null, null, 1000)
  const { data: cryptoData, loading: cryptoLoading, error: cryptoError } = useAPI.assetsoverviews.crypto(assetId)

  // 로딩 상태
  const isLoading = ohlcvLoading || cryptoLoading
  const hasError = ohlcvError || cryptoError

  // 에러 처리
  if (hasError) {
    return (
      <div className="container-fluid p-4">
        <div className="alert alert-danger">
          <h4>Error Loading Asset Data</h4>
          <p>Failed to load data for asset: {assetId}</p>
          {ohlcvError && <p>OHLCV Error: {ohlcvError.message}</p>}
          {cryptoError && <p>Crypto Error: {cryptoError.message}</p>}
        </div>
      </div>
    )
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="container-fluid p-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span className="ms-3">Loading asset data...</span>
        </div>
      </div>
    )
  }

  // 공통 props 객체
  const commonProps = {
    assetId,
    asset,
    ohlcvData,
    cryptoData,
    // 추가 데이터는 나중에 필요에 따라 확장
  }

  return (
    <div className="asset-overview">
      {/* 헤더 영역 */}
      <AssetOverviewHeader {...commonProps} />

      {/* OHLCV 데이터 테이블 영역 */}
      <div className="container-fluid p-3">
        <div className="row">
          <div className="col-12">
            <h4 className="mb-3">{asset?.name} ({asset?.ticker}) Price History</h4>
            <HistoryTable
              data={ohlcvData?.data || []}
              loading={ohlcvLoading}
              error={ohlcvError}
              dataType="ohlcv"
              height={isMobile ? 400 : 600}
              loadingMessage="Loading price history..."
              errorMessage="Failed to load price history"
            />
          </div>
        </div>
      </div>

      {/* 탭 영역 */}
      <AssetOverviewTabs {...commonProps} />
    </div>
  )
}

export default AssetOverview
