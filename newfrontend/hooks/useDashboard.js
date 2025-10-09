"use client"

import { useEffect, useState } from 'react'
import { getDashboardSummary } from '@/lib/dashboard'

export const useDashboard = () => {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getDashboardSummary()
        setSummary(data)
      } catch (e) {
        setError(e)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  return { summary, loading, error }
}
