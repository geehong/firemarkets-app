'use client'

import { useState, useEffect, useCallback } from 'react'

interface SchedulerStatus {
  isRunning: boolean
  status: string
  job_count?: number
  last_run?: string
  next_run?: string
}

interface UseSchedulerOptions {
  period?: string
  enabled?: boolean
}

interface UseSchedulerReturn {
  data: SchedulerStatus | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useScheduler = ({ 
  period = 'day', 
  enabled = true 
}: UseSchedulerOptions = {}): UseSchedulerReturn => {
  const [data, setData] = useState<SchedulerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`https://backend.firemarkets.net/api/v1/scheduler/status?period=${period}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [enabled, period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
