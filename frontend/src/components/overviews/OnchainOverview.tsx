'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useOnchain, useOnchainMetrics } from '@/hooks/useOnchain'
import { useSocket } from '@/hooks/useSocket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Activity,
  Info,
  RefreshCw
} from 'lucide-react'
import OnChainChart from '@/components/charts/onchaincharts/OnChainChart'
import HalvingChart from '@/components/charts/onchaincharts/HalvingChart'
import HistoryTable from '@/components/tables/HistoryTable'

interface OnchainOverviewProps {
  className?: string
}

const OnchainOverview: React.FC<OnchainOverviewProps> = ({ className }) => {
  const searchParams = useSearchParams()
  const [isMobile, setIsMobile] = useState(false)
  
  // URL에서 메트릭 ID 가져오기, 없으면 기본값 사용
  const metricId = searchParams.get('metric') || 'mvrv_z_score'
  const isHalvingMode = searchParams.get('halving') === 'true'
  
  // 온체인 메트릭 목록 및 데이터
  const { metrics, loading: metricsLoading, error: metricsError } = useOnchainMetrics()
  const { data: onchainData, loading: dataLoading, error: dataError } = useOnchain(metricId, '1y')
  
  // WebSocket 연결 상태
  const { isConnected } = useSocket()

  // 화면 크기 변경 감지
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 메트릭 이름에서 괄호 부분 제거하는 함수
  const cleanMetricName = (name: string) => {
    if (!name) return name
    return name.replace(/\s*\([^)]*\)/g, '')
  }

  // 현재 메트릭 정보 찾기
  const metricConfig = metrics.find(m => m.id === metricId) || {
    name: 'MVRV-Z',
    description: 'Bitcoin market value to realized value ratio',
    title: 'Bitcoin Price vs MVRV-Z Correlation',
    loadingText: 'Loading MVRV-Z data...'
  }

  const cleanMetricNameValue = cleanMetricName(metricConfig.name)

  if (metricsLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading metrics...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (metricsError) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load onchain metrics: {metricsError.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (dataLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-96">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{metricConfig.loadingText || 'Loading data...'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (dataError) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load onchain data: {dataError.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 메트릭 선택 및 헤더 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Activity className="h-6 w-6" />
                {isHalvingMode ? 'Bitcoin Halving Analysis' : `${cleanMetricNameValue} Analysis`}
              </CardTitle>
              <div className="flex items-center gap-2">
                <p className="text-muted-foreground mt-1">
                  {isHalvingMode 
                    ? 'Historical Bitcoin halving cycles and price analysis'
                    : `Bitcoin onchain metrics correlation with price movements`
                  }
                </p>
                {isConnected && (
                  <Badge variant="outline" className="text-green-600">
                    Live
                  </Badge>
                )}
              </div>
            </div>
            {!isHalvingMode && (
              <div className="flex items-center gap-2">
                <Select value={metricId} onValueChange={(value) => {
                  const url = new URL(window.location.href)
                  url.searchParams.set('metric', value)
                  window.history.pushState({}, '', url.toString())
                  window.location.reload()
                }}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    {metrics.map((metric) => (
                      <SelectItem key={metric.id} value={metric.id}>
                        {cleanMetricName(metric.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {isHalvingMode ? (
        // 반감기 분석 모드
        <div className="space-y-6">
          {/* 반감기 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Bitcoin Halving Price Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HalvingChart
                title="Bitcoin Halving Price Analysis"
                height={600}
                showRangeSelector={true}
                showExporting={true}
              />
            </CardContent>
          </Card>

          {/* 반감기 정보 카드 */}
          <Card>
            <CardHeader>
              <CardTitle>Halving Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">1st</div>
                  <div className="text-sm text-muted-foreground">Halving</div>
                  <div className="text-xs mt-1">Nov 28, 2012</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">2nd</div>
                  <div className="text-sm text-muted-foreground">Halving</div>
                  <div className="text-xs mt-1">Jul 9, 2016</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">3rd</div>
                  <div className="text-sm text-muted-foreground">Halving</div>
                  <div className="text-xs mt-1">May 11, 2020</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">4th</div>
                  <div className="text-sm text-muted-foreground">Halving</div>
                  <div className="text-xs mt-1">Apr 20, 2024</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bitcoin 히스토리 데이터 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle>Bitcoin Historical Data</CardTitle>
            </CardHeader>
            <CardContent>
              <HistoryTable
                assetIdentifier="BTCUSDT"
                initialInterval="1d"
                showVolume={true}
                showChangePercent={true}
                height={400}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        // 상관관계 분석 모드
        <div className="space-y-6">
          {/* 상관관계 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {metricConfig.title || `Bitcoin Price vs ${cleanMetricNameValue} Correlation`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OnChainChart
                assetId="BTCUSDT"
                title={metricConfig.title || `Bitcoin Price vs ${cleanMetricNameValue} Correlation`}
                height={600}
                showRangeSelector={true}
                showStockTools={false}
                showExporting={true}
                metricId={metricId}
              />
            </CardContent>
          </Card>

          {/* 데이터 정보 카드 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                {cleanMetricNameValue} Analysis Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">What is {cleanMetricNameValue}?</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {metricConfig.description}. Correlation analysis measures the relationship between 
                    Bitcoin price and {cleanMetricNameValue}. A positive correlation means they move 
                    together, while a negative correlation means they move in opposite directions. 
                    The correlation coefficient ranges from -1 to +1.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Correlation Interpretation</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span><strong>Strong Positive (0.7-1.0):</strong> High correlation, similar movements</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span><strong>Moderate Positive (0.5-0.7):</strong> Moderate correlation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span><strong>Weak Positive (0.3-0.5):</strong> Low correlation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <span><strong>No Correlation (-0.3 to 0.3):</strong> Independent movements</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span><strong>Negative Correlations:</strong> Opposite movements</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 상관관계 데이터 표시 */}
          {onchainData?.correlation && (
            <Card>
              <CardHeader>
                <CardTitle>Current Correlation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">
                    {onchainData.correlation > 0 ? (
                      <span className="text-green-600">+{onchainData.correlation.toFixed(3)}</span>
                    ) : (
                      <span className="text-red-600">{onchainData.correlation.toFixed(3)}</span>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Correlation between Bitcoin price and {cleanMetricNameValue}
                  </p>
                  <Badge 
                    variant={Math.abs(onchainData.correlation) > 0.7 ? "default" : "secondary"}
                    className="mt-2"
                  >
                    {Math.abs(onchainData.correlation) > 0.7 ? "Strong" : 
                     Math.abs(onchainData.correlation) > 0.5 ? "Moderate" : 
                     Math.abs(onchainData.correlation) > 0.3 ? "Weak" : "No"} Correlation
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default OnchainOverview
