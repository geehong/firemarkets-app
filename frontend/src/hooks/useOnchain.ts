import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api'

export interface OnchainMetric {
  id: string
  name: string
  description: string
  title?: string
  loadingText?: string
}

export interface OnchainDataPoint {
  timestamp: string
  value: number
  price?: number
}

export interface OnchainData {
  metric: string
  data: OnchainDataPoint[]
  correlation?: number
  last_updated?: string
}

/**
 * 온체인 메트릭 데이터 훅
 */
export const useOnchain = (metric?: string, timeRange: string = '1y') => {
  const [data, setData] = useState<OnchainData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!metric) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 useOnchain: Fetching onchain data for metric:', metric, 'timeRange:', timeRange)
      const response = await apiClient.getOnchainMetricData(metric, { time_range: timeRange })
      console.log('✅ useOnchain: API response:', response)
      setData(response)
    } catch (err) {
      console.error('❌ useOnchain: API error:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch onchain data'))
    } finally {
      setLoading(false)
    }
  }, [metric, timeRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchData 
  }
}

/**
 * 온체인 메트릭 목록 훅
 */
export const useOnchainMetrics = () => {
  const [metrics, setMetrics] = useState<OnchainMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 useOnchainMetrics: Fetching metrics list')
      const response = await apiClient.getOnchainMetrics()
      console.log('✅ useOnchainMetrics: API response:', response)
      setMetrics(response)
    } catch (err) {
      console.error('❌ useOnchainMetrics: API error:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch onchain metrics'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return { 
    metrics, 
    loading, 
    error, 
    refetch: fetchMetrics 
  }
}

export default useOnchain
