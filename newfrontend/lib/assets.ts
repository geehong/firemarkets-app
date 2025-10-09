import { apiFetch } from "@/lib/api"
import { paramSpecs } from "@/lib/paramSpecs"

export type AssetType = "Stock" | "Crypto" | "ETF" | string

export interface AssetSummary {
  id: number | string
  symbol: string
  name: string
  type_name?: AssetType
  market_cap?: number
}

export interface OhlcvPoint {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export async function getAssetsList(opts: {
  type_name?: string
  has_ohlcv_data?: boolean
  limit?: number
} = {}) {
  const { path } = paramSpecs.assets.list as any
  return apiFetch<AssetSummary[]>(path, { query: opts, next: { revalidate: 60 } })
}

export async function getAssetsListPg(opts: {
  type_name?: string
  has_ohlcv_data?: boolean
  limit?: number
} = {}) {
  const { path } = paramSpecs.assets.listPg as any
  return apiFetch<AssetSummary[]>(path, { query: opts, next: { revalidate: 60 } })
}

export async function getAssetDetail(asset_identifier: string | number) {
  const spec = paramSpecs.assets.detail as any
  const path = spec.path.replace("{asset_identifier}", String(asset_identifier))
  return apiFetch<any>(path, { next: { revalidate: 60 } })
}

export async function getAssetOhlcv(asset_identifier: string | number, opts: {
  data_interval?: string
  start_date?: string
  end_date?: string
  limit?: number
} = {}) {
  const spec = paramSpecs.assets.ohlcv as any
  const path = spec.path.replace("{asset_identifier}", String(asset_identifier))
  return apiFetch<OhlcvPoint[]>(path, { query: opts, next: { revalidate: 30 } })
}


