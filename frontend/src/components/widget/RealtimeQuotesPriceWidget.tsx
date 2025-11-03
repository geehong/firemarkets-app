'use client'

import React from 'react'
import { useQuotesPrice } from '@/hooks/useRealtime'
import ComponentCard from '@/components/common/ComponentCard'

interface RealtimeQuotesPriceWidgetProps {
  assetIdentifier: string
  className?: string
}

const RealtimeQuotesPriceWidget: React.FC<RealtimeQuotesPriceWidgetProps> = ({
  assetIdentifier,
  className = ''
}) => {
  // 15분마다 리프레시하도록 설정 (900,000ms)
  // refetchInterval으로 자동 리프레시하며, 이전 데이터는 자동으로 리셋됨
  const { data: quotesData, isLoading, error } = useQuotesPrice(
    [assetIdentifier],
    {
      refetchInterval: 15 * 60 * 1000, // 15분 = 900,000ms마다 자동 리프레시
      staleTime: 0, // 데이터를 즉시 stale로 표시하여 항상 최신 데이터 사용
      gcTime: 0, // 캐시 정리 시간 0으로 설정하여 이전 데이터 즉시 리셋
    }
  )

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

  // quotesData는 배열 형태일 가능성이 높음
  const quote = Array.isArray(quotesData) 
    ? quotesData.find((q: any) => q.asset_identifier === assetIdentifier)
    : quotesData

  if (!quote) {
    return (
      <ComponentCard title="Delayed Price (15min)" className={className}>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">No delayed price data available</p>
        </div>
      </ComponentCard>
    )
  }

  const price = quote.price || quote.close || 0
  const change = quote.change || quote.change_percent || 0
  const changePercent = quote.change_percent || (change / (price - change) * 100) || 0
  const volume = quote.volume || 0
  const timestamp = quote.timestamp || new Date().toISOString()

  // 시간 포맷팅
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toISOString().split('T')[1].split('.')[0] // HH:MM:SS 형식
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
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
          </div>
          <div className="text-sm text-gray-500">Change</div>
          {change !== 0 && (
            <div className={`text-xs mt-1 ${changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}${Math.abs(change).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6
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

