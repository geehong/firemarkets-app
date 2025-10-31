"use client"

import React from 'react'
import { RealtimePriceWidget, PriceWidgetGrid, MiniPriceWidget } from '@/components/widget'

export default function WidgetPage() {
  const cryptoTickers = ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'DOGEUSDT']
  const stockTickers = ['BABA', 'TM', 'BRK-A', 'AMX']
  const commodityTickers = ['GCUSD', 'SIUSD']

  const groupedTickers = [
    { title: 'Crypto', tickers: cryptoTickers, variant: 'crypto' as const },
    { title: 'Stocks', tickers: stockTickers, variant: 'stocks' as const },
    { title: 'Commodities', tickers: commodityTickers, variant: 'commodities' as const }
  ]

  return (
    <div className="min-h-screen bg-white p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Widgets</h1>

      {/* Individual Widgets */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Individual</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <RealtimePriceWidget ticker="BTCUSDT" variant="crypto" size="medium" showVolume showTimestamp />
          <RealtimePriceWidget ticker="ETHUSDT" variant="crypto" size="small" />
          <RealtimePriceWidget ticker="BABA" variant="stocks" size="large" showVolume showTimestamp />
          <RealtimePriceWidget ticker="GCUSD" variant="commodities" size="medium" showVolume />
        </div>
      </section>

      {/* Grid Widgets */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Grids</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-600 mb-3">Single Group</h3>
            <PriceWidgetGrid tickers={cryptoTickers} variant="crypto" size="medium" columns={4} />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-600 mb-3">Grouped Tabs</h3>
            <PriceWidgetGrid groups={groupedTickers} size="medium" columns={4} showGroupTabs />
          </div>
        </div>
      </section>

      {/* Mini Widgets */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Mini</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...cryptoTickers, ...stockTickers, ...commodityTickers].map((t) => (
            <MiniPriceWidget key={t} ticker={t} showChange showStatus />
          ))}
        </div>
      </section>
    </div>
  )
}


