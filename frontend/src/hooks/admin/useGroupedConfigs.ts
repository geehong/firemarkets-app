'use client'

import { useState, useEffect, useCallback } from 'react'
import { resolveApiBaseUrl } from '@/lib/api'

export interface GroupedConfigItem {
    value: any
    type: string
    description?: string
    is_sensitive?: boolean
    is_active?: boolean
}

export interface GroupedConfig {
    config_id: number
    config_key: string
    config_value: Record<string, GroupedConfigItem>
    data_type: string
    description?: string
    category?: string
    updated_at: string
}

interface UseGroupedConfigsReturn {
    data: GroupedConfig[]
    loading: boolean
    error: Error | null
    refetch: () => Promise<void>
    updateConfig: (key: string, newValue: Record<string, GroupedConfigItem>) => Promise<boolean>
}

export const useGroupedConfigs = (): UseGroupedConfigsReturn => {
    const [data, setData] = useState<GroupedConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const backendApiUrl = resolveApiBaseUrl();
            const response = await fetch(`${backendApiUrl}/configurations/grouped`)

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const result = await response.json()
            setData(result)
        } catch (e) {
            console.error("Failed to fetch configs:", e)
            setError(e instanceof Error ? e : new Error('Unknown error'))
        } finally {
            setLoading(false)
        }
    }, [])

    const updateConfig = async (key: string, newValue: Record<string, GroupedConfigItem>) => {
        try {
            const backendApiUrl = resolveApiBaseUrl();
            const response = await fetch(`${backendApiUrl}/configurations/grouped/${key}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ config_value: newValue }),
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            await fetchData() // Refresh data
            return true
        } catch (e) {
            console.error("Failed to update config:", e)
            return false
        }
    }

    useEffect(() => {
        fetchData()
    }, [fetchData])

    return { data, loading, error, refetch: fetchData, updateConfig }
}
