"use client"

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

// 타입 정의
interface RealtimePricesParams {
  asset_identifier: string
  data_interval?: string
  days?: number
}

interface Quote {
  timestamp_utc: string
  price: string | number
}

interface RealtimePricesResponse {
  quotes: Quote[]
}

// Assets 관련 훅들
export const useAssets = () => {
  return useQuery({
    queryKey: ['assets'],
    queryFn: () => apiClient.getAssets(),
    staleTime: 5 * 60 * 1000, // 5분
    retry: 3,
  })
}

export const useAsset = (id: string) => {
  return useQuery({
    queryKey: ['asset', id],
    queryFn: () => apiClient.getAsset(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  })
}

// Realtime 관련 훅들
export const useRealtimePricesPg = (params: RealtimePricesParams) => {
  return useQuery({
    queryKey: ['realtime', 'pricesPg', params],
    queryFn: async () => {
      try {
        const primary = await apiClient.getRealtimePricesPg(params)
        const quotes = (primary as any)?.quotes
        if (Array.isArray(quotes) && quotes.length > 0) return primary
      } catch (e: any) {
        // swallow and try fallback
      }
      // Fallback to intraday OHLCV and map -> { quotes: [{timestamp_utc, price}] }
      try {
        const intraday = await apiClient.getIntradayOhlcv({ asset_identifier: params.asset_identifier, data_interval: '4h', ohlcv: true, days: 1 })
        const arr = (intraday as any)?.data || []
        const mapped = Array.isArray(arr) ? arr.map((d: any) => ({ timestamp_utc: d.timestamp || d.timestamp_utc, price: d.close })) : []
        return { quotes: mapped }
      } catch (e: any) {
        // if fallback also fails, rethrow last error
        throw e
      }
    },
    enabled: !!params?.asset_identifier,
    staleTime: 30 * 1000, // 30초 (실시간 데이터)
    refetchInterval: 60 * 1000, // 1분마다 자동 갱신
    retry: 1, // 재시도 횟수 줄임
  })
}

// Crypto 관련 훅들
export const useCryptoData = (id: string) => {
  return useQuery({
    queryKey: ['crypto', id],
    queryFn: () => apiClient.getCryptoData(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2분
    retry: 3,
  })
}

// Dashboard 관련 훅들
export const useDashboard = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.getDashboardData(),
    staleTime: 1 * 60 * 1000, // 1분
    retry: 3,
  })
}

// Tickers 관련 훅들
export const useTickers = () => {
  return useQuery({
    queryKey: ['tickers'],
    queryFn: () => apiClient.getTickers(),
    staleTime: 30 * 1000, // 30초
    refetchInterval: 60 * 1000, // 1분마다 자동 갱신
    retry: 2,
  })
}

// 통합 useAPI 객체 (기존 코드 호환성 유지)
export const useAPI = {
  assets: {
    list: useAssets,
    get: useAsset,
  },
  realtime: {
    pricesPg: useRealtimePricesPg,
  },
  crypto: {
    data: useCryptoData,
  },
  dashboard: {
    summary: useDashboard,
  },
  tickers: {
    list: useTickers,
  },
}

export default useAPI