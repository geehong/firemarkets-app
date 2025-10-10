// API 클라이언트 - 백엔드 엔드포인트와 통신
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1'

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      mode: 'cors',
      credentials: 'omit',
    }

    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    })
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  }

  // Assets API
  async getAssets() {
    return this.request('/assets')
  }

  async getAsset(id) {
    return this.request(`/assets/${id}`)
  }

  // Realtime API
  async getRealtimePricesPg(params) {
    const queryParams = new URLSearchParams()
    if (params.asset_identifier) {
      queryParams.append('asset_identifier', params.asset_identifier)
    }
    if (params.data_interval) {
      queryParams.append('data_interval', params.data_interval)
    }
    if (params.days) {
      queryParams.append('days', params.days)
    }
    
    const queryString = queryParams.toString()
    return this.request(`/realtime/pg/quotes-delay-price${queryString ? `?${queryString}` : ''}`)
  }

  // Crypto API
  async getCryptoData(id) {
    return this.request(`/crypto/${id}`)
  }

  // Dashboard API
  async getDashboardData() {
    return this.request('/dashboard')
  }

  // Tickers API
  async getTickers() {
    return this.request('/tickers')
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
