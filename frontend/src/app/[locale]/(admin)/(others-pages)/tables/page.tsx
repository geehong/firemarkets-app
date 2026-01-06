"use client"

import React, { useState } from 'react'
import ComponentCard from '@/components/common/ComponentCard'
import RealtimePriceTable from '@/components/tables/RealtimePriceTable'
import HistoryTable from '@/components/tables/HistoryTable'
import SparklineTable from '@/components/tables/SparklineTable'

export default function TablesPage() {
    const [activeTab, setActiveTab] = useState<'realtime' | 'history' | 'sparkline'>('realtime')

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Tables</h1>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('realtime')}
                        className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'realtime'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
            `}
                    >
                        Realtime Prices
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'history'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
            `}
                    >
                        Historical Data
                    </button>
                    <button
                        onClick={() => setActiveTab('sparkline')}
                        className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'sparkline'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
            `}
                    >
                        Sparkline Table
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="min-h-[500px]">
                {activeTab === 'realtime' && (
                    <ComponentCard title="All Assets Realtime Data">
                        <RealtimePriceTable
                            typeName=""
                            showFilter={true}
                            showPagination={true}
                            maxRows={20}
                        />
                    </ComponentCard>
                )}

                {activeTab === 'history' && (
                    <ComponentCard title="Bitcoin Historical Data (Default)">
                        <HistoryTable
                            assetIdentifier="BTCUSDT"
                            initialInterval="1d"
                            showVolume={true}
                            showChangePercent={true}
                            height={600}
                        />
                    </ComponentCard>
                )}

                {activeTab === 'sparkline' && (
                    <ComponentCard title="Assets with 24h Sparklines">
                        <SparklineTable
                            typeName=""
                            maxRows={20}
                        />
                    </ComponentCard>
                )}
            </div>
        </div>
    )
}
