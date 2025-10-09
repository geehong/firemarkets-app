import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAPI } from '../../hooks/useAPI'
import AssetOverviewHeader from './AssetOverviewHeader'
import AssetOverviewTabs from './tab/AssetOverviewTabs'
import OHLCVChart from '../charts/ohlcvchart/OHLCVChart'

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

  // 통합 개요 데이터 fetching (새로운 엔드포인트 사용)
  const { data: overviewData, loading: overviewLoading, error: overviewError } = useAPI.assetsoverviews.overview(assetId)

  // 통합된 데이터에서 필요한 정보 추출
  const asset = overviewData ? {
    asset_id: overviewData.asset_id,
    ticker: overviewData.ticker,
    name: overviewData.name,
    type_name: overviewData.type_name,
    exchange: overviewData.exchange,
    currency: overviewData.currency,
    description: overviewData.description,
    is_active: overviewData.is_active,
    created_at: overviewData.created_at,
    updated_at: overviewData.updated_at,
    type_description: overviewData.type_description,
    asset_category: overviewData.asset_category,
    // 자산 타입별 추가 정보
    ...(overviewData.type_name === 'Stocks' && {
      company_name: overviewData.company_name,
      sector: overviewData.sector,
      industry: overviewData.industry,
      country: overviewData.country,
      city: overviewData.city,
      address: overviewData.address,
      phone: overviewData.phone,
      website: overviewData.website,
      ceo: overviewData.ceo,
      employees_count: overviewData.employees_count,
      ipo_date: overviewData.ipo_date,
      logo_image_url: overviewData.logo_image_url,
    }),
    ...(overviewData.type_name === 'Crypto' && {
      crypto_symbol: overviewData.crypto_symbol,
      crypto_name: overviewData.crypto_name,
      crypto_market_cap: overviewData.crypto_market_cap,
      circulating_supply: overviewData.circulating_supply,
      total_supply: overviewData.total_supply,
      max_supply: overviewData.max_supply,
      crypto_current_price: overviewData.crypto_current_price,
      volume_24h: overviewData.volume_24h,
      percent_change_1h: overviewData.percent_change_1h,
      percent_change_24h: overviewData.percent_change_24h,
      percent_change_7d: overviewData.percent_change_7d,
      percent_change_30d: overviewData.percent_change_30d,
      cmc_rank: overviewData.cmc_rank,
      category: overviewData.category,
      crypto_description: overviewData.crypto_description,
      logo_url: overviewData.logo_url,
      website_url: overviewData.website_url,
      slug: overviewData.slug,
      date_added: overviewData.date_added,
      platform: overviewData.platform,
      explorer: overviewData.explorer,
      source_code: overviewData.source_code,
      tags: overviewData.tags,
    }),
    ...(overviewData.type_name === 'ETFs' && {
      net_assets: overviewData.net_assets,
      net_expense_ratio: overviewData.net_expense_ratio,
      portfolio_turnover: overviewData.portfolio_turnover,
      etf_dividend_yield: overviewData.etf_dividend_yield,
      inception_date: overviewData.inception_date,
      leveraged: overviewData.leveraged,
      sectors: overviewData.sectors,
      holdings: overviewData.holdings,
    }),
  } : null

  // OHLCV 데이터 (별도 API 호출 필요 - 통합 엔드포인트에 포함되지 않음)
  // 더 많은 데이터를 가져오기 위해 maxDataPoints를 늘림 (약 10년치 데이터)
  const { data: ohlcvData, loading: ohlcvLoading, error: ohlcvError } = useAPI.assets.ohlcv(assetId, '1d', null, null, 5000)

  // 자산 타입별 데이터 추출
  const getAssetSpecificData = () => {
    if (!overviewData) return null

    switch (overviewData.type_name) {
      case 'Stocks':
        return {
          market_cap: overviewData.market_cap,
          ebitda: overviewData.ebitda,
          shares_outstanding: overviewData.shares_outstanding,
          pe_ratio: overviewData.pe_ratio,
          peg_ratio: overviewData.peg_ratio,
          beta: overviewData.beta,
          eps: overviewData.eps,
          dividend_yield: overviewData.dividend_yield,
          dividend_per_share: overviewData.dividend_per_share,
          profit_margin_ttm: overviewData.profit_margin_ttm,
          return_on_equity_ttm: overviewData.return_on_equity_ttm,
          revenue_ttm: overviewData.revenue_ttm,
          price_to_book_ratio: overviewData.price_to_book_ratio,
          book_value: overviewData.book_value,
          revenue_per_share_ttm: overviewData.revenue_per_share_ttm,
          operating_margin_ttm: overviewData.operating_margin_ttm,
          return_on_assets_ttm: overviewData.return_on_assets_ttm,
          gross_profit_ttm: overviewData.gross_profit_ttm,
          quarterly_earnings_growth_yoy: overviewData.quarterly_earnings_growth_yoy,
          quarterly_revenue_growth_yoy: overviewData.quarterly_revenue_growth_yoy,
          analyst_target_price: overviewData.analyst_target_price,
          trailing_pe: overviewData.trailing_pe,
          forward_pe: overviewData.forward_pe,
          price_to_sales_ratio_ttm: overviewData.price_to_sales_ratio_ttm,
          ev_to_revenue: overviewData.ev_to_revenue,
          ev_to_ebitda: overviewData.ev_to_ebitda,
          week_52_high: overviewData.week_52_high,
          week_52_low: overviewData.week_52_low,
          day_50_avg: overviewData.day_50_avg,
          day_200_avg: overviewData.day_200_avg,
        }
      
      case 'Crypto':
        return {
          symbol: overviewData.crypto_symbol,
          name: overviewData.crypto_name,
          market_cap: overviewData.crypto_market_cap,
          circulating_supply: overviewData.circulating_supply,
          total_supply: overviewData.total_supply,
          max_supply: overviewData.max_supply,
          price: overviewData.crypto_current_price,
          volume_24h: overviewData.volume_24h,
          percent_change_1h: overviewData.percent_change_1h,
          percent_change_24h: overviewData.percent_change_24h,
          percent_change_7d: overviewData.percent_change_7d,
          percent_change_30d: overviewData.percent_change_30d,
          rank: overviewData.cmc_rank,
          category: overviewData.category,
          description: overviewData.crypto_description,
          logo_url: overviewData.logo_url,
          website_url: overviewData.website_url,
          slug: overviewData.slug,
          date_added: overviewData.date_added,
          platform: overviewData.platform,
          explorer: overviewData.explorer,
          source_code: overviewData.source_code,
          tags: overviewData.tags,
        }
      
      case 'ETFs':
        return {
          net_assets: overviewData.net_assets,
          expense_ratio: overviewData.net_expense_ratio,
          portfolio_turnover: overviewData.portfolio_turnover,
          dividend_yield: overviewData.etf_dividend_yield,
          inception_date: overviewData.inception_date,
          leveraged: overviewData.leveraged,
          sectors: overviewData.sectors,
          holdings: overviewData.holdings,
        }
      
      default:
        return null
    }
  }

  const assetSpecificData = getAssetSpecificData()

  // 로딩 상태
  const isLoading = overviewLoading || ohlcvLoading
  const hasError = overviewError || ohlcvError

  // 에러 처리
  if (hasError) {
    return (
      <div className="container-fluid p-4">
        <div className="alert alert-danger">
          <h4>Error Loading Asset Data</h4>
          <p>Failed to load data for asset: {assetId}</p>
          {overviewError && <p>Overview Error: {overviewError.message}</p>}
          {ohlcvError && <p>OHLCV Error: {ohlcvError.message}</p>}
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
    ohlcvData: ohlcvData?.data || ohlcvData || [],
    cryptoData: assetSpecificData, // 자산 타입별 데이터 사용
    stockData: overviewData, // overviewData를 stockData로 전달 (통합 데이터)
    etfData: assetSpecificData, // ETF 데이터
    commodityData: assetSpecificData, // 상품 데이터
    overviewData, // 전체 개요 데이터
  }

  return (
    <div className="asset-overview">
      {/* 헤더 영역 */}
      <AssetOverviewHeader {...commonProps} />

      {/* OHLCV 차트 영역 */}
      <div className="container-fluid p-3">
        <div className="row">
          <div className="col-12">
            <OHLCVChart
              assetIdentifier={asset?.ticker}
              dataInterval="1d"
              height={isMobile ? 400 : 600}
              showVolume={true}
              showRangeSelector={true}
              showStockTools={!isMobile}
              showExporting={!isMobile}
              title={`${asset?.name} (${asset?.ticker}) Price Chart`}
              subtitle="OHLCV Data"
              maxDataPoints={10000}
              // externalOhlcvData를 제거하여 OHLCVChart가 자체적으로 더 많은 데이터를 가져오도록 함
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
