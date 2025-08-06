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
import { useNavigate, useSearchParams } from 'react-router-dom'
import CorrelationChart from '../../components/charts/CorrelationChart'
import { usePriceData } from '../../hooks/useIntegratedMetrics'

const OnchainDataOverviews = ({ 
  chartData = null,
  loading = false,
  error = null,
  correlation = null
}) => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [metrics, setMetrics] = useState([])
  const [metricsLoading, setMetricsLoading] = useState(true)
  
  // URL에서 메트릭 ID 가져오기, 없으면 기본값 사용
  const metricId = searchParams.get('metric') || 'mvrv_z_score'
  
  // 메트릭 정보 로드
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setMetricsLoading(true)
        const response = await fetch('/api/v1/onchain/metrics')
        if (response.ok) {
          const data = await response.json()
          setMetrics(data)
        } else {
          console.error('Failed to load metrics')
        }
      } catch (error) {
        console.error('Error loading metrics:', error)
      } finally {
        setMetricsLoading(false)
      }
    }
    
    loadMetrics()
  }, [])
  
  // 현재 메트릭 정보 찾기
  const metricConfig = metrics.find(m => m.id === metricId) || {
    name: 'MVRV Z-Score',
    description: 'Bitcoin market value to realized value ratio',
    title: 'Bitcoin Price vs MVRV Z-Score Correlation',
    loadingText: 'Loading MVRV Z-Score data...'
  }

  if (metricsLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <CSpinner size="sm" />
        <span className="ms-3">Loading metrics...</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
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

      {/* 상관관계 분석 결과 */}
      {/* Removed correlation analysis section as CorrelationChart handles this internally */}

      {/* 통합 차트 */}
      <CorrelationChart
        assetId="BTCUSDT"
        title={metricConfig.title || `Bitcoin Price vs ${metricConfig.name} Correlation`}
        height={600}
        showRangeSelector={true}
        showStockTools={true}
        showExporting={true}
        metricId={metricId}
      />

      {/* LineChart 추가 */}
      {/* Removed LineChart as per edit hint */}

      {/* 데이터 정보 카드 */}
      <CCard className="mb-4">
        <CCardHeader>
          <h5>{metricConfig.name} Analysis Information</h5>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={6}>
              <h6>What is {metricConfig.name}?</h6>
              <p className="text-muted">
                {metricConfig.description}. Correlation analysis measures the relationship between Bitcoin price and {metricConfig.name}.
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
    </div>
  )
}

export default OnchainDataOverviews
