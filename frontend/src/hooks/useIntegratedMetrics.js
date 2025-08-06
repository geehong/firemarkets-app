import { useQuery } from '@tanstack/react-query'

// 통합 메트릭 API 훅 (수정됨)
export const useIntegratedMetrics = (assetId, metrics, options = {}) => {
  const {
    limit = 1000,
    compute = 'correlation',
    startDate,
    endDate
  } = options

  return useQuery({
    queryKey: ['integrated-metrics', assetId, metrics, limit, compute, startDate, endDate],
    queryFn: async () => {
      // 통합 API 호출
      const params = new URLSearchParams({
        metrics: metrics.join(','),
        limit: limit.toString(),
        ...(compute && { compute }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate })
      })

      const response = await fetch(`/api/v1/metrics/${assetId}?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch integrated metrics: ${response.status}`)
      }
      return response.json()
    },
    enabled: !!assetId && !!metrics && metrics.length > 0,
    staleTime: 1 * 60 * 1000, // 1분
  })
}

// 개별 가격 데이터 API 훅
export const usePriceData = (assetId, options = {}) => {
  const {
    limit = 1000,
    dataInterval = '1d',
    startDate,
    endDate
  } = options

  return useQuery({
    queryKey: ['price-data', assetId, dataInterval, limit, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        data_interval: dataInterval,
        limit: limit.toString(),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate })
      })

      const response = await fetch(`/api/v1/ohlcv/${assetId}?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch price data: ${response.status}`)
      }
      return response.json()
    },
    enabled: !!assetId,
    staleTime: 2 * 60 * 1000, // 2분
  })
}

// 개별 온체인 메트릭 데이터 API 훅
export const useOnChainMetricData = (metricId, assetId, options = {}) => {
  const {
    limit = 1000,
    startDate,
    endDate
  } = options

  return useQuery({
    queryKey: ['onchain-metric-data', metricId, assetId, limit, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate })
      })

      const response = await fetch(`/api/v1/onchain/metrics/${metricId}/data?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch onchain metric data: ${response.status}`)
      }
      return response.json()
    },
    enabled: !!metricId && !!assetId,
    staleTime: 5 * 60 * 1000, // 5분
  })
}

// 통합 분석 훅 (여러 API를 조합)
export const useAssetAnalysis = (assetId, metrics = [], options = {}) => {
  const {
    limit = 1000,
    compute = 'correlation',
    startDate,
    endDate
  } = options

  return useQuery({
    queryKey: ['asset-analysis', assetId, metrics, limit, compute, startDate, endDate],
    queryFn: async () => {
      // 개별 메트릭 데이터를 병렬로 가져오기
      const metricPromises = metrics.map(async (metricId) => {
        const params = new URLSearchParams({
          limit: limit.toString(),
          ...(startDate && { start_date: startDate }),
          ...(endDate && { end_date: endDate })
        })

        const response = await fetch(`/api/v1/onchain/metrics/${metricId}/data?${params}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch metric ${metricId}: ${response.status}`)
        }
        return response.json()
      })

      const metricResults = await Promise.all(metricPromises)
      
      // 가격 데이터도 가져오기
      const priceParams = new URLSearchParams({
        data_interval: '1d',
        limit: limit.toString(),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate })
      })

      const priceResponse = await fetch(`/api/v1/ohlcv/${assetId}?${priceParams}`)
      if (!priceResponse.ok) {
        throw new Error(`Failed to fetch price data: ${priceResponse.status}`)
      }
      const priceData = await priceResponse.json()

      // 통합 데이터 구성
      return {
        asset_ticker: assetId,
        series: {
          price: priceData.data || [],
          ...metricResults.reduce((acc, result, index) => {
            const metricId = metrics[index]
            acc[metricId] = result.data || []
            return acc
          }, {})
        },
        analysis: {
          correlation: compute === 'correlation' ? {} : null
        }
      }
    },
    enabled: !!assetId && !!metrics && metrics.length > 0,
    staleTime: 1 * 60 * 1000, // 1분
  })
} 