'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAssetDetail } from '@/hooks/useAssets'
import { useAssetOverviews } from '@/hooks/useAssetOverviews'
import { useRealtimePrices } from '@/hooks/useSocket'
import ComponentCard from '@/components/common/ComponentCard'
import Badge from '@/components/ui/badge/Badge'
import Alert from '@/components/ui/alert/Alert'
import { ArrowUpIcon, DollarLineIcon, PieChartIcon, UserIcon } from '@/icons'
// Live Chart 컴포넌트들 import
import LiveChart from '@/components/charts/live/livechart'
import LivePriceStocksEtfChart from '@/components/charts/live/LivePriceStocksEtfChart'
import LivePriceCryptoChart from '@/components/charts/live/LivePriceCryptoChart'
import LivePriceCommoditiesChart from '@/components/charts/live/LivePriceCommoditiesChart'
import OHLCVCustomGUIChart from '@/components/charts/ohlcvcharts/OHLCVCustomGUIChart'
import OHLCVVolumeChart from '@/components/charts/ohlcvcharts/OHLCVVolumeChart'
import { getStringValue, formatDate, formatIPODate, formatTime } from '@/components/overviews/utils/formatters'
import StocksInfoCard from '@/components/overviews/tab/StocksInfoCard'
import CryptoInfoCard from '@/components/overviews/tab/CryptoInfoCard'
import ETFInfoCard from '@/components/overviews/tab/ETFInfoCard'
import BasicAssetInfoCard from '@/components/overviews/tab/BasicAssetInfoCard'
import HistoryTable from '@/components/tables/HistoryTable'
import RealtimeQuotesPriceWidget from '@/components/widget/RealtimeQuotesPriceWidget'
import StocksFinancialDataTab from '@/components/overviews/tab/StocksFinancialDataTab'

interface AssetOverviewProps {
  className?: string
  initialData?: any
}

