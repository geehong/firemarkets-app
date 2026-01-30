"use client"

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import ComponentCard from '@/components/common/ComponentCard'
import BarChartOne from '@/components/charts/bar/BarChartOne'
import LineChartOne from '@/components/charts/line/LineChartOne'

// Dynamic imports for heavy chart components
const PerformanceTreeMapToday = dynamic(
    () => import('@/components/charts/treemap/PerformanceTreeMapToday'),
    { ssr: false }
)
const LiveChart = dynamic(
    () => import('@/components/charts/live/LiveChart'),
    { ssr: false }
)
const MiniPriceChart = dynamic(
    () => import('@/components/charts/minicharts/MiniPriceChart'),
    { ssr: false }
)
const OHLCVCustomGUIChart = dynamic(
    () => import('@/components/charts/ohlcvcharts/OHLCVCustomGUIChart'),
    { ssr: false }
)
const OnChainChart = dynamic(
    () => import('@/components/charts/onchaincharts/OnChainChart'),
    { ssr: false }
)
const HalvingChart = dynamic(
    () => import('@/components/charts/onchaincharts/HalvingChart'),
    { ssr: false }
)
const CycleComparisonChart = dynamic(
    () => import('@/components/charts/onchaincharts/CycleComparisonChart'),
    { ssr: false }
)

const OHLCVVolumeChart = dynamic(
    () => import('@/components/charts/ohlcvcharts/OHLCVVolumeChart'),
    { ssr: false }
)

const MultipleComparisonChart = dynamic(
    () => import('@/components/charts/ohlcvcharts/MultipleComparisonChart'),
    { ssr: false }
)

export default function ChartsPage() {
    const [activeTab, setActiveTab] = useState<'bar' | 'line' | 'treemap' | 'live' | 'mini' | 'ohlcv' | 'onchain' | 'volume' | 'multiple'>('bar')

    const tabs = [
        { id: 'bar', label: 'Bar Charts' },
        { id: 'line', label: 'Line Charts' },
        { id: 'treemap', label: 'Treemap' },
        { id: 'live', label: 'Live Charts' },
        { id: 'mini', label: 'Mini Charts' },
        { id: 'ohlcv', label: 'OHLCV' },
        { id: 'volume', label: 'Volume' },
        { id: 'multiple', label: 'Multiple Comparison' },
        { id: 'onchain', label: 'On-Chain' },
    ] as const

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Charts Library</h1>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
                <nav className="-mb-px flex space-x-8 min-w-max px-2" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                                ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="min-h-[500px]">
                {activeTab === 'bar' && (
                    <ComponentCard title="Basic Bar Chart">
                        <BarChartOne />
                    </ComponentCard>
                )}

                {activeTab === 'line' && (
                    <ComponentCard title="Basic Line Chart">
                        <LineChartOne />
                    </ComponentCard>
                )}

                {activeTab === 'treemap' && (
                    <ComponentCard title="Market Treemap">
                        <div className="h-[650px] w-full">
                            <PerformanceTreeMapToday />
                        </div>
                    </ComponentCard>
                )}

                {activeTab === 'live' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ComponentCard title="BTC/USDT Live Chart">
                            <div className="h-[400px]">
                                <LiveChart
                                    assetIdentifier="BTCUSDT"
                                    height={400}
                                    dataSource="binance"
                                    useWebSocket={true}
                                />
                            </div>
                        </ComponentCard>
                        <ComponentCard title="ETH/USDT Live Chart">
                            <div className="h-[400px]">
                                <LiveChart
                                    assetIdentifier="ETHUSDT"
                                    height={400}
                                    dataSource="binance"
                                    useWebSocket={true}
                                />
                            </div>
                        </ComponentCard>
                    </div>
                )}

                {activeTab === 'mini' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <ComponentCard title="Mini BTC">
                            <div className="h-[200px]">
                                <MiniPriceChart assetIdentifier="BTCUSDT" title="Bitcoin" chartType="crypto" />
                            </div>
                        </ComponentCard>
                        <ComponentCard title="Mini ETH">
                            <div className="h-[200px]">
                                <MiniPriceChart assetIdentifier="ETHUSDT" title="Ethereum" chartType="crypto" />
                            </div>
                        </ComponentCard>
                        <ComponentCard title="Mini AAPL">
                            <div className="h-[200px]">
                                <MiniPriceChart assetIdentifier="AAPL" title="Apple Inc." chartType="stocks" />
                            </div>
                        </ComponentCard>
                    </div>
                )}

                {activeTab === 'ohlcv' && (
                    <ComponentCard title="OHLCV Candle Chart">
                        <div className="h-[650px]">
                            <OHLCVCustomGUIChart
                                assetIdentifier="BTCUSDT"
                                dataInterval="1d"
                                seriesName="BTC/USDT"
                                height={650}
                            />
                        </div>
                    </ComponentCard>
                )}

                {activeTab === 'volume' && (
                    <ComponentCard title="Candlestick with Volume">
                        <div className="h-[650px]">
                            <OHLCVVolumeChart
                                assetIdentifier="BTCUSDT"
                                dataInterval="1d"
                                title="BTC/USDT Volume"
                                height={650}
                            />
                        </div>
                    </ComponentCard>
                )}

                {activeTab === 'multiple' && (
                    <ComponentCard title="Multiple Asset Comparison">
                        <div className="h-[650px]">
                            <MultipleComparisonChart
                                assets={['MSFT', 'AAPL', 'GOOG']}
                                compareMode="percent"
                                height={600}
                            />
                        </div>
                    </ComponentCard>
                )}

                {activeTab === 'onchain' && (
                    <div className="space-y-8">
                        <ComponentCard title="On-Chain Metrics (MVRV Z-Score)">
                            <div className="h-[600px]">
                                <OnChainChart
                                    assetId="BTCUSDT"
                                    metricId="mvrv_z_score"
                                    title="Bitcoin Price vs MVRV Z-Score"
                                    height={600}
                                />
                            </div>
                        </ComponentCard>

                        <ComponentCard title="Halving Analysis">
                            <div className="h-[600px]">
                                <HalvingChart height={600} />
                            </div>
                        </ComponentCard>

                        <ComponentCard title="Cycle Comparison">
                            <div className="h-[600px]">
                                <CycleComparisonChart height={600} />
                            </div>
                        </ComponentCard>
                    </div>
                )}
            </div>
        </div>
    )
}
