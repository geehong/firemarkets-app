"use client";

import React from 'react';
import Link from 'next/link';

interface NewsCardProps {
    title: string;
    summary: string;
    source: string;
    time: string;
    image?: string | null;
    slug: string;
    author?: string;
    category?: string;
    href?: string;
}

export const NewsCard: React.FC<NewsCardProps> = ({ title, summary, source, time, image, slug, author, category, href }) => {
    // Enhanced Fallback image logic using slug hash for variety from local assets
    const getFallbackImage = (slugStr: string, cat?: string) => {
        const fallbacks = [
            '/images/posts/temp/abstract_finance.png',
            '/images/posts/temp/bitcoin_gold.png',
            '/images/posts/temp/blockchain_blocks.png',
            '/images/posts/temp/bull_bear.png',
            '/images/posts/temp/ethereum_network.png',
            '/images/posts/temp/future_city.png',
            '/images/posts/temp/global_network.png',
            '/images/posts/temp/stock_chart.png',
            '/images/posts/temp/tech_bg.png',
            '/images/posts/temp/trading_desk.png'
        ];

        // Simple hash function for string
        let hash = 0;
        for (let i = 0; i < slugStr.length; i++) {
            hash = slugStr.charCodeAt(i) + ((hash << 5) - hash);
        }

        const index = Math.abs(hash) % fallbacks.length;
        const c = cat?.toLowerCase() || '';

        // Priority themed fallbacks if local assets exist
        if (c.includes('bitcoin') || c.includes('btc')) return '/images/posts/temp/bitcoin_gold.png';
        if (c.includes('eth') || c.includes('blockchain')) return '/images/posts/temp/ethereum_network.png';

        return fallbacks[index];
    };

    const displayImage = image || getFallbackImage(slug, category);
    const finalHref = href || `/blog/${slug}`;

    return (
        <Link href={finalHref} className="block break-inside-avoid bg-white dark:bg-gray-800 rounded-3xl shadow-sm overflow-hidden mb-0 group cursor-pointer hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600 h-full">
            <div className={`h-48 bg-cover bg-center relative`} style={{ backgroundImage: `url(${displayImage})` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-4">
                    <div className="text-xs text-blue-300 font-bold mb-1 uppercase tracking-wider">{source} • {time}</div>
                    <h3 className="text-white font-bold text-lg leading-tight group-hover:underline decoration-blue-400 underline-offset-4 line-clamp-2">{title}</h3>
                </div>
            </div>
            <div className="p-5 border-t border-gray-50 dark:border-gray-700/50">
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4 line-clamp-3">{summary}</p>
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tight">
                    <div className="flex items-center gap-2">
                        {category ? (
                            <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                🏷️ {category}
                            </span>
                        ) : (
                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full">
                                🏷️ News
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                        <span>✍️</span>
                        <span>{author || 'Admin'}</span>
                    </div>
                </div>
            </div>
        </Link>
    );
};
