// All HTTP polling removed. Re-export WebSocket-based hooks for realtime data.
import { useWebSocket, useRealtimePricesWebSocket, useDelaySparklineWebSocket } from './useWebSocket'
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

// Backward-compatible stub: provide a minimal shape without polling
export const useRealtime = (_symbols = []) => {
  return { prices: {} }
}

// HTTP API 호출 훅 추가
export const useRealtimePricesPg = (params = {}) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!params.asset_identifier) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await axios.get('/api/v1/realtime/pg/quotes-delay-price', {
        params: {
          asset_identifier: params.asset_identifier,
          data_interval: params.data_interval || '15m',
          days: params.days || 1
        }
      })
      setData(response.data)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [params.asset_identifier, params.data_interval, params.days])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// Keep existing names but route to WebSocket implementations
export const useDelaySparklinePg = useDelaySparklineWebSocket
