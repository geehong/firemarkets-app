import { useQuery } from '@tanstack/react-query';
import { realtimeAPI } from '../services/api';

/**
 * PostgreSQL에서 여러 자산의 실시간 가격 데이터를 가져오는 커스텀 훅
 * @param {string[]} symbols - 가격을 조회할 심볼 배열
 * @param {'crypto' | 'stock'} assetType - 자산 유형
 * @param {object} options - react-query 옵션 (예: refetchInterval)
 */
export const useRealtimePricesPg = (symbols, assetType = 'crypto', options = {}) => {
  return useQuery({
    // queryKey에 assetType과 pg를 포함하여 캐시가 섞이지 않도록 함
    queryKey: ['realtimePricesPg', assetType, symbols],
    queryFn: async () => {
      // PostgreSQL API를 사용하여 순차 호출로 병합
      const results = {}
      for (const sym of symbols) {
        try {
          const r = await realtimeAPI.getQuotesPricePg(sym)
          // { quotes: [{...}] } 형태의 응답 처리
          const payload = r.data || {}
          
          if (Array.isArray(payload.quotes) && payload.quotes.length > 0) {
            // PostgreSQL API 응답 구조: { asset_identifier, quotes: [ { price, change_percent, ... } ] }
            results[sym] = payload.quotes[0]
          } else if (payload.price != null) {
            results[sym] = payload
          }
        } catch (error) {
          console.warn(`PostgreSQL realtime price fetch failed for ${sym}:`, error);
        }
      }
      return results;
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
 * PostgreSQL에서 지연 스파크라인(1일) 데이터 훅: pg/quotes-delay-price를 사용
 */
export const useDelaySparklinePg = (symbols = [], dataInterval = '15m', limit = 96, options = {}) => {
  return useQuery({
    queryKey: ['delaySparklinePg', symbols, dataInterval, limit],
    queryFn: async () => {
      const out = {}
      for (const sym of symbols) {
        try {
          // PostgreSQL quotes-delay-price API 사용
          const r = await realtimeAPI.getQuotesDelayPricePg(sym, dataInterval, 1)
          let payload = r.data || {}
          
          // API 응답 구조에 맞게 데이터 추출
          let points = []
          if (Array.isArray(payload.quotes)) {
            points = payload.quotes
          } else if (Array.isArray(payload.data)) {
            points = payload.data
          } else if (Array.isArray(payload)) {
            points = payload
          } else if (Array.isArray(payload[sym])) {
            points = payload[sym]
          }
          
          // 비어 있으면 인트라데이 OHLCV(4h) 백업으로 사용 (MySQL API)
          if (!Array.isArray(points) || points.length === 0) {
            try {
              const o = await realtimeAPI.getIntradayOhlcv(sym, '4h', true, 1)
              const arr = o.data?.data || []
              points = arr.map(d => ({ timestamp_utc: d.timestamp || d.timestamp_utc, price: d.close }))
            } catch (error) {
              console.warn(`PostgreSQL delay data fallback failed for ${sym}:`, error);
            }
          }

          // Reverse the order to get latest data first (in case backend returns oldest first)
          out[sym] = points.reverse()
        } catch (error) {
          console.warn(`PostgreSQL delay sparkline fetch failed for ${sym}:`, error);
        }
      }
      return out
    },
    enabled: !!symbols && symbols.length > 0,
    staleTime: 60000,
    gcTime: 300000,
    refetchInterval: 60000,
    ...options,
  });
};

/**
 * PostgreSQL에서 암호화폐 실시간 가격 데이터를 가져오는 커스텀 훅
 * @param {string[]} symbols - 암호화폐 심볼 배열
 * @param {object} options - react-query 옵션
 */
export const useCryptoPricesPg = (symbols, options = {}) => {
  return useRealtimePricesPg(symbols, 'crypto', options);
};

/**
 * PostgreSQL에서 주식 실시간 가격 데이터를 가져오는 커스텀 훅
 * @param {string[]} symbols - 주식 심볼 배열
 * @param {object} options - react-query 옵션
 */
export const useStockPricesPg = (symbols, options = {}) => {
  return useRealtimePricesPg(symbols, 'stock', options);
};

export default useRealtimePricesPg;
