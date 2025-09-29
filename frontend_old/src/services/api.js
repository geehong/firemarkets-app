import axios from 'axios'
import cacheService from './cacheService'

// API 기본 설정
const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000, // 30초로 증가
  paramsSerializer: {
    // URL 파라미터 직렬화 설정 (URI malformed 에러 방지)
    serialize: (params) => {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined && value !== '') {
          searchParams.append(key, value);
        }
      }
      return searchParams.toString();
    }
  }
})

// 캐싱이 적용된 API 클라이언트
const cachedApi = {
  get: async (endpoint, params = {}, options = {}) => {
    const { useCache = true, cacheTtl = 60000 } = options
    
    // 파라미터 정리 및 검증
    const cleanParams = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        // 문자열인 경우 공백 제거 및 특수문자 처리
        if (typeof value === 'string') {
          const trimmedValue = value.trim();
          if (trimmedValue) {
            // URL 인코딩 문제를 방지하기 위해 특수문자 처리
            cleanParams[key] = trimmedValue;
          }
        } else {
          cleanParams[key] = value;
        }
      }
    }
    
    if (useCache) {
      // 캐시에서 데이터 확인
      const cachedData = cacheService.get(endpoint, cleanParams)
      if (cachedData) {
        return cachedData
      }
    }
    
    // API 호출
    const response = await api.get(endpoint, { params: cleanParams })
    
    if (useCache) {
      // 캐시에 저장
      cacheService.set(endpoint, cleanParams, response.data, { 
        memoryTtl: cacheTtl, 
        storageTtl: cacheTtl * 5 
      })
    }
    
    return response.data
  },
  
  post: api.post,
  put: api.put,
  delete: api.delete
}

// 응답 인터셉터 (에러 처리)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error)
    
    // URI malformed 에러 특별 처리
    if (error.message && error.message.includes('URI malformed')) {
      console.error('URI malformed error detected. This might be due to invalid characters in URL parameters.')
      console.error('Error details:', {
        config: error.config,
        url: error.config?.url,
        params: error.config?.params
      })
    }
    
    return Promise.reject(error)
  },
)

// 자산 관련 API
export const assetAPI = {
  // 기본 자산 정보 (티커 또는 assetId로 조회 가능)
  getAsset: async (assetId) => cachedApi.get(`/assets/${assetId}`, {}, { cacheTtl: 600000 }), // 10분 캐시

  // OHLCV 데이터 (캐싱 적용)
  getOHLCV: async (assetId, interval = '1d', limit = 50000, startDate = null, endDate = null) => {
    const params = {
      data_interval: interval,
      limit: limit.toString(),
    }
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    return cachedApi.get(`/ohlcv/${assetId}`, params, { cacheTtl: 300000 }) // 5분 캐시로 증가
  },

  // 자산 목록 (캐싱 적용)
  getAssets: async (params = {}) => cachedApi.get('/assets', params, { cacheTtl: 600000 }), // 10분 캐시로 증가

  // 자산 market_cap 데이터 (TreeMap용, 캐싱 적용)
  getAssetsMarketCaps: async (params = {}) => cachedApi.get('/assets/market-caps', params, { cacheTtl: 300000 }), // 5분 캐시로 증가

  // 새로운 Assets Table API (캐싱 적용)
  getAssetsTable: async (params = {}) => cachedApi.get('/assets-table/', params, { cacheTtl: 300000 }), // 5분 캐시
}

// 주식 관련 API (실제 엔드포인트)
export const stockAPI = {
  // 주식 프로필 정보
  getStockProfile: (assetId) => api.get(`/stock-profile/asset/${assetId}`),

  // 재무 정보
  getStockFinancials: (assetId, limit = 10) =>
    api.get(`/stock-financials/asset/${assetId}?limit=${limit}`),

  // 애널리스트 의견
  getStockEstimates: (assetId, limit = 10) =>
    api.get(`/stock-estimates/asset/${assetId}?limit=${limit}`),
}

// ETF 관련 API
export const etfAPI = {
  // ETF 정보
  getETFInfo: (assetId) => api.get(`/etf-info/asset/${assetId}`),

  // ETF 섹터 노출도
  getETFSectorExposure: (etfInfoId) => api.get(`/etf-sector-exposure/${etfInfoId}`),

  // ETF 보유 종목
  getETFHoldings: (etfInfoId, limit = 50) => api.get(`/etf-holdings/${etfInfoId}?limit=${limit}`),
}

// 암호화폐 관련 API
export const cryptoAPI = {
  // 암호화폐 지표
  getCryptoMetrics: (assetId) => api.get(`/crypto-metrics/asset/${assetId}`),
  // 암호화폐 데이터
  getCryptoData: (assetId) => api.get(`/crypto/data/asset/${assetId}`),
}

