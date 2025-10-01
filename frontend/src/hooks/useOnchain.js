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
      const params = { metric, time_range: timeRange }
      const res = await axios.get(`${API}/onchain`, { params })
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
