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
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  if (envUrl) {
    console.log('Using NEXT_PUBLIC_API_URL:', envUrl)
    return envUrl
  }
  
  // 하드코딩된 백엔드 URL 사용
  const hardcodedUrl = 'http://firemarkets.net:8001/api/v1'
  console.log('Using hardcoded API URL:', hardcodedUrl)
  return hardcodedUrl
  
  // 기존 로직 (백업용)
  // if (typeof window !== 'undefined') {
  //   try {
  //     const { protocol, hostname, port } = window.location
  //     const apiUrl = `${protocol}//${hostname}:8001/api/v1`
  //     console.log('Resolved API URL:', apiUrl, 'from window.location:', { protocol, hostname, port })
  //     return apiUrl
  //   } catch (_) {}
  // }
  // const fallbackUrl = 'http://localhost:8001/api/v1'
  // console.log('Using fallback API URL:', fallbackUrl)
  // return fallbackUrl
}

export class ApiClient {
  private readonly baseURL: string

  constructor(baseURL: string = resolveApiBaseUrl()) {
    this.baseURL = baseURL
  }

  private async request<T = any>(endpoint: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
    const res = await fetch(url, {
      ...init,
      headers: { ...defaultHeaders, ...(init?.headers as Record<string, string> | undefined) },
      mode: 'cors',
      credentials: 'omit',
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`API Error: ${res.status} ${res.statusText} ${text}`)
    }
    return res.json() as Promise<T>
  }

  // Assets
  getAssets() { return this.request('/assets') }
  getAsset(id: string) { return this.request(`/assets/${id}`) }

  // Realtime
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
}

export const apiClient = new ApiClient()
