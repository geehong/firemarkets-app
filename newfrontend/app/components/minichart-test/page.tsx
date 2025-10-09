export const metadata = {
  title: "Mini Chart Test | FireMarkets",
}

import MiniPriceChart from "@/components/charts/minicharts/MiniPriceChart"

export default function MiniChartTestPage() {
  return (
    <div className="container mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-bold">MiniPriceChart Test</h1>
      <MiniPriceChart assetIdentifier="BTCUSDT" useWebSocket={false} />
    </div>
  )
}


