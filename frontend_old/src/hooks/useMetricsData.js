import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://firemarkets.net'

export const useMetricsData = (assetTicker, metrics = [], options = {}) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const {
    limit = 1000,
    compute = null,
    dataInterval = '1d'
  } = options

  useEffect(() => {
    const fetchData = async () => {
      if (!assetTicker || metrics.length === 0) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // URL 파라미터 구성
        const params = new URLSearchParams()
        params.append('metrics', metrics.join(','))
        params.append('limit', limit.toString())
        
        if (compute) {
          params.append('compute', compute)
        }
        
        if (dataInterval) {
          params.append('data_interval', dataInterval)
        }

        const url = `${API_BASE_URL}/api/v1/metrics/${assetTicker}?${params.toString()}`
        console.log('[useMetricsData] Fetching:', url)

        const response = await axios.get(url)
        
        console.log('[useMetricsData] Response:', response.data)
        setData(response.data)
        
      } catch (err) {
        console.error('[useMetricsData] Error:', err)
        setError(err.response?.data?.detail || err.message || 'Failed to fetch metrics data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [assetTicker, metrics.join(','), limit, compute, dataInterval])

  return {
    data,
    loading,
    error,
    refetch: () => {
      setLoading(true)
      setError(null)
      // useEffect가 다시 실행되도록 의존성 변경
      setData(null)
    }
  }
} 