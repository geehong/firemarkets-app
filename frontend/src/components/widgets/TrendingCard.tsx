"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { TreemapLiveItem } from '@/hooks/assets/useAssets';
import { formatCurrency } from './utils';

export const TrendingCard = ({ topGainer }: { topGainer?: TreemapLiveItem }) => {
    const t = useTranslations('Dashboard');
    if (!topGainer) return null;

    const change = topGainer.price_change_percentage_24h || 0;

    return (
        <div className="break-inside-avoid bg-gradient-to-br from-pink-500 to-orange-500 rounded-3xl shadow-lg p-6 text-white mb-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute top-0 right-0 p-4 opacity-50 text-9xl font-black transform translate-x-1/2 -translate-y-1/2 rotate-12 pointer-events-none">🔥</div>
            <div className="relative z-10">
                <div className="text-sm uppercase font-bold opacity-80 mb-2 flex items-center gap-2">
                    <span className="animate-pulse">●</span> {t('topGainer24h')}
                </div>
                <div className="text-3xl font-bold mb-1">{topGainer.name}</div>
                <div className="text-5xl font-black mb-2">${formatCurrency(topGainer.current_price)}</div>
                <div className="inline-block bg-white/20 rounded-lg px-3 py-1 backdrop-blur-md text-lg font-bold">
                    +{change.toFixed(2)}% 🚀
                </div>
                <button className="w-full mt-6 bg-white text-orange-600 font-bold rounded-xl py-3 hover:bg-gray-50 transition-colors shadow-lg">{t('viewMarket')}</button>
            </div>
        </div>
    );
};
