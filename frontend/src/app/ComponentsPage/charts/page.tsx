'use client'

import { useState } from 'react'
import LineChartOne from '@/components/charts/line/LineChartOne'
import BarChartOne from '@/components/charts/bar/BarChartOne'
import MiniPriceChart from '@/components/charts/minicharts/MiniPriceChart'
import MiniPriceCryptoChart from '@/components/charts/minicharts/MiniPriceCryptoChart'
import MiniPriceStocksEtfChart from '@/components/charts/minicharts/MiniPriceStocksEtfChart'
import MiniPriceCommoditiesChart from '@/components/charts/minicharts/MiniPriceCommoditiesChart'
import InteractiveOhlcvChart from '@/components/charts/ohlcvcharts/InteractiveOhlcvChart'

export default function ChartsPage() {
  const [activeChart, setActiveChart] = useState('line')

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Charts
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Interactive chart components and visualizations for data display.
        </p>
      </div>

      {/* Chart Type Selector */}
      <div className="mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveChart('line')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeChart === 'line'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Line Chart
          </button>
          <button
            onClick={() => setActiveChart('bar')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeChart === 'bar'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Bar Chart
          </button>
          <button
            onClick={() => setActiveChart('mini')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeChart === 'mini'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Mini Charts
          </button>
          <button
            onClick={() => setActiveChart('tradingview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeChart === 'tradingview'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            TradingView Chart
          </button>
        </div>
      </div>

      {/* Chart Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <div className={activeChart === 'tradingview' ? 'h-[600px]' : 'h-96'}>
          {activeChart === 'line' && <LineChartOne />}
          {activeChart === 'bar' && <BarChartOne />}
          {activeChart === 'mini' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="h-32">
                <MiniPriceChart />
              </div>
              <div className="h-32">
                <MiniPriceCryptoChart />
              </div>
              <div className="h-32">
                <MiniPriceStocksEtfChart />
              </div>
              <div className="h-32">
                <MiniPriceCommoditiesChart />
              </div>
            </div>
          )}
          {activeChart === 'tradingview' && (
            <div className="w-full h-full">
              <InteractiveOhlcvChart 
                symbol="AAPL"
                interval="1D"
                theme="light"
                height={600}
                onSymbolChange={(symbol) => console.log('Symbol changed:', symbol)}
                onIntervalChange={(interval) => console.log('Interval changed:', interval)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Chart Examples Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Line Chart</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Interactive line chart for time series data visualization.
          </p>
          <div className="h-48">
            <LineChartOne />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Bar Chart</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Bar chart for comparing categorical data.
          </p>
          <div className="h-48">
            <BarChartOne />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Mini Charts</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Compact mini charts for quick data overview.
          </p>
          <div className="space-y-2">
            <div className="h-16">
              <MiniPriceChart />
            </div>
            <div className="h-16">
              <MiniPriceCryptoChart />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">TradingView Chart</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Professional OHLCV chart with TradingView Advanced Charts library.
          </p>
          <div className="h-48">
            <InteractiveOhlcvChart 
              symbol="BTCUSDT"
              interval="1H"
              theme="light"
              height={200}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
