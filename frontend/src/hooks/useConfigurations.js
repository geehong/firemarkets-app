import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = '/api/v1'

export const useConfigurations = (configKey) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(`${API}/configurations/${configKey}`)
      setData(res.data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [configKey])

  useEffect(() => { 
    if (configKey) fetchData() 
  }, [fetchData, configKey])
  
  return { data, loading, error, refetch: fetchData }
}
