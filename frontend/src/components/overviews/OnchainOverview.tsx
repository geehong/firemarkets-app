'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import { useOnchain, useOnchainMetrics } from '@/hooks/useOnchain'
import { useSocket } from '@/hooks/useSocket'
import ComponentCard from '@/components/common/ComponentCard'
import Badge from '@/components/ui/badge/Badge'
import Alert from '@/components/ui/alert/Alert'
import Button from '@/components/ui/button/Button'
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  PieChartIcon, 
  BoltIcon,
  InfoIcon,
  TimeIcon
} from '@/icons'
import OnChainChart from '@/components/charts/onchaincharts/OnChainChart'
import HalvingChart from '@/components/charts/onchaincharts/HalvingChart'
import HistoryTable from '@/components/tables/HistoryTable'

interface OnchainOverviewProps {
  className?: string
  initialMetrics?: any[]
  initialMetricConfig?: any
}

const OnchainOverview: React.FC<OnchainOverviewProps> = ({ className, initialMetrics, initialMetricConfig }) => {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)
  
  // URL 경로에서 메트릭 ID 가져오기
  const getMetricIdFromPath = () => {
    // /onchain/nupl -> nupl
    const pathParts = pathname.split('/')
    const metricFromPath = pathParts[pathParts.length - 1]
    
    // 경로에서 메트릭을 찾을 수 없으면 쿼리 파라미터에서 가져오기
    // halving 관련 경로는 메트릭이 아님
    if (
      metricFromPath === 'onchain' ||
      metricFromPath === 'halving' ||
      metricFromPath === 'halving-bull-chart' ||
      !metricFromPath
    ) {
      return searchParams.get('metric') || 'mvrv_z_score'
    }
    
    return metricFromPath
  }
  
  const metricId = getMetricIdFromPath()
  // halving 전용 라우트 또는 쿼리 파라미터로 진입한 경우
  const isHalvingMode = pathname.includes('/onchain/halving') || (searchParams.get('halving') === 'true')
  
  // 온체인 메트릭 목록 및 데이터 (initialData가 있으면 사용)
  const { metrics, loading: metricsLoading, error: metricsError } = useOnchainMetrics({ initialData: initialMetrics })
  // halving 모드에서는 안전한 기본 메트릭으로 데이터 요청 (또는 훅 내부 skip이 있다면 사용)
  const safeMetricId = isHalvingMode ? 'mvrv_z_score' : metricId
  const { data: onchainData, loading: dataLoading, error: dataError } = useOnchain(safeMetricId, '1y')
  
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
        <ComponentCard title="Loading...">
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2">
              <TimeIcon className="h-4 w-4 animate-spin" />
              <span>Loading metrics...</span>
            </div>
          </div>
        </ComponentCard>
      </div>
    )
  }

  if (metricsError) {
    return (
      <div className={className}>
        <Alert 
          variant="error"
          title="Error"
          message={`Failed to load onchain metrics: ${metricsError.message}`}
        />
      </div>
    )
  }

  if (dataLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <ComponentCard title="Loading...">
          <div className="flex items-center justify-center h-96">
            <div className="flex items-center gap-2">
              <TimeIcon className="h-4 w-4 animate-spin" />
              <span>{metricConfig.loadingText || 'Loading data...'}</span>
            </div>
          </div>
        </ComponentCard>
      </div>
    )
  }

  if (dataError) {
    return (
      <div className={className}>
        <Alert 
          variant="error"
          title="Error"
          message={`Failed to load onchain data: ${dataError.message}`}
        />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 메트릭 선택 및 헤더 */}
      <ComponentCard title={isHalvingMode ? 'Bitcoin Halving Analysis' : `${cleanMetricNameValue} Analysis`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <p className="text-gray-500">
              {isHalvingMode 
                ? 'Historical Bitcoin halving cycles and price analysis'
                : `Bitcoin onchain metrics correlation with price movements`
              }
            </p>
            {isConnected && (
              <div className="mt-2">
                <Badge color="success">
                  Live
                </Badge>
              </div>
            )}
          </div>
          {!isHalvingMode && (
            <div className="flex items-center gap-2">
              <select 
                value={metricId} 
                onChange={(e) => {
                  const url = new URL(window.location.href)
                  url.searchParams.set('metric', e.target.value)
                  window.history.pushState({}, '', url.toString())
                  window.location.reload()
                }}
                className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {metrics.map((metric) => (
                  <option key={metric.id} value={metric.id}>
                    {cleanMetricName(metric.name)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </ComponentCard>

      {isHalvingMode ? (
        // 반감기 분석 모드
        <div className="space-y-6">
          {/* 반감기 차트 */}
          <ComponentCard title="Bitcoin Halving Price Comparison">
            <HalvingChart
              title="Bitcoin Halving Price Analysis"
              height={600}
              showRangeSelector={true}
              showExporting={true}
            />
          </ComponentCard>

          {/* 반감기 정보 카드 */}
          <ComponentCard title="Halving Information">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">1st</div>
                <div className="text-sm text-gray-500">Halving</div>
                <div className="text-xs mt-1">Nov 28, 2012</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">2nd</div>
                <div className="text-sm text-gray-500">Halving</div>
                <div className="text-xs mt-1">Jul 9, 2016</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">3rd</div>
                <div className="text-sm text-gray-500">Halving</div>
                <div className="text-xs mt-1">May 11, 2020</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">4th</div>
                <div className="text-sm text-gray-500">Halving</div>
                <div className="text-xs mt-1">Apr 20, 2024</div>
              </div>
            </div>
          </ComponentCard>

          {/* Bitcoin 히스토리 데이터 테이블 */}
          <ComponentCard title="Bitcoin Historical Data">
            <HistoryTable
              assetIdentifier="BTCUSDT"
              initialInterval="1d"
              showVolume={true}
              showChangePercent={true}
              height={400}
            />
          </ComponentCard>
        </div>
      ) : (
        // 상관관계 분석 모드
        <div className="space-y-6">
          {/* 상관관계 차트 */}
          <ComponentCard title={metricConfig.title || `Bitcoin Price vs ${cleanMetricNameValue} Correlation`}>
            <OnChainChart
              assetId="BTCUSDT"
              title={metricConfig.title || `Bitcoin Price vs ${cleanMetricNameValue} Correlation`}
              height={600}
              showRangeSelector={true}
              showStockTools={false}
              showExporting={true}
              metricId={metricId}
            />
          </ComponentCard>

          {/* 데이터 정보 카드 */}
          <ComponentCard title={`${cleanMetricNameValue} Analysis Information`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">What is {cleanMetricNameValue}?</h4>
                <p className="text-sm text-gray-500 leading-relaxed">
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
          </ComponentCard>

          {/* 상관관계 데이터 표시 */}
          {onchainData?.correlation && (
            <ComponentCard title="Current Correlation">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">
                  {onchainData.correlation > 0 ? (
                    <span className="text-green-600">+{onchainData.correlation.toFixed(3)}</span>
                  ) : (
                    <span className="text-red-600">{onchainData.correlation.toFixed(3)}</span>
                  )}
                </div>
                <p className="text-gray-500">
                  Correlation between Bitcoin price and {cleanMetricNameValue}
                </p>
                <div className="mt-2">
                  <Badge 
                    color={Math.abs(onchainData.correlation) > 0.7 ? "success" : "light"}
                  >
                    {Math.abs(onchainData.correlation) > 0.7 ? "Strong" : 
                     Math.abs(onchainData.correlation) > 0.5 ? "Moderate" : 
                     Math.abs(onchainData.correlation) > 0.3 ? "Weak" : "No"} Correlation
                  </Badge>
                </div>
              </div>
            </ComponentCard>
          )}
        </div>
      )}
    </div>
  )
}

export default OnchainOverview
