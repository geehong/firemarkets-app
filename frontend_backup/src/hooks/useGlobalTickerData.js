import { useQuery } from '@tanstack/react-query'

// 전역 티커 데이터 API
const globalTickerAPI = {
  // 모든 티커 목록 조회
  getAllTickers: async () => {
    const response = await fetch('/api/v1/assets?limit=1000', {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    if (!response.ok) {
      throw new Error('티커 목록을 불러오는 데 실패했습니다.')
    }
    const data = await response.json()
    return data.data || data
  },

  // OHLCV 데이터가 있는 티커만 조회
  getTickersWithOHLCV: async () => {
    const response = await fetch('/api/v1/assets?has_ohlcv_data=true&limit=1000&offset=0', {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    if (!response.ok) {
      throw new Error('OHLCV 데이터가 있는 티커 목록을 불러오는 데 실패했습니다.')
    }
    const data = await response.json()
    return data.data || data
  },

  // OHLCV 데이터가 없는 티커만 조회 (티커 관리용)
  getTickersWithoutOHLCV: async () => {
    const response = await fetch('/api/v1/assets?has_ohlcv_data=false&limit=1000&offset=0', {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    if (!response.ok) {
      throw new Error('OHLCV 데이터가 없는 티커 목록을 불러오는 데 실패했습니다.')
    }
    const data = await response.json()
    return data.data || data
  },

  // 자산 타입 목록 조회 (최적화)
  getAssetTypes: async () => {
    const response = await fetch('/api/v1/asset-types?include_description=false', {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    if (!response.ok) {
      throw new Error('자산 타입을 불러오는 데 실패했습니다.')
    }
    return response.json()
  },

  // 데이터가 있는 자산 타입만 조회 (최적화)
  getAssetTypesWithData: async () => {
    const response = await fetch('/api/v1/asset-types?has_data=true&include_description=false', {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    if (!response.ok) {
      throw new Error('데이터가 있는 자산 타입을 불러오는 데 실패했습니다.')
    }
    return response.json()
  },

  // description이 포함된 자산 타입 조회 (필요한 경우)
  getAssetTypesWithDescription: async () => {
    const response = await fetch('/api/v1/asset-types?include_description=true', {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    if (!response.ok) {
      throw new Error('자산 타입을 불러오는 데 실패했습니다.')
    }
    return response.json()
  },
}

// 전역 티커 데이터 훅
export const useGlobalTickerData = (options = {}) => {
  const {
    includeOHLCV = false, // OHLCV 데이터가 있는 티커만 가져올지 여부
    excludeOHLCV = false, // OHLCV 데이터가 없는 티커만 가져올지 여부
    staleTime = 30 * 1000, // 30초로 단축 (5분에서 변경)
  } = options

  // 티커 목록 조회 함수 결정
  const getTickerFunction = () => {
    if (excludeOHLCV) {
      return globalTickerAPI.getTickersWithoutOHLCV
    } else if (includeOHLCV) {
      return globalTickerAPI.getTickersWithOHLCV
    } else {
      return globalTickerAPI.getAllTickers
    }
  }

  // 티커 목록 조회
  const tickersQuery = useQuery({
    queryKey: [
      'global-tickers',
      includeOHLCV ? 'with-ohlcv' : excludeOHLCV ? 'without-ohlcv' : 'all',
    ],
    queryFn: getTickerFunction(),
    staleTime: 0, // 즉시 stale로 처리
    cacheTime: 0, // 캐시 비활성화
    refetchOnWindowFocus: true, // 윈도우 포커스 시 자동 리페치 활성화
    refetchOnMount: true, // 컴포넌트 마운트 시 자동 리페치 활성화
    refetchOnReconnect: true, // 네트워크 재연결 시 자동 리페치 활성화
    refetchInterval: 30 * 1000, // 30초마다 자동 새로고침
  })

  // 자산 타입 목록 조회
  const assetTypesQuery = useQuery({
    queryKey: ['global-asset-types'],
    queryFn: globalTickerAPI.getAssetTypes,
    staleTime: 0, // 즉시 stale로 처리
    cacheTime: 0, // 캐시 비활성화
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: 60 * 1000, // 1분마다 자동 새로고침
  })

  // 데이터가 있는 자산 타입 목록 조회
  const assetTypesWithDataQuery = useQuery({
    queryKey: ['global-asset-types-with-data'],
    queryFn: globalTickerAPI.getAssetTypesWithData,
    staleTime: 0, // 즉시 stale로 처리
    cacheTime: 0, // 캐시 비활성화
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: 60 * 1000, // 1분마다 자동 새로고침
  })

  return {
    // 티커 데이터
    tickers: tickersQuery.data || [],
    tickersLoading: tickersQuery.isLoading,
    tickersError: tickersQuery.error,

    // 자산 타입 데이터
    assetTypes: assetTypesQuery.data?.data || [],
    assetTypesLoading: assetTypesQuery.isLoading,
    assetTypesError: assetTypesQuery.error,

    // 데이터가 있는 자산 타입
    assetTypesWithData: assetTypesWithDataQuery.data?.data || [],
    assetTypesWithDataLoading: assetTypesWithDataQuery.isLoading,
    assetTypesWithDataError: assetTypesWithDataQuery.error,

    // 전체 로딩 상태
    loading: tickersQuery.isLoading || assetTypesQuery.isLoading,

    // 전체 에러 상태
    error: tickersQuery.error || assetTypesQuery.error,

    // 수동 리페치 함수들
    refetchTickers: tickersQuery.refetch,
    refetchAssetTypes: assetTypesQuery.refetch,
    refetchAll: () => {
      tickersQuery.refetch()
      assetTypesQuery.refetch()
      assetTypesWithDataQuery.refetch()
    },

    // 유틸리티 함수들
    getTickersByType: (typeName) => {
      const assetType = assetTypesQuery.data?.data?.find((at) => at.type_name === typeName)
      if (!assetType) return []
      return (
        tickersQuery.data?.filter((ticker) => ticker.asset_type_id === assetType.asset_type_id) ||
        []
      )
    },

    getAssetTypeById: (assetTypeId) => {
      return assetTypesQuery.data?.data?.find((at) => at.asset_type_id === assetTypeId)
    },

    getTickerById: (assetId) => {
      return tickersQuery.data?.find((ticker) => ticker.asset_id === assetId)
    },
  }
}

// 특정 자산 타입의 티커만 가져오는 훅
export const useTickersByType = (typeName) => {
  const { tickers, assetTypes, loading, error } = useGlobalTickerData()

  const assetType = assetTypes.find((at) => at.type_name === typeName)
  const filteredTickers = assetType
    ? tickers.filter((ticker) => ticker.asset_type_id === assetType.asset_type_id)
    : []

  return {
    tickers: filteredTickers,
    assetType,
    loading,
    error,
  }
}

// OHLCV 데이터가 있는 티커만 가져오는 훅 (사이드메뉴용)
export const useTickersWithOHLCV = () => {
  return useGlobalTickerData({ includeOHLCV: true })
}

// OHLCV 데이터가 없는 티커만 가져오는 훅 (티커 관리용)
export const useTickersWithoutOHLCV = () => {
  return useGlobalTickerData({ excludeOHLCV: true })
}

// 모든 티커를 가져오는 훅 (기본)
export const useAllTickers = () => {
  return useGlobalTickerData()
}

export default useGlobalTickerData
