import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = '/api/v1'

export const useOnchain = (metric, timeRange = '1y') => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Corrected endpoint for onchain metrics data
      const res = await axios.get(`${API}/onchain/metrics/${metric}/data`, {
        params: { time_range: timeRange }
      })
      setData(res.data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [metric, timeRange])

  useEffect(() => { fetchData() }, [fetchData])
  return { data, loading, error, refetch: fetchData }
}
