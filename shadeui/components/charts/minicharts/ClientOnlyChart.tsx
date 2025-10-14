"use client"

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Highcharts 공식 권장사항에 따른 클라이언트 전용 차트 컴포넌트들
const MiniPriceChart = dynamic(() => import('./MiniPriceChart'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] bg-gray-800 rounded animate-pulse flex items-center justify-center text-gray-400">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
        <div>차트 로딩 중...</div>
      </div>
    </div>
  )
})

const MiniPriceCryptoChart = dynamic(() => import('./MiniPriceCryptoChart'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] bg-gray-800 rounded animate-pulse flex items-center justify-center text-gray-400">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
        <div>암호화폐 차트 로딩 중...</div>
      </div>
    </div>
  )
})

const MiniPriceCommoditiesChart = dynamic(() => import('./MiniPriceCommoditiesChart'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] bg-gray-800 rounded animate-pulse flex items-center justify-center text-gray-400">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
        <div>상품 차트 로딩 중...</div>
      </div>
    </div>
  )
})

const MiniPriceStocksEtfChart = dynamic(() => import('./MiniPriceStocksEtfChart'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] bg-gray-800 rounded animate-pulse flex items-center justify-center text-gray-400">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
        <div>주식/ETF 차트 로딩 중...</div>
      </div>
    </div>
  )
})

interface ClientOnlyChartProps {
  type: 'crypto' | 'commodities' | 'stocks' | 'default'
  containerId: string
  assetIdentifier: string
  chartType?: string
  useWebSocket?: boolean
  apiInterval?: string | null
  marketHours?: boolean
}

export default function ClientOnlyChart({
  type,
  containerId,
  assetIdentifier,
  chartType,
  useWebSocket,
  apiInterval,
  marketHours
}: ClientOnlyChartProps) {
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
      <div className="h-[300px] bg-gray-800 rounded animate-pulse flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
          <div>차트 초기화 중...</div>
        </div>
      </div>
    )
  }

  const commonProps = {
    containerId,
    assetIdentifier,
    chartType,
    useWebSocket,
    apiInterval,
    marketHours
  }

  switch (type) {
    case 'crypto':
      return <MiniPriceCryptoChart {...commonProps} />
    case 'commodities':
      return <MiniPriceCommoditiesChart {...commonProps} />
    case 'stocks':
      return <MiniPriceStocksEtfChart {...commonProps} />
    default:
      return <MiniPriceChart {...commonProps} />
  }
}
