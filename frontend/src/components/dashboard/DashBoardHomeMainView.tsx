'use client'

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { usePosts } from '@/hooks/data/usePosts';
import { TickerTapeWidget } from '@/components/widgets/TickerTapeWidget';
import { getFallbackImage } from '@/utils/fallbackImage';
import { BriefNewsListTable } from '@/components/tables/BriefNewsListTable';
import { apiClient } from '@/lib/api';
import DashBoardTemplateView from '@/components/template/dashboard/DashBoardTemplateView';

// Dynamic imports
const MiniPriceChart = dynamic(
    () => import('@/components/charts/minicharts/MiniPriceChart'),
    { ssr: false, loading: () => <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div> }
);

const SparklineTable = dynamic(
    () => import('@/components/tables/SparklineTable'),
    { ssr: false, loading: () => <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div> }
);

const MultipleComparisonChart = dynamic(
    () => import('@/components/charts/ohlcvcharts/MultipleComparisonChart'),
    { ssr: false, loading: () => <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div> }
);

// --- Sub Components ---

const LatestPostSection = ({ title, postType, linkUrl }: { title: string; postType: string; linkUrl: string }) => {
    const { data, isLoading } = usePosts({
        page: 1,
        page_size: 4,
        post_type: postType,
        sort_by: 'created_at',
        order: 'desc',
        status: 'published'
    });

    const posts = data?.posts || [];
    const locale = useLocale();
    const t = useTranslations('Dashboard');

    if (isLoading) return <div className="h-60 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse"></div>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-6 border border-slate-100 dark:border-gray-700">
            <div className="flex justify-between items-end mb-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-2">
                    {title}
                </h3>
                <Link href={linkUrl} className="text-sm font-medium text-slate-500 hover:text-violet-600 transition-colors">
                    {t('viewAll')} →
                </Link>
            </div>

            {(!posts || posts.length === 0) ? (
                <div className="text-center py-10 text-gray-400">No posts available.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {posts.map((post) => {
                        const hasImage = post.cover_image && post.cover_image.trim() !== '';
                        const imageUrl = hasImage ? (post.cover_image || '').trim() : getFallbackImage({ ...post, category: post.category || undefined });
                        const postTitle = typeof post.title === 'object' ? (locale === 'ko' ? (post.title.ko || post.title.en) : (post.title.en || post.title.ko)) : post.title;

                        return (
                            <Link
                                key={post.id}
                                href={`/blog/${post.slug}`}
                                className="group flex flex-col h-full"
                            >
                                <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-3 bg-gray-100 dark:bg-gray-700 shadow-sm group-hover:shadow-md transition-all duration-300">
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
                                <h4 className="text-slate-800 dark:text-gray-100 font-bold leading-tight mb-2 group-hover:text-violet-500 transition-colors line-clamp-2">
                                    {postTitle}
                                </h4>
                                <div className="flex items-center justify-between mt-auto text-xs text-slate-400 dark:text-gray-500">
                                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                    {post.author?.username && <span>by {post.author.username}</span>}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const FeatureCard = ({ title, description, icon, href, color }: any) => (
    <Link href={href} className="block group">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-slate-100 dark:border-gray-700 shadow-lg shadow-slate-200/50 dark:shadow-none h-full hover:-translate-y-1 transition-transform duration-300">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-gray-400 leading-relaxed">
                {description}
            </p>
        </div>
    </Link>
);

const BriefNewsSection = () => {
    const t = useTranslations('Dashboard');
    const { data, isLoading, refetch } = usePosts({
        post_type: 'brief_news',
        status: 'published',
        page_size: 10,
        sort_by: 'created_at',
        order: 'desc'
    });

    const briefNews = data?.posts || [];

    if (isLoading) return <div className="h-60 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse"></div>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-6 border border-slate-100 dark:border-gray-700">
            <div className="flex justify-between items-end mb-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-2">
                    {t('briefNews')}
                </h3>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => refetch()}
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-slate-500 transition-colors"
                        title="Refresh"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    <Link href="/news" className="text-sm font-medium text-slate-500 hover:text-violet-600 transition-colors">
                        View All →
                    </Link>
                </div>
            </div>
            <BriefNewsListTable data={briefNews} />
        </div>
    );
}

// --- Main View ---

const DashBoardHomeMainView = () => {
    const t = useTranslations('Dashboard');
    const locale = useLocale();
    const [selectedAssetType, setSelectedAssetType] = useState<string>('');

    const assetTypes = [
        { value: '', label_en: 'All', label_ko: '전체' },
        { value: 'Stocks', label_en: 'Stocks', label_ko: '주식' },
        { value: 'Crypto', label_en: 'Crypto', label_ko: '크립토' },
        { value: 'Commodities', label_en: 'Commodities', label_ko: '상품' },
        { value: 'ETFs', label_en: 'ETFs', label_ko: 'ETF' },
        { value: 'Funds', label_en: 'Funds', label_ko: '펀드' },
    ];

    return (
        <DashBoardTemplateView
            locale={locale}
            title={t('homeTitle')}
            description={t('homeDesc')}
        >
            <div className="space-y-8">
                {/* Hero Section */}
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white shadow-2xl">
                    <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10"></div>
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-violet-500/20 to-transparent"></div>

                    <div className="relative z-10 p-8 md:p-12 lg:p-16 text-center md:text-left">
                        <div className="max-w-3xl">
                            <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold tracking-wider mb-4 border border-white/10">
                                {t('welcome')}
                            </span>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight tracking-tight whitespace-pre-line"
                                dangerouslySetInnerHTML={{ __html: t('homeTitle').replace(' ', '<br className="hidden md:block" />') }}>
                            </h1>
                            <p className="text-lg text-slate-300 mb-8 max-w-xl leading-relaxed">
                                {t('homeDesc')}
                            </p>
                            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                <Link href="/dashboard" className="px-8 py-3.5 bg-white text-indigo-900 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-lg shadow-white/10">
                                    {t('launchDashboard')}
                                </Link>
                                <Link href="/assets" className="px-8 py-3.5 bg-white/10 backdrop-blur-md text-white rounded-xl font-bold hover:bg-white/20 transition-colors border border-white/10">
                                    {t('exploreAssets')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ticker Tape Widget */}
                <div className="grid grid-cols-1 w-full h-[72px] overflow-hidden rounded-xl shadow-lg border border-slate-100 dark:border-gray-700">
                    <TickerTapeWidget />
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FeatureCard
                        title={t('feature1Title')}
                        description={t('feature1Desc')}
                        href="/dashboard"
                        color="from-blue-500 to-cyan-400"
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                    />
                    <FeatureCard
                        title={t('feature2Title')}
                        description={t('feature2Desc')}
                        href="/onchain"
                        color="from-violet-500 to-purple-400"
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
                    />
                    <FeatureCard
                        title={t('feature3Title')}
                        description={t('feature3Desc')}
                        href="/assets"
                        color="from-pink-500 to-rose-400"
                        icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />
                </div>
                
                {/* Global Assets Chart */}
                <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-6 border border-slate-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                         <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-2">
                             Global Assets Comparison (YTD)
                         </h3>
                    </div>
                     <MultipleComparisonChart
                        assets={['GCUSD', 'BTCUSDT', 'SPY', 'QQQ']}
                        height={500}
                        compareMode="percent"
                        title=""
                        startDate="2025-01-01"
                    />
                </div>

                {/* Market Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-6 border border-slate-100 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-2">
                                {t('market')}
                            </h3>
                            <div className="relative">
                                <select
                                    value={selectedAssetType}
                                    onChange={(e) => setSelectedAssetType(e.target.value)}
                                    className="appearance-none text-xs font-semibold py-1.5 pl-3 pr-8 rounded-full bg-slate-100 dark:bg-gray-700/50 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20 hover:border-violet-300 dark:hover:border-violet-700 transition-all cursor-pointer"
                                    style={{ WebkitAppearance: 'none' }}
                                >
                                    {assetTypes.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {locale === 'ko' ? type.label_ko : type.label_en}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 shadow-sm">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <Link href="/assets" className="text-sm font-medium text-slate-500 hover:text-violet-600 transition-colors whitespace-nowrap">
                            {t('viewAll')} →
                        </Link>
                    </div>
                    <SparklineTable maxRows={10} typeName={selectedAssetType || undefined} />
                </div>

                {/* Latest Blog */}
                <LatestPostSection title={t('blog')} postType="post" linkUrl="/blog" />

                {/* Latest News */}
                <LatestPostSection title={t('news')} postType="news" linkUrl="/news" />

                {/* Brief News */}
                <BriefNewsSection />
            </div>
        </DashBoardTemplateView>
    );
};

export default DashBoardHomeMainView;
