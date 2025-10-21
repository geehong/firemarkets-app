import { useState, useEffect } from 'react'
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
  }
) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!assetIdentifier) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.getTechnicalIndicators(assetIdentifier, options)
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [assetIdentifier, JSON.stringify(options)])

  return { data, loading, error }
}

// Crypto Market Overview Hook
export const useCryptoMarketOverview = (
  options?: {
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }
) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.getCryptoMarketOverview(options)
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    
    // 30초마다 자동 갱신
    const interval = setInterval(fetchData, 30 * 1000)
    return () => clearInterval(interval)
  }, [JSON.stringify(options)])

  return { data, loading, error }
}

// Bitcoin Halving Data 훅
export const useHalvingData = (period: number, startPrice: number, enabled: boolean = true) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!enabled || startPrice <= 0) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.getHalvingData(period, startPrice)
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [period, startPrice, enabled])

  return { data, loading, error }
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
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.getHalvingSummary()
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { data, loading, error }
}

// Next Halving Info 훅
export const useNextHalvingInfo = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.getNextHalvingInfo()
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { data, loading, error }
}

// Crypto Data by Asset 훅
export const useCryptoDataByAsset = (assetIdentifier: string) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!assetIdentifier) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.getCryptoDataByAsset(assetIdentifier)
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [assetIdentifier])

  return { data, loading, error }
}

// Top Cryptos 훅
export const useTopCryptos = (limit: number = 100) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.getTopCryptos(limit)
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [limit])

  return { data, loading, error }
}

// Update Crypto Data 훅 (Mutation)
export const useUpdateCryptoData = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const mutate = async (symbol: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiClient.updateCryptoData(symbol)
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}

// Global Crypto Metrics 훅
export const useGlobalCryptoMetrics = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.getGlobalCryptoMetrics()
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { data, loading, error }
}
