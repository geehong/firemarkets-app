'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import AdminPostTemplateView from '@/components/template/admin/AdminPostTemplateView';
import { usePostStats } from '@/hooks/data/usePosts';
import Link from 'next/link';
import { FileText, PlusCircle, List } from 'lucide-react';

import DraftKeywordsWidget from './DraftKeywordsWidget';

export default function AdminPostDashboard() {
    const t = useTranslations('Admin');
    const locale = useLocale();
    const { data: stats, isLoading } = usePostStats();

    const actions = (
        <div className="flex gap-2">
            <Link
                href={`/${locale}/admin/post/create`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
                <PlusCircle className="w-4 h-4" />
                Create New
            </Link>
            <Link
                href={`/${locale}/admin/post/list`}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
            >
                <List className="w-4 h-4" />
                View List
            </Link>
        </div>
    );

    return (
        <AdminPostTemplateView locale={locale} actions={actions}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Total Posts */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <FileText className="w-6 h-6 text-blue-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {isLoading ? '...' : stats?.post_count || 0}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Blog Content & News</p>
                </div>

                {/* Published */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="w-6 h-6 rounded-full border-4 border-green-500/30 bg-green-500"></div>
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Published</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {isLoading ? '...' : stats?.published_posts || 0}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Live content</p>
                </div>

                {/* Drafts */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <div className="w-6 h-6 rounded-full border-4 border-yellow-500/30 bg-yellow-500"></div>
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Drafts</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {isLoading ? '...' : stats?.draft_posts || 0}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Work in progress</p>
                </div>
            </div>

            {/* Keyword Widget Row */}
            <div className="mb-8">
               <DraftKeywordsWidget />
            </div>

            {/* Quick Actions / Recent */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Manage Your Posts</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    Create new blog posts, news updates, or manage existing content. Use the list view to filter and search.
                </p>
                <div className="flex justify-center gap-4">
                    <Link
                        href={`/${locale}/admin/post/create`}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
                    >
                        Write New Post
                    </Link>
                    <Link
                        href={`/${locale}/admin/post/list`}
                        className="px-6 py-3 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-semibold"
                    >
                        Browse All Posts
                    </Link>
                </div>
            </div>
        </AdminPostTemplateView>
    );
}
