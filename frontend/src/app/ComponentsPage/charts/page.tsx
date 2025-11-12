'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import MiniPriceChart from '@/components/charts/minicharts/MiniPriceChart'
import MiniPriceCryptoChart from '@/components/charts/minicharts/MiniPriceCryptoChart'
import MiniPriceStocksEtfChart from '@/components/charts/minicharts/MiniPriceStocksEtfChart'
import MiniPriceCommoditiesChart from '@/components/charts/minicharts/MiniPriceCommoditiesChart'
import CompareMultipleAssetsChart from '@/components/charts/line/CompareMultipleAssetsChart'
import LiveChart from '@/components/charts/live/livechart'
import OHLCVCustomGUIChart from '@/components/charts/ohlcvcharts/OHLCVCustomGUIChart'

// Dynamic import로 ApexCharts 로드
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

// 더미 라인 차트 컴포넌트
const DummyLineChart = ({ height = 350 }: { height?: number }) => {
  const options: any = {
    chart: {
      type: 'area',
      height,
      toolbar: { show: false },
    },
    colors: ['#3B82F6', '#10B981'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      labels: {
        style: { fontSize: '12px', colors: '#6B7280' }
      }
    },
    yaxis: {
      labels: {
        style: { fontSize: '12px', colors: '#6B7280' }
      }
    },
    grid: {
      borderColor: '#E5E7EB',
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
    tooltip: {
      x: { format: 'MMM' }
    }
  }

  const series = [
    { name: 'BTC', data: [30000, 35000, 32000, 38000, 42000, 45000, 48000, 44000, 50000, 55000, 52000, 58000] },
    { name: 'ETH', data: [2000, 2200, 2100, 2500, 2800, 3000, 3200, 2900, 3400, 3600, 3300, 3800] }
  ]

  return <ReactApexChart options={options} series={series} type="area" height={height} />
}

// 더미 바 차트 컴포넌트
const DummyBarChart = ({ height = 350 }: { height?: number }) => {
  const options: any = {
    chart: {
      type: 'bar',
      height,
      toolbar: { show: false },
    },
    colors: ['#3B82F6'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '60%',
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      labels: {
        style: { fontSize: '12px', colors: '#6B7280' }
      }
    },
    yaxis: {
      labels: {
        style: { fontSize: '12px', colors: '#6B7280' }
      }
    },
    grid: {
      borderColor: '#E5E7EB',
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    }
  }

  const series = [
    { name: 'Volume', data: [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 312] }
  ]

  return <ReactApexChart options={options} series={series} type="bar" height={height} />
}

export default function ChartsPage() {
  const [activeChart, setActiveChart] = useState('line')
  const [isClient, setIsClient] = useState(false)
  
  console.log('📈 ChartsPage 렌더링:', { activeChart });

  // 클라이언트 사이드에서만 차트 렌더링
  useEffect(() => {
    setIsClient(true)
  }, [])

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
        <div className="flex flex-wrap gap-2">
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
            onClick={() => setActiveChart('compare')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeChart === 'compare'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Compare Charts
          </button>
          <button
            onClick={() => setActiveChart('live')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeChart === 'live'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Live Chart
          </button>
          <button
            onClick={() => setActiveChart('custom-gui')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeChart === 'custom-gui'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Custom GUI Chart
          </button>
        </div>
      </div>

      {/* Chart Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        {!isClient ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-600">Loading charts...</span>
          </div>
        ) : activeChart === 'compare' ? (
          <div key="compare-charts" className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">주요 암호화폐 비교</h3>
              <CompareMultipleAssetsChart
                assetIdentifiers={['BTCUSDT', 'ETHUSDT', 'BNB']}
                assetNames={['Bitcoin', 'Ethereum', 'BNB']}
                dataInterval="1d"
                height={500}
                title="Cryptocurrency Comparison"
                subtitle="BTC vs ETH vs BNB - Percentage Change"
              />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">주요 기술주 비교</h3>
              <CompareMultipleAssetsChart
                assetIdentifiers={['AAPL', 'MSFT', 'GOOG', 'TSLA']}
                assetNames={['Apple', 'Microsoft', 'Google', 'Tesla']}
                dataInterval="1d"
                height={500}
                title="Tech Stocks Comparison"
                subtitle="FAANG Stocks - Percentage Change"
              />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">암호화폐 vs 주식 비교</h3>
              <CompareMultipleAssetsChart
                assetIdentifiers={['BTCUSDT', 'ETHUSDT', 'AAPL', 'TSLA']}
                assetNames={['Bitcoin', 'Ethereum', 'Apple', 'Tesla']}
                dataInterval="1d"
                height={500}
                title="Crypto vs Stock Comparison"
                subtitle="Asset Class Comparison - Percentage Change"
              />
            </div>
          </div>
        ) : activeChart === 'live' ? (
          <div key="live-chart" className="h-[600px]">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Live Dynamic Chart</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Real-time candlestick chart with dynamic data updates
            </p>
            <LiveChart 
              containerId="live-chart-container"
              height={500}
              updateInterval={100}
            />
          </div>
        ) : activeChart === 'custom-gui' ? (
          <div key="custom-gui-chart">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">OHLCV Custom GUI Chart</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Highcharts Stock Tools with custom GUI - Indicators, Annotations, and Drawing Tools
            </p>
            <OHLCVCustomGUIChart 
              assetIdentifier="AAPL"
              dataInterval="1d"
              seriesId="aapl-ohlc"
              seriesName="AAPL Stock Price"
              height={650}
            />
          </div>
        ) : (
          <div key={activeChart} className="h-96">
            {activeChart === 'line' && <DummyLineChart key="line-chart" />}
            {activeChart === 'bar' && <DummyBarChart key="bar-chart" />}
            {activeChart === 'mini' && (
              <div key="mini-charts" className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="h-32">
                  <LiveChart key="mini-live-1" containerId="mini-live-1" height={128} updateInterval={100} />
                </div>
                <div className="h-32">
                  <MiniPriceCryptoChart key="mini-2" />
                </div>
                <div className="h-32">
                  <MiniPriceStocksEtfChart key="mini-3" />
                </div>
                <div className="h-32">
                  <MiniPriceCommoditiesChart key="mini-4" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart Examples Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Line Chart</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Interactive line chart for time series data visualization.
          </p>
          <div className="h-48">
            {isClient && <DummyLineChart height={180} />}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Bar Chart</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Bar chart for comparing categorical data.
          </p>
          <div className="h-48">
            {isClient && <DummyBarChart height={180} />}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Mini Charts</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Compact mini charts for quick data overview.
          </p>
          <div className="space-y-2">
            <div className="h-16">
              <LiveChart containerId="mini-live-compact-1" height={64} updateInterval={100} />
            </div>
            <div className="h-16">
              <MiniPriceCryptoChart />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Compare Chart</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Compare multiple assets with percentage change visualization.
          </p>
          <div className="h-48">
            <CompareMultipleAssetsChart
              assetIdentifiers={['BTCUSDT', 'ETHUSDT']}
              assetNames={['Bitcoin', 'Ethereum']}
              dataInterval="1d"
              height={180}
              showRangeSelector={false}
              showNavigator={false}
            />
          </div>
        </div>
        
      </div>
    </main>
  )
}
