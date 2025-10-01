import { useState, useEffect } from 'react'
import axios from 'axios'

const API = '/api/v1'

export const useDashboard = () => {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      try {
        const res = await axios.get(`${API}/dashboard`)
        setSummary(res.data)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  return { summary, loading }
}
