"use client"

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const OnChainChart = dynamic(() => import('./OnChainChart'), { 
  ssr: false, 
  loading: () => (
    <div className="bg-gray-800 rounded-lg p-6 flex items-center justify-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <div className="text-gray-300 text-sm">온체인 차트 로딩 중...</div>
      </div>
    </div>
  )
})

const HalvingChart = dynamic(() => import('./HalvingChart'), { 
  ssr: false, 
  loading: () => (
    <div className="bg-gray-800 rounded-lg p-6 flex items-center justify-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <div className="text-gray-300 text-sm">하빙 차트 로딩 중...</div>
      </div>
    </div>
  )
})

interface ClientOnlyOnChainChartProps {
  type: 'onchain' | 'halving'
  assetId?: string
  title?: string
  height?: number
  showRangeSelector?: boolean
  showStockTools?: boolean
  showExporting?: boolean
  metricId?: string
  singlePeriod?: number | null
}

export default function ClientOnlyOnChainChart(props: ClientOnlyOnChainChartProps) {
  const [isClient, setIsClient] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const timer = setTimeout(() => {
      setIsMounted(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  if (!isClient || !isMounted) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-32 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-24 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  const { type, ...chartProps } = props

  switch (type) {
    case 'onchain':
      return <OnChainChart {...chartProps} />
    case 'halving':
      return <HalvingChart {...chartProps} />
    default:
      return <OnChainChart {...chartProps} />
  }
}

