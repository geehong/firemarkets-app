'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api'

export interface OnchainMetric {
    id: string
    name: string
    description: string
    title?: string
    loadingText?: string
    data_count?: number
}

export interface OnchainDataPoint {
    timestamp: string
    value: number
    price?: number
}

export interface OnchainData {
    metric: string
    data?: OnchainDataPoint[]
    series?: {
        [key: string]: any[] | undefined
        date?: any[]
        price?: any[]
    }
    analysis?: {
        correlation?: {
            [key: string]: any
        }
    }
    correlation?: number
    last_updated?: string
}

/**
 * 온체인 메트릭 데이터 훅
 */
export const useOnchain = (metric?: string, timeRange: string = '1y', ticker: string = 'BTCUSDT') => {
    const [data, setData] = useState<OnchainData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const fetchData = useCallback(async () => {
        if (!metric) {
            setData(null)
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            console.log('🔍 useOnchain: Fetching onchain data for metric:', metric, 'timeRange:', timeRange, 'ticker:', ticker)
            const response = await apiClient.getOnchainMetricsData(ticker, metric, { time_range: timeRange })
            console.log('✅ useOnchain: API response:', response)
            setData(response)
        } catch (err) {
            console.error('❌ useOnchain: API error:', err)
            setError(err instanceof Error ? err : new Error('Failed to fetch onchain data'))
        } finally {
            setLoading(false)
        }
    }, [metric, timeRange, ticker])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    return {
        data,
        loading,
        error,
        refetch: fetchData
    }
}

/**
 * 온체인 메트릭 목록 훅
 */
export const useOnchainMetrics = (options: { initialData?: OnchainMetric[] | null } = {}) => {
    const { initialData = null } = options;
    const [metrics, setMetrics] = useState<OnchainMetric[]>(initialData || [])
    const [loading, setLoading] = useState(!initialData)
    const [error, setError] = useState<Error | null>(null)

    const fetchMetrics = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            console.log('🔍 useOnchainMetrics: Fetching metrics list')
            const response = await apiClient.getOnchainMetrics()
            console.log('✅ useOnchainMetrics: API response:', response)
            setMetrics(response)
        } catch (err) {
            console.error('❌ useOnchainMetrics: API error:', err)
            setError(err instanceof Error ? err : new Error('Failed to fetch onchain metrics'))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (!initialData) {
            fetchMetrics()
        }
    }, [fetchMetrics, initialData])

    return {
        metrics,
        loading,
        error,
        refetch: fetchMetrics
    }
}

/**
 * 온체인 대시보드 훅
 */
export const useOnchainDashboard = (ticker: string = 'BTCUSDT') => {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const fetchDashboard = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            console.log('🔍 useOnchainDashboard: Fetching dashboard summary')
            const response = await apiClient.getOnchainDashboard(ticker)
            console.log('✅ useOnchainDashboard: API response:', response)
            setData(response)
        } catch (err) {
            console.error('❌ useOnchainDashboard: API error:', err)
            setError(err instanceof Error ? err : new Error('Failed to fetch onchain dashboard'))
        } finally {
            setLoading(false)
        }
    }, [ticker])

    useEffect(() => {
        fetchDashboard()
    }, [fetchDashboard])

    return {
        data,
        loading,
        error,
        refetch: fetchDashboard
    }
}

export default useOnchain
