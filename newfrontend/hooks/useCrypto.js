import { useState, useEffect } from 'react'
import axios from 'axios'

const API = '/api/v1'

export const useCrypto = (symbol) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      if (!symbol) {
        setData(null)
        setLoading(false)
        return
      }
      try {
        const res = await axios.get(`${API}/crypto/data/asset/${symbol}`)
        setData(res.data)
      } catch (error) {
        console.error('Crypto API Error:', error)
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [symbol])

  return { data, loading }
}
