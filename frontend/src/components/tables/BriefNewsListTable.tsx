'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

// --- CONFIGURATION START ---
// Control spacing, border, and visual density of the table rows
const TABLE_STYLE = {
    ROW: {
        PADDING: 'px-1 py-1',   // Very tight vertical/horizontal padding
        HOVER: 'hover:bg-gray-50 dark:hover:bg-gray-700/50',
        BORDER: 'border-b-0 border-transparent', // Remove bottom border
    },
    TABLE: {
        DIVIDE: 'divide-none', // Remove divider between rows
        BG: 'bg-white dark:bg-gray-800'
    },
    TYPOGRAPHY: {
        TITLE_SIZE: 'text-sm sm:text-base',
        DATE_SIZE: 'text-xs text-gray-400',
        SOURCE_SIZE: 'text-xs'
    }
};
// --- CONFIGURATION END ---


interface BriefNews {
    id: number;
    title: string | { ko?: string; en?: string };
    slug: string;
    created_at: string;
    post_info?: any;
    author?: any;
}

interface BriefNewsListTableProps {
    data: BriefNews[];
}

export const BriefNewsListTable: React.FC<BriefNewsListTableProps> = ({ data }) => {
    const locale = useLocale() as 'en' | 'ko';

    return (
        <div className="overflow-x-auto">
            <table className={`min-w-full ${TABLE_STYLE.TABLE.DIVIDE}`}>
                <tbody className={`${TABLE_STYLE.TABLE.BG} ${TABLE_STYLE.TABLE.DIVIDE}`}>
                    {data.map((item) => {
                        const title = typeof item.title === 'string' ? item.title : (item.title?.[locale] || item.title?.ko || item.title?.en || '');

                        // Parse post_info specifically for brief news source
                        let source = 'News';
                        try {
                            if (typeof item.post_info === 'string') {
                                const info = JSON.parse(item.post_info);
                                source = info.source || source;
                            } else if (typeof item.post_info === 'object' && item.post_info) {
                                source = item.post_info.source || source;
                            }
                            if (source === 'News' && item.author?.username) {
                                source = item.author.username;
                            }
                        } catch (e) {
                            // ignore
                        }

                        // Format date (YYYY-MM-DD HH:mm) -> Simplified for tight mode
                        const dateObj = new Date(item.created_at);
                        const dateStr = dateObj.toLocaleDateString().slice(2) + ' ' + dateObj.getHours().toString().padStart(2, '0') + ':' + dateObj.getMinutes().toString().padStart(2, '0');

                        return (
                            <tr key={item.id} className={`${TABLE_STYLE.ROW.HOVER} ${TABLE_STYLE.ROW.BORDER} transition-colors`}>
                                {/* Title Column */}
                                <td className={`${TABLE_STYLE.ROW.PADDING} whitespace-nowrap ${TABLE_STYLE.TYPOGRAPHY.TITLE_SIZE} font-medium text-gray-900 dark:text-white max-w-md truncate`}>
                                    <Link href={`/blog/${item.slug}`} className="hover:text-blue-600 dark:hover:text-blue-400 block w-full">
                                        {title}
                                    </Link>
                                </td>

                                {/* Date Column */}
                                <td className={`${TABLE_STYLE.ROW.PADDING} whitespace-nowrap ${TABLE_STYLE.TYPOGRAPHY.DATE_SIZE} text-right w-32`}>
                                    {dateStr}
                                </td>

                                {/* Source Column */}
                                <td className={`${TABLE_STYLE.ROW.PADDING} whitespace-nowrap ${TABLE_STYLE.TYPOGRAPHY.SOURCE_SIZE} text-right w-24 pl-2`}>
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                        {source}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {data.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                    No brief news available.
                </div>
            )}
        </div>
    );
};
