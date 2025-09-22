import React, { useState, useEffect } from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import OnChainMetrics from '../../components/admin/onchain/OnChainMetrics'

const OnChainPage = ({ category }) => {
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [runningMetrics, setRunningMetrics] = useState(new Set())

  // 카테고리 이름 매핑
  const categoryNames = {
    'market-metrics': 'Market Metrics',
    'price-metrics': 'Price Metrics',
    'mining-metrics': 'Mining Metrics',
    'institutional-metrics': 'Institutional Metrics',
    'derivatives-metrics': 'Derivatives Metrics',
  }

  const categoryKey = category ? category.replace('-', '_') : 'market_metrics'
  const pageTitle = categoryNames[category] || 'OnChain Metrics'

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true)
        // API 호출 (실제 구현 시 백엔드 엔드포인트로 변경)
        const response = await fetch('/api/v1/onchain/metrics')
        if (response.ok) {
          const data = await response.json()
          // 카테고리별 필터링
          const filteredMetrics = category
            ? data.filter((metric) => metric.category === categoryKey)
            : data
          setMetrics(filteredMetrics)
        } else {
          console.error('Failed to fetch metrics')
          setMetrics([])
        }
      } catch (error) {
        console.error('Error fetching metrics:', error)
        setMetrics([])
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [category, categoryKey])

  const handleMetricsChange = (metricId, changes) => {
    setMetrics((prevMetrics) =>
      prevMetrics.map((metric) => (metric.id === metricId ? { ...metric, ...changes } : metric)),
    )

    // 메트릭 실행 처리
    if (changes.action === 'run') {
      setRunningMetrics((prev) => new Set([...prev, metricId]))
      // 실제 API 호출 로직 (백엔드 구현 필요)
      setTimeout(() => {
        setRunningMetrics((prev) => {
          const newSet = new Set(prev)
          newSet.delete(metricId)
          return newSet
        })
      }, 5000) // 5초 후 완료 시뮬레이션
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <CCard className="mb-4">
        <CCardHeader>
          <h4 className="card-title mb-0">{pageTitle}</h4>
          <div className="small text-body-secondary">OnChain data collection and monitoring</div>
        </CCardHeader>
      </CCard>

      <OnChainMetrics
        metrics={metrics}
        onMetricsChange={handleMetricsChange}
        runningMetrics={runningMetrics}
      />
    </div>
  )
}

export default OnChainPage
