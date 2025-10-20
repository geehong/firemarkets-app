export type FetchOptions = {
  method?: string
  headers?: Record<string, string>
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  next?: RequestInit['next']
}

function buildUrl(path: string, query?: FetchOptions['query']) {
  if (!query) return path
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue
    params.set(k, String(v))
  }
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

export async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const url = buildUrl(path, opts.query)
  const init: RequestInit = {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers ?? {}),
    },
    next: opts.next,
  }
  if (opts.body !== undefined) {
    init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)
  }
  const res = await fetch(url, init)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${init.method} ${url} failed: ${res.status} ${res.statusText} ${text}`)
  }
  return res.json() as Promise<T>
}

// ---- High-level API client (TS) ----

function resolveApiBaseUrl(): string {
  // 환경 변수가 명시적으로 설정된 경우 우선 사용
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_BASE;
  if (envUrl) {
    console.log('🔧 Using environment variable:', envUrl);
    return envUrl;
  }

  // 서버사이드 렌더링 시 Docker 환경 감지
  if (typeof window === 'undefined') {
    // Docker 환경에서 서버사이드 렌더링
    if (process.env.BACKEND_API_BASE) {
      console.log('🐳 Docker server-side detected, using:', process.env.BACKEND_API_BASE);
      return process.env.BACKEND_API_BASE;
    }
    
    // 프로덕션 환경 감지 (서버사이드)
    if (process.env.NODE_ENV === 'production') {
      const prodUrl = 'https://backend.firemarkets.net/api/v1';
      console.log('🌐 Production server-side detected, using:', prodUrl);
      return prodUrl;
    }
    
    // 로컬 개발 환경 (서버사이드) - 항상 HTTP 사용
    const localUrl = 'http://localhost:8001/api/v1';
    console.log('🏠 Local development server-side, using:', localUrl);
    return localUrl;
  }

  // 브라우저 환경에서 호스트 기반으로 결정
  const hostname = window.location.hostname;
  console.log('🔍 Current hostname:', hostname);
  
  // 프로덕션 도메인인 경우에만 HTTPS 사용
  if (hostname.includes('firemarkets.net') && !hostname.includes('localhost')) {
    const prodUrl = 'https://backend.firemarkets.net/api/v1';
    console.log('🌐 Production domain detected, using HTTPS:', prodUrl);
    return prodUrl;
  }
  
  // 로컬 개발 환경 (브라우저에서는 항상 HTTP 사용)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const localUrl = 'http://localhost:8001/api/v1';
    console.log('🏠 Local development detected (Browser):', localUrl);
    return localUrl;
  }

  // 기본값 - 항상 HTTP 사용 (로컬 개발 환경)
  const defaultUrl = 'http://localhost:8001/api/v1';
  console.log('⚙️ Using default URL:', defaultUrl);
  return defaultUrl;
}


export class ApiClient {
  private readonly baseURL: string

  constructor(baseURL: string = resolveApiBaseUrl()) {
    this.baseURL = baseURL
    console.log('🚀 ApiClient initialized with baseURL:', this.baseURL)
  }

  private async request<T = any>(endpoint: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    console.log('📡 Making request to:', url)
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
    try {
      const fetchOptions: RequestInit = {
        ...init,
        headers: { ...defaultHeaders, ...(init?.headers as Record<string, string> | undefined) },
        mode: 'cors',
        credentials: 'omit'
      }
      
      const res = await fetch(url, fetchOptions)
      
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error(`[API ERROR] ${res.status} ${res.statusText}:`, text)
        throw new Error(`API Error: ${res.status} ${res.statusText} ${text}`)
      }
      
      return res.json() as Promise<T>
    } catch (error) {
      console.error('[API REQUEST FAILED]', {
        url,
        method: init?.method ?? 'GET',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name
      })
      throw error
    }
  }

  // Assets
  getAssets(params?: { assetTypeId?: number; limit?: number; offset?: number; search?: string }) {
    const search = new URLSearchParams()
    if (params?.assetTypeId) search.append('asset_type_id', String(params.assetTypeId))
    if (params?.limit) search.append('limit', String(params.limit))
    if (params?.offset) search.append('offset', String(params.offset))
    if (params?.search) search.append('search', params.search)
    const qs = search.toString()
    return this.request(`/assets${qs ? `?${qs}` : ''}`)
  }
  
  getAsset(id: string) { return this.request(`/assets/${id}`) }
  
  getAssetTypes(params?: { hasData?: boolean; includeDescription?: boolean }) {
    const search = new URLSearchParams()
    if (params?.hasData !== undefined) search.append('has_data', String(params.hasData))
    if (params?.includeDescription !== undefined) search.append('include_description', String(params.includeDescription))
    const qs = search.toString()
    return this.request(`/assets/asset-types${qs ? `?${qs}` : ''}`)
  }
  
  getAssetDetail(assetIdentifier: string) {
    return this.request(`/assets/${assetIdentifier}`)
  }
  
  getAssetPrice(assetIdentifier: string) {
    return this.request(`/assets/price/${assetIdentifier}`)
  }
  
  getMarketCaps(params?: { assetTypeId?: number; limit?: number }) {
    const search = new URLSearchParams()
    if (params?.assetTypeId) search.append('asset_type_id', String(params.assetTypeId))
    if (params?.limit) search.append('limit', String(params.limit))
    const qs = search.toString()
    return this.request(`/assets/market-caps${qs ? `?${qs}` : ''}`)
  }

  // Realtime
  getRealtimeTable(params?: { assetTypeId?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
    const search = new URLSearchParams()
    if (params?.assetTypeId) search.append('asset_type_id', String(params.assetTypeId))
    if (params?.limit) search.append('limit', String(params.limit))
    if (params?.sortBy) search.append('sort_by', params.sortBy)
    if (params?.sortOrder) search.append('sort_order', params.sortOrder)
    const qs = search.toString()
    return this.request(`/realtime/table${qs ? `?${qs}` : ''}`)
  }
  
  getQuotesPrice(assetIdentifiers: string[]) {
    const search = new URLSearchParams()
    assetIdentifiers.forEach(id => search.append('asset_identifier', id))
    const qs = search.toString()
    return this.request(`/realtime/pg/quotes-price${qs ? `?${qs}` : ''}`)
  }
  
  getDelayedQuotes(assetIdentifiers: string[]) {
    const search = new URLSearchParams()
    assetIdentifiers.forEach(id => search.append('asset_identifier', id))
    const qs = search.toString()
    return this.request(`/realtime/pg/quotes-delay-price${qs ? `?${qs}` : ''}`)
  }
  
  getRealtimePricesPg(params: { asset_identifier: string; data_interval?: string; days?: number; }) {
    const search = new URLSearchParams()
    if (params.asset_identifier) search.append('asset_identifier', params.asset_identifier)
    if (params.data_interval) search.append('data_interval', params.data_interval)
    if (typeof params.days === 'number') search.append('days', String(params.days))
    const qs = search.toString()
    return this.request(`/realtime/pg/quotes-delay-price${qs ? `?${qs}` : ''}`)
  }

  // Assets OHLCV - main OHLCV endpoint with more flexibility
  getAssetsOhlcv(params: { asset_identifier: string; data_interval?: string; start_date?: string; end_date?: string; limit?: number; }) {
    const search = new URLSearchParams()
    search.append('data_interval', params.data_interval ?? '1d')
    if (params.start_date) search.append('start_date', params.start_date)
    if (params.end_date) search.append('end_date', params.end_date)
    if (params.limit) search.append('limit', String(params.limit))
    const qs = search.toString()
    return this.request(`/assets/ohlcv/${params.asset_identifier}${qs ? `?${qs}` : ''}`)
  }

  // Realtime (fallback) - intraday OHLCV from MySQL API
  getIntradayOhlcv(params: { asset_identifier: string; data_interval?: string; ohlcv?: boolean; days?: number; limit?: number; }) {
    const search = new URLSearchParams()
    if (params.asset_identifier) search.append('asset_identifier', params.asset_identifier)
    search.append('data_interval', params.data_interval ?? '4h')
    search.append('ohlcv', String(params.ohlcv ?? true))
    search.append('days', String(params.days ?? 1))
    if (params.limit) search.append('limit', String(params.limit))
    const qs = search.toString()
    return this.request(`/realtime/intraday-ohlcv${qs ? `?${qs}` : ''}`)
  }

  // Crypto
  getCryptoData(id: string) { return this.request(`/crypto/${id}`) }
  
  getCryptoMetrics(assetIdentifier: string) {
    return this.request(`/assets/${assetIdentifier}/crypto-metrics`)
  }
  
  getTechnicalIndicators(assetIdentifier: string, params?: { indicators?: string[]; period?: number }) {
    const search = new URLSearchParams()
    if (params?.indicators) params.indicators.forEach(indicator => search.append('indicators', indicator))
    if (params?.period) search.append('period', String(params.period))
    const qs = search.toString()
    return this.request(`/assets/${assetIdentifier}/technical-indicators${qs ? `?${qs}` : ''}`)
  }
  
  getCryptoMarketOverview(params?: { limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
    const search = new URLSearchParams()
    if (params?.limit) search.append('limit', String(params.limit))
    if (params?.sortBy) search.append('sort_by', params.sortBy)
    if (params?.sortOrder) search.append('sort_order', params.sortOrder)
    const qs = search.toString()
    return this.request(`/crypto/market-overview${qs ? `?${qs}` : ''}`)
  }

  // Dashboard
  getDashboardData() { return this.request('/dashboard') }

  // Tickers
  getTickers() { return this.request('/tickers') }

  // On-chain metrics data (통합 엔드포인트 - price + metric + correlation)
  getOnchainMetricsData(assetId: string, metricId: string, limit: number = 10000) {
    const search = new URLSearchParams();
    search.append('metrics', `price,${metricId}`);
    search.append('limit', String(limit));
    search.append('compute', 'correlation');
    const qs = search.toString();
    return this.request(`/metrics/${assetId}${qs ? `?${qs}` : ''}`);
  }

  // Halving data
  getHalvingData(period: number, startPrice: number) {
    const search = new URLSearchParams();
    search.append('include_ohlcv', 'false');
    search.append('normalize_to_price', String(startPrice));
    const qs = search.toString();
    return this.request(`/crypto/bitcoin/halving-data/${period}${qs ? `?${qs}` : ''}`);
  }

  // Bitcoin Halving Summary
  getHalvingSummary() {
    return this.request('/crypto/bitcoin/halving-summary');
  }

  // Next Halving Info
  getNextHalvingInfo() {
    return this.request('/crypto/bitcoin/next-halving');
  }

  // Crypto Data by Asset
  getCryptoDataByAsset(assetIdentifier: string) {
    return this.request(`/crypto/data/asset/${assetIdentifier}`);
  }

  // Top Cryptos
  getTopCryptos(limit: number = 100) {
    const search = new URLSearchParams();
    search.append('limit', String(limit));
    const qs = search.toString();
    return this.request(`/crypto/top${qs ? `?${qs}` : ''}`);
  }

  // Update Crypto Data
  updateCryptoData(symbol: string) {
    return this.request(`/crypto/update/${symbol}`, {
      method: 'POST'
    });
  }

  // Global Crypto Metrics
  getGlobalCryptoMetrics() {
    return this.request('/crypto/global-metrics');
  }

  // TreeMap Live Data (optional filters)
  getTreemapLiveData(params?: { asset_type_id?: number; type_name?: string }) {
    const search = new URLSearchParams();
    if (typeof params?.asset_type_id === 'number') search.append('asset_type_id', String(params.asset_type_id));
    if (params?.type_name) search.append('type_name', params.type_name);
    const qs = search.toString();
    return this.request(`/assets/treemap/live${qs ? `?${qs}` : ''}`);
  }

  // Assets Overview - 통합 자산 개요 데이터
  getAssetOverview(assetIdentifier: string) {
    return this.request(`/assets/overview/${assetIdentifier}`);
  }

  // Assets List with filters
  getAssetsList(params?: { 
    type_name?: string; 
    has_ohlcv_data?: boolean; 
    limit?: number; 
    offset?: number;
    search?: string;
  }) {
    const search = new URLSearchParams();
    if (params?.type_name) search.append('type_name', params.type_name);
    if (params?.has_ohlcv_data !== undefined) search.append('has_ohlcv_data', String(params.has_ohlcv_data));
    if (params?.limit) search.append('limit', String(params.limit));
    if (params?.offset) search.append('offset', String(params.offset));
    if (params?.search) search.append('search', params.search);
    const qs = search.toString();
    return this.request(`/assets/assets${qs ? `?${qs}` : ''}`);
  }

  // Onchain Metrics List
  getOnchainMetrics() {
    return this.request('/onchain/metrics');
  }

  // Onchain Metric Data
  getOnchainMetricData(metric: string, params?: { 
    time_range?: string; 
    limit?: number;
    start_date?: string;
    end_date?: string;
  }) {
    const search = new URLSearchParams();
    if (params?.time_range) search.append('time_range', params.time_range);
    if (params?.limit) search.append('limit', String(params.limit));
    if (params?.start_date) search.append('start_date', params.start_date);
    if (params?.end_date) search.append('end_date', params.end_date);
    const qs = search.toString();
    return this.request(`/onchain/metrics/${metric}/data${qs ? `?${qs}` : ''}`);
  }

  // Performance TreeMap Data (for AssetsList)
  getPerformanceTreeMap(params?: { asset_type_id?: number; type_name?: string }) {
    const search = new URLSearchParams();
    if (typeof params?.asset_type_id === 'number') search.append('asset_type_id', String(params.asset_type_id));
    if (params?.type_name) search.append('type_name', params.type_name);
    const qs = search.toString();
    return this.request(`/assets/treemap/live${qs ? `?${qs}` : ''}`);
  }

  // Blog APIs
  getBlogs(params?: { 
    page?: number; 
    page_size?: number; 
    status?: string; 
    search?: string; 
    category?: string; 
    tag?: string; 
  }) {
    const search = new URLSearchParams();
    if (params?.page) search.append('page', String(params.page));
    if (params?.page_size) search.append('page_size', String(params.page_size));
    if (params?.status) search.append('status', params.status);
    if (params?.search) search.append('search', params.search);
    if (params?.category) search.append('category', params.category);
    if (params?.tag) search.append('tag', params.tag);
    const qs = search.toString();
    
    // trailing slash로 리다이렉트 방지
    return this.request(`/blogs/${qs ? `?${qs}` : ''}`);
  }

  getBlog(slug: string) {
    // 슬러그 전용 엔드포인트 사용 및 리다이렉트 방지
    return this.request(`/blogs/slug/${slug}`);
  }

  getBlogCategories() {
    // backend route: /api/v1/blogs/categories/
    return this.request('/blogs/categories/');
  }

  getBlogTags() {
    // backend route: /api/v1/blogs/tags/
    return this.request('/blogs/tags/');
  }

  createBlog(data: any) {
    return this.request('/blogs/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  updateBlog(id: number, data: any) {
    return this.request(`/blogs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  deleteBlog(id: number) {
    return this.request(`/blogs/${id}`, {
      method: 'DELETE'
    });
  }
}

// API 클라이언트 인스턴스 생성
export const apiClient = new ApiClient()
