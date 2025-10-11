"use client"

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Highcharts 공식 권장사항에 따른 클라이언트 전용 OHLCV 차트 컴포넌트
const OHLCVChart = dynamic(() => import('./OHLCVChart'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] bg-gray-800 rounded animate-pulse flex items-center justify-center text-gray-400">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
        <div className="text-lg">OHLCV 차트 로딩 중...</div>
      </div>
    </div>
  )
})

interface ClientOnlyOHLCVChartProps {
  assetIdentifier: string
  dataInterval?: string
  height?: number
  showVolume?: boolean
  showRangeSelector?: boolean
  showStockTools?: boolean
  showExporting?: boolean
  title?: string
  subtitle?: string
  backgroundColor?: string
  volumeColor?: string
  volumeOpacity?: number
  maxDataPoints?: number
  onDataLoad?: (data: { ohlcData: number[][]; volumeData: number[][]; totalCount: number }) => void
  onError?: (error: string) => void
  customOptions?: any
  externalOhlcvData?: any[] | null
  useIntradayApi?: boolean
}

export default function ClientOnlyOHLCVChart(props: ClientOnlyOHLCVChartProps) {
  const [isClient, setIsClient] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Highcharts 공식 권장사항: 클라이언트 사이드 렌더링 확인
  useEffect(() => {
    setIsClient(true)
    // DOM이 완전히 마운트된 후 차트 렌더링
    const timer = setTimeout(() => {
      setIsMounted(true)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // 클라이언트 사이드 렌더링이 완료되지 않은 경우
  if (!isClient || !isMounted) {
    return (
      <div className="h-[600px] bg-gray-800 rounded animate-pulse flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
          <div className="text-lg">OHLCV 차트 초기화 중...</div>
        </div>
      </div>
    )
  }

  return <OHLCVChart {...props} />
}
