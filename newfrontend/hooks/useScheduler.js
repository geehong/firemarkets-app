import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = '/api/v1'

export const useScheduler = ({ period = 'day', enabled = true } = {}) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      // Prefer explicit status endpoint
      const res = await axios.get(`${API}/scheduler/status`, { params: { period } })
      setData(res.data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [enabled, period])

  useEffect(() => { fetchData() }, [fetchData])
  return { data, loading, error, refetch: fetchData }
}
