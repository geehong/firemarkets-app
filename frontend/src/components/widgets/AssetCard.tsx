"use client";

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { TreemapLiveItem } from '@/hooks/assets/useAssets';
import { useRealtimePrices } from '@/hooks/data/useSocket';
import { formatCurrency, formatChange } from './utils';

export const AssetCard = ({ item }: { item: TreemapLiveItem }) => {
    const t = useTranslations('Dashboard');
    const { latestPrice, isConnected } = useRealtimePrices(item.ticker);

    // Prioritize Live WS data, fallback to Treemap Snapshot
    const price = latestPrice?.price ?? item.current_price;
    const change = latestPrice?.changePercent ?? item.price_change_percentage_24h;
    const isPositive = (change || 0) >= 0;

    const type = item.asset_type?.toLowerCase() || 'crypto';

    const assetLink = `/assets/${item.ticker}`;
    const postsLink = `/admin/post/list?search=${encodeURIComponent(item.name || item.ticker)}`;

    return (
        <div className="break-inside-avoid bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-4 hover:shadow-lg transition-shadow mb-6 cursor-pointer group border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
            <Link href={assetLink} className="block">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${type === 'crypto' ? 'bg-orange-500' : 'bg-blue-600'}`}>
                            {item.ticker[0]}
                        </div>
                        <div>
                            <div className="font-bold dark:text-white text-lg leading-tight">{item.name}</div>
                            <div className="text-xs text-gray-400">{item.ticker}</div>
                        </div>
                    </div>
                    {change !== undefined && change !== null && (
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${isPositive ? 'text-green-500 bg-green-100 dark:bg-green-900/30' : 'text-red-500 bg-red-100 dark:bg-red-900/30'}`}>
                            {formatChange(change)}
                        </span>
                    )}
                </div>

                <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-2xl font-bold dark:text-white">
                        ${formatCurrency(price, type)}
                    </span>
                    <span className={`text-xs ${isConnected ? 'text-green-500 animate-pulse' : 'text-gray-400'}`}>
                        {isConnected ? `• ${t('live')}` : `• ${t('delayed')}`}
                    </span>
                </div>
            </Link>

            <div className="flex gap-2 text-sm text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={assetLink} className="flex-1 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 bg-gray-50 dark:bg-gray-700/50 transition-colors text-center">
                    {t('details')}
                </Link>
                <Link href={postsLink} className="flex-1 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 bg-gray-50 dark:bg-gray-700/50 font-bold text-blue-500 transition-colors text-center">
                    {t('posts')}
                </Link>
            </div>
        </div>
    );
};
