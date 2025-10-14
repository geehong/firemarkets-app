import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
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

export interface TechnicalIndicator {
  asset_identifier: string
  indicator_name: string
  value: number
  signal: 'buy' | 'sell' | 'hold'
  timestamp: string
}

// Crypto Metrics Hook
export const useCryptoMetrics = (
  assetIdentifier: string,
  queryOptions?: UseQueryOptions
) => {
  return useQuery({
    queryKey: ['crypto-metrics', assetIdentifier],
    queryFn: () => apiClient.getCryptoMetrics(assetIdentifier),
    enabled: !!assetIdentifier,
    staleTime: 1 * 60 * 1000, // 1분
    ...queryOptions,
  })
}

// Technical Indicators Hook
export const useTechnicalIndicators = (
  assetIdentifier: string,
  options?: {
    indicators?: string[]
    period?: number
  },
  queryOptions?: UseQueryOptions
) => {
  return useQuery({
    queryKey: ['technical-indicators', assetIdentifier, options],
    queryFn: () => apiClient.getTechnicalIndicators(assetIdentifier, options),
    enabled: !!assetIdentifier,
    staleTime: 5 * 60 * 1000, // 5분
    ...queryOptions,
  })
}

// Crypto Market Overview Hook
export const useCryptoMarketOverview = (
  options?: {
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  },
  queryOptions?: UseQueryOptions
) => {
  return useQuery({
    queryKey: ['crypto-market-overview', options],
    queryFn: () => apiClient.getCryptoMarketOverview(options),
    refetchInterval: 30 * 1000, // 30초마다 자동 갱신
    ...queryOptions,
  })
}

// Bitcoin Halving Data 훅
export const useHalvingData = (period: number, startPrice: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['halving-data', period, startPrice],
    queryFn: () => apiClient.getHalvingData(period, startPrice),
    enabled: enabled && startPrice > 0,
    staleTime: 5 * 60 * 1000, // 5분
    cacheTime: 10 * 60 * 1000, // 10분
  })
}

// 여러 반감기 데이터를 동시에 가져오는 훅
export const useMultipleHalvingData = (periods: number[], startPrice: number, enabled: boolean = true) => {
  const queries = periods.map(period => 
    useHalvingData(period, startPrice, enabled)
  )

  return {
    queries,
    isLoading: queries.some(query => query.isLoading),
    isError: queries.some(query => query.isError),
    errors: queries.filter(query => query.isError).map(query => query.error),
    data: queries.reduce((acc, query, index) => {
      if (query.data) {
        acc[periods[index]] = query.data
      }
      return acc
    }, {} as Record<number, any>)
  }
}

// Bitcoin Halving Summary 훅
export const useHalvingSummary = () => {
  return useQuery({
    queryKey: ['halving-summary'],
    queryFn: () => apiClient.getHalvingSummary(),
    staleTime: 10 * 60 * 1000, // 10분
    cacheTime: 30 * 60 * 1000, // 30분
  })
}

// Next Halving Info 훅
export const useNextHalvingInfo = () => {
  return useQuery({
    queryKey: ['next-halving-info'],
    queryFn: () => apiClient.getNextHalvingInfo(),
    staleTime: 60 * 60 * 1000, // 1시간
    cacheTime: 2 * 60 * 60 * 1000, // 2시간
  })
}

// Crypto Data by Asset 훅
export const useCryptoDataByAsset = (assetIdentifier: string) => {
  return useQuery({
    queryKey: ['crypto-data', assetIdentifier],
    queryFn: () => apiClient.getCryptoDataByAsset(assetIdentifier),
    enabled: !!assetIdentifier,
    staleTime: 2 * 60 * 1000, // 2분
    cacheTime: 5 * 60 * 1000, // 5분
  })
}

// Top Cryptos 훅
export const useTopCryptos = (limit: number = 100) => {
  return useQuery({
    queryKey: ['top-cryptos', limit],
    queryFn: () => apiClient.getTopCryptos(limit),
    staleTime: 5 * 60 * 1000, // 5분
    cacheTime: 10 * 60 * 1000, // 10분
  })
}

// Update Crypto Data 훅 (Mutation)
export const useUpdateCryptoData = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (symbol: string) => apiClient.updateCryptoData(symbol),
    onSuccess: (data, symbol) => {
      // 관련 쿼리들 무효화
      queryClient.invalidateQueries({ queryKey: ['crypto-data', symbol] })
      queryClient.invalidateQueries({ queryKey: ['top-cryptos'] })
      queryClient.invalidateQueries({ queryKey: ['global-crypto-metrics'] })
    },
  })
}

// Global Crypto Metrics 훅
export const useGlobalCryptoMetrics = () => {
  return useQuery({
    queryKey: ['global-crypto-metrics'],
    queryFn: () => apiClient.getGlobalCryptoMetrics(),
    staleTime: 5 * 60 * 1000, // 5분
    cacheTime: 10 * 60 * 1000, // 10분
  })
}
