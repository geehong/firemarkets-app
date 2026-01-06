'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AssetsList from '@/components/lists/AssetsList'
import RealtimePriceTable from '@/components/tables/RealtimePriceTable'

export default function AssetsPage() {
    const [activeTab, setActiveTab] = useState<'list' | 'realtime'>('list')
    const searchParams = useSearchParams()
    const typeName = searchParams?.get('type_name') || undefined

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit mb-6">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'list'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                >
                    Assets List
                </button>
                <button
                    onClick={() => setActiveTab('realtime')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'realtime'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                >
                    Realtime Prices
                </button>
            </div>

            {activeTab === 'list' ? (
                <AssetsList />
            ) : (
                <div className="space-y-6">
                    <RealtimePriceTable
                        title="Realtime Asset Prices"
                        showFilter={true}
                        showPagination={true}
                        typeName={typeName}
                    />
                </div>
            )}
        </main>
    )
}
