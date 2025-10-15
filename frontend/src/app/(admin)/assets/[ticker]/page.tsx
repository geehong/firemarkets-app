import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ComponentCard from '@/components/common/ComponentCard'
import Badge from '@/components/ui/badge/Badge'
import { useTreemapLive } from '@/hooks/useAssets'

export const metadata: Metadata = {
  title: 'Asset Details | FireMarkets',
  description: 'Asset detail overview including price, market cap and category.',
}

function formatUsd(n?: number | null) {
  if (n == null) return '-'
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

export default function AssetDetailPage({ params }: { params: { ticker: string } }) {
  const { data, isLoading, error } = useTreemapLive()
  const ticker = (params?.ticker || '').toUpperCase()

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <ComponentCard title="Loading asset...">
          <div className="animate-pulse h-24 bg-gray-200 rounded" />
        </ComponentCard>
      </main>
    )
  }

  if (error) {
    return (
      <main className="container mx-auto px-4 py-8">
        <ComponentCard title="Error">
          <div className="text-sm text-red-600">{String((error as any).message || error)}</div>
        </ComponentCard>
      </main>
    )
  }

  const items = data?.data || []
  const asset = items.find((it: any) => (it.ticker || '').toUpperCase() === ticker)
  if (!asset) {
    notFound()
  }

  const typeName = asset.type_name || asset.asset_type || asset.category

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <ComponentCard title={`${asset.name} (${ticker})`}>
        <div className="flex items-center gap-3 mb-4">
          {asset.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.logo_url} alt="logo" style={{ width: 28, height: 28, borderRadius: 4 }} />
          ) : (
            <div className="w-7 h-7 rounded bg-gray-200" />
          )}
          {typeName && <Badge color="info">{typeName}</Badge>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="p-4 border rounded-lg">
            <div className="text-gray-500">Current Price</div>
            <div className="text-lg font-semibold">{formatUsd(asset.current_price)}</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-gray-500">Market Cap</div>
            <div className="text-lg font-semibold">{formatUsd(asset.market_cap)}</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-gray-500">24h Change</div>
            <div className={`text-lg font-semibold ${Number(asset.price_change_percentage_24h ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {`${Number(asset.price_change_percentage_24h ?? 0) >= 0 ? '+' : ''}${Number(asset.price_change_percentage_24h ?? 0).toFixed(2)}%`}
            </div>
          </div>
        </div>
      </ComponentCard>

      {/* 확장: 차트/뉴스/상세 테이블 등을 여기에 추가 가능 */}
    </main>
  )
}


