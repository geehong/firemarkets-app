'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import AdminPageTemplateView from '@/components/template/admin/AdminPageTemplateView';
import { usePostStats } from '@/hooks/data/usePosts';
import Link from 'next/link';
import { Layers, PlusCircle, List } from 'lucide-react';

export default function AdminPageDashboard() {
    const t = useTranslations('Admin');
    const locale = useLocale();
    const { data: stats, isLoading } = usePostStats();

    const actions = (
        <div className="flex gap-2">
            <Link
                href={`/${locale}/admin/page/create`}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
                <PlusCircle className="w-4 h-4" />
                Create New
            </Link>
            <Link
                href={`/${locale}/admin/page/list`}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
            >
                <List className="w-4 h-4" />
                View List
            </Link>
        </div>
    );

    return (
        <AdminPageTemplateView locale={locale} actions={actions}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Total Pages */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <Layers className="w-6 h-6 text-purple-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Pages</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {isLoading ? '...' : stats?.page_count || 0}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Static Pages & Assets</p>
                </div>
            </div>

            {/* Quick Actions / Recent */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Manage Static Pages</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    Create and edit static pages for your site like About, Terms, or custom landing pages.
                </p>
                <div className="flex justify-center gap-4">
                    <Link
                        href={`/${locale}/admin/page/create`}
                        className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold"
                    >
                        Create New Page
                    </Link>
                    <Link
                        href={`/${locale}/admin/page/list`}
                        className="px-6 py-3 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-semibold"
                    >
                        View All Pages
                    </Link>
                </div>
            </div>
        </AdminPageTemplateView>
    );
}
