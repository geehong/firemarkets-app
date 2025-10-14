import { apiFetch } from "@/lib/api"
import { paramSpecs } from "@/lib/paramSpecs"

export async function getRealtimePrices() {
  const { path } = paramSpecs.realtime.prices as any
  return apiFetch<any[]>(path, { next: { revalidate: 5 } })
}

export async function getRealtimePricesPg(opts: {
  asset_identifier: string
  data_interval?: string
  days?: number
}) {
  const { path } = paramSpecs.realtime.pricesPg as any
  return apiFetch<any[]>(path, { query: opts, next: { revalidate: 5 } })
}

export async function getSparkline() {
  const { path } = paramSpecs.realtime.sparkline as any
  return apiFetch<any[]>(path, { next: { revalidate: 5 } })
}


