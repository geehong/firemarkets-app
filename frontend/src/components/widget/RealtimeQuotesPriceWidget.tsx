'use client'

import React from 'react'
import { useDelayedQuoteLast, useSparklinePrice } from '@/hooks/useRealtime'
import { useAssetDetail } from '@/hooks/useAssets'
import ComponentCard from '@/components/common/ComponentCard'

interface RealtimeQuotesPriceWidgetProps {
  assetIdentifier: string
  className?: string
}

const RealtimeQuotesPriceWidget: React.FC<RealtimeQuotesPriceWidgetProps> = ({
  assetIdentifier,
  className = ''
}) => {
  // 자산 정보 조회 (asset_type_id 확인용)
  const { data: assetDetail } = useAssetDetail(assetIdentifier)
  
  // 암호화폐(asset_type_id=8)일 때만 binance 사용, 그 외에는 data_source 지정하지 않음
  const isCrypto = assetDetail?.asset_type_id === 8
  const dataSource = isCrypto ? 'binance' : undefined
  
  // 주식/ETF인지 확인
  const isStocksOrEtf = 
    assetDetail?.asset_type_id === 2 || // Stocks
    assetDetail?.asset_type_id === 5 || // ETFs
    assetDetail?.type_name?.toLowerCase() === 'stocks' ||
    assetDetail?.type_name?.toLowerCase() === 'etfs'
  
  // 주식/ETF는 sparkline-price 사용, 그 외는 기존 useDelayedQuoteLast 사용
  const delayedQuoteQuery = useDelayedQuoteLast(
    assetIdentifier,
    {
      dataInterval: '15m',
      dataSource: dataSource
    },
    {
      refetchInterval: 15 * 60 * 1000,
      staleTime: 0,
      gcTime: 0,
      enabled: !!assetIdentifier && !isStocksOrEtf,
    }
  )
  
  const sparklineQuery = useSparklinePrice(
    assetIdentifier,
    { dataInterval: '15m', days: 1, dataSource },
    {
      refetchInterval: 15 * 60 * 1000,
      staleTime: 0,
      gcTime: 0,
      enabled: !!assetIdentifier && isStocksOrEtf,
    }
  )
  
  // 주식/ETF인 경우 sparkline-price에서 최신 quote 추출, 그 외는 기존 delayed quote 사용
  let quoteData: any = null
  if (isStocksOrEtf && sparklineQuery.data) {
    // sparkline-price 응답에서 첫 번째 quote를 사용 (최신 데이터)
    const quotes = sparklineQuery.data?.quotes || []
    if (quotes.length > 0) {
      quoteData = {
        quote: quotes[0],
        timestamp: quotes[0]?.timestamp_utc
      }
    }
  } else if (!isStocksOrEtf) {
    quoteData = delayedQuoteQuery.data
  }
  
  const isLoading = isStocksOrEtf ? sparklineQuery.isLoading : delayedQuoteQuery.isLoading
  const error = isStocksOrEtf ? sparklineQuery.error : delayedQuoteQuery.error

  if (isLoading) {
    return (
      <ComponentCard title="Delayed Price (15min)" className={className}>
        <div className="animate-pulse">
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </ComponentCard>
    )
  }

  if (error) {
    return (
      <ComponentCard title="Delayed Price (15min)" className={className}>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">Failed to load delayed price data</p>
        </div>
      </ComponentCard>
    )
  }

  // API 응답 구조: { quote: {...}, timestamp: "..." }
  const quote = quoteData?.quote || quoteData

  // 디버깅: 실제 API 응답 확인
  if (quoteData && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log('[RealtimeQuotesPriceWidget] API Response:', {
      assetIdentifier,
      isStocksOrEtf,
      quoteData,
      quote,
      price: quote?.price
    })
  }

  if (!quote) {
    return (
      <ComponentCard title="Delayed Price (15min)" className={className}>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">No delayed price data available</p>
        </div>
      </ComponentCard>
    )
  }

  // API에서 받은 값 사용
  const price = quote.price || 0
  // sparkline-price는 change_amount/change_percent를 제공하지 않을 수 있으므로 기본값 사용
  const changeAmount = quote.change_amount ?? 0
  const changePercent = quote.change_percent ?? 0
  const volume = quote.volume || 0
  const timestamp = quote.timestamp_utc || quoteData?.timestamp || new Date().toISOString()

  // 시간 포맷팅 (UTC 시간 그대로 표시)
  const formatTime = (timestamp: string) => {
    try {
      // ISO 형식에서 직접 시간 부분 추출 (예: "2025-11-04T11:30:00" -> "11:30:00")
      if (timestamp.includes('T')) {
        const timePart = timestamp.split('T')[1]
        // 초 및 밀리초 제거
        return timePart.split('.')[0].substring(0, 8) // HH:MM:SS 형식
      }
      // 다른 형식인 경우 Date 객체로 파싱
      const date = new Date(timestamp)
      // UTC 시간으로 포맷팅
      const hours = date.getUTCHours().toString().padStart(2, '0')
      const minutes = date.getUTCMinutes().toString().padStart(2, '0')
      const seconds = date.getUTCSeconds().toString().padStart(2, '0')
      return `${hours}:${minutes}:${seconds}`
    } catch {
      return timestamp
    }
  }

  return (
    <ComponentCard title="Delayed Price (15min)" className={className}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 border rounded-lg">
          <div className={`text-2xl font-bold ${changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${price.toLocaleString(undefined, { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 6 
            })}
          </div>
          <div className="text-sm text-gray-500">Price</div>
        </div>
        
        <div className="text-center p-4 border rounded-lg">
          <div className={`text-lg font-semibold ${changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(4)}%
          </div>
          <div className="text-sm text-gray-500">Change</div>
          {changeAmount !== 0 && (
            <div className={`text-xs mt-1 ${changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {changeAmount >= 0 ? '+' : ''}${changeAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 8
              })}
            </div>
          )}
        </div>
        
        <div className="text-center p-4 border rounded-lg">
          <div className="text-sm font-medium">
            {formatTime(timestamp)}
          </div>
          <div className="text-sm text-gray-500">Last Updated</div>
          {volume > 0 && (
            <div className="text-xs mt-1 text-gray-400">
              Vol: {volume.toLocaleString('en-US')}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
          <span className="text-xs text-gray-500">15-minute delayed data</span>
        </div>
      </div>
    </ComponentCard>
  )
}

export default RealtimeQuotesPriceWidget

