import axios from 'axios'
import cacheService from './cacheService'

// API 기본 설정
const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
})

// 캐싱이 적용된 API 클라이언트
const cachedApi = {
  get: async (endpoint, params = {}, options = {}) => {
    const { useCache = true, cacheTtl = 60000 } = options
    
    if (useCache) {
      // 캐시에서 데이터 확인
      const cachedData = cacheService.get(endpoint, params)
      if (cachedData) {
        return cachedData
      }
    }
    
    // API 호출
    const response = await api.get(endpoint, { params })
    
    if (useCache) {
      // 캐시에 저장
      cacheService.set(endpoint, params, response.data, { 
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
    return Promise.reject(error)
  },
)

// 자산 관련 API
export const assetAPI = {
  // 기본 자산 정보 (티커 또는 assetId로 조회 가능)
  getAsset: (assetId) => api.get(`/assets/${assetId}`),

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
