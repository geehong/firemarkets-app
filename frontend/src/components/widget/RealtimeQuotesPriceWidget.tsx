'use client'

import React from 'react'
import { useDelayedQuoteLast } from '@/hooks/useRealtime'
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
  
  // 15분마다 리프레시하도록 설정 (900,000ms)
  // refetchInterval으로 자동 리프레시하며, 이전 데이터는 자동으로 리셋됨
  const { data: quoteData, isLoading, error } = useDelayedQuoteLast(
    assetIdentifier,
    {
      dataInterval: '15m',
      dataSource: dataSource
    },
    {
      refetchInterval: 15 * 60 * 1000, // 15분 = 900,000ms마다 자동 리프레시
      staleTime: 0, // 데이터를 즉시 stale로 표시하여 항상 최신 데이터 사용
      gcTime: 0, // 캐시 정리 시간 0으로 설정하여 이전 데이터 즉시 리셋
      enabled: !!assetIdentifier, // assetIdentifier가 있을 때만 실행
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

  // API 응답 구조: { quote: {...}, timestamp: "..." }
  const quote = quoteData?.quote || quoteData

  if (!quote) {
    return (
      <ComponentCard title="Delayed Price (15min)" className={className}>
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">No delayed price data available</p>
        </div>
      </ComponentCard>
    )
  }

  // API에서 받은 값 사용 (자체 계산 제거)
  const price = quote.price || 0
  const changeAmount = quote.change_amount || 0
  const changePercent = quote.change_percent || 0
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

