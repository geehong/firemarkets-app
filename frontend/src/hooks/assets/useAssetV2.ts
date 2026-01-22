/**
 * useAssetV2 - v2 API를 사용하는 자산 데이터 훅
 * 
 * 기존 v1 훅들을 점진적으로 대체하기 위한 v2 API 기반 훅
 */

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api'

// ============================================================================
// Types
// ============================================================================

export interface AssetPriceV2 {
  asset_id: number
  current_price: number | null
  open_price: number | null
  high_price: number | null
  low_price: number | null
  prev_close: number | null
  change_percent_24h: number | null
  volume_24h: number | null
  last_updated: string
  data_source: string
}

export interface AssetOverviewV2 {
  asset_id: number
  ticker: string
  name: string
  asset_type: string
  source: string
  numeric_data: Record<string, any>
  [key: string]: any
}

export interface OhlcvDataPointV2 {
  timestamp_utc: string
  open_price: number | null
  high_price: number | null
  low_price: number | null
  close_price: number | null
  volume: number | null
  change_percent: number | null
  data_interval: string
}

export interface OhlcvResponseV2 {
  asset_id: number
  data_interval: string
  count: number
  data: OhlcvDataPointV2[]
}

export interface TechnicalsV2 {
  asset_id: number
  data_interval: string
  count: number
  data: Array<{
    timestamp?: string
    current_price?: number
    sma_20?: number | null
    sma_50?: number | null
    sma_200?: number | null
    rsi_14?: number | null
    trend?: string | null
    [key: string]: any
  }>
  source?: string
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * v2 API로 현재가 조회
 */
export function useAssetPriceV2(assetIdentifier: string | null) {
  const [data, setData] = useState<AssetPriceV2 | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchPrice = useCallback(async () => {
    if (!assetIdentifier) return

    setLoading(true)
    setError(null)

    try {
      const result = await apiClient.v2GetPrice(assetIdentifier)
      setData(result as AssetPriceV2)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch price'))
    } finally {
      setLoading(false)
    }
  }, [assetIdentifier])

  useEffect(() => {
    fetchPrice()
  }, [fetchPrice])

  return { data, loading, error, refetch: fetchPrice }
}

/**
 * v2 API로 OHLCV 차트 데이터 조회
 */
export function useOhlcvV2(
  assetIdentifier: string | null,
  params?: { data_interval?: string; limit?: number; start_date?: string; end_date?: string }
) {
  const [data, setData] = useState<OhlcvResponseV2 | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchOhlcv = useCallback(async () => {
    if (!assetIdentifier) return

    setLoading(true)
    setError(null)

    try {
      const result = await apiClient.v2GetOhlcv(assetIdentifier, params)
      setData(result as OhlcvResponseV2)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch OHLCV'))
    } finally {
      setLoading(false)
    }
  }, [assetIdentifier, params?.data_interval, params?.limit, params?.start_date, params?.end_date])

  useEffect(() => {
    fetchOhlcv()
  }, [fetchOhlcv])

  return { data, loading, error, refetch: fetchOhlcv }
}

/**
 * v2 API로 자산 개요 조회
 */
export function useAssetOverviewV2(assetIdentifier: string | null, lang: string = 'ko') {
  const [data, setData] = useState<AssetOverviewV2 | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchOverview = useCallback(async () => {
    if (!assetIdentifier) return

    setLoading(true)
    setError(null)

    try {
      const result = await apiClient.v2GetOverview(assetIdentifier, lang)
      setData(result as AssetOverviewV2)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch overview'))
    } finally {
      setLoading(false)
    }
  }, [assetIdentifier, lang])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  return { data, loading, error, refetch: fetchOverview }
}

/**
 * v2 API로 기술적 지표 조회
 */
export function useTechnicalsV2(
  assetIdentifier: string | null,
  params?: { indicator_type?: string; data_interval?: string; limit?: number }
) {
  const [data, setData] = useState<TechnicalsV2 | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchTechnicals = useCallback(async () => {
    if (!assetIdentifier) return

    setLoading(true)
    setError(null)

    try {
      const result = await apiClient.v2GetTechnicals(assetIdentifier, params)
      setData(result as TechnicalsV2)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch technicals'))
    } finally {
      setLoading(false)
    }
  }, [assetIdentifier, params?.indicator_type, params?.data_interval, params?.limit])

  useEffect(() => {
    fetchTechnicals()
  }, [fetchTechnicals])

  return { data, loading, error, refetch: fetchTechnicals }
}

/**
 * v2 API로 자산 프로필 조회 (Stock, Crypto, ETF 통합)
 */
export function useAssetProfileV2(assetIdentifier: string | null) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!assetIdentifier) return

    setLoading(true)
    setError(null)

    try {
      const result = await apiClient.v2GetProfile(assetIdentifier)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch profile'))
    } finally {
      setLoading(false)
    }
  }, [assetIdentifier])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return { data, loading, error, refetch: fetchProfile }
}

/**
 * v2 API로 시장 등락 종목 조회
 */
export function useMarketMoversV2(
  params?: { type_name?: string; direction?: 'gainers' | 'losers'; limit?: number }
) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchMovers = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await apiClient.v2GetMarketMovers(params)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch market movers'))
    } finally {
      setLoading(false)
    }
  }, [params?.type_name, params?.direction, params?.limit])

  useEffect(() => {
    fetchMovers()
  }, [fetchMovers])

  return { data, loading, error, refetch: fetchMovers }
}

/**
 * v2 API로 다중 티커 요약 조회
 */
export function useTickerSummaryV2(tickers: string[]) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchSummary = useCallback(async () => {
    if (!tickers.length) return

    setLoading(true)
    setError(null)

    try {
      const result = await apiClient.v2GetTickerSummary(tickers)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch ticker summary'))
    } finally {
      setLoading(false)
    }
  }, [tickers.join(',')])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return { data, loading, error, refetch: fetchSummary }
}

/**
 * v2 API로 트리맵 데이터 조회
 */
export function useTreemapV2(params?: { asset_type_id?: number; type_name?: string; limit?: number }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchTreemap = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await apiClient.v2GetTreemap(params)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch treemap'))
    } finally {
      setLoading(false)
    }
  }, [params?.asset_type_id, params?.type_name, params?.limit])

  useEffect(() => {
    fetchTreemap()
  }, [fetchTreemap])

  return { data, loading, error, refetch: fetchTreemap }
}

/**
 * v2 API로 빠른 시장 통계 조회
 */
export function useQuickStatsV2() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await apiClient.v2GetQuickStats()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch quick stats'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { data, loading, error, refetch: fetchStats }
}
