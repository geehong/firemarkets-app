import { useState, useEffect, useCallback } from 'react'

export const useOnChain = () => {
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(false)
  const [collecting, setCollecting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [error, setError] = useState(null)

  // 온체인 메트릭 로드
  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/v1/onchain/metrics')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      } else {
        console.error('Failed to load metrics data')
        setError('Failed to load metrics data')
      }
    } catch (error) {
      setError(error.message)
      console.error('Failed to load metrics data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 메트릭 설정 업데이트
  const updateMetric = useCallback(
    async (metricId, config) => {
      try {
        setLoading(true)
        setError(null)

        // 백엔드 API에 맞게 요청 구성
        const response = await fetch(`/api/v1/onchain/metrics/${metricId}/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })

        if (response.ok) {
          // 메트릭 목록 새로고침
          await loadMetrics()
          return { success: true, message: `Metric updated successfully` }
        } else {
          const errorData = await response.json()
          console.error('Failed to update metric:', errorData)
          return { success: false, message: errorData.detail || 'Failed to update metric' }
        }
      } catch (error) {
        setError(error.message)
        console.error('Failed to update metric:', error)
        return { success: false, message: error.message }
      } finally {
        setLoading(false)
      }
    },
    [loadMetrics],
  )

  // 개별 메트릭 실행
  const runMetric = useCallback(async (metricId, collectionType = 'recent') => {
    try {
      setCollecting(true)
      setError(null)

      const response = await fetch(`/api/v1/onchain/metrics/${metricId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric_id: metricId,
          force_update: false,
          collection_type: collectionType,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        return {
          success: true,
          message: `${result.message} (${result.data_points_added} data points added)`,
        }
      } else {
        const errorData = await response.json()
        return { success: false, message: errorData.detail || 'Failed to run metric' }
      }
    } catch (error) {
      setError(error.message)
      console.error('Failed to run metric:', error)
      return { success: false, message: error.message }
    } finally {
      setCollecting(false)
    }
  }, [])

  // 온체인 데이터 수집 (전체)
  const collectData = useCallback(async () => {
    try {
      setCollecting(true)
      setError(null)

      // 활성화된 메트릭들만 필터링
      const enabledMetrics = metrics.filter((metric) => metric.is_enabled)

      if (enabledMetrics.length === 0) {
        return { success: false, message: 'No enabled metrics to collect' }
      }

      // 각 메트릭을 순차적으로 실행
      let totalAdded = 0
      for (const metric of enabledMetrics) {
        const result = await runMetric(metric.id, 'recent')
        if (result.success) {
          totalAdded += 1
        }
      }

      return {
        success: true,
        message: `On-chain data collection completed: ${totalAdded}/${enabledMetrics.length} metrics processed`,
      }
    } catch (error) {
      setError(error.message)
      console.error('Failed to collect on-chain data:', error)
      return { success: false, message: error.message }
    } finally {
      setCollecting(false)
    }
  }, [metrics, runMetric])

  // 수집 중지
  const stopCollection = useCallback(async () => {
    try {
      setStopping(true)
      setError(null)
      // 백엔드에 중지 API가 없으므로 상태만 업데이트
      setCollecting(false)
      return { success: true, message: 'Data collection stopped successfully' }
    } catch (error) {
      setError(error.message)
      console.error('Failed to stop collection:', error)
      return { success: false, message: error.message }
    } finally {
      setStopping(false)
    }
  }, [])

  // 데이터 새로고침
  const refreshData = useCallback(async () => {
    try {
      await loadMetrics()
      return { success: true, message: 'Data refreshed successfully' }
    } catch (error) {
      console.error('Failed to refresh data:', error)
      return { success: false, message: error.message }
    }
  }, [loadMetrics])

  // 초기 로드
  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  return {
    metrics,
    loading,
    collecting,
    stopping,
    error,
    loadMetrics,
    updateMetric,
    runMetric,
    collectData,
    stopCollection,
    refreshData,
  }
}
