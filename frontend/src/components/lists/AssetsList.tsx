'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRealtimeTable } from '@/hooks/data/useRealtime'
import { useRealtimePrices } from '@/hooks/data/useSocket'
import ComponentCard from '@/components/common/ComponentCard'
import Badge from '@/components/ui/badge/Badge'
import AssetsListTable from '@/components/tables/AssetsListTable'
import { filterExcludedAssets } from '@/constants/excludedAssets'

interface AssetsListProps {
    className?: string
    showHeader?: boolean
}

const AssetsList: React.FC<AssetsListProps> = ({ className, showHeader = true }) => {
    const searchParams = useSearchParams()
    // type_name from query or default to null for All
    const typeNameFromQuery = searchParams?.get('type_name') || null

    const [selectedType, setSelectedType] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')

    // Initialize selectedType from URL
    useEffect(() => {
        if (typeNameFromQuery) {
            let mapped = typeNameFromQuery.toLowerCase()
            if (mapped === 'etf') mapped = 'etfs'
            if (mapped === 'fund') mapped = 'funds'
            setSelectedType(mapped)
        } else {
            setSelectedType('all')
        }
    }, [typeNameFromQuery])

    // API param construction
    const apiParams = useMemo(() => {
        if (selectedType === 'all') {
            return { sortBy: 'market_cap', sortOrder: 'desc', limit: 5000 } as any
        }
        return {
            type_name: selectedType, // Use selectedType directly
            sortBy: 'market_cap',
            sortOrder: 'desc',
            limit: 5000
        } as any
    }, [selectedType])

    const { data: tableData, isLoading: liveLoading, error: liveError } = useRealtimeTable(apiParams)

    // Helper options
    const assetTypeOptions = [
        { value: 'all', label: 'All Assets' },
        { value: 'crypto', label: 'Crypto' },
        { value: 'stocks', label: 'Stocks' },
        { value: 'etfs', label: 'ETFs' },
        { value: 'commodities', label: 'Commodities' },
        { value: 'funds', label: 'Funds' },
    ]

    // Filtering Logic
    const filteredAssets = useMemo(() => {
        if (!tableData) return []
        const anyData: any = tableData as any
        let arr = Array.isArray(anyData?.data) ? (anyData.data as any[]) : []

        // 1. Exclude
        arr = filterExcludedAssets(arr)

        // 2. Type Filter (If API didn't already handle it perfectly, or to be safe)
        // Since we pass type to API, it should be mostly filtered, but let's double check if "all"
        if (selectedType !== 'all') {
            arr = arr.filter((asset: any) => {
                const at = (asset.type_name || asset.asset_type || '').toLowerCase()
                const target = selectedType.toLowerCase()
                // Simple inclusion check
                if (target === 'stocks') return at.includes('stock') || at === 'equity'
                if (target === 'etfs') return at.includes('etf')
                if (target === 'funds') return at.includes('fund')
                if (target === 'crypto') return at.includes('crypto')
                if (target === 'commodities') return at.includes('commodit')
                return at.includes(target)
            })
        }

        // 3. Search Query
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            arr = arr.filter((asset: any) =>
                (asset.ticker || '').toLowerCase().includes(q) ||
                (asset.name || '').toLowerCase().includes(q)
            )
        }

        // 4. Transform for Table (Match AssetsListTable expectation)
        return arr.map((it: any) => ({
            asset_id: it.asset_id,
            ticker: it.ticker,
            name: it.name,
            type_name: it.type_name || it.asset_type,
            market_cap: it.market_cap ?? it.market_cap_usd ?? null,
            current_price: it.current_price ?? it.price ?? null,
            daily_change_percent: it.price_change_percentage_24h ?? it.daily_change_percent ?? null,
            logo_url: it.logo_url ?? null,
            category: it.category,
        })).sort((a: any, b: any) => {
            const marketCapA = parseFloat(a.market_cap) || 0
            const marketCapB = parseFloat(b.market_cap) || 0
            return marketCapB - marketCapA
        })

    }, [tableData, selectedType, searchQuery])


    const err = liveError ? String((liveError as any).message || liveError) : null

    return (
        <div className={`space-y-6 ${className}`}>
            <ComponentCard title={`Assets List: ${filteredAssets.length} Assets Found`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    {/* Left: Dropdown */}
                    <div className="w-full md:w-auto">
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="w-full md:w-48 px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            {assetTypeOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Right: Search */}
                    <div className="w-full md:w-auto relative">
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by ticker, name..."
                            className="w-full md:w-64 px-3 py-2 border rounded-md text-sm dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                <AssetsListTable
                    rows={filteredAssets}
                    loading={liveLoading}
                    error={err}
                />
            </ComponentCard>
        </div>
    )
}

export default AssetsList