// 실시간 가격 관련 API
export const realtimePriceAPI = {
  /**
   * 여러 자산의 실시간 가격을 백엔드에서 가져옵니다.
   * @param {string[]} symbols - 가격을 조회할 심볼 배열 (e.g., ['BTC', 'ETH'])
   * @param {'crypto' | 'stock'} assetType - 자산 유형
   * @returns {Promise<Object>} - { SYMBOL: price } 형태의 객체
   */
  fetchRealtimePrices: async (symbols, assetType = 'crypto') => {
    if (!symbols || symbols.length === 0) {
      return {};
    }
    
    const params = new URLSearchParams();
    symbols.forEach(symbol => params.append('symbols', symbol));
    
    // assetType에 따라 다른 엔드포인트를 호출
    const endpoint = assetType === 'crypto' ? '/realtime-prices/crypto' : '/realtime-prices/stock';
    
    try {
      const response = await api.get(`${endpoint}?${params.toString()}`);
      return response.data.prices || {};
    } catch (error) {
      console.error(`Failed to fetch ${assetType} prices:`, error);
      throw error;
    }
  },

  /**
   * 암호화폐 실시간 가격 조회
   * @param {string[]} symbols - 암호화폐 심볼 배열
   * @returns {Promise<Object>} - { SYMBOL: price } 형태의 객체
   */
  fetchCryptoPrices: async (symbols) => {
    return realtimePriceAPI.fetchRealtimePrices(symbols, 'crypto');
  },

  /**
   * 주식 실시간 가격 조회
   * @param {string[]} symbols - 주식 심볼 배열
   * @returns {Promise<Object>} - { SYMBOL: price } 형태의 객체
   */
  fetchStockPrices: async (symbols) => {
    return realtimePriceAPI.fetchRealtimePrices(symbols, 'stock');
  }
}

// 실시간 데이터 관리 API
export const realtimeAPI = {
  // 자산 테이블 데이터 조회
  getAssetsTable: (params) => api.get('/realtime/table', { params }),
  
  getIntradayOhlcv: (assetIdentifier, dataInterval = '4h', ohlcv = true, days = 1) =>
    api.get('/realtime/intraday-ohlcv', { params: { asset_identifier: assetIdentifier, data_interval: dataInterval, ohlcv, days } }),
  
  // PostgreSQL 전용 실시간 가격 데이터 조회
  getQuotesPricePg: (symbolOrId) => api.get('/realtime/pg/quotes-price', { params: { asset_identifier: symbolOrId } }),
  getQuotesDelayPricePg: (symbolOrId, dataInterval = '15m', days = 1) =>
    api.get('/realtime/pg/quotes-delay-price', { params: { asset_identifier: symbolOrId, data_interval: dataInterval, days } }),
  
  // 장기 OHLCV 데이터 (assets.py 엔드포인트)
  getAssetsOhlcv: (assetIdentifier, dataInterval = '1d', startDate = null, endDate = null, limit = 1000) => {
    const params = { data_interval: dataInterval, limit };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get(`/assets/ohlcv/${assetIdentifier}`, { params });
  },
  
  // 레거시 실시간 가격 데이터 조회
  getCryptoPrices: (symbols) => api.get('/realtime/prices/crypto', { params: { symbols } }),
  getStockPrices: (symbols) => api.get('/realtime/prices/stock', { params: { symbols } }),
  getTiingoPrices: (symbols) => api.get('/realtime/prices/tiingo', { params: { symbols } }),
  getPricesByType: (assetType, symbols) => api.get(`/realtime/prices/${assetType}`, { params: { symbols } }),
  
  // 실시간 데이터 수집기 시작/중지
  startCollectors: (assetTypes) => api.post('/realtime/collectors/run', { asset_types: assetTypes }),
  stopCollectors: (assetTypes) => api.post('/realtime/collectors/stop', { asset_types: assetTypes }),
  
  // 실시간 데이터 수집기 상태 조회
  getCollectorsStatus: () => api.get('/realtime/collectors/status'),
  
  // WebSocket 구독 관리
  getWSSubscriptions: () => api.get('/realtime/ws/subscriptions'),
  addWSSubscriptions: (tickers) => api.post('/realtime/ws/subscriptions/add', { tickers }),
  removeWSSubscriptions: (tickers) => api.post('/realtime/ws/subscriptions/remove', { tickers }),
}

// 기술적 분석 API
export const technicalAPI = {
  // 기술적 지표
  getTechnicalIndicators: (assetId, indicatorType = null, dataInterval = '1d', limit = 100) => {
    const params = new URLSearchParams({
      data_interval: dataInterval,
      limit: limit.toString(),
    })
    if (indicatorType) {
      params.append('indicator_type', indicatorType)
    }
    return api.get(`/technical-indicators/asset/${assetId}?${params}`)
  },
}

// 인덱스 관련 API
export const indexAPI = {
  // 인덱스 정보
  getIndexInfo: (assetId, limit = 10) => api.get(`/index-info/asset/${assetId}?limit=${limit}`),
}

// 스케줄러 관련 API
export const schedulerAPI = {
  // 스케줄러 상태 조회
  getSchedulerStatus: () => api.get('/scheduler/status'),
  
  // 기간별 스케줄러 상태 조회
  getSchedulerStatusByPeriod: (period) => api.get(`/scheduler/status/${period}`),
  
  // 스케줄러 시작/재시작
  startScheduler: () => api.post('/scheduler/restart'),
  
  // 스케줄러 트리거 (실제 데이터 수집 시작)
  triggerScheduler: () => api.post('/scheduler/trigger'),
  
  // 스케줄러 중지
  stopScheduler: () => api.post('/scheduler/stop'),
  
  // 스케줄러 일시정지
  pauseScheduler: () => api.post('/scheduler/pause'),
  
  // 스케줄러 로그 조회
  getSchedulerLogs: () => api.get('/scheduler/jobs/history'),
}

export default api
