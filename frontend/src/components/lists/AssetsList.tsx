'use client'

import React, { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTreemapLive } from '@/hooks/useAssets'
import { useRealtimePrices } from '@/hooks/useSocket'
import ComponentCard from '@/components/common/ComponentCard'
import Badge from '@/components/ui/badge/Badge'
import AssetsListTable from '@/components/tables/AssetsListTable'
import { filterExcludedAssets } from '@/constants/excludedAssets'
import { 
  ArrowRightIcon,
  DollarLineIcon,
  PieChartIcon
} from '@/icons'

interface AssetsListProps {
  className?: string
  showHeader?: boolean
}

const AssetsList: React.FC<AssetsListProps> = ({ className, showHeader = true }) => {
  const searchParams = useSearchParams()
  const typeNameFromQuery = searchParams?.get('type_name')
  
  // Removed search/sort controls per request

  // TreeMap Live 데이터 사용 (AssetsListTable과 동일한 hook 사용)
  const { data: treemapData, isLoading: liveLoading, error: liveError } = useTreemapLive(
    typeNameFromQuery 
      ? { 
          type_name: typeNameFromQuery,
          sort_by: 'market_cap',
          sort_order: 'desc'
        } 
      : {
          sort_by: 'market_cap',
          sort_order: 'desc'
        }
  )
  
  // 실시간 가격 데이터 (첫 번째 자산에 대해서만)
  const firstAsset = (treemapData as any)?.data?.[0]
  const { latestPrice, isConnected } = useRealtimePrices(firstAsset?.ticker || '')

  // 헤더/상단 카운트 표시에 사용 (테이블은 별도 API 사용)
  const filteredAssets = useMemo(() => {
    const anyData: any = treemapData as any
    let arr = Array.isArray(anyData?.data) ? (anyData.data as any[]) : []
    
    // 제외 목록 필터링
    arr = filterExcludedAssets(arr)
    
    // 타입 필터링
    if (typeNameFromQuery) {
      const wanted = String(typeNameFromQuery)
      arr = arr.filter((asset: any) => (asset.type_name || asset.asset_type || asset.category) === wanted)
    }
    
    // 시총으로 정렬 (내림차순)
    return arr.sort((a: any, b: any) => {
      const marketCapA = parseFloat(a.market_cap) || 0
      const marketCapB = parseFloat(b.market_cap) || 0
      return marketCapB - marketCapA
    })
  }, [treemapData, typeNameFromQuery])

  if (liveLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <ComponentCard title="Loading...">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </ComponentCard>
      </div>
    )
  }

  if (liveError) {
    return (
      <div className={className}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                Failed to load assets: {liveError.message}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 헤더 - showHeader가 true일 때만 표시 */}
      {showHeader && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {typeNameFromQuery ? `${typeNameFromQuery} Assets` : 'All Assets'}
            </h2>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">
                {filteredAssets.length} assets found
              </p>
              {isConnected && (
                <Badge color="success">
                  Live Data
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter section removed */}

      {/* AssetsListTable 컴포넌트 사용 */}
      <ComponentCard title="Assets Overview">
        <AssetsListTable typeName={typeNameFromQuery} />
      </ComponentCard>
    </div>
  )
}

export default AssetsList
