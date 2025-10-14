// Parameter and endpoint specifications with TypeScript types

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface ParamDescriptor {
  type: "string" | "number" | "boolean"
  required?: boolean
  optional?: boolean
  default?: string | number | boolean
  description?: string
}

export interface EndpointSpec {
  path: string
  method: HttpMethod
  params?: Record<string, ParamDescriptor>
  pathParams?: Record<string, ParamDescriptor>
  bodyParams?: Record<string, ParamDescriptor>
}

export interface NamespacedSpecs {
  [endpoint: string]: EndpointSpec | NamespacedSpecs
}

const API_BASE = "/api/v1"

export const paramSpecs: NamespacedSpecs = {
  assets: {
    list: {
      path: `${API_BASE}/assets`,
      method: "GET",
      params: {
        type_name: { type: "string", optional: true, description: "필터링할 자산 유형 이름" },
        has_ohlcv_data: { type: "boolean", default: false, description: "OHLCV 데이터가 있는 자산만 필터링" },
        limit: { type: "number", default: 1000, description: "페이지당 자산 개수" },
      },
    },
    listPg: {
      path: `${API_BASE}/assets-lists`,
      method: "GET",
      params: {
        type_name: { type: "string", optional: true, description: "필터링할 자산 유형 이름" },
        has_ohlcv_data: { type: "boolean", default: true, description: "OHLCV 데이터가 있는 자산만 필터링" },
        limit: { type: "number", default: 1000, description: "페이지당 자산 개수" },
      },
    },
    marketCaps: {
      path: `${API_BASE}/assets/market-caps`,
      method: "GET",
      params: {
        type_name: { type: "string", optional: true, description: "필터링할 자산 유형 이름" },
        has_ohlcv_data: { type: "boolean", default: true, description: "OHLCV 데이터가 있는 자산만 필터링" },
        has_asset_data: { type: "boolean", default: true, description: "데이터베이스에 자산이 있는 것만 필터링" },
      },
    },
    detail: {
      path: `${API_BASE}/assets/{asset_identifier}`,
      method: "GET",
      pathParams: {
        asset_identifier: { type: "string", required: true, description: "Asset ID (integer) or Ticker (string)" },
      },
    },
    world: {
      collectionStatus: {
        path: `${API_BASE}/world-assets/collection-status`,
        method: "GET",
      },
      topAssetsByCategory: {
        path: `${API_BASE}/world-assets/top-assets-by-category`,
        method: "GET",
        params: {
          limit: { type: "number", default: 30, description: "최대 자산 개수" },
        },
      },
      performanceTreemap: {
        path: `${API_BASE}/world-assets/performance-treemap`,
        method: "GET",
        params: {
          performance_period: { type: "string", default: "1d", description: "성과 계산 기간 (1d, 1w, 1m, 3m, 6m, 1y, 2y, 3y, 5y, 10y)" },
          limit: { type: "number", default: 100, description: "최대 자산 개수" },
        },
      },
      missingMappings: {
        path: `${API_BASE}/world-assets/missing-mappings`,
        method: "GET",
        params: {
          ranking_date: { type: "string", optional: true, description: "랭킹 날짜" },
        },
      },
    },
    crypto: {
      path: `${API_BASE}/crypto/{symbol}`,
      method: "GET",
      pathParams: {
        symbol: { type: "string", required: true },
      },
    },
    etf: {
      path: `${API_BASE}/etf`,
      method: "GET",
      params: {
        symbol: { type: "string", optional: true },
      },
    },
    ohlcv: {
      path: `${API_BASE}/assets/ohlcv/{asset_identifier}`,
      method: "GET",
      pathParams: {
        asset_identifier: { type: "string", required: true, description: "Asset ID (integer) or Ticker (string)" },
      },
      params: {
        data_interval: { type: "string", default: "1d", description: "데이터 간격" },
        start_date: { type: "string", optional: true, description: "시작 날짜 (YYYY-MM-DD)" },
        end_date: { type: "string", optional: true, description: "종료 날짜 (YYYY-MM-DD)" },
        limit: { type: "number", default: 50000, description: "최대 데이터 포인트 수" },
      },
    },
  },

  collectors: {
    runOHLCV: {
      path: `${API_BASE}/collectors/ohlcv/run`,
      method: "POST",
    },
    testOHLCVAsset: {
      path: `${API_BASE}/collectors/ohlcv/test-asset`,
      method: "POST",
      bodyParams: {
        asset_id: { type: "number", required: true },
        test_mode: { type: "boolean", default: true },
      },
    },
    runOnchain: { path: `${API_BASE}/collectors/onchain/run`, method: "POST" },
    runStock: { path: `${API_BASE}/collectors/stock/run`, method: "POST" },
    runETF: { path: `${API_BASE}/collectors/etf/run`, method: "POST" },
    runTechnical: { path: `${API_BASE}/collectors/technical/run`, method: "POST" },
    runWorldAssets: { path: `${API_BASE}/collectors/world-assets/run`, method: "POST" },
    runAll: { path: `${API_BASE}/collectors/all/run`, method: "POST" },
  },

  dashboard: {
    summary: { path: `${API_BASE}/dashboard/summary`, method: "GET" },
    topAssets: {
      path: `${API_BASE}/dashboard/top-assets`,
      method: "GET",
      params: {
        limit: { type: "number", default: 5, description: "표시할 상위 자산 개수" },
      },
    },
    tickerSummary: {
      path: `${API_BASE}/widgets/ticker-summary`,
      method: "GET",
      params: {
        tickers: { type: "string", default: "BTCUSDT,SPY,MSFT", description: "쉼표로 구분된 티커 목록" },
      },
    },
  },

  realtime: {
    prices: { path: `${API_BASE}/realtime/prices`, method: "GET" },
    pricesPg: {
      path: `${API_BASE}/realtime/pg/quotes-delay-price`,
      method: "GET",
      params: {
        asset_identifier: { type: "string", required: true, description: "자산 식별자" },
        data_interval: { type: "string", default: "15m", description: "데이터 간격" },
        days: { type: "number", default: 1, description: "조회할 일수" },
      },
    },
    sparkline: { path: `${API_BASE}/realtime/sparkline`, method: "GET" },
  },

  onchain: {
    metrics: { path: `${API_BASE}/onchain/metrics`, method: "GET" },
  },

  scheduler: {
    tasks: { path: `${API_BASE}/scheduler/tasks`, method: "GET" },
  },

  admin: {
    panel: { path: `${API_BASE}/admin`, method: "GET" },
    logs: { path: `${API_BASE}/logs`, method: "GET", params: { level: { type: "string", optional: true } } },
    metrics: { path: `${API_BASE}/metrics`, method: "GET" },
  },

  openInterest: {
    data: { path: `${API_BASE}/open-interest`, method: "GET", params: { symbol: { type: "string", optional: true } } },
  },

  configurations: {
    settings: { path: `${API_BASE}/configurations`, method: "GET" },
  },
}

export default paramSpecs


