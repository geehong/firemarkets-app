"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useTreemapLive, TreemapLiveItem } from '@/hooks/assets/useAssets';
import { useRealtimePrices } from '@/hooks/data/useSocket';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import AIInsightCard from './AIInsightCard';
import { useTranslations } from 'next-intl';

// --- Helper Functions ---
const formatCurrency = (value: number | null | undefined, type: string = 'crypto') => {
    if (value === undefined || value === null) return '---';
    return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: type === 'crypto' && value < 1 ? 6 : 2
    });
};

const formatChange = (value: number | null | undefined) => {
    if (value === undefined || value === null) return '0.00%';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
};

// --- Components ---

// 1. Asset Card (Live Data + Treemap Fallback)
const AssetCard = ({ item }: { item: TreemapLiveItem }) => {
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

// 2. Trending Card (Top Gainer from Data)
const TrendingCard = ({ topGainer }: { topGainer?: TreemapLiveItem }) => {
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

// 3. News Card (Static for now)
const NewsCard = ({ title, summary, source, time, image, slug }: any) => (
    <Link href={`/blog/${slug}`} className="block break-inside-avoid bg-white dark:bg-gray-800 rounded-3xl shadow-sm overflow-hidden mb-6 group cursor-pointer hover:shadow-md transition-shadow border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
        <div className={`h-48 bg-cover bg-center relative`} style={{ backgroundImage: `url(${image})` }}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-4">
                <div className="text-xs text-blue-300 font-bold mb-1 uppercase tracking-wider">{source} • {time}</div>
                <h3 className="text-white font-bold text-lg leading-tight group-hover:underline decoration-blue-400 underline-offset-4">{title}</h3>
            </div>
        </div>
        <div className="p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">{summary}</p>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">#Market</span>
            </div>
        </div>
    </Link>
);

// 4. Market Movers Card (Replacing Portfolio - Shows top 3 gainers)
const MarketMoversCard = ({ movers }: { movers: TreemapLiveItem[] }) => {
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

export const PersonalizedFeedDashboard = () => {
    const t = useTranslations('Dashboard');
    const { data: treemapData } = useTreemapLive({
        sort_by: "market_cap",
        sort_order: "desc",
    });

    const [aiInsights, setAiInsights] = useState<any[]>([]);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                // Fetch AI News/Insights AND General Posts
                const response = await apiClient.getPosts({
                    post_type: 'post',
                    status: 'published',
                    page_size: 10
                });

                let posts: any[] = [];
                if (response && Array.isArray(response.posts)) {
                    posts = response.posts;
                } else if (response && Array.isArray(response.items)) {
                    posts = response.items;
                } else if (Array.isArray(response)) {
                    posts = response;
                }

                setAiInsights(posts);
            } catch (e) {
                console.error("Failed to fetch dashboard posts", e);
            }
        };
        fetchInsights();
    }, []);

    const { feedItems, isLoading } = useMemo(() => {
        if (!treemapData || !(treemapData as any).data) return { feedItems: [], isLoading: true };

        const allAssets: TreemapLiveItem[] = (treemapData as any).data;

        // 1. Find Top Gainer
        const topGainer = [...allAssets].sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))[0];

        // 2. Find Top 3 Movers
        const movers = [...allAssets].sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)).slice(0, 3);

        // 3. Select interesting assets
        const keyAssetsTickers = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOG'];
        const keyAssets = keyAssetsTickers.map(t => allAssets.find(a => a.ticker === t || (a as any).asset_identifier === t)).filter(Boolean) as TreemapLiveItem[];

        // Construct the Feed
        const items: any[] = [];

        // Helper to pop next insight/post
        let postIndex = 0;
        const getNextPost = () => {
            if (postIndex < aiInsights.length) {
                return aiInsights[postIndex++];
            }
            return null;
        }

        // Col 1
        if (keyAssets[0]) items.push({ type: 'asset', data: keyAssets[0] }); // BTC

        // Post 1 (Topmost)
        const post1 = getNextPost();
        if (post1) {
            if (post1.post_type === 'ai_insight' || post1.post_info?.analysis) {
                items.push({ type: 'ai_insight', data: post1 });
            } else {
                // Map Post to NewsCard props
                const title = typeof post1.title === 'object' ? (post1.title.en || post1.title.ko) : post1.title;
                const summary = typeof post1.description === 'object' ? (post1.description.en || post1.description.ko) : post1.description;
                items.push({
                    type: 'news',
                    title: title,
                    summary: summary || post1.excerpt?.en || post1.excerpt?.ko || t('noSummary'),
                    source: "FireMarkets",
                    time: post1.published_at ? new Date(post1.published_at).toLocaleDateString() : new Date(post1.created_at).toLocaleDateString(),
                    image: post1.cover_image || "/images/placeholder-news.jpg",
                    slug: post1.slug
                });
            }
        }

        if (keyAssets[1]) items.push({ type: 'asset', data: keyAssets[1] }); // ETH


        // Col 2
        items.push({ type: 'trending', data: topGainer });

        // Post 2
        const post2 = getNextPost();
        if (post2) {
            if (post2.post_type === 'ai_insight' || post2.post_info?.analysis) {
                items.push({ type: 'ai_insight', data: post2 });
            } else {
                const title = typeof post2.title === 'object' ? (post2.title.en || post2.title.ko) : post2.title;
                const summary = typeof post2.description === 'object' ? (post2.description.en || post2.description.ko) : post2.description;
                items.push({
                    type: 'news',
                    title: title,
                    summary: summary || t('clickToReadMore'),
                    source: "FireMarkets",
                    time: post2.published_at ? new Date(post2.published_at).toLocaleDateString() : new Date(post2.created_at).toLocaleDateString(),
                    image: post2.cover_image,
                    slug: post2.slug
                });
            }
        }

        if (keyAssets[2]) items.push({ type: 'asset', data: keyAssets[2] }); // SOL
        if (keyAssets[3]) items.push({ type: 'asset', data: keyAssets[3] }); // AAPL


        // Col 3
        items.push({ type: 'movers', data: movers });

        // Post 3
        const post3 = getNextPost();
        if (post3) {
            if (post3.post_type === 'ai_insight' || post3.post_info?.analysis) {
                items.push({ type: 'ai_insight', data: post3 });
            } else {
                const title = typeof post3.title === 'object' ? (post3.title.en || post3.title.ko) : post3.title;
                items.push({
                    type: 'news',
                    title: title,
                    summary: t('latestUpdate'),
                    source: "FireMarkets",
                    time: post3.published_at ? new Date(post3.published_at).toLocaleDateString() : new Date(post3.created_at).toLocaleDateString(),
                    image: post3.cover_image,
                    slug: post3.slug
                });
            }
        }

        if (keyAssets[4]) items.push({ type: 'asset', data: keyAssets[4] }); // NVDA

        // Remaining assets
        keyAssets.slice(5).forEach(asset => items.push({ type: 'asset', data: asset }));

        // Remaining posts
        while (postIndex < aiInsights.length) {
            const p = getNextPost();
            if (p) { // double check
                if (p.post_type === 'ai_insight' || p.post_info?.analysis) {
                    items.push({ type: 'ai_insight', data: p });
                } else {
                    const title = typeof p.title === 'object' ? (p.title.en || p.title.ko) : p.title;
                    items.push({
                        type: 'news',
                        title: title,
                        summary: t('moreNews'),
                        source: "FireMarkets",
                        time: p.published_at ? new Date(p.published_at).toLocaleDateString() : new Date(p.created_at).toLocaleDateString(),
                        image: p.cover_image,
                        slug: p.slug
                    });
                }
            }
        }

        return { feedItems: items, isLoading: false };
    }, [treemapData, aiInsights, t]);

    if (isLoading) {
        return <div className="p-10 text-center text-gray-500 animate-pulse">{t('loadingFeed')}</div>;
    }

    return (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6 pb-10">
            {feedItems.map((item, idx) => {
                if (item.type === 'asset') return <AssetCard key={idx} item={item.data} />;
                if (item.type === 'trending') return <TrendingCard key={idx} topGainer={item.data} />;
                if (item.type === 'movers') return <MarketMoversCard key={idx} movers={item.data} />;
                if (item.type === 'ai_insight') return <AIInsightCard key={idx} post={item.data} />;
                if (item.type === 'news') return <NewsCard key={idx} {...item} />;
                return null;
            })}
        </div>
    );
};
