'use client'

import React from 'react'
import { usePosts } from '@/hooks/data/usePosts'
import { useCryptoMetrics } from '@/hooks/assets/useCrypto'

export default function TestHooksPage() {
    const { data: posts, isLoading: postsLoading, error: postsError } = usePosts({ page: 1, page_size: 5 })
    const { data: btcMetrics, isLoading: btcLoading, error: btcError } = useCryptoMetrics('BTCUSDT') // Corrected to use Ticker

    return (
        <div className="p-6 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-4">Hook Migration Test</h1>

            {/* Dataset 1: Posts */}
            <section className="p-4 border rounded dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-2">1. usePosts Test</h2>
                {postsLoading && <div className="text-blue-500">Loading Posts...</div>}
                {postsError && <div className="text-red-500">Error: {String(postsError)}</div>}
                {posts && (
                    <div>
                        <div className="text-green-500 font-bold mb-2">Success! Fetched {posts.posts.length} posts.</div>
                        <pre className="bg-gray-100 dark:bg-gray-900 p-2 text-xs overflow-auto max-h-40">
                            {JSON.stringify(posts.posts[0], null, 2)}
                        </pre>
                    </div>
                )}
            </section>

            {/* Dataset 2: Crypto Metrics */}
            <section className="p-4 border rounded dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-2">2. useCryptoMetrics Test (BTC)</h2>
                {btcLoading && <div className="text-blue-500">Loading BTC Metrics...</div>}
                {btcError && <div className="text-red-500">Error: {String(btcError)}</div>}
                {!!btcMetrics && (
                    <div>
                        <div className="text-green-500 font-bold mb-2">Success! Data received.</div>
                        <pre className="bg-gray-100 dark:bg-gray-900 p-2 text-xs overflow-auto max-h-40">
                            {JSON.stringify(btcMetrics, null, 2)}
                        </pre>
                    </div>
                )}
            </section>
        </div>
    )
}