const AssetOverview: React.FC<AssetOverviewProps> = ({ className, initialData }) => {
  const { assetIdentifier } = useParams() as { assetIdentifier: string }
  const [isMobile, setIsMobile] = useState(false)
  const [activeChartTab, setActiveChartTab] = useState<'price' | 'interactive' | 'volume'>('price')
  
  // 기본 자산 정보 fetching (타입 확인용)
  const { data: assetDetail, loading: assetDetailLoading, error: assetDetailError } = useAssetDetail(assetIdentifier as string)
  
  // 새로운 asset-overviews API 사용
  const assetType = assetDetail?.type_name
  const { data: overviewsData, loading: overviewsLoading, error: overviewsError } = useAssetOverviews(
    assetIdentifier as string,
    { assetType: assetType as string }
  )
  
  // 지원되는 자산 타입 목록
  const supportedTypes = ['Stocks', 'Crypto', 'ETFs', 'Funds']
  
  // Stocks 여부 확인
  const isStock = assetDetail && !assetDetailLoading && assetDetail.type_name === 'Stocks'
  const isCrypto = assetDetail && !assetDetailLoading && assetDetail.type_name === 'Crypto'
  const isETF = assetDetail && !assetDetailLoading && (assetDetail.type_name === 'ETFs' || assetDetail.type_name === 'Funds')
  const isSupportedType = assetDetail && !assetDetailLoading && assetDetail.type_name && supportedTypes.includes(assetDetail.type_name)
  
  // 로딩 상태 통합
  const overviewLoading = assetDetailLoading || overviewsLoading
  const overviewError = assetDetailError || overviewsError
  
  // 실시간 가격 데이터
  const { latestPrice, isConnected } = useRealtimePrices(assetIdentifier as string)

  // 실시간 가격 수신 로깅 (웹소켓)
  // useEffect(() => {
  //   if (!assetIdentifier) return
  //   console.log('[AssetOverview][Realtime]', {
  //     assetIdentifier,
  //     isConnected,
  //     latestPrice,
  //   })
  // }, [assetIdentifier, isConnected, latestPrice])

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 디버그 로그
  useEffect(() => {
    try {
      console.log('[AssetOverview]', {
        assetIdentifier,
        isStock,
        isCrypto,
        isETF,
        isSupportedType,
        assetDetailLoading,
        overviewsLoading,
        hasAssetDetail: !!assetDetail,
        hasOverviews: !!overviewsData,
        hasStock: !!overviewsData?.stock,
        hasCrypto: !!overviewsData?.crypto,
        hasETF: !!overviewsData?.etf,
        hasCommon: !!overviewsData?.common,
        commonData: overviewsData?.common,
        ticker: assetDetail?.ticker,
        type_name: assetDetail?.type_name,
      })
    } catch {}
  }, [assetIdentifier, isStock, isCrypto, isETF, isSupportedType, assetDetailLoading, overviewsLoading, assetDetail, overviewsData])

  if (overviewLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <ComponentCard title="Loading...">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </ComponentCard>
      </div>
    )
  }

  if (overviewError) {
    return (
      <div className={className}>
        <Alert 
          variant="error"
          title="Error"
          message={`Failed to load asset overview: ${overviewError.message}`}
        />
      </div>
    )
  }

  // 새로운 API 데이터에서 자산 정보 구성
  let asset: any = assetDetail || {}
  
  if (overviewsData) {
    // 지원되는 자산 타입에 대해서만 상세 정보 병합
    if (isSupportedType) {
      // Stock 데이터 병합
      if (overviewsData.stock) {
        asset = {
          ...asset,
          ...overviewsData.stock.post_overview,
          ...overviewsData.stock.numeric_overview,
          // stock_financials_data를 직접 사용
          ...(overviewsData.stock.numeric_overview?.stock_financials_data || {}),
          // name과 ticker가 없으면 assetDetail에서 가져오기
          name: asset.name || overviewsData.stock.post_overview?.title || assetDetail?.name,
          ticker: asset.ticker || overviewsData.stock.numeric_overview?.ticker || assetDetail?.ticker,
        }
      }
      
      // Crypto 데이터 병합
      if (overviewsData.crypto) {
        asset = {
          ...asset,
          ...overviewsData.crypto.post_overview,
          ...overviewsData.crypto.numeric_overview,
          crypto_symbol: overviewsData.crypto.numeric_overview?.symbol,
          crypto_current_price: overviewsData.crypto.numeric_overview?.current_price,
          crypto_market_cap: overviewsData.crypto.numeric_overview?.market_cap,
          // name과 ticker가 없으면 assetDetail에서 가져오기
          name: asset.name || overviewsData.crypto.post_overview?.title || overviewsData.crypto.numeric_overview?.name || assetDetail?.name,
          ticker: asset.ticker || overviewsData.crypto.numeric_overview?.symbol || assetDetail?.ticker,
        }
      }
      
      // ETF 데이터 병합
      if (overviewsData.etf) {
        asset = {
          ...asset,
          ...overviewsData.etf.post_overview,
          ...overviewsData.etf.numeric_overview,
          etf_dividend_yield: overviewsData.etf.numeric_overview?.dividend_yield,
          // name과 ticker가 없으면 assetDetail에서 가져오기
          name: asset.name || overviewsData.etf.post_overview?.title || assetDetail?.name,
          ticker: asset.ticker || assetDetail?.ticker,
        }
      }
    }
    
    // 공통 정보는 모든 자산 타입에 대해 병합 (지원되지 않는 타입도 포함)
    if (overviewsData.common) {
      asset = {
        ...asset,
        prev_close: overviewsData.common.prev_close ?? asset.prev_close,
        week_52_high: overviewsData.common.week_52_high ?? asset.week_52_high,
        week_52_low: overviewsData.common.week_52_low ?? asset.week_52_low,
        volume: overviewsData.common.volume ?? asset.volume,
        average_vol_3m: overviewsData.common.average_vol_3m ?? asset.average_vol_3m,
        market_cap: overviewsData.common.market_cap || asset.market_cap,
        day_50_moving_avg: overviewsData.common.day_50_moving_avg ?? asset.day_50_moving_avg,
        day_200_moving_avg: overviewsData.common.day_200_moving_avg ?? asset.day_200_moving_avg,
        // last_updated도 저장 (표시용)
        common_last_updated: overviewsData.common.last_updated,
      }
    }
  }
  
  // name과 ticker가 여전히 없으면 assetDetail에서 가져오기
  if (!asset.name && assetDetail?.name) {
    asset.name = assetDetail.name
  }
  if (!asset.ticker && assetDetail?.ticker) {
    asset.ticker = assetDetail.ticker
  }
  
  if (!asset) {
    return (
      <div className={className}>
        <Alert 
          variant="warning"
          title="No Data"
          message="No asset data available for the selected asset."
        />
      </div>
    )
  }

  // Stocks일 때만 재무 정보 사용
  const stockFinancials = isStock ? overviewsData?.stock?.numeric_overview?.stock_financials_data : null
  const incomeData = isStock ? overviewsData?.stock?.numeric_overview?.income_json : null
  const balanceData = isStock ? overviewsData?.stock?.numeric_overview?.balance_json : null
  const cashFlowData = isStock ? overviewsData?.stock?.numeric_overview?.cash_flow_json : null
  const ratiosData = isStock ? overviewsData?.stock?.numeric_overview?.ratios_json : null

  const assetName = getStringValue(asset?.name)
  const assetTicker = getStringValue(asset?.ticker)
  const assetTypeName = getStringValue(asset?.type_name)
  const assetExchange = getStringValue(asset?.exchange)
  const assetCurrency = getStringValue(asset?.currency)
  const assetDescription = getStringValue(asset?.description)
  const assetWebsite = typeof asset?.website === 'string' ? asset.website : undefined
  const ensureString = (value: any) => {
    const str = getStringValue(value)
    return str === '-' ? null : str
  }
  const assetMarketStatus = ensureString(asset?.market_status)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 자산 헤더 정보 */}
      <ComponentCard title={`${assetName} (${assetTicker})`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <p className="text-gray-500">
              {assetTypeName} • {assetExchange}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge color={asset.is_active ? "success" : "light"}>
              {asset.is_active ? "Active" : "Inactive"}
            </Badge>
            {assetCurrency && assetCurrency !== '-' && (
              <Badge color="info">{assetCurrency}</Badge>
            )}
            {isConnected && (
              <Badge color="success">
                Live
              </Badge>
            )}
          </div>
        </div>
        {(() => {
          // description 추출 (다양한 소스에서)
          let description: string | null = null
          if (isSupportedType) {
            if (isStock) {
              description = ensureString(overviewsData?.stock?.post_overview?.description)
            } else if (isCrypto) {
              description = ensureString(overviewsData?.crypto?.post_overview?.description)
            }
          }
          
          // 지원되지 않는 타입이거나 description이 없으면 assetDetail에서 가져오기
          if (!description && asset.description) {
            description = assetDescription && assetDescription !== '-' ? assetDescription : null
          }
          
          return description ? (
            <p className="text-sm text-gray-500 mb-4">
              {description}
            </p>
          ) : null
        })()}
        
        {/* 자산 타입별 추가 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isSupportedType && assetTypeName === 'Stocks' && (
              <>
                {ensureString(asset.company_name) && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Company:</span>
                    <span className="text-sm">{ensureString(asset.company_name)}</span>
                  </div>
                )}
                {ensureString(asset.sector) && (
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Sector:</span>
                    <span className="text-sm">{ensureString(asset.sector)}</span>
                  </div>
                )}
                {ensureString(asset.industry) && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Industry:</span>
                    <span className="text-sm">{ensureString(asset.industry)}</span>
                  </div>
                )}
                {ensureString(asset.country) && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Country:</span>
                    <span className="text-sm">{ensureString(asset.country)}</span>
                  </div>
                )}
                {asset.employees_count && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Employees:</span>
                    <span className="text-sm">{asset.employees_count.toLocaleString('en-US')}</span>
                  </div>
                )}
                {ensureString(asset.ceo) && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">CEO:</span>
                    <span className="text-sm">{ensureString(asset.ceo)}</span>
                  </div>
                )}
                {asset.ipo_date && (
                  <div className="flex items-center gap-2">
                    <DollarLineIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">IPO Date:</span>
                    <span className="text-sm">{formatIPODate(asset.ipo_date)}</span>
                  </div>
                )}
                {assetWebsite && (
                  <div className="flex items-center gap-2">
                    <ArrowUpIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Website:</span>
                    <a href={assetWebsite} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                      {assetWebsite}
                    </a>
                  </div>
                )}
              </>
            )}
            
            {isSupportedType && assetTypeName === 'Crypto' && (
              <>
                {ensureString(asset.crypto_symbol) && (
                  <div className="flex items-center gap-2">
                    <DollarLineIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Symbol:</span>
                    <span className="text-sm">{ensureString(asset.crypto_symbol)}</span>
                  </div>
                )}
                {asset.crypto_market_cap && (
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Market Cap:</span>
                    <span className="text-sm">${(asset.crypto_market_cap / 1e9).toFixed(2)}B</span>
                  </div>
                )}
                {asset.circulating_supply && (
                  <div className="flex items-center gap-2">
                    <ArrowUpIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Circulating Supply:</span>
                    <span className="text-sm">{asset.circulating_supply.toLocaleString('en-US')}</span>
                  </div>
                )}
                {asset.total_supply && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Total Supply:</span>
                    <span className="text-sm">{asset.total_supply.toLocaleString('en-US')}</span>
                  </div>
                )}
                {asset.max_supply && (
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Max Supply:</span>
                    <span className="text-sm">{asset.max_supply.toLocaleString('en-US')}</span>
                  </div>
                )}
                {asset.cmc_rank && (
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">CMC Rank:</span>
                    <span className="text-sm">#{asset.cmc_rank}</span>
                  </div>
                )}
                {ensureString(asset.category) && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Category:</span>
                    <span className="text-sm capitalize">{ensureString(asset.category)}</span>
                  </div>
                )}
                {ensureString(asset.website_url) && (
                  <div className="flex items-center gap-2">
                    <ArrowUpIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Website:</span>
                    <a href={ensureString(asset.website_url) || undefined} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                      {ensureString(asset.website_url)}
                    </a>
                  </div>
                )}
                {asset.logo_url && (
                  <div className="flex items-center gap-2">
                    <img 
                      src={asset.logo_url} 
                      alt={`${assetName} logo`}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm font-medium">Logo Available</span>
                  </div>
                )}
                {asset.date_added && (
                  <div className="flex items-center gap-2">
                    <DollarLineIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Date Added:</span>
                    <span className="text-sm">{formatDate(asset.date_added)}</span>
                  </div>
                )}
              </>
            )}
            
            {isSupportedType && assetTypeName === 'ETFs' && (
              <>
                {asset.net_assets && (
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Net Assets:</span>
                    <span className="text-sm">${(asset.net_assets / 1e9).toFixed(2)}B</span>
                  </div>
                )}
                {asset.net_expense_ratio && (
                  <div className="flex items-center gap-2">
                    <DollarLineIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Expense Ratio:</span>
                    <span className="text-sm">{(asset.net_expense_ratio * 100).toFixed(2)}%</span>
                  </div>
                )}
                {asset.portfolio_turnover && (
                  <div className="flex items-center gap-2">
                    <ArrowUpIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Portfolio Turnover:</span>
                    <span className="text-sm">{(asset.portfolio_turnover * 100).toFixed(1)}%</span>
                  </div>
                )}
                {asset.etf_dividend_yield && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Dividend Yield:</span>
                    <span className="text-sm">{(asset.etf_dividend_yield * 100).toFixed(2)}%</span>
                  </div>
                )}
                {asset.inception_date && (
                  <div className="flex items-center gap-2">
                    <DollarLineIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Inception Date:</span>
                    <span className="text-sm">{formatIPODate(asset.inception_date)}</span>
                  </div>
                )}
                {asset.leveraged !== null && (
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Leveraged:</span>
                    <span className="text-sm">{asset.leveraged ? 'Yes' : 'No'}</span>
                  </div>
                )}
                {asset.sectors && asset.sectors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Top Sectors:</span>
                    <span className="text-sm">
                      {asset.sectors
                        .slice(0, 3)
                        .map((s: any) => ensureString(s?.sector) || '-')
                        .join(', ')}
                    </span>
                  </div>
                )}
                {asset.holdings && asset.holdings.length > 0 && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Top Holdings:</span>
                    <span className="text-sm">
                      {asset.holdings
                        .slice(0, 3)
                        .map((h: any) => ensureString(h?.symbol) || '-')
                        .join(', ')}
                    </span>
                  </div>
                )}
              </>
            )}
            
            {assetTypeName === 'Commodity' && (
              <>
                {ensureString(asset.commodity_type) && (
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Type:</span>
                    <span className="text-sm">{ensureString(asset.commodity_type)}</span>
                  </div>
                )}
                {ensureString(asset.unit) && (
                  <div className="flex items-center gap-2">
                    <DollarLineIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Unit:</span>
                    <span className="text-sm">{ensureString(asset.unit)}</span>
                  </div>
                )}
              </>
            )}
        </div>
      </ComponentCard>

      {/* 딜레이된 실시간 가격 정보 (15분 딜레이) */}
      <RealtimeQuotesPriceWidget 
        assetIdentifier={assetIdentifier as string}
        className=""
      />

    

      {/* 시장 상태 정보 */}
      {assetMarketStatus && (
        <ComponentCard title="Market Status">
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              assetMarketStatus === 'REALTIME' ? 'bg-green-100 text-green-800' :
              assetMarketStatus === 'DAILY_DATA' ? 'bg-blue-100 text-blue-800' :
              assetMarketStatus === 'INTRADAY_DATA' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {assetMarketStatus === 'REALTIME' ? 'Real-time' :
               assetMarketStatus === 'DAILY_DATA' ? 'Daily Data' :
               assetMarketStatus === 'INTRADAY_DATA' ? 'Intraday Data' :
               'Static Data'}
            </div>
            <div className="text-sm text-gray-600">
              {assetMarketStatus === 'REALTIME' ? 'Live market data' :
               assetMarketStatus === 'DAILY_DATA' ? 'End-of-day data' :
               assetMarketStatus === 'INTRADAY_DATA' ? 'Intraday data' :
               'Historical data'}
            </div>
          </div>
        </ComponentCard>
      )}

      {/* 자산 상세 정보 */}
      {isStock && overviewsData?.stock ? (
        <StocksInfoCard
          asset={asset}
          stockFinancials={stockFinancials}
          commonData={overviewsData?.common}
        />
      ) : isCrypto && overviewsData?.crypto ? (
        <CryptoInfoCard asset={asset} commonData={overviewsData?.common} />
      ) : isETF && overviewsData?.etf ? (
        <ETFInfoCard asset={asset} commonData={overviewsData?.common} />
      ) : (
        <BasicAssetInfoCard asset={asset} commonData={overviewsData?.common} />
      )}

      {/* Live 차트 */}
      <ComponentCard title="Charts">
        {/* 탭 메뉴 */}
        <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8" aria-label="Chart Tabs">
            <button
              onClick={() => setActiveChartTab('price')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeChartTab === 'price'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              Live Chart
            </button>
            <button
              onClick={() => setActiveChartTab('interactive')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeChartTab === 'interactive'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              Interactive Chart
            </button>
            <button
              onClick={() => setActiveChartTab('volume')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeChartTab === 'volume'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              Volume Chart
            </button>
          </nav>
        </div>

        {/* 탭별 차트 콘텐츠 */}
        <React.Suspense fallback={
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="text-sm text-gray-600">Loading chart library...</div>
            </div>
          </div>
        }>
          {activeChartTab === 'price' ? (
            (() => {
              // 자산 타입에 따라 적절한 Live 차트 컴포넌트 선택
              if (isStock || isETF) {
                return (
                  <LivePriceStocksEtfChart
                    assetIdentifier={assetIdentifier as string}
                    height={600}
                  />
                )
              } else if (isCrypto) {
                return (
                  <LivePriceCryptoChart
                    assetIdentifier={assetIdentifier as string}
                    height={600}
                  />
                )
              } else if (assetTypeName === 'Commodity') {
                return (
                  <LivePriceCommoditiesChart
                    assetIdentifier={assetIdentifier as string}
                    height={600}
                  />
                )
              } else {
                // 기본 Live 차트 (기타 자산 타입)
                return (
                  <LiveChart
                    assetIdentifier={assetIdentifier as string}
                    height={600}
                  />
                )
              }
            })()
          ) : activeChartTab === 'interactive' ? (
            // Interactive Chart는 OHLCVCustomGUIChart 사용
            <OHLCVCustomGUIChart
              assetIdentifier={assetIdentifier as string}
              dataInterval="1d"
              seriesId={`${assetIdentifier}-interactive`}
              seriesName={assetName || assetTicker}
              height={650}
            />
          ) : (
            // Volume Chart는 OHLCVVolumeChart 사용
            <OHLCVVolumeChart
              assetIdentifier={assetIdentifier as string}
              height={650}
              title={`${assetName || assetTicker} - Candlestick and Volume`}
            />
          )}
        </React.Suspense>
      </ComponentCard>

      {/* ETF 섹터 및 홀딩 정보 */}
      {isSupportedType && assetTypeName === 'ETFs' && (asset.sectors || asset.holdings) && (
        <ComponentCard title="Portfolio Composition">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {asset.sectors && asset.sectors.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Sector Allocation</h4>
                <div className="space-y-2">
                  {asset.sectors.slice(0, 10).map((sector: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{ensureString(sector?.sector) || '-'}</span>
                      <span className="text-sm font-medium">{(sector.weight * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {asset.holdings && asset.holdings.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Top Holdings</h4>
                <div className="space-y-2">
                  {asset.holdings.slice(0, 10).map((holding: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{ensureString(holding?.symbol) || '-'}</span>
                        <span className="text-xs text-gray-500">{ensureString(holding?.description) || ''}</span>
                      </div>
                      <span className="text-sm font-medium">{(holding.weight * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ComponentCard>
      )}

      {/* Macrotrends 재무 정보 */}
      {isSupportedType && overviewsData?.stock && assetTypeName === 'Stocks' && (
        <StocksFinancialDataTab
          incomeData={incomeData}
          balanceData={balanceData}
          cashFlowData={cashFlowData}
          ratiosData={ratiosData}
        />
      )}

      {/* 히스토리 데이터 */}
      <ComponentCard title="Historical Data">
        <HistoryTable
          assetIdentifier={assetIdentifier as string}
          initialInterval="1d"
          showVolume={true}
          showChangePercent={true}
          height={400}
        />
      </ComponentCard>
    </div>
  )
}

export default AssetOverview
