import { useQuery } from '@tanstack/react-query'
import { assetAPI, stockAPI, etfAPI, cryptoAPI } from '../services/api'

// 자산 데이터 훅
export const useAssetData = (assetId, interval = '1d', limit = 1000) => {
  console.log('🔍 useAssetData called with assetId:', assetId, 'interval:', interval, 'limit:', limit);

  // 자산 기본 정보 조회
  const {
    data: asset,
    isLoading: assetLoading,
    error: assetError,
  } = useQuery({
    queryKey: ['asset', assetId],
    queryFn: async () => {
      console.log('🔍 Fetching asset data for assetId:', assetId);
      const response = await assetAPI.getAsset(assetId)
      console.log('🔍 Asset API response:', response);
      return response
    },
    enabled: !!assetId,
    staleTime: 5 * 60 * 1000, // 5분
  })

  // OHLCV 데이터 조회 - interval과 limit 파라미터 추가
  const {
    data: ohlcvData,
    isLoading: ohlcvLoading,
    error: ohlcvError,
  } = useQuery({
    queryKey: ['ohlcv', assetId, interval, limit], // limit을 queryKey에 추가
    queryFn: async () => {
      console.log('🔍 Fetching OHLCV data for assetId:', assetId, 'interval:', interval, 'limit:', limit);
      const response = await assetAPI.getOHLCV(assetId, interval, limit) // limit 전달
      console.log('🔍 OHLCV API raw response:', response);
      console.log('🔍 OHLCV API response.data:', response.data);
      console.log('🔍 OHLCV API response.data.data:', response.data?.data);
      console.log('🔍 OHLCV API response.data.data length:', response.data?.data?.length);
      
      const data = Array.isArray(response.data) ? response.data : response.data.data || [];
      console.log('🔍 OHLCV data before processing:', data.slice(0, 2));
      
      const processed = data.map(item => ({
        ...item,
        open_price: Number(item.open_price ?? item.open ?? item.o ?? 0),
        high_price: Number(item.high_price ?? item.high ?? item.h ?? 0),
        low_price: Number(item.low_price ?? item.low ?? item.l ?? 0),
        close_price: Number(item.close_price ?? item.close ?? item.c ?? 0),
        volume: Number(item.volume ?? 0),
        timestamp_utc: item.timestamp_utc ?? item.timestamp ?? item.date ?? '',
      })).sort((a, b) => new Date(a.timestamp_utc) - new Date(b.timestamp_utc));
      
      console.log('🔍 OHLCV data after processing:', processed.slice(0, 2));
      return processed;
    },
    enabled: !!assetId,
    staleTime: 2 * 60 * 1000, // 2분
  })

  // 주식 프로필 조회
  const {
    data: stockProfile,
    isLoading: stockProfileLoading,
    error: stockProfileError,
  } = useQuery({
    queryKey: ['stock-profile', assetId],
    queryFn: async () => {
      const response = await stockAPI.getStockProfile(assetId)
      return response.data
    },
    enabled: !!assetId && asset?.type_name?.toLowerCase() === 'stocks',
    staleTime: 10 * 60 * 1000, // 10분
  })

  // 주식 재무 정보 조회
  const {
    data: stockFinancials,
    isLoading: stockFinancialsLoading,
    error: stockFinancialsError,
  } = useQuery({
    queryKey: ['stock-financials', assetId, 10],
    queryFn: async () => {
      const response = await stockAPI.getStockFinancials(assetId, 10)
      return response.data
    },
    enabled: !!assetId && asset?.type_name?.toLowerCase() === 'stocks',
    staleTime: 10 * 60 * 1000, // 10분
  })

  // 주식 예측 정보 조회
  const {
    data: stockEstimates,
    isLoading: stockEstimatesLoading,
    error: stockEstimatesError,
  } = useQuery({
    queryKey: ['stock-estimates', assetId, 10],
    queryFn: async () => {
      const response = await stockAPI.getStockEstimates(assetId, 10)
      return response.data
    },
    enabled: !!assetId && asset?.type_name?.toLowerCase() === 'stocks',
    staleTime: 10 * 60 * 1000, // 10분
  })

  // ETF 정보 조회
  const {
    data: etfInfo,
    isLoading: etfInfoLoading,
    error: etfInfoError,
  } = useQuery({
    queryKey: ['etf-info', assetId],
    queryFn: async () => {
      const response = await etfAPI.getETFInfo(assetId)
      return response.data
    },
    enabled: !!assetId && asset?.type_name?.toLowerCase() === 'etfs',
    staleTime: 10 * 60 * 1000, // 10분
  })

  // 암호화폐 메트릭 조회
  const {
    data: cryptoMetrics,
    isLoading: cryptoMetricsLoading,
    error: cryptoMetricsError,
  } = useQuery({
    queryKey: ['crypto-metrics', assetId],
    queryFn: async () => {
      const response = await cryptoAPI.getCryptoMetrics(assetId)
      return response.data
    },
    enabled: !!assetId && asset?.type_name?.toLowerCase() === 'crypto',
    staleTime: 5 * 60 * 1000, // 5분
  })

  // 암호화폐 데이터 조회
  const {
    data: cryptoData,
    isLoading: cryptoDataLoading,
    error: cryptoDataError,
  } = useQuery({
    queryKey: ['crypto-data', assetId],
    queryFn: async () => {
      const response = await cryptoAPI.getCryptoData(assetId)
      return response.data
    },
    enabled: !!assetId && asset?.type_name?.toLowerCase() === 'crypto',
    staleTime: 5 * 60 * 1000, // 5분
  })

  // 로딩 상태 통합
  const loading = assetLoading || ohlcvLoading || stockProfileLoading || stockFinancialsLoading || 
                 stockEstimatesLoading || etfInfoLoading || cryptoMetricsLoading || cryptoDataLoading

  // 에러 상태 통합
  const error = assetError || ohlcvError || stockProfileError || stockFinancialsError || 
               stockEstimatesError || etfInfoError || cryptoMetricsError || cryptoDataError

  // 성공 상태
  const isSuccess = !loading && !error && asset
  const isError = !!error

  console.log('🔍 useAssetData return values:', {
    assetId,
    interval,
    asset: asset?.name,
    ohlcvDataLength: ohlcvData?.length,
    loading,
    error: error?.message,
    isSuccess,
    isError
  });

  return {
    asset,
    ohlcvData: ohlcvData || [],
    stockProfile,
    stockFinancials,
    stockEstimates,
    etfInfo,
    cryptoMetrics,
    cryptoData,
    loading,
    error,
    isSuccess,
    isError,
  }
}

export default useAssetData
