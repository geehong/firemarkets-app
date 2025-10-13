import { apiFetch } from "@/lib/api"
import { paramSpecs } from "@/lib/paramSpecs"

export async function getDashboardSummary() {
  const { path } = paramSpecs.dashboard.summary as any
  return apiFetch<any>(path, { next: { revalidate: 30 } })
}

export async function getTopAssets(limit = 5) {
  const { path } = paramSpecs.dashboard.topAssets as any
  return apiFetch<any[]>(path, { query: { limit }, next: { revalidate: 30 } })
}

export async function getTickerSummary(tickers = "BTCUSDT,SPY,MSFT") {
  const { path } = paramSpecs.dashboard.tickerSummary as any
  return apiFetch<any>(path, { query: { tickers }, next: { revalidate: 15 } })
}


