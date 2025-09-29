// 티커 관리 API 서비스
export const tickerAPI = {
  // 티커 목록 조회
  getTickers: async (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value)
      }
    })

    const response = await fetch(`/api/v1/tickers?${queryParams}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '티커 목록 조회에 실패했습니다.')
    }
    return response.json()
  },

  // 자산 타입 조회
  getAssetTypes: async () => {
    const response = await fetch('/api/v1/asset-types')
    if (!response.ok) {
      throw new Error('자산 타입을 불러오는 데 실패했습니다.')
    }
    return response.json()
  },

  // 티커 유효성 검사
  validateTicker: async (ticker) => {
    const response = await fetch(`/api/v1/tickers/validate/${ticker}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '티커 유효성 검사에 실패했습니다.')
    }
    return response.json()
  },

  // 티커 추가
  addTicker: async (tickerData) => {
    const response = await fetch('/api/v1/tickers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tickerData),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '티커 추가에 실패했습니다.')
    }
    return response.json()
  },

  // 티커 삭제
  deleteTicker: async (assetId) => {
    const response = await fetch(`/api/v1/tickers/${assetId}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '티커 삭제에 실패했습니다.')
    }
    return response.json()
  },

  // 개별 티커 설정 업데이트 (JSON 형식)
  updateTickerSettings: async ({ assetId, settings }) => {
    const response = await fetch(`/api/v1/tickers/${assetId}/collection-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '티커 설정 업데이트에 실패했습니다.')
    }
    return response.json()
  },

  // 데이터 수집 실행
  executeCollection: async (assetId) => {
    const response = await fetch(`/api/v1/tickers/${assetId}/execute-collection`, {
      method: 'POST',
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '데이터 수집 실행에 실패했습니다.')
    }
    return response.json()
  },

  // 수집 상태 조회
  getCollectionStatus: async (assetId) => {
    const response = await fetch(`/api/v1/tickers/${assetId}/collection-status`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '수집 상태 조회에 실패했습니다.')
    }
    return response.json()
  },

  // 일괄 티커 설정 업데이트
  bulkUpdateTickerSettings: async (updates) => {
    const response = await fetch('/api/v1/tickers/bulk-update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || '일괄 티커 설정 업데이트에 실패했습니다.')
    }
    return response.json()
  },
}
