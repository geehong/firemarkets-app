
import React from 'react';

interface AIInsightCardProps {
    post: any;
}

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';

// ... existing imports ...
// Helper: In a real app, use next-intl's formatRelativeTime or similar.
// For now, let's keep it simple or accept t as argument if we want to translate 'ago'.
// Better yet, let's move formatting inside component to access 't'.

const AIInsightCard = ({ post }: AIInsightCardProps) => {
    const t = useTranslations('Dashboard');
    const locale = useLocale() as 'en' | 'ko';
    const { title, post_info, published_at, slug } = post;
    const info = post_info || {};
    const analysis = info.analysis || {};

    const displayTitle = typeof title === 'object' ? (title[locale] || title.ko || title.en) : title;
    const summary = locale === 'ko' ? analysis.summary_ko : (analysis.summary_en || analysis.summary_ko);
    const analysisContent = locale === 'ko' ? analysis.analysis_ko : (analysis.analysis_en || analysis.analysis_ko);

    // Custom time ago with translation
    const formatTimeAgo = (dateString: string) => {
        if (!dateString) return '';
        const now = new Date();
        const past = new Date(dateString);
        const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}${t('ago_s')}`; // 's ago' or '초 전'
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}${t('ago_m')}`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}${t('ago_h')}`;
        return `${Math.floor(diffInSeconds / 86400)}${t('ago_d')}`;
    };

    const timeAgo = formatTimeAgo(published_at);

    return (
        <Link href={`/blog/${slug}`} className="block break-inside-avoid bg-white dark:bg-gray-800 rounded-3xl shadow-sm overflow-hidden mb-6 group cursor-pointer hover:shadow-md transition-shadow border border-transparent hover:border-blue-200 dark:hover:border-blue-800">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white relative overflow-hidden">
                <div className="flex justify-between items-start z-10 relative">
                    <div className="text-xs font-bold uppercase tracking-wider opacity-80 mb-2 flex items-center gap-1">
                        ✨ {t('aiInsight')} • {timeAgo}
                    </div>
                </div>
                <h3 className="font-bold text-lg leading-tight mb-2">{displayTitle}</h3>

                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -mr-4 -mt-4 text-9xl text-white opacity-10 font-black pointer-events-none">AI</div>
            </div>

            <div className="p-5 space-y-4">
                {summary && (
                    <div className="space-y-2">
                        {Array.isArray(summary) ? (
                            summary.map((item: string, idx: number) => (
                                <div key={idx} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <span className="text-blue-500 font-bold">•</span>
                                    <span>{item}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                {String(summary)}
                            </div>
                        )}
                    </div>
                )}

                {/* Analysis Snippet (Limit line count) */}
                {analysisContent && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-xs text-gray-500 dark:text-gray-400 italic">
                        " {analysisContent.substring(0, 150)}... "
                    </div>
                )}

                {/* Entities / Tags */}
                {analysis.entities && Array.isArray(analysis.entities) && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {analysis.entities.map((tag: string, idx: number) => (
                            <span key={idx} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 px-2 py-1 rounded text-xs font-bold">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Source Articles Count */}
                {info.source_articles && (
                    <div className="text-xs text-right text-gray-400">
                        {t('basedOnSources', { count: info.source_articles.length })}
                    </div>
                )}
            </div>
        </Link>
    );
};

export default AIInsightCard;
