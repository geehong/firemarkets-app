import { useState, useEffect } from 'react'
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
export const useCryptoMetrics = (assetIdentifier: string) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!assetIdentifier) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await apiClient.getCryptoMetrics(assetIdentifier)
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
  const [queries, setQueries] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errors, setErrors] = useState<any[]>([])
  const [lastFetchKey, setLastFetchKey] = useState<string>('')

  // periods 배열을 문자열로 변환하여 의존성 비교
  const periodsKey = periods.join(',')
  const fetchKey = `${periodsKey}-${startPrice}-${enabled}`

  useEffect(() => {
    // 이미 같은 요청을 처리했으면 중복 실행 방지
    if (fetchKey === lastFetchKey) return

    if (!enabled || startPrice <= 0 || periods.length === 0) {
      setQueries([])
      setIsLoading(false)
      setIsError(false)
      setErrors([])
      setLastFetchKey(fetchKey)
      return
    }

    const fetchAllData = async () => {
      setIsLoading(true)
      setIsError(false)
      setErrors([])
      setLastFetchKey(fetchKey)
      
      try {
        const promises = periods.map(async (period, index) => {
          try {
            const result = await apiClient.getHalvingData(period, startPrice)
            return {
              data: result,
              isLoading: false,
              isError: false,
              error: null
            }
          } catch (err) {
            return {
              data: null,
              isLoading: false,
              isError: true,
              error: err
            }
          }
        })
        
        const results = await Promise.all(promises)
        setQueries(results)
        
        // 에러가 있는지 확인
        const hasErrors = results.some(result => result.isError)
        const errorList = results.filter(result => result.isError).map(result => result.error)
        
        setIsError(hasErrors)
        setErrors(errorList)
      } catch (err) {
        setIsError(true)
        setErrors([err])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllData()
  }, [periodsKey, startPrice, enabled, fetchKey, lastFetchKey])

  return { queries, isLoading, isError, errors }
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
