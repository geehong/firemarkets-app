'use client'

import { useState } from 'react'

// Line Charts
import LineChartOne from '@/components/charts/line/LineChartOne'
// Bar Charts
import BarChartOne from '@/components/charts/bar/BarChartOne'
// Mini Charts
import ClientOnlyChart from '@/components/charts/minicharts/ClientOnlyChart'
// OHLCV Charts
import OHLCVChart from '@/components/charts/ohlcvcharts/OHLCVChart'
// OnChain Charts
import HalvingChart from '@/components/charts/onchaincharts/HalvingChart'
import OnChainChart from '@/components/charts/onchaincharts/OnChainChart'

export default function ChartsPage() {
  console.log('📈 ChartsPage 렌더링');
  
  const [activeTab, setActiveTab] = useState('basic')

  const tabs = [
    { id: 'basic', name: 'Basic Charts', icon: '📊' },
    { id: 'financial', name: 'Financial Charts', icon: '💰' },
    { id: 'onchain', name: 'OnChain Charts', icon: '⛓️' },
    { id: 'halving', name: 'Halving Charts', icon: '₿' },
    { id: 'mini', name: 'Mini Charts', icon: '📈' }
  ]

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

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {/* Basic Charts Tab */}
        {activeTab === 'basic' && (
          <>
            {/* Line Chart */}
            <div 
              style={{ 
                height: '400px', 
                width: '100%',
                minHeight: '400px',
                position: 'relative'
              }}
            >
              <LineChartOne />
            </div>

            {/* Bar Chart */}
            <div 
              style={{ 
                height: '400px', 
                width: '100%',
                minHeight: '400px',
                position: 'relative'
              }}
            >
              <BarChartOne />
            </div>
          </>
        )}

        {/* Financial Charts Tab */}
        {activeTab === 'financial' && (
          <div 
            style={{ 
              height: '500px', 
              width: '100%',
              minHeight: '500px',
              position: 'relative'
            }}
          >
            <OHLCVChart assetIdentifier="BTCUSDT" />
          </div>
        )}

        {/* OnChain Charts Tab */}
        {activeTab === 'onchain' && (
          <div 
            style={{ 
              height: '500px', 
              width: '100%',
              minHeight: '500px',
              position: 'relative'
            }}
          >
            <OnChainChart />
          </div>
        )}

        {/* Halving Charts Tab */}
        {activeTab === 'halving' && (
          <div 
            style={{ 
              height: '500px', 
              width: '100%',
              minHeight: '500px',
              position: 'relative'
            }}
          >
            <HalvingChart height={500} />
          </div>
        )}

        {/* Mini Charts Tab */}
        {activeTab === 'mini' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* BTCUSDT */}
            <div 
              style={{ 
                height: '200px', 
                width: '100%',
                minHeight: '200px',
                position: 'relative'
              }}
            >
              <ClientOnlyChart 
                type="crypto" 
                containerId="btcusdt-chart" 
                assetIdentifier="BTCUSDT" 
              />
            </div>
            
            {/* ETHUSDT */}
            <div 
              style={{ 
                height: '200px', 
                width: '100%',
                minHeight: '200px',
                position: 'relative'
              }}
            >
              <ClientOnlyChart 
                type="crypto" 
                containerId="ethusdt-chart" 
                assetIdentifier="ETHUSDT" 
              />
            </div>
            
            {/* GCUSD (금) */}
            <div 
              style={{ 
                height: '200px', 
                width: '100%',
                minHeight: '200px',
                position: 'relative'
              }}
            >
              <ClientOnlyChart 
                type="commodities" 
                containerId="gcusd-chart" 
                assetIdentifier="GCUSD" 
              />
            </div>
            
            {/* SPY */}
            <div 
              style={{ 
                height: '200px', 
                width: '100%',
                minHeight: '200px',
                position: 'relative'
              }}
            >
              <ClientOnlyChart 
                type="stocks" 
                containerId="spy-chart" 
                assetIdentifier="SPY" 
              />
            </div>
            
            {/* QQQ */}
            <div 
              style={{ 
                height: '200px', 
                width: '100%',
                minHeight: '200px',
                position: 'relative'
              }}
            >
              <ClientOnlyChart 
                type="stocks" 
                containerId="qqq-chart" 
                assetIdentifier="QQQ" 
              />
            </div>
            
            {/* NVDA */}
            <div 
              style={{ 
                height: '200px', 
                width: '100%',
                minHeight: '200px',
                position: 'relative'
              }}
            >
              <ClientOnlyChart 
                type="stocks" 
                containerId="nvda-chart" 
                assetIdentifier="NVDA" 
              />
            </div>
            
            {/* AAPL */}
            <div 
              style={{ 
                height: '200px', 
                width: '100%',
                minHeight: '200px',
                position: 'relative'
              }}
            >
              <ClientOnlyChart 
                type="stocks" 
                containerId="aapl-chart" 
                assetIdentifier="AAPL" 
              />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

