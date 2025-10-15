'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAssetOverview } from '@/hooks/useAssetOverview'
import { useRealtimePrices } from '@/hooks/useSocket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Globe, Building2 } from 'lucide-react'
import OHLCVChart from '@/components/charts/ohlcvcharts/OHLCVChart'
import HistoryTable from '@/components/tables/HistoryTable'

interface AssetOverviewProps {
  className?: string
}

const AssetOverview: React.FC<AssetOverviewProps> = ({ className }) => {
  const { assetId } = useParams()
  const [isMobile, setIsMobile] = useState(false)
  
  // 자산 개요 데이터 fetching
  const { data: overviewData, loading: overviewLoading, error: overviewError } = useAssetOverview(assetId as string)
  
  // 실시간 가격 데이터
  const { latestPrice, isConnected } = useRealtimePrices(assetId as string)

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
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (overviewError) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load asset overview: {overviewError.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!overviewData) {
    return (
      <div className={className}>
        <Alert>
          <AlertDescription>
            No asset data available for the selected asset.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const asset = overviewData

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 자산 헤더 정보 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                {asset.name}
                <Badge variant="secondary">{asset.ticker}</Badge>
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                {asset.type_name} • {asset.exchange}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={asset.is_active ? "default" : "secondary"}>
                {asset.is_active ? "Active" : "Inactive"}
              </Badge>
              {asset.currency && (
                <Badge variant="outline">{asset.currency}</Badge>
              )}
              {isConnected && (
                <Badge variant="outline" className="text-green-600">
                  Live
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {asset.description && (
            <p className="text-sm text-muted-foreground mb-4">
              {asset.description}
            </p>
          )}
          
          {/* 자산 타입별 추가 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {asset.type_name === 'Stocks' && (
              <>
                {asset.company_name && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Company:</span>
                    <span className="text-sm">{asset.company_name}</span>
                  </div>
                )}
                {asset.sector && (
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Sector:</span>
                    <span className="text-sm">{asset.sector}</span>
                  </div>
                )}
                {asset.industry && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Industry:</span>
                    <span className="text-sm">{asset.industry}</span>
                  </div>
                )}
                {asset.country && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
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
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
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
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">ETF Name:</span>
                    <span className="text-sm">{asset.etf_name}</span>
                  </div>
                )}
                {asset.expense_ratio && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
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
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Type:</span>
                    <span className="text-sm">{asset.commodity_type}</span>
                  </div>
                )}
                {asset.unit && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Unit:</span>
                    <span className="text-sm">{asset.unit}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 실시간 가격 정보 */}
      {latestPrice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Real-time Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ${latestPrice.price.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 6 
                  })}
                </div>
                <div className="text-sm text-muted-foreground">Current Price</div>
              </div>
              {latestPrice.volume && (
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-lg font-semibold">
                    {latestPrice.volume.toLocaleString(undefined, { 
                      notation: 'compact',
                      maximumFractionDigits: 2 
                    })}
                  </div>
                  <div className="text-sm text-muted-foreground">Volume</div>
                </div>
              )}
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm font-medium">
                  {new Date(latestPrice.timestamp).toLocaleTimeString()}
                </div>
                <div className="text-sm text-muted-foreground">Last Updated</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 자산 상세 정보 탭 */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Asset ID:</span>
                      <span>{asset.asset_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span>{asset.type_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Exchange:</span>
                      <span>{asset.exchange}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Currency:</span>
                      <span>{asset.currency}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Timestamps</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(asset.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Updated:</span>
                      <span>{new Date(asset.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="charts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Price Charts</CardTitle>
            </CardHeader>
            <CardContent>
              <OHLCVChart
                assetIdentifier={assetId as string}
                dataInterval="1d"
                height={600}
                showVolume={true}
                showRangeSelector={true}
                showExporting={true}
                title={`${asset.name} Price Chart`}
                subtitle={`${asset.exchange} • ${asset.currency}`}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historical Data</CardTitle>
            </CardHeader>
            <CardContent>
              <HistoryTable
                assetIdentifier={assetId as string}
                initialInterval="1d"
                showVolume={true}
                showChangePercent={true}
                height={400}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AssetOverview
