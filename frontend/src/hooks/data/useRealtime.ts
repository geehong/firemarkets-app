import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

// Types
export interface RealtimeQuote {
  asset_identifier: string
  price: number
  change: number
  change_percent: number
  volume: number
  timestamp: string
}

export interface IntradayOhlcv {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Realtime Table Hook
export const useRealtimeTable = (
  options?: {
    assetTypeId?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  },
  queryOptions?: Omit<UseQueryOptions<any, Error, any, any>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['realtime-table', options],
    queryFn: () => apiClient.getRealtimeTable(options),
    refetchInterval: 5 * 1000, // 5초마다 자동 갱신
    ...queryOptions,
  })
}

// Quotes Price Hook
export const useQuotesPrice = (
  assetIdentifiers: string[],
  queryOptions?: Omit<UseQueryOptions<any, Error, any, any>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['quotes-price', assetIdentifiers],
    queryFn: () => apiClient.getQuotesPrice(assetIdentifiers),
    enabled: assetIdentifiers.length > 0,
    refetchInterval: 2 * 1000, // 2초마다 자동 갱신
    ...queryOptions,
  })
}

// Intraday OHLCV Hook
export const useIntradayOhlcv = (
  assetIdentifier: string,
  options?: {
    dataInterval?: string
    days?: number
    limit?: number
  },
  queryOptions?: Omit<UseQueryOptions<any, Error, any, any>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['intraday-ohlcv', assetIdentifier, options],
    queryFn: () => {
      const params = {
        asset_identifier: assetIdentifier,
        data_interval: options?.dataInterval, // dataInterval을 data_interval로 매핑
        days: options?.days,
        limit: options?.limit
      }
      console.log('[useIntradayOhlcv] Calling API with params:', params)
      return apiClient.getIntradayOhlcv(params)
    },
    enabled: !!assetIdentifier,
    staleTime: 30 * 1000, // 30초
    ...queryOptions,
  })
}

// Delayed Quotes Hook
export const useDelayedQuotes = (
  assetIdentifiers: string[],
  options?: {
    dataSource?: string
    limit?: number
    days?: number | string
  },
  queryOptions?: Omit<UseQueryOptions<any, Error, any, any>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['delayed-quotes', assetIdentifiers, options],
    queryFn: () => apiClient.getDelayedQuotes(assetIdentifiers, options?.dataSource, options?.limit, options?.days),
    enabled: assetIdentifiers.length > 0,
    refetchInterval: 15 * 60 * 1000, // 15분마다 자동 갱신
    staleTime: 15 * 60 * 1000, // 15분간 데이터를 신선하게 유지
    ...queryOptions,
  })
}

// Delayed Quote Last Hook (최신값만)
export const useDelayedQuoteLast = (
  assetIdentifier: string,
  options?: {
    dataInterval?: string
    dataSource?: string
  },
  queryOptions?: Omit<UseQueryOptions<any, Error, any, any>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['delayed-quote-last', assetIdentifier, options],
    queryFn: () => apiClient.getDelayedQuoteLast(
      assetIdentifier,
      options?.dataInterval || '15m',
      options?.dataSource // undefined일 수 있음 (주식 등은 data_source 지정 안 함)
    ),
    enabled: !!assetIdentifier,
    refetchInterval: 15 * 60 * 1000, // 15분마다 자동 갱신
    ...queryOptions,
  })
}

// Sparkline Price Hook (주식/ETF용 - 유효성 검증 포함)
export const useSparklinePrice = (
  assetIdentifier: string,
  options?: {
    dataInterval?: string
    days?: number
    dataSource?: string
  },
  queryOptions?: Omit<UseQueryOptions<any, Error, any, any>, 'queryKey' | 'queryFn'>
) => {
  // sparkline-price API는 days가 최대 1로 제한되어 있으므로 1로 제한
  const days = options?.days ? Math.min(options.days, 1) : 1

  return useQuery({
    queryKey: ['sparkline-price', assetIdentifier, options],
    queryFn: () => apiClient.getSparklinePrice(
      assetIdentifier,
      options?.dataInterval || '15m',
      days,
      options?.dataSource
    ),
    enabled: !!assetIdentifier,
    refetchInterval: 15 * 60 * 1000, // 15분마다 자동 갱신
    staleTime: 15 * 60 * 1000, // 15분간 데이터를 신선하게 유지
    ...queryOptions,
  })
}
