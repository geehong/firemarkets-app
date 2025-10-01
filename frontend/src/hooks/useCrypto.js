import { useState, useEffect } from 'react'
import axios from 'axios'

const API = '/api/v1'

export const useCrypto = (symbol) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      if (!symbol) return setLoading(false)
      try {
        const res = await axios.get(`${API}/crypto/${symbol}`)
        setData(res.data)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [symbol])

  return { data, loading }
}
