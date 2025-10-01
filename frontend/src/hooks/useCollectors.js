import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

/**
 * useCollectors
 * 지원 파라미터는 `useAPI.specs.collectors.data.params` 참고
 */

const API = '/api/v1'

export const useCollectors = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(`${API}/collectors`)
      setData(res.data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  return { data, loading, error, refetch: fetchData }
}
