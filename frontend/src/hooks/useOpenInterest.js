import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = '/api/v1'

export const useOpenInterest = (symbol, timeRange = '1d') => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { symbol, time_range: timeRange }
      const res = await axios.get(`${API}/open-interest`, { params })
      setData(res.data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [symbol, timeRange])

  useEffect(() => { 
    if (symbol) fetchData() 
  }, [fetchData, symbol])
  
  return { data, loading, error, refetch: fetchData }
}
