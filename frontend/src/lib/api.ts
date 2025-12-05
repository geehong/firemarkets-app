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
    return envUrl;
  }

  // 모든 환경에서 프로덕션 API 사용
  return 'https://backend.firemarkets.net/api/v1';
}


export class ApiClient {
  private readonly baseURL: string

  constructor(baseURL: string = resolveApiBaseUrl()) {
    this.baseURL = baseURL
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async request<T = any>(endpoint: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
    try {
      const fetchOptions: RequestInit = {
        ...init,
        headers: { ...defaultHeaders, ...(init?.headers as Record<string, string> | undefined) },
        mode: 'cors',
        credentials: 'omit',
        // 네트워크 타임아웃 설정
        signal: AbortSignal.timeout(10000) // 10초 타임아웃
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

  getAssetPrice(assetIdentifier: string, params?: {
    dataInterval?: string
    startDate?: string
    endDate?: string
    limit?: number
  }) {
    const search = new URLSearchParams()
    if (params?.dataInterval) search.append('data_interval', params.dataInterval)
    if (params?.startDate) search.append('start_date', params.startDate)
    if (params?.endDate) search.append('end_date', params.endDate)
    if (params?.limit) search.append('limit', String(params.limit))
    const qs = search.toString()
    return this.request(`/assets/price/${assetIdentifier}${qs ? `?${qs}` : ''}`)
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

  getDelayedQuotes(assetIdentifiers: string[], dataSource?: string, limit: number = 360, days: number | string = 1) {
    const search = new URLSearchParams()
    assetIdentifiers.forEach(id => search.append('asset_identifier', id))
    search.append('data_interval', '15m')
    search.append('days', String(days)) // 기본 1일, 필요 시 조정
    search.append('limit', limit.toString()) // 24*15 = 360개 포인트
    if (dataSource) {
      search.append('data_source', dataSource)
    }
    const qs = search.toString()
    return this.request(`/realtime/pg/quotes-delay-price${qs ? `?${qs}` : ''}`)
  }

  getDelayedQuoteLast(assetIdentifier: string, dataInterval: string = '15m', dataSource?: string) {
    const search = new URLSearchParams()
    search.append('asset_identifier', assetIdentifier)
    search.append('data_interval', dataInterval)
    search.append('days', 'last')
    // dataSource가 제공된 경우에만 추가 (암호화폐일 때만 binance 사용)
    if (dataSource) {
      search.append('data_source', dataSource)
    }
    return this.request(`/realtime/pg/quotes-delay-price?${search.toString()}`)
  }

  // Sparkline Price (주식/ETF용 - 유효성 검증 포함)
  getSparklinePrice(assetIdentifier: string, dataInterval: string = '15m', days: number = 1, dataSource?: string) {
    const search = new URLSearchParams()
    search.append('asset_identifier', assetIdentifier)
    search.append('data_interval', dataInterval)
    search.append('days', String(days))
    if (dataSource) {
      search.append('data_source', dataSource)
    }
    const qs = search.toString()
    return this.request(`/realtime/sparkline-price${qs ? `?${qs}` : ''}`)
  }

  getRealtimePricesPg(params: { asset_identifier: string; data_interval?: string; days?: number | string; }) {
    const search = new URLSearchParams()
    if (params.asset_identifier) search.append('asset_identifier', params.asset_identifier)
    if (params.data_interval) search.append('data_interval', params.data_interval)
    if (params.days !== undefined) search.append('days', String(params.days))
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
    const url = `/realtime/intraday-ohlcv${qs ? `?${qs}` : ''}`
    console.log('[ApiClient.getIntradayOhlcv] Request URL:', url, {
      params,
      data_interval: params.data_interval ?? '4h (default)',
      limit: params.limit
    })
    return this.request(url)
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

  // Comparison Cycle Data
  getComparisonCycleData(
    eraNumber: number,
    params?: {
      normalizeToPrice?: number
      assetIdentifiers?: string
    }
  ) {
    const search = new URLSearchParams()
    if (params?.normalizeToPrice) search.append('normalize_to_price', String(params.normalizeToPrice))
    if (params?.assetIdentifiers) search.append('asset_identifiers', params.assetIdentifiers)
    const qs = search.toString()
    return this.request(`/crypto/bitcoin/comparison-cycle-data/${eraNumber}${qs ? `?${qs}` : ''}`)
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

  // Update Asset Overview - 자산 개요 정보 업데이트
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateAssetOverview(assetIdentifier: string, data: Record<string, any>) {
    return this.request(`/assets/overview/${assetIdentifier}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Asset Overviews - 새로운 뷰 기반 엔드포인트
  getStockInfo(assetIdentifier: string) {
    return this.request(`/asset-overviews/stock/${assetIdentifier}`);
  }

  getCryptoInfo(assetIdentifier: string) {
    return this.request(`/asset-overviews/crypto/${assetIdentifier}`);
  }

  getETFInfo(assetIdentifier: string) {
    return this.request(`/asset-overviews/etf/${assetIdentifier}`);
  }

  getAssetInfo(assetIdentifier: string) {
    return this.request(`/asset-overviews/common/${assetIdentifier}`);
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

  // Post APIs
  getPosts(params?: {
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
    return this.request(`/posts/${qs ? `?${qs}` : ''}`);
  }

  getPost(slug: string) {
    // 슬러그 전용 엔드포인트 사용 및 리다이렉트 방지
    return this.request(`/posts/slug/${slug}`);
  }

  getBlogCategories() {
    // backend route: /api/v1/posts/categories/
    return this.request('/posts/categories/');
  }

  getBlogTags() {
    // backend route: /api/v1/posts/tags/
    return this.request('/posts/tags/');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createBlog(data: any) {
    return this.request('/posts/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateBlog(id: number, data: any) {
    return this.request(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }


  deleteBlog(id: number) {
    return this.request(`/posts/${id}`, {
      method: 'DELETE'
    });
  }

  // Menu Management
  getMenus() {
    return this.request('/navigation/menus');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createMenu(data: any) {
    return this.request('/navigation/menus', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateMenu(id: number, data: any) {
    return this.request(`/navigation/menus/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  deleteMenu(id: number) {
    return this.request(`/navigation/menus/${id}`, {
      method: 'DELETE'
    });
  }

  // System Logs
  getSystemLogs(params?: { limit?: number; level?: string; module?: string }) {
    const search = new URLSearchParams()
    if (params?.limit) search.append('limit', String(params.limit))
    if (params?.level) search.append('level', params.level)
    if (params?.module) search.append('module', params.module)
    const qs = search.toString()
    return this.request(`/logs/system${qs ? `?${qs}` : ''}`)
  }

  getSystemLogsSummary(days: number = 7) {
    return this.request(`/logs/system/summary?days=${days}`)
  }

  clearSystemLogs(days: number = 30) {
    return this.request(`/logs/system?days=${days}`, {
      method: 'DELETE'
    })
  }

  // Scheduler Logs
  getSchedulerLogs(params?: { limit?: number; status?: string; job_name?: string }) {
    const search = new URLSearchParams()
    if (params?.limit) search.append('limit', String(params.limit))
    if (params?.status) search.append('status', params.status)
    if (params?.job_name) search.append('job_name', params.job_name)
    const qs = search.toString()
    return this.request(`/logs/scheduler${qs ? `?${qs}` : ''}`)
  }

  getSchedulerLogsSummary(days: number = 7) {
    return this.request(`/logs/scheduler/summary?days=${days}`)
  }

  clearSchedulerLogs(days: number = 30) {
    return this.request(`/logs/scheduler?days=${days}`, {
      method: 'DELETE'
    })
  }

  // API Logs
  getApiLogs(params?: { limit?: number; endpoint?: string; status_code?: number; method?: string }) {
    const search = new URLSearchParams()
    if (params?.limit) search.append('limit', String(params.limit))
    if (params?.endpoint) search.append('endpoint', params.endpoint)
    if (params?.status_code) search.append('status_code', String(params.status_code))
    if (params?.method) search.append('method', params.method)
    const qs = search.toString()
    return this.request(`/logs/api${qs ? `?${qs}` : ''}`)
  }

  getApiLogsSummary(days: number = 7) {
    return this.request(`/logs/api/summary?days=${days}`)
  }

  clearApiLogs(days: number = 30) {
    return this.request(`/logs/api?days=${days}`, {
      method: 'DELETE'
    })
  }
}

// API 클라이언트 인스턴스 생성
export const apiClient = new ApiClient()
