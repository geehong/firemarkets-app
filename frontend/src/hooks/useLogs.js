import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = '/api/v1'

export const useLogs = (page = 1, limit = 50, filters = {}) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page, limit, ...filters }
      const res = await axios.get(`${API}/logs`, { params })
      setData(res.data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [page, limit, filters])

  useEffect(() => { fetchData() }, [fetchData])
  return { data, loading, error, refetch: fetchData }
}
