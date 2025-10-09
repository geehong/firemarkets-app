import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = '/api/v1'

export const useMetrics = (metricType, timeRange = '1d') => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { metric_type: metricType, time_range: timeRange }
      const res = await axios.get(`${API}/metrics`, { params })
      setData(res.data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [metricType, timeRange])

  useEffect(() => { 
    if (metricType) fetchData() 
  }, [fetchData, metricType])
  
  return { data, loading, error, refetch: fetchData }
}
