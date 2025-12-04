import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api'

export interface SchedulerLog {
  log_id: number
  job_name: string
  status: 'completed' | 'running' | 'failed'
  start_time: string
  end_time: string | null
  duration_seconds: number | null
  assets_processed: number
  data_points_added: number
  error_message: string | null
  created_at: string
}

interface UseSchedulerLogsOptions {
  enabled?: boolean
  refetchInterval?: number
  limit?: number
  status?: string
  job_name?: string
}

interface UseSchedulerLogsReturn {
  data: SchedulerLog[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useSchedulerLogs = ({
  enabled = true,
  refetchInterval = 30000,
  limit = 20,
  status,
  job_name
}: UseSchedulerLogsOptions = {}): UseSchedulerLogsReturn => {
  const [data, setData] = useState<SchedulerLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await apiClient.getSchedulerLogs({ limit, status, job_name })
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [enabled, limit, status, job_name])

  useEffect(() => {
    fetchData()

    if (enabled && refetchInterval > 0) {
      const interval = setInterval(fetchData, refetchInterval)
      return () => clearInterval(interval)
    }
  }, [fetchData, enabled, refetchInterval])

  return { data, isLoading, error, refetch: fetchData }
}

export default useSchedulerLogs
