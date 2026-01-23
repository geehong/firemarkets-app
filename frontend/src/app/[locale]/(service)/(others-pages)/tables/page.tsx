"use client"

import React, { useState } from 'react'
import ComponentCard from '@/components/common/ComponentCard'
import RealtimePriceTable from '@/components/tables/RealtimePriceTable'
import HistoryTable from '@/components/tables/HistoryTable'
import SparklineTable from '@/components/tables/SparklineTable'
import { BriefNewsListTable } from '@/components/tables/BriefNewsListTable'
import AssetsList from '@/components/lists/AssetsList'
import AgGridHistoryTable from '@/components/tables/AgGridHistoryTable'
import SimpleHistoryTable from '@/components/tables/SimpleHistoryTable'
import BasicTableOne from '@/components/tables/BasicTableOne'
import { apiClient } from '@/lib/api'

// ...

export default function TablesPage() {
    const [activeTab, setActiveTab] = useState<'realtime' | 'history' | 'sparkline' | 'brief_news' | 'assets_list' | 'ag_grid' | 'simple_history' | 'basic_table'>('realtime')
    const [briefNews, setBriefNews] = useState<any[]>([])
    const [loadingBrief, setLoadingBrief] = useState(false)

    React.useEffect(() => {
        if (activeTab === 'brief_news' && briefNews.length === 0) {
            setLoadingBrief(true)
            apiClient.getPosts({ post_type: 'brief_news', status: 'published', page_size: 20 })
                .then((res: any) => {
                    if (res && res.posts) {
                        setBriefNews(res.posts)
                    }
                })
                .catch(err => console.error(err))
                .finally(() => setLoadingBrief(false))
        }
    }, [activeTab, briefNews.length])

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Tables</h1>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
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
                        onClick={() => setActiveTab('assets_list')}
                        className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'assets_list'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
            `}
                    >
                        Assets List
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
                        onClick={() => setActiveTab('ag_grid')}
                        className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'ag_grid'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
            `}
                    >
                        Ag Grid History
                    </button>
                    <button
                        onClick={() => setActiveTab('simple_history')}
                        className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'simple_history'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
            `}
                    >
                        Simple History
                    </button>
                     <button
                        onClick={() => setActiveTab('basic_table')}
                        className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'basic_table'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
            `}
                    >
                        Basic Table
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
                    <button
                        onClick={() => setActiveTab('brief_news')}
                        className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'brief_news'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
            `}
                    >
                        Brief News
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

                {activeTab === 'assets_list' && (
                    <ComponentCard title="Assets List Component">
                        <AssetsList showHeader={true} className="" />
                    </ComponentCard>
                )}

                {activeTab === 'ag_grid' && (
                    <ComponentCard title="AgGrid History Table (BTCUSDT)">
                        <AgGridHistoryTable
                            assetIdentifier="BTCUSDT"
                            dataInterval="1d"
                            height={600}
                        />
                    </ComponentCard>
                )}

                {activeTab === 'simple_history' && (
                    <ComponentCard title="Simple History Table (BTCUSDT)">
                        <SimpleHistoryTable
                            assetIdentifier="BTCUSDT"
                            initialInterval="1d"
                            showVolume={true}
                            showChangePercent={true}
                            height={600}
                        />
                    </ComponentCard>
                )}

                {activeTab === 'basic_table' && (
                    <ComponentCard title="Basic Table Example">
                        <BasicTableOne />
                    </ComponentCard>
                )}

                {activeTab === 'brief_news' && (
                    <ComponentCard title="Latest Brief News">
                        {loadingBrief ? (
                            <div className="p-8 text-center">Loading...</div>
                        ) : (
                            <BriefNewsListTable data={briefNews} />
                        )}
                    </ComponentCard>
                )}
            </div>
        </div>
    )
}
