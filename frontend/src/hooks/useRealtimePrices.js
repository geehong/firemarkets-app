import { useQuery } from '@tanstack/react-query';
import { realtimeAPI } from '../services/api';

/**
 * 여러 자산의 실시간 가격 데이터를 가져오는 커스텀 훅
 * @param {string[]} symbols - 가격을 조회할 심볼 배열
 * @param {'crypto' | 'stock'} assetType - 자산 유형
 * @param {object} options - react-query 옵션 (예: refetchInterval)
 */
const useRealtimePrices = (symbols, assetType = 'crypto', options = {}) => {
  return useQuery({
    // queryKey에 assetType을 포함하여 캐시가 섞이지 않도록 함
    queryKey: ['realtimePrices', assetType, symbols],
    queryFn: async () => {
      const params = new URLSearchParams();
      symbols.forEach(symbol => params.append('symbols', symbol));
      
      // assetType에 따라 다른 엔드포인트를 호출
      const endpoint = assetType === 'crypto' ? '/realtime/prices/crypto' : '/realtime/prices/stock';
      
      const response = await realtimeAPI.getPricesByType(assetType, symbols);
      return response.data.prices || {};
    },
    enabled: !!symbols && symbols.length > 0,
    refetchInterval: assetType === 'crypto' ? 10000 : 300000, // 암호화폐는 10초, 주식은 5분
    staleTime: assetType === 'crypto' ? 9000 : 270000, // 주식은 4.5분
    gcTime: assetType === 'crypto' ? 30000 : 600000, // 주식은 10분 캐시 유지
    retry: 3, // 실패 시 3번 재시도
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 지수 백오프
    ...options,
  });
};

/**
 * 암호화폐 실시간 가격 데이터를 가져오는 커스텀 훅
 * @param {string[]} symbols - 암호화폐 심볼 배열
 * @param {object} options - react-query 옵션
 */
export const useCryptoPrices = (symbols, options = {}) => {
  return useRealtimePrices(symbols, 'crypto', options);
};

/**
 * 주식 실시간 가격 데이터를 가져오는 커스텀 훅
 * @param {string[]} symbols - 주식 심볼 배열
 * @param {object} options - react-query 옵션
 */
export const useStockPrices = (symbols, options = {}) => {
  return useRealtimePrices(symbols, 'stock', options);
};

export default useRealtimePrices;
