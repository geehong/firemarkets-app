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

export function resolveApiBaseUrl(): string {
  // 0. 환경 변수 우선 확인 (Override)
  const envApiBase = process.env.NEXT_PUBLIC_BACKEND_API_BASE;
  const isClient = typeof window !== 'undefined';

  // [Server Side] Docker/Internal Network Priority
  if (!isClient && process.env.BACKEND_API_BASE) {
     return process.env.BACKEND_API_BASE;
  }

  // 1. 클라이언트 사이드 (브라우저) 환경 - 동적 감지 (Firemarkets.net 우선 처리)
  if (isClient && window.location && window.location.hostname) {
    const hostname = window.location.hostname;

    // 프로덕션 환경 (firemarkets.net) - 환경변수보다 우선순위 높임 (Relative path 방지)
    if (hostname.includes('firemarkets.net')) {
      // console.log('[resolveApiBaseUrl] Using Production API');
      return 'https://backend.firemarkets.net/api/v1';
    }
  }

  if (envApiBase) {
    // Client Side: Relative path is fine (e.g., /api/v1)
    if (isClient) {
      // console.log('[resolveApiBaseUrl] Using Env API Base (Client):', envApiBase);
      return envApiBase;
    }
    // Server Side: MUST be absolute. If env is relative, ignore it here and fallback to internal rules.
    else if (envApiBase.startsWith('http')) {
      // console.log('[resolveApiBaseUrl] Using Env API Base (Server):', envApiBase);
      return envApiBase;
    }
  }

  // 1. 클라이언트 사이드 (브라우저) 환경 - 나머지 케이스
  if (isClient) {
    // console.log('[resolveApiBaseUrl] Client default: /api/v1');
    return '/api/v1';
  }

  // 2. 서버 사이드 (SSR) 환경 - Docker 내부 통신 우선
  // docker-compose.yml에 설정된 BACKEND_API_BASE(http://backend:8000/api/v1) 사용
  const internalUrl = process.env.BACKEND_API_BASE || process.env.NEXT_PUBLIC_API_URL;
  if (internalUrl) {
    // console.log('[resolveApiBaseUrl] Server-side detected:', internalUrl);
    return internalUrl;
  }

  // 최후의 수단 (Internal Fallback)
  return 'http://backend:8000/api/v1';
}


export class ApiClient {
  private baseURL: string | null = null
  private accessToken: string | null = null

  constructor(baseURL?: string) {
    if (baseURL) {
      this.baseURL = baseURL
    }
  }

  private getBaseURL(): string {
    if (this.baseURL === null) {
      this.baseURL = resolveApiBaseUrl()
    }
    return this.baseURL
  }

  // v2 API Base URL (v1 URL에서 /v2로 변환)
  private getV2BaseURL(): string {
    return this.getBaseURL().replace('/api/v1', '/api/v2')
  }

