"use client"

import React, { useState } from 'react'
import ComponentCard from '@/components/common/ComponentCard'
import RealtimePriceTable from '@/components/tables/RealtimePriceTable'
import HistoryTable from '@/components/tables/HistoryTable'
import SparklineTable from '@/components/tables/SparklineTable'
import { BriefNewsListTable } from '@/components/tables/BriefNewsListTable'
import { apiClient } from '@/lib/api'

// ...

export default function TablesPage() {
    const [activeTab, setActiveTab] = useState<'realtime' | 'history' | 'sparkline' | 'brief_news'>('realtime')
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
