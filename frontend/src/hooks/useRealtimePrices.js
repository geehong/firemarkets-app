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
      // 백엔드가 단건만 허용할 가능성을 대비해 순차 호출로 병합
      const results = {}
      for (const sym of symbols) {
        try {
          const r = await realtimeAPI.getQuotesPrice(sym)
          // { prices: {SYM: {...}} } 또는 {SYM: {...}} 형태 허용
          const payload = r.data?.prices || r.data || {}
          // 디버그: 각 심볼 응답 스냅샷
          try {
            // eslint-disable-next-line no-console
            console.log('[quotes-price] symbol=', sym, 'payload=', payload)
          } catch {}
          if (payload[sym]) {
            results[sym] = payload[sym]
          } else if (Array.isArray(payload.quotes) && payload.quotes.length > 0) {
            // 백엔드: { asset_identifier, quotes: [ { price, change_percent, ... } ] }
            results[sym] = payload.quotes[0]
          } else if (payload.price != null) {
            results[sym] = payload
          }
        } catch {}
      }
      const prices = results
      try {
        // eslint-disable-next-line no-console
        console.log('[quotes-price] merged=', prices)
      } catch {}
      return prices;
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

/**
 * 지연 스파크라인(1일) 데이터 훅: quotes-delay-price를 사용
 */
export const useDelaySparkline = (symbols = [], dataInterval = '15m', limit = 96, options = {}) => {
  return useQuery({
    queryKey: ['delaySparkline', symbols, dataInterval, limit],
    queryFn: async () => {
      const out = {}
      for (const sym of symbols) {
        try {
          // 1) 우선 quotes-delay-price 시도
          const r = await realtimeAPI.getQuotesDelayPrice(sym, dataInterval, limit)
          let payload = r.data?.data || r.data || []
          try {
            // eslint-disable-next-line no-console
            console.log('[quotes-delay-price] symbol=', sym, 'points=', Array.isArray(payload) ? payload.length : (Array.isArray(payload[sym]) ? payload[sym].length : 0))
          } catch {}
          let points = Array.isArray(payload) ? payload : (payload[sym] || [])

          // 2) 비어 있으면 인트라데이 OHLCV(4h) 백업으로 사용
          if (!Array.isArray(points) || points.length === 0) {
            try {
              const o = await realtimeAPI.getIntradayOhlcv(sym, '4h', true)
              const arr = o.data?.data || []
              points = arr.map(d => ({ timestamp_utc: d.timestamp || d.timestamp_utc, price: d.close }))
            } catch {}
          }

          out[sym] = points
        } catch {}
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
 * 실시간 자산 테이블 데이터를 가져오는 커스텀 훅
 * @param {object} params - 검색 파라미터
 * @param {string} params.search - 검색할 티커
 * @param {number} params.page - 페이지 번호
 * @param {number} params.page_size - 페이지 크기
 * @param {object} options - react-query 옵션
 */
export const useRealtimeAssetsTable = (params = {}, options = {}) => {
  const {
    search = '',
    page = 1,
    page_size = 1,
    ...otherParams
  } = params;

  return useQuery({
    queryKey: ['realtimeAssetsTable', search, page, page_size, otherParams],
    queryFn: async () => {
      const queryParams = {
        search,
        page,
        page_size,
        _t: Date.now(), // 캐시 무시를 위한 타임스탬프
        ...otherParams
      };
      
      const response = await realtimeAPI.getAssetsTable(queryParams);
      return response.data;
    },
    enabled: !!search, // search가 있을 때만 실행
    refetchInterval: 15000, // 15초마다 자동 갱신
    staleTime: 10000, // 10초 후 stale
    gcTime: 60000, // 1분 캐시 유지
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
};

/**
 * 여러 티커의 실시간 데이터를 병렬로 가져오는 훅
 * @param {string[]} tickers - 티커 배열
 * @param {object} options - react-query 옵션
 */
export const useMultipleRealtimeAssets = (tickers = [], options = {}) => {
  return useQuery({
    queryKey: ['multipleRealtimeAssets', tickers],
    queryFn: async () => {
      if (!tickers || tickers.length === 0) return [];
      
      console.log('🔍 useMultipleRealtimeAssets queryFn:', {
        tickers: tickers,
        tickersLength: tickers.length
      });
      
      // 모든 티커에 대해 병렬로 데이터 가져오기
      const promises = tickers.map(ticker => 
        realtimeAPI.getAssetsTable({ 
          search: ticker, 
          page: 1, 
          page_size: 1
        })
      );
      
      const responses = await Promise.all(promises);
      
      console.log('🔍 API Responses:', {
        responsesLength: responses.length,
        sampleResponse: responses[0]
      });
      
      // 응답 데이터 처리
      const results = responses
        .map(response => response.data?.data?.[0])
        .filter(Boolean)
        .map(row => {
          const sparkline = Array.isArray(row.sparkline_30d) ? row.sparkline_30d : [];
          const currentPrice = row.price != null ? Number(row.price) : null;
          
          return {
            id: row.ticker,
            title: row.ticker,
            name: row.name || row.asset_name || null,
            logoUrl: row.logo_image_url || row.logo_url || null,
            price: currentPrice,
            isRealtime: row.is_realtime || false,
            lastUpdated: row.last_updated,
            chartData: sparkline,
            changePercent: row.change_percent_today,
            volume: row.volume_today,
            dataSource: row.data_source,
            typeName: row.type_name || row.asset_type || row.asset_type_name || 'Others'
          };
        });
      
      console.log('🔍 Processed Results:', {
        resultsLength: results.length,
        sampleResult: results[0]
      });
      
      return results;
    },
    enabled: !!tickers && tickers.length > 0,
    refetchInterval: 15000, // 15초마다 자동 갱신
    staleTime: 15000, // 15초 동안 fresh
    gcTime: 120000, // 2분 캐시 유지
    keepPreviousData: true,
    retry: 0,
    ...options,
  });
};

export default useRealtimePrices;
