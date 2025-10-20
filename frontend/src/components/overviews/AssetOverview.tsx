'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAssetOverview } from '@/hooks/useAssetOverview'
import { useRealtimePrices } from '@/hooks/useSocket'
import ComponentCard from '@/components/common/ComponentCard'
import Badge from '@/components/ui/badge/Badge'
import Alert from '@/components/ui/alert/Alert'
import { ArrowUpIcon, ArrowDownIcon, DollarLineIcon, PieChartIcon, UserIcon } from '@/icons'
import OHLCVChart from '@/components/charts/ohlcvcharts/OHLCVChart'
import HistoryTable from '@/components/tables/HistoryTable'

interface AssetOverviewProps {
  className?: string
  initialData?: any
}

const AssetOverview: React.FC<AssetOverviewProps> = ({ className, initialData }) => {
  const { assetIdentifier } = useParams()
  const [isMobile, setIsMobile] = useState(false)
  
  // 자산 개요 데이터 fetching (initialData가 있으면 사용)
  const { data: overviewData, loading: overviewLoading, error: overviewError } = useAssetOverview(assetIdentifier as string, { initialData })
  
  // 디버깅을 위한 로그
  console.log('🔍 AssetOverview Debug:', {
    assetIdentifier,
    overviewData,
    overviewLoading,
    overviewError
  })
  
  // 실시간 가격 데이터
  const { latestPrice, isConnected } = useRealtimePrices(assetIdentifier as string)

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

  if (!overviewData) {
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

  const asset = overviewData

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
        {asset.description && (
          <p className="text-sm text-gray-500 mb-4">
            {asset.description}
          </p>
        )}
        
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
              </>
            )}
            
            {asset.type_name === 'Cryptocurrency' && (
              <>
                {asset.symbol && (
                  <div className="flex items-center gap-2">
                    <DollarLineIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Symbol:</span>
                    <span className="text-sm">{asset.symbol}</span>
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
              </>
            )}
            
            {asset.type_name === 'ETF' && (
              <>
                {asset.etf_name && (
                  <div className="flex items-center gap-2">
                    <ArrowUpIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">ETF Name:</span>
                    <span className="text-sm">{asset.etf_name}</span>
                  </div>
                )}
                {asset.expense_ratio && (
                  <div className="flex items-center gap-2">
                    <DollarLineIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Expense Ratio:</span>
                    <span className="text-sm">{(asset.expense_ratio * 100).toFixed(2)}%</span>
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

      {/* 실시간 가격 정보 */}
      {latestPrice && (
        <ComponentCard title="Real-time Price">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ${latestPrice.price.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 6 
                  })}
                </div>
                <div className="text-sm text-gray-500">Current Price</div>
              </div>
              {latestPrice.volume && (
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-lg font-semibold">
                    {latestPrice.volume.toLocaleString(undefined, { 
                      notation: 'compact',
                      maximumFractionDigits: 2 
                    })}
                  </div>
                  <div className="text-sm text-gray-500">Volume</div>
                </div>
              )}
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm font-medium">
                  {new Date(latestPrice.timestamp).toLocaleTimeString()}
                </div>
                <div className="text-sm text-gray-500">Last Updated</div>
              </div>
            </div>
        </ComponentCard>
      )}

      {/* 자산 상세 정보 */}
      <ComponentCard title="Asset Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">Timestamps</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created:</span>
                <span>{new Date(asset.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated:</span>
                <span>{new Date(asset.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </ComponentCard>

      {/* 가격 차트 */}
      <ComponentCard title="Price Charts">
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
      </ComponentCard>

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