  // v2 API 요청 메서드
  public async requestV2<T = any>(endpoint: string, init?: RequestInit & { silentStatusCodes?: number[] }): Promise<T> {
    const url = `${this.getV2BaseURL()}${endpoint}`

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    if (this.accessToken) {
      defaultHeaders['Authorization'] = `Bearer ${this.accessToken}`
    }

    try {
      const fetchOptions: RequestInit = {
        ...init,
        headers: { ...defaultHeaders, ...(init?.headers as Record<string, string> | undefined) },
        mode: 'cors',
        credentials: 'omit',
        signal: AbortSignal.timeout(30000)
      }

      const res = await fetch(url, fetchOptions)

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        const shouldLog = !init?.silentStatusCodes?.includes(res.status)

        if (shouldLog) {
          console.error(`[API V2 ERROR] ${res.status} ${res.statusText}:`, text)
        }

        const error = new Error(`API V2 Error: ${res.status} ${res.statusText} ${text}`)
          ; (error as any).status = res.status
        throw error
      }

      if (res.status === 204) {
        return {} as Promise<T>
      }

      const text = await res.text().catch(() => '')

      if (!text) {
        return {} as Promise<T>
      }

      try {
        return JSON.parse(text)
      } catch {
        return (text || {}) as unknown as Promise<T>
      }
    } catch (error: any) {
      if (error.status && init?.silentStatusCodes?.includes(error.status)) {
        throw error
      }

      console.error('[API V2 REQUEST FAILED]', { url, method: init?.method ?? 'GET', error: error.message })
      throw error
    }
  }



  public async request<T = any>(endpoint: string, init?: RequestInit & { silentStatusCodes?: number[] }): Promise<T> {
    const url = `${this.getBaseURL()}${endpoint}`

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    if (this.accessToken) {
      defaultHeaders['Authorization'] = `Bearer ${this.accessToken}`
    }
    try {
      const fetchOptions: RequestInit = {
        ...init,
        headers: { ...defaultHeaders, ...(init?.headers as Record<string, string> | undefined) },
        mode: 'cors',
        credentials: 'omit',
        // 네트워크 타임아웃 설정
        signal: AbortSignal.timeout(30000) // 30초 타임아웃
      }

      const res = await fetch(url, fetchOptions)

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        const shouldLog = !init?.silentStatusCodes?.includes(res.status)

        if (shouldLog) {
          console.error(`[API ERROR] ${res.status} ${res.statusText}:`, text)
        }

        const error = new Error(`API Error: ${res.status} ${res.statusText} ${text}`)
          ; (error as any).status = res.status
        throw error
      }

      if (res.status === 204) {
        return {} as Promise<T>
      }

      const text = await res.text().catch(() => '')

      if (!text) {
        return {} as Promise<T>
      }

      try {
        return JSON.parse(text)
      } catch {
        // JSON 파싱 실패 시, 텍스트가 있으면 텍스트 반환, 아니면 빈 객체
        return (text || {}) as unknown as Promise<T>
      }
    } catch (error: any) {
      // silentStatusCodes에 포함된 에러라면 로깅 스킵
      if (error.status && init?.silentStatusCodes?.includes(error.status)) {
        throw error
      }

      // 에러 객체를 분해해서 로깅 (console.error가 객체를 제대로 출력하지 못하는 경우가 있음)
      const errorDetails = {
        url,
        method: init?.method ?? 'GET',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };
      console.error('[API REQUEST FAILED]', JSON.stringify(errorDetails, null, 2));
      throw error
    }
  }



  // Realtime
  getRealtimeTable(params?: { assetTypeId?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
    const search = new URLSearchParams()
    if (params?.assetTypeId) search.append('asset_type_id', String(params.assetTypeId))
    if (params?.limit) search.append('limit', String(params.limit))
    if (params?.sortBy) search.append('sort_by', params.sortBy)
    if (params?.sortOrder) search.append('sort_order', params.sortOrder)
    const qs = search.toString()
    // V2 Migration: Using /api/v2/assets/overview/table
    return this.requestV2(`/assets/overview/table${qs ? `?${qs}` : ''}`, { headers: { 'Accept': 'application/json' } }).then(res => {
        // V2 might return data wrapped differently? 
        // Backend: AssetsTableResponse matches V1 schema.
        // URL prefix in axios might be /api/v1 by default?
        // Checking baseURL... usually /api/v1. 
        // If baseURL is /api/v1, we need to go up .. or absolute.
        // Let's assume request handles relative to base.
        // Use "v2" prefix if the base is generic, or "../v2" if base includes v1.
        // Code check needed for axios config.
        // Assuming this.request wraps axios which might have /api/v1 base.
        // Let's verify baseURL context. 
        // If I use `/api/v2/...` it should override if it's absolute path?
        // Usually axios relative paths append to baseURL.
        // If baseURL is `/api/v1`, then `/api/v2` is not possible unless we use full URL.
        // But let's assume `this.request` handles it or we simply replace the path.
        // Let's check `lib/api.ts` setup.
        return res;
    })
  }

  getQuotesPrice(assetIdentifiers: string[]) {
    const search = new URLSearchParams()
    // V2 widgets/ticker-summary takes comma separated string
    search.append('tickers', assetIdentifiers.join(','))
    const qs = search.toString()
    // V2: /assets/widgets/ticker-summary
    return this.requestV2(`/assets/widgets/ticker-summary${qs ? `?${qs}` : ''}`)
  }

  getDelayedQuotes(assetIdentifiers: string[], dataSource?: string, limit: number = 360, days: number | string = 1) {
    // V2 OHLCV is singular. We must parallel fetch.
    const requests = assetIdentifiers.map(id => {
        const search = new URLSearchParams()
        search.append('data_interval', '15m')
        // V2 matches limit logic roughly or we pass timestamp filters.
        // Assuming limit is sufficient.
        search.append('limit', limit.toString())
        return this.requestV2(`/assets/market/${id}/ohlcv?${search.toString()}`).then(res => {
            // V2 returns { data: [...] }. V1 expected object with `quotes`.
            // We verify who calls this. If it expects a list of objects per asset, we wrap it.
            // But getDelayedQuotes in V1 returned A LIST of mixed quotes? Or objects?
            // V1 /realtime/pg/quotes-delay-price returned { asset_identifier:..., quotes: [...] } OR list of such objects?
            // "RealtimeQuoteTimeDelay" objects list?
            // Actually in V1 `realtime.py`: 
            // if single: { asset_identifier, quotes: ... }
            // if multiple: { asset_identifier, quotes, count } ... wait.
            // V1 logic for multiple: returns { asset_identifier: "A,B", quotes: [ { asset_id: A... }, { asset_id: B... } ] } ??
            // No, V1 `realtime.py` line 720: returns { asset_identifier, quotes: processed_quotes ... }. 
            // processed_quotes is FLAT list? 
            // "quotes" contains MIXED assets?
            // Yes, "results.append(quote_dict)". 
            // So V1 returns ONE object with key "quotes" containing mingled data.
            // V2 returns separate objects.
            // We should ideally return { quotes: [ ...all data combined ] }
            return (res as any).data || [];
        }).catch(() => []);
    });

    return Promise.all(requests).then(results => {
        // Flatten
        const allQuotes = results.flat();
        return { quotes: allQuotes };
    });
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
    
    // Convert days to limit based on interval to get approximate last N days
    // 15m = 4 per hour * 24 = 96 per day
    let limit = 100; // default
    if (dataInterval === '1m') limit = 1440 * days;
    else if (dataInterval === '5m') limit = 288 * days;
    else if (dataInterval === '15m') limit = 96 * days;
    else if (dataInterval === '30m') limit = 48 * days;
    else if (dataInterval === '1h') limit = 24 * days;
    else if (dataInterval === '4h') limit = 6 * days;
    else if (dataInterval === '1d') limit = days; // usually more for daily chart but sparkline implies short term trend?
    
    // For sparkline, maybe we want slightly more to fill the chart? 
    // Just use limit.
    
    // Call V2 OHLCV
    // /assets/market/{id}/ohlcv?data_interval=...&limit=...
    search.append('data_interval', dataInterval);
    search.append('limit', String(limit + 5)); // bit buffer
    
    if (dataSource) {
      // V2 doesn't explicitly use data_source in query for ohlcv? 
      // It might if we added it, but standard is auto-detect or finnhub for stocks.
      // But ohlcv endpoint doesn't take data_source param in V2 currently (lines 457+ in market.py).
      // So ignore dataSource.
    }

    const qs = search.toString();
    return this.requestV2(`/assets/market/${assetIdentifier}/ohlcv${qs ? `?${qs}` : ''}`)
  }

  getRealtimePricesPg(params: { asset_identifier: string; data_interval?: string; days?: number | string; }) {
    const search = new URLSearchParams()
    if (params.asset_identifier) search.append('asset_identifier', params.asset_identifier)
    if (params.data_interval) search.append('data_interval', params.data_interval)
    if (params.days !== undefined) search.append('days', String(params.days))
    const qs = search.toString()
    return this.request(`/realtime/pg/quotes-delay-price${qs ? `?${qs}` : ''}`)
  }



  // Crypto
  getCryptoData(id: string) { return this.request(`/crypto/${id}`) }



  // Dashboard
  getDashboardData() { return this.request('/dashboard') }

  // Tickers
  getTickers() { return this.request('/tickers') }

  // On-chain metrics data (통합 엔드포인트 - price + metric + correlation)
  getOnchainMetricsData(assetId: string, metricId: string, params?: { limit?: number; time_range?: string }) {
    const search = new URLSearchParams();
    search.append('metrics', `price,${metricId}`);
    if (params?.limit) {
      search.append('limit', String(params.limit));
    } else if (!params?.time_range) {
      search.append('limit', '10000'); // Default limit only if no time_range provided
    }

    if (params?.time_range) search.append('time_range', params.time_range);

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



  // Onchain Metrics List
  getOnchainMetrics(ticker?: string) {
    const search = new URLSearchParams();
    if (ticker) search.append('ticker', ticker);
    const qs = search.toString();
    return this.request(`/onchain/metrics${qs ? `?${qs}` : ''}`);
  }

  // Onchain Dashboard Summary
  getOnchainDashboard(ticker?: string) {
    const search = new URLSearchParams();
    if (ticker) search.append('ticker', ticker);
    const qs = search.toString();
    return this.request(`/onchain/metrics/dashboard${qs ? `?${qs}` : ''}`);
  }

  // Onchain Metric Data
  getOnchainMetricData(metric: string, params?: {
    time_range?: string;
    limit?: number;
    start_date?: string;
    end_date?: string;
    ticker?: string;
  }) {
    const search = new URLSearchParams();
    if (params?.time_range) search.append('time_range', params.time_range);
    if (params?.limit) search.append('limit', String(params.limit));
    if (params?.start_date) search.append('start_date', params.start_date);
    if (params?.end_date) search.append('end_date', params.end_date);
    if (params?.ticker) search.append('ticker', params.ticker);
    const qs = search.toString();
    return this.request(`/onchain/metrics/${metric}/data${qs ? `?${qs}` : ''}`);
  }

  // Post APIs
  getPosts(params?: {
    page?: number;
    page_size?: number;
    status?: string;
    search?: string;
    category?: string;
    tag?: string;
    post_type?: string;
  }) {
    const search = new URLSearchParams();
    if (params?.page) search.append('page', String(params.page));
    if (params?.page_size) search.append('page_size', String(params.page_size));
    if (params?.status) search.append('status', params.status);
    if (params?.search) search.append('search', params.search);
    if (params?.category) search.append('category', params.category);
    if (params?.tag) search.append('tag', params.tag);
    if (params?.post_type) search.append('post_type', params.post_type);
    const qs = search.toString();

    // trailing slash로 리다이렉트 방지
    return this.request(`/posts/${qs ? `?${qs}` : ''}`);
  }

  getPost(slug: string) {
    // 슬러그 전용 엔드포인트 사용 및 리다이렉트 방지
    return this.request(`/posts/slug/${slug}`);
  }

  getHomePost() {
    return this.request('/posts/home');
  }

  getBlogCategories() {
    // backend route: /api/v1/posts/categories/
    return this.request('/posts/categories/');
  }

  getBlogTags() {
    // backend route: /api/v1/posts/tags/
    return this.request('/posts/tags/');
  }


  createBlog(data: any) {
    return this.request('/posts/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }


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


  createMenu(data: any) {
    return this.request('/navigation/menus', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }


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



  // Tags
  getAdminTags(params: { page?: number; limit?: number; search?: string; sort_by?: string; order?: 'asc' | 'desc' }) {
    const query = new URLSearchParams()
    if (params.page) query.append('page', params.page.toString())
    if (params.limit) query.append('limit', params.limit.toString())
    if (params.search) query.append('search', params.search)
    if (params.sort_by) query.append('sort_by', params.sort_by)
    if (params.order) query.append('order', params.order)

    return this.request(`/posts/tags/admin?${query.toString()}`)
  }

  createTag(data: { name: string; slug: string }) {
    return this.request(`/posts/tags/`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  updateTag(tagId: number, data: { name?: string; slug?: string }) {
    return this.request(`/posts/tags/${tagId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  deleteTag(tagId: number) {
    return this.request(`/posts/tags/${tagId}`, {
      method: 'DELETE'
    })
  }

  // Comments
  getPostComments(postId: number) {
    return this.request(`/posts/${postId}/comments`)
  }

  createPostComment(postId: number, data: { content: string; parent_id?: number }) {
    return this.request(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  getAdminComments(params: { page?: number; limit?: number; status?: string; search?: string }) {
    const query = new URLSearchParams()
    if (params.page) query.append('page', params.page.toString())
    if (params.limit) query.append('limit', params.limit.toString())
    if (params.status && params.status !== 'all') query.append('status', params.status)
    if (params.search) query.append('search', params.search)

    return this.request(`/posts/admin/comments?${query.toString()}`)
  }

  updateCommentStatus(commentId: number, status: string) {
    return this.request(`/posts/comments/${commentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    })
  }

  deletePostComment(commentId: number) {
    return this.request(`/posts/comments/${commentId}`, {
      method: 'DELETE'
    })
  }


  // Auth & Session Management
  setAccessToken(token: string) {
    this.accessToken = token
  }

  clearAccessToken() {
    this.accessToken = null
  }


  login(credentials: any) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    })
  }

  logout() {
    return this.request('/auth/logout', {
      method: 'POST',
      silentStatusCodes: [401]
    })
  }

  refreshToken(token: string) {
    return this.request(`/auth/refresh?refresh_token=${token}`, {
      method: 'POST'
    })
  }

  getMe() {
    return this.request('/auth/me')
  }

  // ============================================================================
  // API v2 Methods (Modular Asset APIs)
  // ============================================================================

  // --- V2 Core Module ---
  v2GetAssetTypes(params?: { has_data?: boolean; include_description?: boolean }) {
    const search = new URLSearchParams()
    if (params?.has_data !== undefined) search.append('has_data', String(params.has_data))
    if (params?.include_description !== undefined) search.append('include_description', String(params.include_description))
    const qs = search.toString()
    return this.requestV2(`/assets/core/types${qs ? `?${qs}` : ''}`)
  }

  v2GetAssets(params?: { type_name?: string; has_ohlcv_data?: boolean; search?: string; limit?: number; offset?: number }) {
    const search = new URLSearchParams()
    if (params?.type_name) search.append('type_name', params.type_name)
    if (params?.has_ohlcv_data !== undefined) search.append('has_ohlcv_data', String(params.has_ohlcv_data))
    if (params?.search) search.append('search', params.search)
    if (params?.limit) search.append('limit', String(params.limit))
    if (params?.offset) search.append('offset', String(params.offset))
    const qs = search.toString()
    return this.requestV2(`/assets/core${qs ? `?${qs}` : ''}`)
  }

  v2GetAssetMetadata(assetIdentifier: string) {
    return this.requestV2(`/assets/core/${assetIdentifier}/metadata`)
  }

  v2SearchAssets(query: string, params?: { type_name?: string; limit?: number }) {
    const search = new URLSearchParams()
    search.append('query', query)
    if (params?.type_name) search.append('type_name', params.type_name)
    if (params?.limit) search.append('limit', String(params.limit))
    const qs = search.toString()
    return this.requestV2(`/assets/core/search?${qs}`)
  }

  // --- V2 Market Module ---
  v2GetOhlcv(assetIdentifier: string, params?: { data_interval?: string; start_date?: string; end_date?: string; limit?: number }, options?: RequestInit & { silentStatusCodes?: number[] }) {
    const search = new URLSearchParams()
    if (params?.data_interval) search.append('data_interval', params.data_interval)
    if (params?.start_date) search.append('start_date', params.start_date)
    if (params?.end_date) search.append('end_date', params.end_date)
    if (params?.limit) search.append('limit', String(params.limit))
    const qs = search.toString()
    return this.requestV2(`/assets/market/${assetIdentifier}/ohlcv${qs ? `?${qs}` : ''}`, options)
  }

  v2GetPrice(assetIdentifier: string) {
    return this.requestV2(`/assets/market/${assetIdentifier}/price`)
  }

  v2GetPriceHistory(assetIdentifier: string, period: string = '1m') {
    return this.requestV2(`/assets/market/${assetIdentifier}/history?period=${period}`)
  }

  // --- V2 Detail Module ---
  v2GetProfile(assetIdentifier: string) {
    return this.requestV2(`/assets/detail/${assetIdentifier}/profile`)
  }

  v2GetFinancials(assetIdentifier: string, limit: number = 10) {
    return this.requestV2(`/assets/detail/${assetIdentifier}/financials?limit=${limit}`)
  }

  v2GetCryptoInfo(assetIdentifier: string) {
    return this.requestV2(`/assets/detail/${assetIdentifier}/crypto-info`)
  }

  v2GetEtfInfo(assetIdentifier: string) {
    return this.requestV2(`/assets/detail/${assetIdentifier}/etf-info`)
  }

  v2GetEtfSectors(assetIdentifier: string) {
    return this.requestV2(`/assets/detail/${assetIdentifier}/etf-sectors`)
  }

  v2GetEtfHoldings(assetIdentifier: string, limit: number = 50) {
    return this.requestV2(`/assets/detail/${assetIdentifier}/etf-holdings?limit=${limit}`)
  }

  v2GetIndexInfo(assetIdentifier: string) {
    return this.requestV2(`/assets/detail/${assetIdentifier}/index-info`)
  }

  // --- V2 Analysis Module ---
  v2GetTechnicals(assetIdentifier: string, params?: { indicator_type?: string; data_interval?: string; limit?: number }) {
    const search = new URLSearchParams()
    if (params?.indicator_type) search.append('indicator_type', params.indicator_type)
    if (params?.data_interval) search.append('data_interval', params.data_interval)
    if (params?.limit) search.append('limit', String(params.limit))
    const qs = search.toString()
    return this.requestV2(`/assets/analysis/${assetIdentifier}/technicals${qs ? `?${qs}` : ''}`)
  }

  v2GetEstimates(assetIdentifier: string, limit: number = 10) {
    return this.requestV2(`/assets/analysis/${assetIdentifier}/estimates?limit=${limit}`)
  }

  v2GetCryptoMetrics(assetIdentifier: string) {
    return this.requestV2(`/assets/analysis/${assetIdentifier}/crypto-metrics`)
  }

  v2GetTreemap(params?: { asset_type_id?: number; type_name?: string; limit?: number }) {
    const search = new URLSearchParams()
    if (params?.asset_type_id) search.append('asset_type_id', String(params.asset_type_id))
    if (params?.type_name) search.append('type_name', params.type_name)
    if (params?.limit) search.append('limit', String(params.limit))
    const qs = search.toString()
    return this.requestV2(`/assets/analysis/treemap${qs ? `?${qs}` : ''}`)
  }

  v2GetMarketCaps(params?: { type_name?: string; limit?: number; offset?: number }) {
    const search = new URLSearchParams()
    if (params?.type_name) search.append('type_name', params.type_name)
    if (params?.limit) search.append('limit', String(params.limit))
    if (params?.offset) search.append('offset', String(params.offset))
    const qs = search.toString()
    return this.requestV2(`/assets/analysis/market-caps${qs ? `?${qs}` : ''}`)
  }

  // --- V2 Overview Module ---
  v2GetOverview(assetIdentifier: string, lang: string = 'ko', options?: RequestInit & { silentStatusCodes?: number[] }) {
    return this.requestV2(`/assets/overview/${assetIdentifier}?lang=${lang}`, options)
  }

  v2GetOverviewBundle(assetIdentifier: string, lang: string = 'ko') {
    return this.requestV2(`/assets/overview/${assetIdentifier}/bundle?lang=${lang}`)
  }

  v2GetStockOverview(assetIdentifier: string) {
    return this.requestV2(`/assets/overview/${assetIdentifier}/stock`)
  }

  v2GetCryptoOverview(assetIdentifier: string) {
    return this.requestV2(`/assets/overview/${assetIdentifier}/crypto`)
  }

  v2GetEtfOverview(assetIdentifier: string) {
    return this.requestV2(`/assets/overview/${assetIdentifier}/etf`)
  }

  v2GetCommonOverview(assetIdentifier: string, options?: RequestInit & { silentStatusCodes?: number[] }) {
    return this.requestV2(`/assets/overview/${assetIdentifier}/common`, options)
  }

  // --- V2 Widgets Module ---
  v2GetTickerSummary(tickers: string[]) {
    return this.requestV2(`/assets/widgets/ticker-summary?tickers=${tickers.join(',')}`)
  }

  v2GetMarketMovers(params?: { type_name?: string; direction?: 'gainers' | 'losers'; limit?: number }) {
    const search = new URLSearchParams()
    if (params?.type_name) search.append('type_name', params.type_name)
    if (params?.direction) search.append('direction', params.direction)
    if (params?.limit) search.append('limit', String(params.limit))
    const qs = search.toString()
    return this.requestV2(`/assets/widgets/market-movers${qs ? `?${qs}` : ''}`)
  }

  v2GetQuickStats<T = any>() {
    return this.requestV2<T>('/assets/widgets/quick-stats')
  }
}

// API 클라이언트 인스턴스 생성
export const apiClient = new ApiClient()
