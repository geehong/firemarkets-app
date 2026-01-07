'use client'

import React, { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTreemapLive, TreemapLiveItem } from '@/hooks/assets/useAssets';
import { useRealtimePrices } from '@/hooks/data/useSocket';
import { usePosts } from '@/hooks/data/usePosts';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { getFallbackImage } from '@/utils/fallbackImage';
import { BriefNewsListTable } from '@/components/tables/BriefNewsListTable';
import DashBoardTemplateView from '@/components/template/dashboard/DashBoardTemplateView';

// Dynamic import for MiniPriceChart (client-side only)
const MiniPriceChart = dynamic(
    () => import('@/components/charts/minicharts/MiniPriceChart'),
    { ssr: false, loading: () => <div className="h-48 flex items-center justify-center text-slate-400">Loading chart...</div> }
);

// --- Helper Functions ---
const formatCurrency = (value: number | null | undefined) => {
    if (value === undefined || value === null) return '---';
    if (value >= 1000) {
        return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: value < 1 ? 6 : 2 });
};

const formatLargeNumber = (value: number | null | undefined) => {
    if (value === undefined || value === null) return '---';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
};

// --- Sub Components ---

const AssetRow = ({ item, colorClass }: { item: TreemapLiveItem; colorClass: string }) => {
    const { latestPrice, isConnected } = useRealtimePrices(item.ticker);
    const price = latestPrice?.price ?? item.current_price;
    const change = latestPrice?.changePercent ?? item.price_change_percentage_24h;
    const isPositive = (change || 0) >= 0;

    return (
        <Link href={`/assets/${item.ticker}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${colorClass} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                {item.ticker[0]}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-slate-800 dark:text-white font-medium text-sm truncate">{item.name}</div>
                <div className="text-slate-400 text-xs flex items-center gap-1">
                    {item.ticker}
                    {isConnected && <span className="text-green-500 animate-pulse">●</span>}
                </div>
            </div>
            <div className="text-right">
                <div className="text-slate-800 dark:text-white font-medium text-sm">${formatCurrency(price)}</div>
                <div className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}{(change ?? 0).toFixed(2)}%
                </div>
            </div>
        </Link>
    );
};

const MainNewsSection = () => {
    const { data, isLoading } = usePosts({
        page: 1,
        page_size: 4,
        post_type: 'news',
        sort_by: 'created_at',
        order: 'desc',
        status: 'published'
    });

    const posts = data?.posts || [];
    const t = useTranslations('Dashboard');
    const locale = useLocale();

    if (isLoading) {
        return (
            <div className="col-span-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-5 border border-slate-100 dark:border-gray-700">
                <div className="h-40 flex items-center justify-center text-slate-400 animate-pulse">
                    Loading main news...
                </div>
            </div>
        );
    }

    if (!posts || posts.length === 0) return null;

    return (
        <div className="col-span-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-5 border border-slate-100 dark:border-gray-700">
            <div className="flex justify-between items-end mb-4">
                <h3 className="text-slate-800 dark:text-white font-semibold flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-gradient-to-b from-blue-500 to-violet-500 rounded-full"></span>
                    Main News & Research
                </h3>
                <Link href="/news" className="text-sm text-violet-500 hover:text-violet-600 font-medium">
                    View All News
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {posts.map((post) => {
                    const hasImage = post.cover_image && post.cover_image.trim() !== '';
                    const imageUrl = hasImage ? post.cover_image : getFallbackImage({ ...post, category: post.category || undefined });
                    const postTitle = typeof post.title === 'object' ? (locale === 'ko' ? (post.title.ko || post.title.en) : (post.title.en || post.title.ko)) : post.title;

                    return (
                        <Link
                            key={post.id}
                            href={`/blog/${post.slug}`}
                            className="group flex flex-col h-full hover:-translate-y-1 transition-transform duration-200"
                        >
                            <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-gray-100 dark:bg-gray-700">
                                <img
                                    src={imageUrl!}
                                    alt={post.cover_image_alt || postTitle}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => {
                                        if (e.currentTarget.src.includes('placeholder')) return;
                                        e.currentTarget.src = 'https://via.placeholder.com/800x450?text=FireMarkets';
                                    }}
                                />
                                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                                    {post.post_type === 'post' ? 'Blog' : post.post_type}
                                </div>
                            </div>
                            <h4 className="text-slate-800 dark:text-white font-medium line-clamp-2 mb-2 group-hover:text-violet-500 transition-colors">
                                {postTitle}
                            </h4>
                            <div className="flex items-center justify-between mt-auto text-xs text-slate-500 dark:text-gray-400">
                                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                {post.author?.username && <span>by {post.author.username}</span>}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

const BriefNewsSection = () => {
    const t = useTranslations('Dashboard');
    const { data, isLoading } = usePosts({
        page: 1,
        page_size: 10,
        post_type: 'brief_news',
        sort_by: 'created_at',
        order: 'desc',
        status: 'published'
    });

    const posts = data?.posts || [];

    if (isLoading) {
        return (
            <div className="col-span-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-5 border border-slate-100 dark:border-gray-700">
                <div className="h-20 flex items-center justify-center text-slate-400 animate-pulse">
                    Loading brief news...
                </div>
            </div>
        );
    }

    if (!posts || posts.length === 0) return null;

    return (
        <div className="col-span-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-5 border border-slate-100 dark:border-gray-700">
            <div className="flex justify-between items-end mb-4">
                <h3 className="text-slate-800 dark:text-white font-semibold flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></span>
                    {t('briefNews')} (Latest 24h)
                </h3>
                <Link href="/news" className="text-sm text-orange-500 hover:text-orange-600 font-medium">
                    View All Brief
                </Link>
            </div>
            <BriefNewsListTable data={posts} />
        </div>
    );
};

// --- View Content ---
export const DashBoardPrismHubViewContent = () => {
    const t = useTranslations('Dashboard');
    const [currentChartIndex, setCurrentChartIndex] = useState(0);

    const { data: treemapData, isLoading, error } = useTreemapLive({
        sort_by: "market_cap",
        sort_order: "desc",
    });

    const { portfolioStats, topAssets, assetTypeBreakdown } = useMemo(() => {
        if (!treemapData || !(treemapData as any).data) {
            return { portfolioStats: null, topAssets: [], assetTypeBreakdown: [] };
        }
        const allAssets: TreemapLiveItem[] = (treemapData as any).data;
        const totalValue = allAssets.slice(0, 20).reduce((sum, a) => sum + (a.market_cap || 0), 0);
        const avgChange = allAssets.slice(0, 10).reduce((sum, a) => sum + (a.price_change_percentage_24h || 0), 0) / 10;
        const typeMap: Record<string, { count: number; totalCap: number }> = {};
        allAssets.forEach(a => {
            const type = a.asset_type || 'Other';
            if (!typeMap[type]) typeMap[type] = { count: 0, totalCap: 0 };
            typeMap[type].count++;
            typeMap[type].totalCap += a.market_cap || 0;
        });
        const breakdown = [
            { label: 'Crypto', value: formatLargeNumber(typeMap['Crypto']?.totalCap || typeMap['crypto']?.totalCap), color: 'from-violet-400 to-indigo-500' },
            { label: 'Stocks', value: formatLargeNumber(typeMap['Stocks']?.totalCap || typeMap['Stock']?.totalCap || typeMap['Common Stock']?.totalCap), color: 'from-pink-400 to-rose-500' },
            { label: 'ETFs', value: formatLargeNumber(typeMap['ETFs']?.totalCap || typeMap['ETF']?.totalCap), color: 'from-amber-400 to-orange-500' },
        ];
        return { portfolioStats: { totalValue, avgChange }, topAssets: allAssets.slice(0, 4), assetTypeBreakdown: breakdown };
    }, [treemapData]);

    useEffect(() => {
        if (topAssets.length === 0) return;
        const interval = setInterval(() => {
            setCurrentChartIndex(prev => (prev + 1) % topAssets.length);
        }, 60 * 1000);
        return () => clearInterval(interval);
    }, [topAssets.length]);

    if (isLoading) return <div className="p-10 text-center animate-pulse">{t('loadingFeed')}</div>;
    if (error) return <div className="p-10 text-center text-red-500">Error loading dashboard data</div>;

    const assetColors = ['from-orange-400 to-amber-500', 'from-indigo-400 to-blue-500', 'from-purple-400 to-violet-500', 'from-emerald-400 to-green-500'];

    return (
        <div className="w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500"></div>
            <div className="p-6">
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-5 bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-5 border border-slate-100 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-slate-400 text-sm mb-1">{t('totalPortfolio')}</div>
                                <div className="text-3xl font-bold text-slate-800 dark:text-white">{formatLargeNumber(portfolioStats?.totalValue)}</div>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`text-sm font-medium ${(portfolioStats?.avgChange || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {(portfolioStats?.avgChange || 0) >= 0 ? '↑' : '↓'} {Math.abs(portfolioStats?.avgChange || 0).toFixed(2)}%
                                    </span>
                                    <span className="text-slate-400 text-xs">24h avg</span>
                                </div>
                            </div>
                            <div className={`w-14 h-14 rounded-full bg-gradient-to-r ${(portfolioStats?.avgChange || 0) >= 0 ? 'from-green-400 to-emerald-500' : 'from-red-400 to-rose-500'} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                                {(portfolioStats?.avgChange || 0) >= 0 ? '+' : ''}{(portfolioStats?.avgChange || 0).toFixed(1)}%
                            </div>
                        </div>
                    </div>

                    {assetTypeBreakdown.map((s, i) => (
                        <div key={i} className="col-span-4 md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none p-4 border border-slate-100 dark:border-gray-700 relative overflow-hidden">
                            <div className={`absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br ${s.color} opacity-20 rounded-full blur-xl`}></div>
                            <div className="text-slate-400 text-xs">{s.label}</div>
                            <div className="text-slate-800 dark:text-white font-bold text-lg">{s.value}</div>
                        </div>
                    ))}

                    <div className="col-span-12 md:col-span-1 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg p-3 flex flex-col items-center justify-center text-white">
                        <div className="w-4 h-4 rounded-full bg-white/30 animate-ping mb-1"></div>
                        <span className="text-xs font-bold">LIVE</span>
                    </div>

                    <div className="col-span-12 md:col-span-8 bg-gray-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden border border-slate-100 dark:border-gray-700 relative">
                        {topAssets.length > 0 && (
                            <div className="absolute top-2 right-2 z-10 flex gap-1">
                                {topAssets.map((_, i) => (
                                    <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === currentChartIndex ? 'bg-violet-500' : 'bg-gray-600'}`} />
                                ))}
                            </div>
                        )}
                        <MiniPriceChart
                            key={topAssets[currentChartIndex]?.ticker || 'BTCUSDT'}
                            containerId={`prism-chart-${currentChartIndex}`}
                            assetIdentifier={topAssets[currentChartIndex]?.ticker || 'BTCUSDT'}
                            chartType="crypto"
                            useWebSocket={true}
                        />
                    </div>

                    <div className="col-span-12 md:col-span-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-5 border border-slate-100 dark:border-gray-700">
                        <h3 className="text-slate-800 dark:text-white font-semibold mb-4">{t('topAssets')}</h3>
                        <div className="space-y-1">
                            {topAssets.map((asset, i) => (
                                <AssetRow key={asset.ticker} item={asset} colorClass={assetColors[i]} />
                            ))}
                        </div>
                    </div>

                    <MainNewsSection />
                    <BriefNewsSection />
                </div>
            </div>
        </div>
    );
};

// --- Main View ---

const DashBoardPrismHubView = () => {
    const t = useTranslations('Dashboard');
    const locale = useLocale();

    return (
        <DashBoardTemplateView
            locale={locale}
            title={t('prismTitle')}
            description={t('prismDesc')}
        >
            <DashBoardPrismHubViewContent />
        </DashBoardTemplateView>
    );
};

export default DashBoardPrismHubView;
