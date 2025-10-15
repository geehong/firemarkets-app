'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePerformanceTreeMap } from '@/hooks/useAssets'
import { useRealtimePrices } from '@/hooks/useSocket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter,
  ExternalLink,
  DollarSign,
  BarChart3
} from 'lucide-react'

interface AssetItem {
  asset_id: number
  ticker: string
  name: string
  asset_type: string
  type_name?: string
  category?: string
  market_cap: number | null
  logo_url?: string
  price_change_percentage_24h: number | null
  current_price: number | null
  market_status: string
  realtime_updated_at?: string
  daily_data_updated_at?: string
}

interface AssetsListProps {
  className?: string
}

const AssetsList: React.FC<AssetsListProps> = ({ className }) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const typeNameFromQuery = searchParams.get('type_name')
  
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'market_cap' | 'name' | 'price_change'>('market_cap')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Performance TreeMap 데이터 사용
  const { data: treemapData, loading: liveLoading, error: liveError } = usePerformanceTreeMap()
  
  // 실시간 가격 데이터 (첫 번째 자산에 대해서만)
  const firstAsset = paginatedAssets[0]
  const { latestPrice, isConnected } = useRealtimePrices(firstAsset?.ticker || '')

  // 필터링 및 정렬된 자산 목록
  const filteredAssets = useMemo(() => {
    if (!treemapData) return []
    
    let filtered = treemapData
    
    // type_name 필터 적용
    if (typeNameFromQuery) {
      filtered = filtered.filter((asset: AssetItem) => 
        (asset.type_name || asset.asset_type || asset.category) === typeNameFromQuery
      )
    }
    
    // 검색어 필터 적용
    if (searchTerm) {
      filtered = filtered.filter((asset: AssetItem) =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.ticker.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // 정렬 적용
    filtered.sort((a: AssetItem, b: AssetItem) => {
      let aValue: number | string
      let bValue: number | string
      
      switch (sortBy) {
        case 'market_cap':
          aValue = a.market_cap || 0
          bValue = b.market_cap || 0
          break
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'price_change':
          aValue = a.price_change_percentage_24h || 0
          bValue = b.price_change_percentage_24h || 0
          break
        default:
          aValue = a.market_cap || 0
          bValue = b.market_cap || 0
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      return sortOrder === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })
    
    return filtered
  }, [treemapData, typeNameFromQuery, searchTerm, sortBy, sortOrder])

  // 페이지네이션
  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedAssets = filteredAssets.slice(startIndex, endIndex)

  const handleAssetClick = (asset: AssetItem) => {
    router.push(`/assets/${asset.ticker}`)
  }

  const formatMarketCap = (marketCap: number | null) => {
    if (!marketCap) return 'N/A'
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`
    if (marketCap >= 1e3) return `$${(marketCap / 1e3).toFixed(2)}K`
    return `$${marketCap.toFixed(2)}`
  }

  const formatPrice = (price: number | null) => {
    if (!price) return 'N/A'
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
  }

  const formatPercentage = (percentage: number | null) => {
    if (percentage === null) return 'N/A'
    const formatted = percentage.toFixed(2)
    return percentage >= 0 ? `+${formatted}%` : `${formatted}%`
  }

  if (liveLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (liveError) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load assets: {liveError.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 헤더 */}
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
              <Badge variant="outline" className="text-green-600">
                Live Data
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market_cap">Market Cap</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="price_change">24h Change</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 자산 목록 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Assets Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>24h Change</TableHead>
                  <TableHead>Market Cap</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAssets.map((asset: AssetItem) => (
                  <TableRow key={asset.asset_id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {asset.logo_url && (
                          <img 
                            src={asset.logo_url} 
                            alt={`${asset.name} logo`}
                            className="h-8 w-8 rounded"
                          />
                        )}
                        <div>
                          <div className="font-medium">{asset.name}</div>
                          <div className="text-sm text-muted-foreground">{asset.ticker}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {asset.type_name || asset.asset_type || asset.category || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        {formatPrice(asset.current_price)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 ${
                        (asset.price_change_percentage_24h || 0) >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {(asset.price_change_percentage_24h || 0) >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {formatPercentage(asset.price_change_percentage_24h)}
                      </div>
                    </TableCell>
                    <TableCell>{formatMarketCap(asset.market_cap)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={asset.market_status === 'open' ? 'default' : 'secondary'}
                      >
                        {asset.market_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAssetClick(asset)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredAssets.length)} of {filteredAssets.length} assets
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AssetsList
