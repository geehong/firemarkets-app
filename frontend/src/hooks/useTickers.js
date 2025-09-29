import { useState, useEffect } from 'react'
import axios from 'axios'

const API = '/api/v1'

export const useTickers = () => {
  const [tickers, setTickers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      try {
        const res = await axios.get()
        setTickers(res.data?.items || res.data || [])
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  return { tickers, loading }
}
