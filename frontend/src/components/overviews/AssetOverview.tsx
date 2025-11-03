'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAssetDetail } from '@/hooks/useAssets'
import { useUnifiedFinancials } from '@/hooks/useUnifiedFinancials'
import { useAssetOverviewBundle } from '@/hooks/useAssetOverviewBundle'
import { useRealtimePrices } from '@/hooks/useSocket'
import ComponentCard from '@/components/common/ComponentCard'
import Badge from '@/components/ui/badge/Badge'
import Alert from '@/components/ui/alert/Alert'
import { ArrowUpIcon, ArrowDownIcon, DollarLineIcon, PieChartIcon, UserIcon } from '@/icons'
// OHLCVChart를 직접 import (SSR 문제 해결)
import OHLCVChart from '@/components/charts/ohlcvcharts/OHLCVChart'

// 일관된 날짜 포맷팅 함수 (SSR/CSR 일관성 보장)
const formatDate = (dateInput: any) => {
  if (!dateInput) return '-'
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return '-'
  return date.toISOString().split('T')[0] // YYYY-MM-DD 형식
}

// IPO 날짜 포맷팅 함수 (더 읽기 쉬운 형식)
const formatIPODate = (dateInput: any) => {
  if (!dateInput) return '-'
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return '-'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 시간 포맷팅 함수 (SSR/CSR 일관성 보장)
const formatTime = (timestamp: any) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return '-'
  return date.toISOString().split('T')[1].split('.')[0] // HH:MM:SS 형식
}
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
  
  // 기본 자산 정보 fetching
  const { data: assetDetail, loading: assetDetailLoading, error: assetDetailError } = useAssetDetail(assetIdentifier as string)
  
  // Stocks 여부 확인
  const isStock = assetDetail && !assetDetailLoading && assetDetail.type_name === 'Stocks'
  
  // Stocks일 때: 새로운 통합 재무 정보 API 사용
  const { data: financialsData, loading: financialsLoading, error: financialsError } = useUnifiedFinancials(
    isStock ? assetIdentifier as string : '', // Stocks가 아니면 빈 문자열 전달하여 호출 방지
    { initialData: null }
  )
  
  // Stocks가 아닐 때: 기존 bundle API 사용 (Crypto, ETF 등)
  // assetDetail이 로드되고 Stocks가 아닐 때만 호출
  const shouldUseBundle = assetDetail && !assetDetailLoading && assetDetail.type_name !== 'Stocks'
  const { data: bundleData, loading: bundleLoading, error: bundleError } = useAssetOverviewBundle(
    shouldUseBundle ? assetIdentifier as string : '',
    { initialData: undefined }
  )
  
  // 로딩 상태 통합
  const overviewLoading = assetDetailLoading || (isStock && financialsLoading) || (shouldUseBundle && bundleLoading)
  const overviewError = assetDetailError || (isStock && financialsError) || (shouldUseBundle && bundleError)
  
  // 디버그 로그
  useEffect(() => {
    try {
      console.log('[AssetOverview]', {
        assetIdentifier,
        isStock,
        shouldUseBundle,
        assetDetailLoading,
        financialsLoading: isStock ? financialsLoading : undefined,
        bundleLoading: shouldUseBundle ? bundleLoading : undefined,
        hasAssetDetail: !!assetDetail,
        hasFinancials: isStock ? !!financialsData : undefined,
        hasBundle: shouldUseBundle ? !!bundleData : undefined,
        ticker: assetDetail?.ticker,
        type_name: assetDetail?.type_name,
      })
    } catch {}
  }, [assetIdentifier, isStock, shouldUseBundle, assetDetailLoading, financialsLoading, bundleLoading, assetDetail, financialsData, bundleData])
  
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

  // Stocks가 아닐 때는 overview-bundle의 여러 소스를 병합하여 표시 객체 생성
  const numericOverview: any = shouldUseBundle ? (bundleData as any)?.numeric_overview : null
  const bundleOverview = numericOverview?.overview || null
  const cryptoMeta = numericOverview?.crypto || null
  const treemapExtras = numericOverview ? {
    treemap_current_price: numericOverview.treemap_current_price,
    treemap_change_24h: numericOverview.treemap_change_24h,
    market_status: numericOverview.market_status,
    realtime_updated_at: numericOverview.realtime_updated_at,
    daily_data_updated_at: numericOverview.daily_data_updated_at,
  } : {}

  const mergedAsset = !isStock ? {
    ...(assetDetail || {}),
    ...(bundleOverview || {}),
    ...(cryptoMeta || {}),
    ...treemapExtras,
  } : null

  const asset = isStock ? assetDetail : (mergedAsset || assetDetail)
  
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
  const stockFinancials = isStock ? financialsData?.stock_financials_data : null
  const incomeData = isStock ? financialsData?.income_json : null
  const balanceData = isStock ? financialsData?.balance_json : null
  const cashFlowData = isStock ? financialsData?.cash_flow_json : null
  const ratiosData = isStock ? financialsData?.ratios_json : null

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 자산 헤더 정보 */}
      <ComponentCard title={`${asset.name} (${asset.ticker})`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <p className="text-gray-500">
              {asset.type_name} • {asset.exchange}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge color={asset.is_active ? "success" : "light"}>
              {asset.is_active ? "Active" : "Inactive"}
            </Badge>
            {asset.currency && (
              <Badge color="info">{asset.currency}</Badge>
            )}
            {isConnected && (
              <Badge color="success">
                Live
              </Badge>
            )}
          </div>
        </div>
        {(shouldUseBundle && (bundleData as any)?.post_overview?.description?.ko) ? (
          <p className="text-sm text-gray-500 mb-4">
            {(bundleData as any).post_overview.description.ko}
          </p>
        ) : asset.description ? (
          <p className="text-sm text-gray-500 mb-4">
            {asset.description}
          </p>
        ) : null}
        
        {/* 자산 타입별 추가 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {asset.type_name === 'Stocks' && (
              <>
                {asset.company_name && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Company:</span>
                    <span className="text-sm">{asset.company_name}</span>
                  </div>
                )}
                {asset.sector && (
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Sector:</span>
                    <span className="text-sm">{asset.sector}</span>
                  </div>
                )}
                {asset.industry && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Industry:</span>
                    <span className="text-sm">{asset.industry}</span>
                  </div>
                )}
                {asset.country && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Country:</span>
                    <span className="text-sm">{asset.country}</span>
                  </div>
                )}
                {asset.employees_count && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Employees:</span>
                    <span className="text-sm">{asset.employees_count.toLocaleString('en-US')}</span>
                  </div>
                )}
                {asset.ceo && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">CEO:</span>
                    <span className="text-sm">{asset.ceo}</span>
                  </div>
                )}
                {asset.ipo_date && (
                  <div className="flex items-center gap-2">
                    <DollarLineIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">IPO Date:</span>
                    <span className="text-sm">{formatIPODate(asset.ipo_date)}</span>
                  </div>
                )}
                {asset.website && (
                  <div className="flex items-center gap-2">
                    <ArrowUpIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Website:</span>
                    <a href={asset.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                      {asset.website}
                    </a>
                  </div>
                )}
              </>
            )}
            
            {asset.type_name === 'Crypto' && (
              <>
                {asset.crypto_symbol && (
                  <div className="flex items-center gap-2">
                    <DollarLineIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Symbol:</span>
                    <span className="text-sm">{asset.crypto_symbol}</span>
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
                {asset.category && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Category:</span>
                    <span className="text-sm capitalize">{asset.category}</span>
                  </div>
                )}
                {asset.website_url && (
                  <div className="flex items-center gap-2">
                    <ArrowUpIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Website:</span>
                    <a href={asset.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                      {asset.website_url}
                    </a>
                  </div>
                )}
                {asset.logo_url && (
                  <div className="flex items-center gap-2">
                    <img 
                      src={asset.logo_url} 
                      alt={`${asset.name} logo`}
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
            
            {asset.type_name === 'ETFs' && (
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
                    <span className="text-sm">{asset.sectors.slice(0, 3).map((s: any) => s.sector).join(', ')}</span>
                  </div>
                )}
                {asset.holdings && asset.holdings.length > 0 && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Top Holdings:</span>
                    <span className="text-sm">{asset.holdings.slice(0, 3).map((h: any) => h.symbol).join(', ')}</span>
                  </div>
                )}
              </>
            )}
            
            {asset.type_name === 'Commodity' && (
              <>
                {asset.commodity_type && (
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Type:</span>
                    <span className="text-sm">{asset.commodity_type}</span>
                  </div>
                )}
                {asset.unit && (
                  <div className="flex items-center gap-2">
                    <DollarLineIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Unit:</span>
                    <span className="text-sm">{asset.unit}</span>
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

      {/* 실시간 가격 정보 */}
      {/* <ComponentCard title="Real-time Price">
        {(latestPrice || asset.current_price) ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                ${(latestPrice?.price || asset.current_price)?.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 6 
                })}
              </div>
              <div className="text-sm text-gray-500">Current Price</div>
            </div>
            {(latestPrice?.volume || asset.price_change_percentage_24h) && (
              <div className="text-center p-4 border rounded-lg">
                <div className={`text-lg font-semibold ${(latestPrice?.change_percent || asset.price_change_percentage_24h) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(latestPrice?.change_percent || asset.price_change_percentage_24h) >= 0 ? '+' : ''}{(latestPrice?.change_percent || asset.price_change_percentage_24h)?.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-500">24h Change</div>
              </div>
            )}
            <div className="text-center p-4 border rounded-lg">
              <div className="text-sm font-medium">
                {formatTime(latestPrice?.timestamp || asset.realtime_updated_at || asset.daily_data_updated_at)}
              </div>
              <div className="text-sm text-gray-500">Last Updated</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">
              {isConnected ? (
                <>
                  <div className="text-lg font-semibold text-gray-700">Real-time data not available</div>
                  <div className="text-sm">
                    {asset.type_name === 'Stocks' 
                      ? 'Real-time stock data may be delayed or unavailable. Check the price chart below for historical data.'
                      : 'Real-time price data is not available for this asset type.'
                    }
                  </div>
                </>
              ) : (
                <>
                  <div className="text-lg font-semibold text-gray-700">Connecting...</div>
                  <div className="text-sm">Establishing connection to real-time data feed</div>
                </>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="text-xs text-gray-500">
                {isConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </div>
        )}
      </ComponentCard> */}

      {/* 시장 상태 정보 */}
            {(asset.market_status || (numericOverview && numericOverview.market_status)) && (
        <ComponentCard title="Market Status">
          <div className="flex items-center gap-4">
                  {(() => { const ms = asset.market_status || (numericOverview && numericOverview.market_status); return (
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    ms === 'REALTIME' ? 'bg-green-100 text-green-800' :
                    ms === 'DAILY_DATA' ? 'bg-blue-100 text-blue-800' :
                    ms === 'INTRADAY_DATA' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
                    {ms === 'REALTIME' ? 'Real-time' :
                     ms === 'DAILY_DATA' ? 'Daily Data' :
                     ms === 'INTRADAY_DATA' ? 'Intraday Data' :
               'Static Data'}
            </div>
                  )})()}
            <div className="text-sm text-gray-600">
                    {(asset.market_status || (numericOverview && numericOverview.market_status)) === 'REALTIME' ? 'Live market data' :
                     (asset.market_status || (numericOverview && numericOverview.market_status)) === 'DAILY_DATA' ? 'End-of-day data' :
                     (asset.market_status || (numericOverview && numericOverview.market_status)) === 'INTRADAY_DATA' ? 'Intraday data' :
               'Historical data'}
            </div>
          </div>
        </ComponentCard>
      )}

      {/* 자산 상세 정보 */}
      <ComponentCard title="Asset Information">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium mb-2">Basic Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Asset ID:</span>
                <span>{asset.asset_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type:</span>
                <span>{asset.type_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Exchange:</span>
                <span>{asset.exchange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Currency:</span>
                <span>{asset.currency}</span>
              </div>
              {asset.market_cap && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Market Cap:</span>
                  <span>${(asset.market_cap / 1e9).toFixed(2)}B</span>
                </div>
              )}
            </div>
          </div>
          
          {asset.type_name === 'Stocks' && (
            <div>
              <h4 className="font-medium mb-2">Financial Metrics</h4>
              <div className="space-y-2 text-sm">
                {(stockFinancials?.pe_ratio ?? asset.pe_ratio) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">P/E Ratio:</span>
                    <span>{(stockFinancials?.pe_ratio ?? asset.pe_ratio)?.toFixed(2)}</span>
                  </div>
                )}
                {(stockFinancials?.eps ?? asset.eps) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">EPS:</span>
                    <span>${(stockFinancials?.eps ?? asset.eps)?.toFixed(2)}</span>
                  </div>
                )}
                {(stockFinancials?.beta ?? asset.beta) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Beta:</span>
                    <span>{(stockFinancials?.beta ?? asset.beta)?.toFixed(3)}</span>
                  </div>
                )}
                {(stockFinancials?.dividend_yield ?? asset.dividend_yield) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dividend Yield:</span>
                    <span>{((stockFinancials?.dividend_yield ?? asset.dividend_yield) * 100)?.toFixed(2)}%</span>
                  </div>
                )}
                {(stockFinancials?.shares_outstanding ?? asset.shares_outstanding) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Shares Outstanding:</span>
                    <span>{(stockFinancials?.shares_outstanding ?? asset.shares_outstanding)?.toLocaleString('en-US')}</span>
                  </div>
                )}
                {stockFinancials?.market_cap && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Market Cap:</span>
                    <span>${(stockFinancials.market_cap / 1e9).toFixed(2)}B</span>
                  </div>
                )}
                {stockFinancials?.revenue_ttm && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Revenue (TTM):</span>
                    <span>${(stockFinancials.revenue_ttm / 1e9).toFixed(2)}B</span>
                  </div>
                )}
                {stockFinancials?.ebitda && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">EBITDA:</span>
                    <span>${(stockFinancials.ebitda / 1e9).toFixed(2)}B</span>
                  </div>
                )}
                {stockFinancials?.profit_margin_ttm && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Profit Margin (TTM):</span>
                    <span>{(stockFinancials.profit_margin_ttm * 100).toFixed(2)}%</span>
                  </div>
                )}
                {stockFinancials?.return_on_equity_ttm && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">ROE (TTM):</span>
                    <span>{(stockFinancials.return_on_equity_ttm * 100).toFixed(2)}%</span>
                  </div>
                )}
                {stockFinancials?.return_on_assets_ttm && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">ROA (TTM):</span>
                    <span>{(stockFinancials.return_on_assets_ttm * 100).toFixed(2)}%</span>
                  </div>
                )}
                {stockFinancials?.price_to_book_ratio && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">P/B Ratio:</span>
                    <span>{stockFinancials.price_to_book_ratio.toFixed(2)}</span>
                  </div>
                )}
                {stockFinancials?.dividend_per_share && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dividend Per Share:</span>
                    <span>${stockFinancials.dividend_per_share.toFixed(2)}</span>
                  </div>
                )}
                {stockFinancials?.book_value && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Book Value:</span>
                    <span>${stockFinancials.book_value.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {asset.type_name === 'Crypto' && (
            <div>
              <h4 className="font-medium mb-2">Crypto Metrics</h4>
              <div className="space-y-2 text-sm">
                {(asset.crypto_current_price || (asset as any).treemap_current_price) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current Price:</span>
                    <span>${(asset.crypto_current_price || (asset as any).treemap_current_price).toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 6 
                    })}</span>
                  </div>
                )}
                {asset.volume_24h && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">24h Volume:</span>
                    <span>${(asset.volume_24h / 1e9).toFixed(2)}B</span>
                  </div>
                )}
                {(asset.percent_change_24h || (asset as any).treemap_change_24h) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">24h Change:</span>
                    {(() => {
                      const change = (asset.percent_change_24h ?? (asset as any).treemap_change_24h) as number
                      return (
                        <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                        </span>
                      )
                    })()}
                  </div>
                )}
                {asset.percent_change_7d && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">7d Change:</span>
                    <span className={asset.percent_change_7d >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {asset.percent_change_7d >= 0 ? '+' : ''}{asset.percent_change_7d.toFixed(2)}%
                    </span>
                  </div>
                )}
                {asset.percent_change_30d && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">30d Change:</span>
                    <span className={asset.percent_change_30d >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {asset.percent_change_30d >= 0 ? '+' : ''}{asset.percent_change_30d.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {asset.type_name === 'ETFs' && (
            <div>
              <h4 className="font-medium mb-2">ETF Metrics</h4>
              <div className="space-y-2 text-sm">
                {asset.net_assets && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Net Assets:</span>
                    <span>${(asset.net_assets / 1e9).toFixed(2)}B</span>
                  </div>
                )}
                {asset.net_expense_ratio && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Expense Ratio:</span>
                    <span>{(asset.net_expense_ratio * 100).toFixed(2)}%</span>
                  </div>
                )}
                {asset.portfolio_turnover && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Portfolio Turnover:</span>
                    <span>{(asset.portfolio_turnover * 100).toFixed(1)}%</span>
                  </div>
                )}
                {asset.etf_dividend_yield && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dividend Yield:</span>
                    <span>{(asset.etf_dividend_yield * 100).toFixed(2)}%</span>
                  </div>
                )}
                {asset.leveraged !== null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Leveraged:</span>
                    <span>{asset.leveraged ? 'Yes' : 'No'}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div>
            <h4 className="font-medium mb-2">Timestamps</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created:</span>
                <span>{formatDate(asset.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated:</span>
                <span>{formatDate(asset.updated_at)}</span>
              </div>
              {asset.ipo_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">IPO Date:</span>
                  <span>{formatDate(asset.ipo_date)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </ComponentCard>

      {/* 가격 차트 */}
      <ComponentCard title="Price Charts">
        <React.Suspense fallback={
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="text-sm text-gray-600">Loading chart library...</div>
            </div>
          </div>
        }>
          <OHLCVChart
            assetIdentifier={assetIdentifier as string}
            dataInterval="1d"
            height={600}
            showVolume={true}
            showRangeSelector={true}
            showExporting={true}
            title={`${asset.name} Price Chart`}
            subtitle={`${asset.exchange} • ${asset.currency}`}
          />
        </React.Suspense>
      </ComponentCard>

      {/* ETF 섹터 및 홀딩 정보 */}
      {asset.type_name === 'ETFs' && (asset.sectors || asset.holdings) && (
        <ComponentCard title="Portfolio Composition">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {asset.sectors && asset.sectors.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Sector Allocation</h4>
                <div className="space-y-2">
                  {asset.sectors.slice(0, 10).map((sector: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{sector.sector}</span>
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
                        <span className="text-sm font-medium">{holding.symbol}</span>
                        <span className="text-xs text-gray-500">{holding.description}</span>
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
      {financialsData && asset.type_name === 'Stocks' && (
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
