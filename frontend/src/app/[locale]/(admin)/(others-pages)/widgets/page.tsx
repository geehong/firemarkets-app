"use client";

import React, { useMemo } from 'react';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/common/Breadcrumb";
import { AssetCard } from '@/components/widgets/AssetCard';
import { TrendingCard } from '@/components/widgets/TrendingCard';
import { NewsCard } from '@/components/widgets/NewsCard';
import { MarketMoversCard } from '@/components/widgets/MarketMoversCard';
import { CryptoPriceCard, CryptoMetricCard } from '@/components/widgets/PriceCards';
import { RealtimePriceWidget, MiniPriceWidget, RealtimeQuotesPriceWidget } from '@/components/widgets/PriceWidgets';
import { TickerTapeWidget } from '@/components/widgets/TickerTapeWidget';
import { DefaultBlogListCard } from '@/components/widgets/DefaultBlogListCard';
import WidgetGrid from '@/components/widgets/WidgetGrid';
import { useTreemapLiveData, TreemapLiveItem } from '@/hooks/assets/useAssets';
import { useRecentPosts } from '@/hooks/data/usePosts';
import { useTranslations, useLocale } from 'next-intl';

const WidgetsPage: React.FC = () => {
    const t = useTranslations('Dashboard');
    const locale = useLocale() as 'ko' | 'en';
    const { data: treemapData, loading: isLoading } = useTreemapLiveData();
    const { data: recentPosts, isLoading: isPostsLoading } = useRecentPosts(3);

    const { topGainer, movers, sampleAssets } = useMemo(() => {
        if (!treemapData || !(treemapData as any).data) return { topGainer: undefined, movers: [], sampleAssets: [] };

        const allAssets: TreemapLiveItem[] = (treemapData as any).data;

        // 1. Find Top Gainer
        const topGainer = [...allAssets].sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))[0];

        // 2. Find Top 3 Movers
        const movers = [...allAssets].sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)).slice(0, 3);

        // 3. Sample Assets (BTC, ETH, SOL)
        const sampleAssetsTickers = ['BTCUSDT', 'ETHUSDT', 'SOL', 'NVDA', 'AAPL'];
        const sampleAssets = sampleAssetsTickers.map(t => allAssets.find(a => a.ticker === t || (a as any).asset_identifier === t)).filter(Boolean) as TreemapLiveItem[];

        return { topGainer, movers, sampleAssets };
    }, [treemapData]);

    const latestNews = useMemo(() => {
        if (!recentPosts || recentPosts.length === 0) {
            return {
                title: "Market Update: Global Markets Rally",
                summary: "Major indices hit record highs as investor sentiment improves globally.",
                source: "FireMarkets",
                time: "Today",
                image: "https://images.unsplash.com/photo-1611974717414-0437fe73427a?auto=format&fit=crop&q=80&w=800",
                slug: "market-update",
                author: "Admin",
                category: "Market"
            };
        }

        const post = recentPosts[0];
        const getLocalized = (val: any) => {
            if (typeof val === 'string') return val;
            if (val && typeof val === 'object') return val[locale] || val.en || '';
            return '';
        };

        return {
            title: getLocalized(post.title),
            summary: getLocalized(post.excerpt) || getLocalized(post.description),
            source: post.author?.username || "FireMarkets",
            time: new Date(post.created_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US'),
            image: post.cover_image,
            slug: post.slug,
            author: post.author?.username,
            category: post.category?.name || (post.post_type ? post.post_type.charAt(0).toUpperCase() + post.post_type.slice(1) : 'News')
        };
    }, [recentPosts, locale]);

    const placeholderNews = latestNews;

    const sampleTickers = ['BTCUSDT', 'ETHUSDT', 'SOL', 'NVDA', 'AAPL', 'TSLA'];

    return (
        <div className="mx-auto max-w-7xl">
            <Breadcrumb className="mb-6">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/">Home</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Widgets</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="space-y-12 pb-20">
                {/* 1. Ticker Tape Section */}
                <section>
                    <h2 className="text-2xl font-bold mb-6 text-black dark:text-white border-b pb-2">Ticker Tape Widget</h2>
                    <div className="h-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
                        <TickerTapeWidget />
                    </div>
                </section>

                {/* 2. Realtime Price Widgets */}
                <section>
                    <h2 className="text-2xl font-bold mb-6 text-black dark:text-white border-b pb-2">Real-time Data Widgets</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <RealtimePriceWidget ticker="BTCUSDT" variant="crypto" />
                        <RealtimePriceWidget ticker="AAPL" variant="stocks" />
                        <RealtimeQuotesPriceWidget assetIdentifier="BTCUSDT" />
                    </div>
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <MiniPriceWidget ticker="ETHUSDT" showChange showStatus />
                        <MiniPriceWidget ticker="SOL" showChange showStatus />
                        <MiniPriceWidget ticker="NVDA" showChange showStatus />
                        <MiniPriceWidget ticker="TSLA" showChange showStatus />
                    </div>
                </section>

                {/* 3. Dashboard Specialized Cards */}
                <section>
                    <h2 className="text-2xl font-bold mb-6 text-black dark:text-white border-b pb-2">Specialized Market Cards</h2>
                    {isLoading || isPostsLoading ? (
                        <div className="p-10 text-center text-gray-500 animate-pulse">{t('loadingFeed')}</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-500 uppercase tracking-wider">Asset Highlights</h3>
                                {sampleAssets.slice(0, 2).map((asset) => (
                                    <AssetCard key={asset.asset_id} item={asset} />
                                ))}
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-500 uppercase tracking-wider">Trending & Movers</h3>
                                <TrendingCard topGainer={topGainer} />
                                <MarketMoversCard movers={movers} />
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-500 uppercase tracking-wider">News & Updates</h3>
                                <NewsCard {...placeholderNews} />
                                {sampleAssets.slice(2, 3).map((asset) => (
                                    <AssetCard key={asset.asset_id} item={asset} />
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                {/* 4. Alternative Blog Card Style */}
                <section>
                    <h2 className="text-2xl font-bold mb-6 text-black dark:text-white border-b pb-2">Alternative Blog Card Style</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <DefaultBlogListCard
                            id={1}
                            title={latestNews.title}
                            summary={latestNews.summary}
                            author={latestNews.author || 'Admin'}
                            date={latestNews.time}
                            image={latestNews.image || undefined}
                            category={latestNews.category || 'Market'}
                            href={`/blog/${latestNews.slug}`}
                        />
                        {/* Placeholder copies */}
                        <DefaultBlogListCard
                            id={2}
                            title="2025 Global Economic Outlook"
                            summary="Explore the key trends shaping the global economy in the coming year, from inflation to technical innovation."
                            author="Market Analyst"
                            date="2025-12-28"
                            category="Economy"
                            href="#"
                        />
                        <DefaultBlogListCard
                            id={3}
                            title="Crypto Market Psychology"
                            summary="Understanding the cycle of Fear and Greed in digital asset markets and how to remain rational."
                            author="John Doe"
                            date="2025-12-25"
                            category="Psychology"
                            href="#"
                        />
                    </div>
                </section>

                {/* 5. Styled Crypto Cards */}
                <section>
                    <h2 className="text-2xl font-bold mb-6 text-black dark:text-white border-b pb-2">Styled Price & Metric Cards</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <CryptoPriceCard
                            symbol="BTC"
                            name="Bitcoin"
                            price={45000}
                            change24h={2.5}
                            gradientFrom="from-orange-500"
                            gradientTo="to-yellow-500"
                        />
                        <CryptoPriceCard
                            symbol="ETH"
                            name="Ethereum"
                            price={2400}
                            change24h={-1.2}
                            gradientFrom="from-blue-600"
                            gradientTo="to-indigo-600"
                        />
                        <CryptoMetricCard
                            symbol="Mkt Cap"
                            name="Total Market"
                            metricValue="$2.5T"
                            metricLabel="Global Cryptocurrency"
                            gradientFrom="from-emerald-500"
                            gradientTo="to-teal-600"
                        />
                    </div>
                </section>

                {/* 5. Widget Grids */}
                <section>
                    <h2 className="text-2xl font-bold mb-6 text-black dark:text-white border-b pb-2">Responsive Widget Grids</h2>
                    <WidgetGrid
                        tickers={sampleTickers}
                        columns={3}
                        variant="default"
                        size="medium"
                    />
                </section>
            </div>
        </div>
    );
};

export default WidgetsPage;
