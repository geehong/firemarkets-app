import { useQuery, useQueries, UseQueryOptions } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

// Types
export interface CryptoMetrics {
    asset_identifier: string
    market_cap: number
    volume_24h: number
    price_change_24h: number
    price_change_percent_24h: number
    circulating_supply: number
    total_supply: number
    max_supply?: number
}

// Bitcoin Halving Data 훅
export const useHalvingData = (period: number, startPrice: number, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['halvingData', period, startPrice],
        queryFn: () => apiClient.getHalvingData(period, startPrice),
        enabled: enabled && startPrice > 0,
        staleTime: Infinity, // History data doesn't change
        gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
        retry: 2
    })
}

// 여러 반감기 데이터를 동시에 가져오는 훅
export const useMultipleHalvingData = (periods: number[], startPrice: number, enabled: boolean = true) => {
    const queryResults = useQueries({
        queries: periods.map(period => ({
            queryKey: ['halvingData', period, startPrice],
            queryFn: () => apiClient.getHalvingData(period, startPrice),
            enabled: enabled && startPrice > 0,
            staleTime: Infinity,
            gcTime: 1000 * 60 * 60 * 24,
            retry: 2
        }))
    })

    return {
        queries: queryResults,
        isLoading: queryResults.some(query => query.isLoading),
        isError: queryResults.some(query => query.isError),
        errors: queryResults.filter(query => query.error).map(query => query.error),
        data: queryResults.reduce((acc, query, index) => {
            if (query.data) {
                acc[periods[index]] = query.data
            }
            return acc
        }, {} as Record<number, any>)
    }
}

// Cycle Comparison Data Hook
export const useComparisonCycleData = (era: number, params: { normalizeToPrice?: number; assetIdentifiers?: string }, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['comparisonCycleData', era, params],
        queryFn: () => apiClient.getComparisonCycleData(era, params),
        enabled: enabled,
        staleTime: Infinity,
        gcTime: 1000 * 60 * 60 * 24,
        retry: 2
    })
}

// Multiple Cycle Comparison Data Hook
export const useMultipleComparisonCycleData = (
    eras: number[],
    params: { normalizeToPrice?: number; assetIdentifiers?: string },
    enabled: boolean = true
) => {
    const queryResults = useQueries({
        queries: eras.map(era => ({
            queryKey: ['comparisonCycleData', era, params],
            queryFn: () => apiClient.getComparisonCycleData(era, params),
            enabled: enabled,
            staleTime: Infinity,
            gcTime: 1000 * 60 * 60 * 24,
            retry: 2
        }))
    })

    return {
        queries: queryResults,
        isLoading: queryResults.some(query => query.isLoading),
        isError: queryResults.some(query => query.isError),
        errors: queryResults.filter(query => query.error).map(query => query.error),
        data: queryResults.reduce((acc, query, index) => {
            if (query.data) {
                acc[eras[index]] = query.data
            }
            return acc
        }, {} as Record<number, any>)
    }
}
