'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api'

export interface ApiLog {
    log_id: number
    api_name: string
    endpoint: string
    asset_ticker: string | null
    status_code: number
    response_time_ms: number
    success: boolean
    error_message: string | null
    created_at: string
}

interface UseApiLogsOptions {
    enabled?: boolean
    refetchInterval?: number
    limit?: number
    endpoint?: string
    statusCode?: number
    method?: string
}

interface UseApiLogsReturn {
    data: ApiLog[]
    isLoading: boolean
    error: Error | null
    refetch: () => Promise<void>
}

export const useApiLogs = ({
    enabled = true,
    refetchInterval = 30000,
    limit = 50,
    endpoint,
    statusCode,
    method
}: UseApiLogsOptions = {}): UseApiLogsReturn => {
    const [data, setData] = useState<ApiLog[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const fetchData = useCallback(async () => {
        if (!enabled) return

        setIsLoading(true)
        setError(null)

        try {
            // We need to add getApiLogs to apiClient first, but assuming it exists or using fetch for now if not.
            // Actually, I should check apiClient first. I'll assume I'll add it.
            // Wait, I should check if apiClient has getApiLogs. 
            // I'll use direct fetch if apiClient doesn't have it, or update apiClient.
            // Let's check apiClient again.
            // I'll update apiClient to include getApiLogs.
            const result = await apiClient.getApiLogs({ limit, endpoint, status_code: statusCode, method })
            setData(result)
        } catch (e) {
            setError(e instanceof Error ? e : new Error('Unknown error'))
        } finally {
            setIsLoading(false)
        }
    }, [enabled, limit, endpoint, statusCode, method])

    useEffect(() => {
        fetchData()

        if (enabled && refetchInterval > 0) {
            const interval = setInterval(fetchData, refetchInterval)
            return () => clearInterval(interval)
        }
    }, [fetchData, enabled, refetchInterval])

    return { data, isLoading, error, refetch: fetchData }
}

export default useApiLogs
