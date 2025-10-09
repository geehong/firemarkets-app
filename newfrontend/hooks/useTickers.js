"use client"

import { useEffect, useState } from 'react'
import { getTickerSummary } from '@/lib/dashboard'

export const useTickers = () => {
  const [tickers, setTickers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getTickerSummary()
        setTickers(data?.items || data || [])
      } catch (e) {
        setError(e)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  return { tickers, loading, error }
}
