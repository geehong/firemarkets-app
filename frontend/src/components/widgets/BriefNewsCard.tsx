'use client';

import React from 'react';
import Link from 'next/link';

// --- CONFIGURATION START ---
// Customize the appearance of the BriefNewsCard here
const CONFIG = {
    TITLE: {
        SIZE: 'text-xl', // e.g., text-lg, text-xl, text-2xl
        COLOR: 'text-green-900 dark:text-gray-100',
        HOVER_COLOR: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
        FONT_WEIGHT: 'font-bold'
    },
    SUMMARY: {
        SIZE: 'text-[16px] sm:text-[14px]', // Custom pixel sizes or Tailwind classes
        COLOR: 'text-gray-400 dark:text-gray-300',
        FONT_TYPE: 'font-medium', // e.g., font-normal, font-medium
        LINE_CLAMP: 'line-clamp-2', // line-clamp-2, line-clamp-3, etc.
        LEADING: 'leading-relaxed'
    },
    META: {
        SIZE: 'text-[12px]',
        COLOR: 'text-blue-500 dark:text-gray-400',
        SOURCE_BG: 'bg-gray-100 dark:bg-gray-700',
        SOURCE_TEXT: 'text-gray-700 dark:text-gray-300'
    }
};
// --- CONFIGURATION END ---

interface BriefNewsCardProps {
    title: string;
    summary?: string;
    source?: string;
    author?: string;
    slug: string;
    publishedAt?: string;
}

export const BriefNewsCard: React.FC<BriefNewsCardProps> = ({
    title,
    summary,
    source,
    author,
    slug,
    publishedAt
}) => {
    return (
        <article className="flex flex-col bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200 h-full">
            <Link href={`/blog/${slug}`} className="group block mb-3">
                <h3 className={`${CONFIG.TITLE.SIZE} ${CONFIG.TITLE.FONT_WEIGHT} ${CONFIG.TITLE.COLOR} ${CONFIG.TITLE.HOVER_COLOR} leading-snug transition-colors`}>
                    {title}
                </h3>
            </Link>

            {summary && (
                <p className={`${CONFIG.SUMMARY.SIZE} ${CONFIG.SUMMARY.LEADING} ${CONFIG.SUMMARY.COLOR} ${CONFIG.SUMMARY.FONT_TYPE} mb-4 ${CONFIG.SUMMARY.LINE_CLAMP}`}>
                    {summary}
                </p>
            )}

            <div className={`mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between ${CONFIG.META.COLOR}`}>
                <div className="flex items-center gap-3">
                    {source && (
                        <span className={`${CONFIG.META.SIZE} font-semibold ${CONFIG.META.SOURCE_BG} px-2 py-0.5 rounded ${CONFIG.META.SOURCE_TEXT}`}>
                            {source}
                        </span>
                    )}
                    {author && (
                        <span className={`${CONFIG.META.SIZE}`}>
                            {author}
                        </span>
                    )}
                </div>
                {publishedAt && (
                    <span className="text-[12px]">
                        {new Date(publishedAt).toLocaleDateString()}
                    </span>
                )}
            </div>
        </article>
    );
};
