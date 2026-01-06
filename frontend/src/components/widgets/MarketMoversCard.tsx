"use client";

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { TreemapLiveItem } from '@/hooks/assets/useAssets';
import { formatCurrency } from './utils';

export const MarketMoversCard = ({ movers }: { movers: TreemapLiveItem[] }) => {
    const t = useTranslations('Dashboard');
    return (
        <div className="break-inside-avoid bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
                <h4 className="font-bold text-gray-800 dark:text-white text-lg">{t('marketMovers')}</h4>
                <div className="bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-1 rounded-lg text-xs font-bold">
                    {t('top3')}
                </div>
            </div>
            <div className="space-y-4">
                {movers.map((item, i) => {
                    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-teal-500'];
                    return (
                        <div key={item.ticker} className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${colors[i % colors.length]}`}>
                                {i + 1}
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-bold dark:text-gray-200">{item.ticker}</div>
                                <div className="text-xs text-gray-400">{item.name}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold dark:text-white">${formatCurrency(item.current_price, item.asset_type)}</div>
                                <div className="text-xs text-green-500">+{item.price_change_percentage_24h?.toFixed(2)}%</div>
                            </div>
                        </div>
                    )
                })}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 text-center">
                <Link href="/tables/sparkline-table" className="text-sm text-blue-500 font-bold hover:underline">{t('viewAllAssets')}</Link>
            </div>
        </div>
    );
};
