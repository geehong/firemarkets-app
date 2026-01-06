"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { usePosts, Post } from '@/hooks/data/usePosts';

import { TickerTapeWidget } from '@/components/widgets/TickerTapeWidget';

// Dynamic import for MiniPriceChart
const MiniPriceChart = dynamic(
    () => import('@/components/charts/minicharts/MiniPriceChart'),
    { ssr: false, loading: () => <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div> }
);

import { getFallbackImage } from '@/utils/fallbackImage';

// Dynamic import for SparklineTable
const SparklineTable = dynamic(
    () => import('@/components/tables/SparklineTable'),
    { ssr: false, loading: () => <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div> }
);

interface LatestPostSectionProps {
    title: string;
    postType: string;
    linkUrl: string;
}

const LatestPostSection = ({ title, postType, linkUrl }: LatestPostSectionProps) => {
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
    // if (!posts || posts.length === 0) return null; // Show even if empty to maintain layout or show "No posts" message? Keeping as is for now.

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
                        const title = locale === 'ko' ? (post.title.ko || post.title.en) : (post.title.en || post.title.ko);

                        return (
                            <Link
                                key={post.id}
                                href={`/blog/${post.slug}`}
                                className="group flex flex-col h-full"
                            >
                                <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-3 bg-gray-100 dark:bg-gray-700 shadow-sm group-hover:shadow-md transition-all duration-300">
                                    <img
                                        src={imageUrl!}
                                        alt={post.cover_image_alt || title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        onError={(e) => { e.currentTarget.src = getFallbackImage({ ...post, category: post.category || undefined }); }}
                                    />
                                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                                        {post.post_type === 'post' ? 'Blog' : post.post_type}
                                    </div>
                                </div>
                                <h4 className="text-slate-800 dark:text-gray-100 font-bold leading-tight mb-2 group-hover:text-violet-500 transition-colors line-clamp-2">
                                    {title}
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

const HomeMain = () => {
    const t = useTranslations('Dashboard');

    return (
        <div className="w-full max-w-[1920px] mx-auto space-y-8 p-4 md:p-6">
            {/* Hero Section */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white shadow-2xl">
                <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10"></div>
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-violet-500/20 to-transparent"></div>

                <div className="relative z-10 p-8 md:p-12 lg:p-16 text-center md:text-left">
                    <div className="max-w-3xl">
                        <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold tracking-wider mb-4 border border-white/10">
                            WELCOME TO FIREMARKETS
                        </span>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight tracking-tight">
                            The Future of <br className="hidden md:block" />
                            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">Financial Intelligence</span>
                        </h1>
                        <p className="text-lg text-slate-300 mb-8 max-w-xl leading-relaxed">
                            Professional-grade market data, on-chain analytics, and AI-driven insights for the modern investor.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                            <Link href="/dashboard" className="px-8 py-3.5 bg-white text-indigo-900 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-lg shadow-white/10">
                                Launch Dashboard
                            </Link>
                            <Link href="/assets" className="px-8 py-3.5 bg-white/10 backdrop-blur-md text-white rounded-xl font-bold hover:bg-white/20 transition-colors border border-white/10">
                                Explore Assets
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
                    title="Real-time Analytics"
                    description="Live market data streaming via WebSocket with sub-second latency for crypto and traditional assets."
                    href="/dashboard"
                    color="from-blue-500 to-cyan-400"
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                />
                <FeatureCard
                    title="On-Chain Insights"
                    description="Deep dive into blockchain metrics, whale movements, and network health indicators."
                    href="/onchain"
                    color="from-violet-500 to-purple-400"
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
                />
                <FeatureCard
                    title="Global Asset Map"
                    description="Visualizing market trends across the globe with our interactive 3D formatting market map."
                    href="/map"
                    color="from-pink-500 to-rose-400"
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
            </div>

            {/* Market Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-6 border border-slate-100 dark:border-gray-700">
                <div className="flex justify-between items-end mb-6">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent flex items-center gap-2">
                        {t('market')}
                    </h3>
                    <Link href="/assets" className="text-sm font-medium text-slate-500 hover:text-violet-600 transition-colors">
                        {t('viewAll')} →
                    </Link>
                </div>
                <SparklineTable maxRows={10} />
            </div>

            {/* Latest Blog */}
            <LatestPostSection title={t('blog')} postType="post" linkUrl="/blog" />

            {/* Latest News */}
            <LatestPostSection title={t('news')} postType="news" linkUrl="/news" />
        </div>
    );
};

export default HomeMain;
