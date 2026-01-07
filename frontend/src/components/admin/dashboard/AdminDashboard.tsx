'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import AdminTemplateView from '@/components/template/admin/AdminTemplateView';
import { FileText, Layers, Settings, MessageSquare, BarChart } from 'lucide-react';
import Link from 'next/link';
import { usePostStats } from '@/hooks/data/usePosts';
import { useGroupedConfigs } from '@/hooks/admin/useGroupedConfigs';

export default function AdminDashboard() {
    const t = useTranslations('Admin');
    const locale = useLocale();
    const { data: stats, isLoading, isError } = usePostStats();

    // Stats Configuration
    const mainStats = [
        {
            title: "Total Content",
            count: stats?.total_posts || 0,
            sub: "All database entries",
            icon: <Layers className="w-8 h-8 text-gray-500" />,
            color: 'bg-gray-50 dark:bg-gray-800'
        },
        {
            title: "Posts",
            count: stats?.post_count || 0,
            sub: "Blog, News, OnChain",
            icon: <FileText className="w-8 h-8 text-blue-500" />,
            link: `/${locale}/admin/post`,
            color: 'bg-blue-50 dark:bg-blue-900/20'
        },
        {
            title: "Pages",
            count: stats?.page_count || 0,
            sub: "Static Pages & Assets",
            icon: <Layers className="w-8 h-8 text-purple-500" />,
            link: `/${locale}/admin/page`,
            color: 'bg-purple-50 dark:bg-purple-900/20'
        },
        {
            title: "Total Views",
            count: stats?.total_views?.toLocaleString() || 0,
            sub: "Across all content",
            icon: <BarChart className="w-8 h-8 text-indigo-500" />,
            color: 'bg-indigo-50 dark:bg-indigo-900/20'
        },
    ];

    const secondaryStats = [
        { label: "Published", value: stats?.published_posts || 0, color: "text-green-600" },
        { label: "Drafts", value: stats?.draft_posts || 0, color: "text-yellow-600" },
        { label: "This Month", value: stats?.monthly_posts || 0, color: "text-blue-600" },
        { label: "Total Comments", value: stats?.total_comments || 0, color: "text-pink-600" },
    ];

    const { data: configs, loading: configLoading } = useGroupedConfigs();

    // Config Summary Logic
    const aiConfig = configs.find(c => c.config_key === 'ai_provider_config');
    const schedulerConfig = configs.find(c => c.config_key === 'SCHEDULER_CONFIG');

    // Helper to determine active AI
    const activeAIProvider = (() => {
        if (!aiConfig?.config_value) return 'None';
        // Logic depends on actual structure. Assuming standard Grouped format:
        for (const [key, item] of Object.entries(aiConfig.config_value)) {
            if (item.is_active && (key !== 'default' && key !== 'system')) return key;
        }
        return 'Auto';
    })();

    const schedulerStatus = (() => {
        if (!schedulerConfig?.config_value) return 'Unknown';
        // Check if global scheduler toggle exists
        if (schedulerConfig.config_value.is_active?.value === true) return 'Active';
        if (schedulerConfig.config_value.is_active?.value === false) return 'Paused';
        return 'Ready';
    })();

    return (
        <AdminTemplateView locale={locale} title={t('dashboard') || "Dashboard"} subtitle={t('dashboardSubtitle') || "Overview of your content performance."}>
            <div className="space-y-6">
                {/* Main Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {mainStats.map((stat, index) => (
                        <div key={index} className={`${stat.color} p-6 rounded-lg shadow-sm border border-transparent`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{stat.title}</p>
                                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                        {isLoading ? '...' : stat.count}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>
                                </div>
                                {stat.link ? (
                                    <Link href={stat.link} className="block p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:shadow-md hover:scale-105 transition-all">
                                        {stat.icon}
                                    </Link>
                                ) : (
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                                        {stat.icon}
                                    </div>
                                )}
                            </div>
                            {stat.link && (
                                <Link href={stat.link} className="block mt-4 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400">
                                    Manage &rarr;
                                </Link>
                            )}
                        </div>
                    ))}
                </div>

                {/* Secondary Stats Row */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Content Breakdown</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {secondaryStats.map((stat, index) => (
                            <div key={index} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className={`text-2xl font-bold ${stat.color}`}>{isLoading ? '...' : stat.value}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Posts (2/3 width) */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Posts</h3>
                            <Link href={`/${locale}/admin/post/list`} className="text-sm text-blue-600 hover:underline">View All</Link>
                        </div>
                        <div className="space-y-3">
                            {stats?.recent_posts?.length > 0 ? (
                                stats.recent_posts.map((post: any) => (
                                    <div key={post.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                        <div className="flex-1 min-w-0 mr-4">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                {typeof post.title === 'object' ? (post.title[locale] || post.title['en'] || 'Untitled') : post.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 text-[10px] rounded-full uppercase font-bold ${post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {post.status}
                                                </span>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(post.created_at).toLocaleDateString(locale)}
                                                </p>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/${locale}/admin/post/edit/${post.id}`}
                                            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                        >
                                            Edit
                                        </Link>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">No recent posts found.</p>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Config Summary + Popular Categories */}
                    <div className="space-y-6">
                        {/* System Status / Config Summary */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">System Status</h3>
                                <Link href={`/${locale}/admin/config`} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <Settings className="w-5 h-5 text-gray-400 hover:text-blue-500 transition-colors" />
                                </Link>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${schedulerStatus === 'Active' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Scheduler</span>
                                    </div>
                                    <span className="text-xs text-gray-500">{configLoading ? '...' : schedulerStatus}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">AI Provider</span>
                                    </div>
                                    <span className="text-xs text-gray-500 uppercase">{configLoading ? '...' : activeAIProvider}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">System Logs</span>
                                    </div>
                                    <Link href={`/${locale}/admin/config/app?tab=logs`} className="text-xs text-blue-500 hover:underline">
                                        View Logs
                                    </Link>
                                </div>
                            </div>
                            <Link href={`/${locale}/admin/config`} className="block mt-4 text-center text-xs font-medium text-gray-500 hover:text-gray-700 border-t pt-3 dark:border-gray-600">
                                Go to Configuration &rarr;
                            </Link>
                        </div>

                        {/* Popular Categories */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Popular Categories</h3>
                            <div className="space-y-4">
                                {stats?.popular_categories?.length > 0 ? (
                                    stats.popular_categories.slice(0, 5).map((cat: any) => ( // Show top 5
                                        <div key={cat.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat.name}</span>
                                            </div>
                                            <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                                                {cat.post_count}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">No categories data.</p>
                                )}
                            </div>
                            <Link href="#" className="block mt-6 text-center text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                View All Categories
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </AdminTemplateView>
    );
}
