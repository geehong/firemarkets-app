import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CAlert,
  CBadge,
} from '@coreui/react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import OnChainChart from '../../components/charts/onchainchart/OnChainChart'
import HalvingChart from '../../components/charts/onchainchart/HalvingChart'
import OHLCVTable from '../../components/tables/OHLCVTable'
import CardTools from '../../components/common/CardTools'
import '../../components/common/CardTools.css'
import { useAPI } from '../../hooks/useAPI'

const OnchainDataOverviews = ({ 
  chartData = null,
  loading = false,
  error = null,
  correlation = null
}) => {
  console.log('OnchainDataOverviews component loaded')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [metrics, setMetrics] = useState([])
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  
  // URL에서 메트릭 ID 가져오기, 없으면 기본값 사용
  const metricId = searchParams.get('metric') || 'mvrv_z_score'
  
  // halving 모드인지 확인 (HashRouter 환경 고려)
  const isHalvingPath = (location && location.pathname || '').includes('/onchain/halving/halving-bull-chart')
    || (typeof window !== 'undefined' && (window.location.hash || '').includes('/onchain/halving/halving-bull-chart'))
  const isHalvingMode = searchParams.get('halving') === 'true' || isHalvingPath
  
  // 화면 크기 변경 감지
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 메트릭 정보 로드
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        console.log('Loading metrics from API...')
        setMetricsLoading(true)
        const response = await fetch('/api/v1/onchain/metrics')
        console.log('API response status:', response.status)
        if (response.ok) {
          const data = await response.json()
          console.log('Metrics loaded:', data)
          setMetrics(data)
        } else {
          console.error('Failed to load metrics, status:', response.status)
        }
      } catch (error) {
        console.error('Error loading metrics:', error)
      } finally {
        setMetricsLoading(false)
      }
    }
    
    loadMetrics()
  }, [])
  
  // 메트릭 이름에서 괄호 부분 제거하는 함수
  const cleanMetricName = (name) => {
    if (!name) return name
    // 괄호와 그 안의 내용을 제거
    return name.replace(/\s*\([^)]*\)/g, '')
  }

  // 현재 메트릭 정보 찾기
  const metricConfig = metrics.find(m => m.id === metricId) || {
    name: 'MVRV-Z',
    description: 'Bitcoin market value to realized value ratio',
    title: 'Bitcoin Price vs MVRV-Z Correlation',
    loadingText: 'Loading MVRV-Z data...'
  }

  // 정리된 메트릭 이름
  const cleanMetricNameValue = cleanMetricName(metricConfig.name)



  if (metricsLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '600px' }}>
        <CSpinner size="sm" />
        <span className="ms-3">Loading metrics...</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '600px' }}>
        <CSpinner size="sm" />
        <span className="ms-3">{metricConfig.loadingText || 'Loading data...'}</span>
      </div>
    )
  }

  if (error) {
    return (
      <CAlert color="danger" className="mb-4">
        <h4>Error Loading Data</h4>
        <p>{error}</p>
        <p>Please check if the backend API is running and accessible.</p>
      </CAlert>
    )
  }

  return (
    <div>
      {isHalvingMode ? (
        // 반감기 분석 모드
        <>
          {/* 통합 반감기 차트 - 모든 반감기를 하나의 차트에 표시 */}
          <HalvingChart
            title="Bitcoin 반감기 가격 비교 분석"
            height={600}
            showRangeSelector={true}
            showStockTools={false}
            showExporting={true}
          />
          
          {/* 반감기 정보 카드 */}


          {/* Bitcoin 히스토리 데이터 테이블 */}
          <CCard className="mb-4" style={{
            backgroundColor: isMobile ? 'var(--cui-card-bg, #fff)' : undefined,
            color: isMobile ? 'var(--cui-card-color, #000)' : undefined
          }}>
            <CCardHeader className="d-flex justify-content-between align-items-center" style={{
              backgroundColor: isMobile ? 'var(--cui-card-cap-bg, #f8f9fa)' : undefined,
              color: isMobile ? 'var(--cui-card-cap-color, #000)' : undefined
            }}>
              <h5 className="mb-0">Bitcoin 히스토리 데이터</h5>
              <CardTools />
            </CCardHeader>
            <CCardBody style={{
              backgroundColor: isMobile ? 'var(--cui-card-bg, #fff)' : undefined,
              color: isMobile ? 'var(--cui-card-color, #000)' : undefined
            }}>
              <OHLCVTable
                assetId="BTCUSDT"
                interval="1d"
                showVolume={true}
                showChangePercent={true}
                height={400}
              />
            </CCardBody>
          </CCard>
        </>
      ) : (
        // 상관관계 분석 모드
        <>
          {/* 상관관계 분석 결과 */}
          {/* Removed correlation analysis section as CorrelationChart handles this internally */}

          {/* 통합 차트 */}
          <OnChainChart
            assetId="BTCUSDT"
            title={metricConfig.title || `Bitcoin Price vs ${cleanMetricNameValue} Correlation`}
            height={600}
            showRangeSelector={true}
            showStockTools={false}
            showExporting={true}
            metricId={metricId}
          />

          {/* 데이터 정보 카드 */}
          <CCard className="mb-4" style={{
            backgroundColor: isMobile ? 'var(--cui-card-bg, #fff)' : undefined,
            color: isMobile ? 'var(--cui-card-color, #000)' : undefined
          }}>
            <CCardHeader style={{
              backgroundColor: isMobile ? 'var(--cui-card-cap-bg, #f8f9fa)' : undefined,
              color: isMobile ? 'var(--cui-card-cap-color, #000)' : undefined
            }}>
              <h5>{cleanMetricNameValue} Analysis Information</h5>
            </CCardHeader>
            <CCardBody style={{
              backgroundColor: isMobile ? 'var(--cui-card-bg, #fff)' : undefined,
              color: isMobile ? 'var(--cui-card-color, #000)' : undefined
            }}>
              <CRow>
                <CCol md={6}>
                  <h6>What is {cleanMetricNameValue}?</h6>
                  <p className="text-muted">
                    {metricConfig.description}. Correlation analysis measures the relationship between Bitcoin price and {cleanMetricNameValue}.
                    A positive correlation means they move together, while a negative correlation means
                    they move in opposite directions. The correlation coefficient ranges from -1 to +1.
                  </p>
                </CCol>
                <CCol md={6}>
                  <h6>Correlation Interpretation</h6>
                  <ul className="text-muted">
                    <li>
                      <strong>Strong Positive (0.7-1.0):</strong> High correlation, similar movements
                    </li>
                    <li>
                      <strong>Moderate Positive (0.5-0.7):</strong> Moderate correlation
                    </li>
                    <li>
                      <strong>Weak Positive (0.3-0.5):</strong> Low correlation
                    </li>
                    <li>
                      <strong>No Correlation (-0.3 to 0.3):</strong> Independent movements
                    </li>
                    <li>
                      <strong>Negative Correlations:</strong> Opposite movements
                    </li>
                  </ul>
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </>
      )}
    </div>
  )
}

export default OnchainDataOverviews
