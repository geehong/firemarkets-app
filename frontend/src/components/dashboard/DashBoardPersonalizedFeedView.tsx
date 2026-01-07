'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useTreemapLive, TreemapLiveItem } from '@/hooks/assets/useAssets';
import { useTranslations, useLocale } from 'next-intl';
import { apiClient } from '@/lib/api';
import AIInsightCard from '@/components/dashboard/AIInsightCard';
import { AssetCard } from '@/components/widgets/AssetCard';
import { TrendingCard } from '@/components/widgets/TrendingCard';
import { NewsCard } from '@/components/widgets/NewsCard';
import { MarketMoversCard } from '@/components/widgets/MarketMoversCard';
import DashBoardTemplateView from '@/components/template/dashboard/DashBoardTemplateView';

export const DashBoardPersonalizedFeedViewContent = () => {
    const t = useTranslations('Dashboard');
    const locale = useLocale() as 'en' | 'ko';

    const { data: treemapData } = useTreemapLive({
        sort_by: "market_cap",
        sort_order: "desc",
    });

    const [aiInsights, setAiInsights] = useState<any[]>([]);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
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
        const topGainer = [...allAssets].sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))[0];
        const movers = [...allAssets].sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)).slice(0, 3);
        const keyAssetsTickers = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOG'];
        const keyAssets = keyAssetsTickers.map(t => allAssets.find(a => a.ticker === t || (a as any).asset_identifier === t)).filter(Boolean) as TreemapLiveItem[];

        const items: any[] = [];
        let postIndex = 0;
        const getNextPost = () => postIndex < aiInsights.length ? aiInsights[postIndex++] : null;

        if (keyAssets[0]) items.push({ type: 'asset', data: keyAssets[0] });
        const post1 = getNextPost();
        if (post1) {
            if (post1.post_type === 'ai_insight' || post1.post_info?.analysis) {
                items.push({ type: 'ai_insight', data: post1 });
            } else {
                const postTitle = typeof post1.title === 'object' ? (post1.title[locale] || post1.title.en || post1.title.ko) : post1.title;
                const postSummary = typeof post1.description === 'object' ? (post1.description[locale] || post1.description.en || post1.description.ko) : post1.description;
                items.push({
                    type: 'news',
                    title: postTitle,
                    summary: postSummary || post1.excerpt?.[locale] || post1.excerpt?.en || post1.excerpt?.ko || t('noSummary'),
                    source: "FireMarkets",
                    time: post1.published_at ? new Date(post1.published_at).toLocaleDateString() : new Date(post1.created_at).toLocaleDateString(),
                    image: post1.cover_image || "/images/placeholder-news.jpg",
                    slug: post1.slug,
                    category: post1.category?.name || "Market",
                    author: post1.author?.username || "Admin"
                });
            }
        }

        if (keyAssets[1]) items.push({ type: 'asset', data: keyAssets[1] });
        items.push({ type: 'trending', data: topGainer });

        const post2 = getNextPost();
        if (post2) {
            if (post2.post_type === 'ai_insight' || post2.post_info?.analysis) {
                items.push({ type: 'ai_insight', data: post2 });
            } else {
                const postTitle = typeof post2.title === 'object' ? (post2.title[locale] || post2.title.en || post2.title.ko) : post2.title;
                const postSummary = typeof post2.description === 'object' ? (post2.description[locale] || post2.description.en || post2.description.ko) : post2.description;
                items.push({
                    type: 'news',
                    title: postTitle,
                    summary: postSummary || t('clickToReadMore'),
                    source: "FireMarkets",
                    time: post2.published_at ? new Date(post2.published_at).toLocaleDateString() : new Date(post2.created_at).toLocaleDateString(),
                    image: post2.cover_image,
                    slug: post2.slug,
                    category: post2.category?.name || "Market",
                    author: post2.author?.username || "Admin"
                });
            }
        }

        if (keyAssets[2]) items.push({ type: 'asset', data: keyAssets[2] });
        if (keyAssets[3]) items.push({ type: 'asset', data: keyAssets[3] });
        items.push({ type: 'movers', data: movers });

        const post3 = getNextPost();
        if (post3) {
            if (post3.post_type === 'ai_insight' || post3.post_info?.analysis) {
                items.push({ type: 'ai_insight', data: post3 });
            } else {
                const postTitle = typeof post3.title === 'object' ? (post3.title[locale] || post3.title.en || post3.title.ko) : post3.title;
                items.push({
                    type: 'news',
                    title: postTitle,
                    summary: t('latestUpdate'),
                    source: "FireMarkets",
                    time: post3.published_at ? new Date(post3.published_at).toLocaleDateString() : new Date(post3.created_at).toLocaleDateString(),
                    image: post3.cover_image,
                    slug: post3.slug,
                    category: post3.category?.name || "Market",
                    author: post3.author?.username || "Admin"
                });
            }
        }

        if (keyAssets[4]) items.push({ type: 'asset', data: keyAssets[4] });
        keyAssets.slice(5).forEach(asset => items.push({ type: 'asset', data: asset }));

        while (postIndex < aiInsights.length) {
            const p = getNextPost();
            if (p) {
                if (p.post_type === 'ai_insight' || p.post_info?.analysis) {
                    items.push({ type: 'ai_insight', data: p });
                } else {
                    const postTitle = typeof p.title === 'object' ? (p.title[locale] || p.title.en || p.title.ko) : p.title;
                    items.push({
                        type: 'news',
                        title: postTitle,
                        summary: t('moreNews'),
                        source: "FireMarkets",
                        time: p.published_at ? new Date(p.published_at).toLocaleDateString() : new Date(p.created_at).toLocaleDateString(),
                        image: p.cover_image,
                        slug: p.slug,
                        category: p.category?.name || "Market",
                        author: p.author?.username || "Admin"
                    });
                }
            }
        }

        return { feedItems: items, isLoading: false };
    }, [treemapData, aiInsights, t, locale]);

    if (isLoading) return <div className="p-10 text-center animate-pulse">{t('loadingFeed')}</div>;

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

const DashBoardPersonalizedFeedView = () => {
    const t = useTranslations('Dashboard');
    const locale = useLocale();

    return (
        <DashBoardTemplateView
            locale={locale}
            title={t('feedTitle')}
            description={t('feedDesc')}
        >
            <DashBoardPersonalizedFeedViewContent />
        </DashBoardTemplateView>
    );
};

export default DashBoardPersonalizedFeedView;
