'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api'

export interface SystemLog {
    id: number
    level: string
    module: string | null
    message: string
    timestamp: string
}

interface UseSystemLogsOptions {
    enabled?: boolean
    refetchInterval?: number
    limit?: number
    level?: string
    module?: string
}

interface UseSystemLogsReturn {
    data: SystemLog[]
    isLoading: boolean
    error: Error | null
    refetch: () => Promise<void>
}

export const useSystemLogs = ({
    enabled = true,
    refetchInterval = 30000, // 30 seconds
    limit = 50,
    level,
    module
}: UseSystemLogsOptions = {}): UseSystemLogsReturn => {
    const [data, setData] = useState<SystemLog[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const fetchData = useCallback(async () => {
        if (!enabled) return

        setIsLoading(true)
        setError(null)

        try {
            const result = await apiClient.getSystemLogs({ limit, level, module })
            setData(result)
        } catch (e) {
            setError(e instanceof Error ? e : new Error('Unknown error'))
        } finally {
            setIsLoading(false)
        }
    }, [enabled, limit, level, module])

    useEffect(() => {
        fetchData()

        if (enabled && refetchInterval > 0) {
            const interval = setInterval(fetchData, refetchInterval)
            return () => clearInterval(interval)
        }
    }, [fetchData, enabled, refetchInterval])

    return { data, isLoading, error, refetch: fetchData }
}

export default useSystemLogs
