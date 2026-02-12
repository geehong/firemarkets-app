
'use client';

import React from 'react';
import { useDraftKeywords } from '@/hooks/data/usePosts';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Flame, ArrowRight } from 'lucide-react';

export default function DraftKeywordsWidget() {
    const locale = useLocale();
    const { data, isLoading } = useDraftKeywords(10); // Top 10

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700/50 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const keywords = data?.keywords || [];

    if (keywords.length === 0) {
        return null; 
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <Flame className="w-5 h-5 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Hot Draft Keywords
                    </h3>
                </div>
                <Link 
                    href={`/${locale}/admin/post/list?status=draft`}
                    className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1"
                >
                    View All Drafts <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
                Frequently occurring terms in draft news titles. Click to filter.
            </p>

            <div className="space-y-2">
                {keywords.map((item, index) => (
                    <Link
                        key={item.keyword}
                        href={`/${locale}/admin/post/list?search=${encodeURIComponent(item.keyword)}&status=draft`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                    >
                        <div className="flex items-center gap-3">
                            <span className={`
                                flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                                ${index === 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 
                                  index === 1 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' :
                                  index === 2 ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30' :
                                  'bg-gray-100 text-gray-600 dark:bg-gray-700'}
                            `}>
                                {index + 1}
                            </span>
                            <span className="font-medium text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {item.keyword}
                            </span>
                        </div>
                        <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                            {item.count} items
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
