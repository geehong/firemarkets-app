'use client';

import React from 'react';
import Link from 'next/link';

// --- CONFIGURATION START ---
const CONFIG = {
    TITLE: {
        SIZE: 'text-xl',
        COLOR: 'text-green-900 dark:text-gray-100',
        HOVER_COLOR: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
        FONT_WEIGHT: 'font-bold'
    },
    SUMMARY: {
        SIZE: 'text-[16px] sm:text-[14px]',
        COLOR: 'text-gray-400 dark:text-gray-300',
        FONT_TYPE: 'font-medium',
        LINE_CLAMP: 'line-clamp-2',
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
    imageUrl?: string;
}

const PLACEHOLDER_IMAGES = [
    'Commodities_0001.webp', 'Commodities_0002.webp', 'Crypto_0001.webp', 'Crypto_0002.webp',
    'Crypto_0003.webp', 'Stocks_0002.webp', 'Stocks_0003.webp', 'abstract_finance.webp',
    'bitcoin_gold.webp', 'blockchain_blocks.webp', 'bull_bear.webp', 'ethereum_network.webp',
    'future_city.webp', 'global_network.webp', 'stock_chart.webp', 'tech_bg.webp', 'trading_desk.webp'
];

export const BriefNewsCard: React.FC<BriefNewsCardProps> = ({
    title,
    summary,
    source,
    author,
    slug,
    publishedAt,
    imageUrl
}) => {
    // Determine the image to use: provided URL or a stable random placeholder based on slug
    const finalImageUrl = React.useMemo(() => {
        if (imageUrl) return imageUrl;

        let hash = 0;
        for (let i = 0; i < slug.length; i++) {
            hash = slug.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % PLACEHOLDER_IMAGES.length;
        return `/images/posts/temp/${PLACEHOLDER_IMAGES[index]}`;
    }, [imageUrl, slug]);

    return (
        <article className="relative flex flex-col rounded-xl p-5 shadow-sm border border-transparent hover:shadow-xl transition-all duration-300 h-full overflow-hidden group text-white">
            {/* Background Image with Scale Effect */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url(${finalImageUrl})` }}
            />

            {/* Gradient Overlay: Left(80% opacity) -> Center(40% opacity) -> Right(0% opacity) */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    background: 'linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)'
                }}
            />

            <div className="relative z-10 flex flex-col h-full pointer-events-none">
                <Link href={`/news/briefnews/${slug}`} className="group block mb-2 pointer-events-auto">
                    <h3 className={`${CONFIG.TITLE.SIZE} ${CONFIG.TITLE.FONT_WEIGHT} text-white group-hover:text-blue-300 leading-snug transition-colors drop-shadow-md`}>
                        {title}
                    </h3>
                </Link>

                {summary && (
                    <p className={`${CONFIG.SUMMARY.SIZE} ${CONFIG.SUMMARY.LEADING} text-gray-100/90 ${CONFIG.SUMMARY.FONT_TYPE} mb-4 ${CONFIG.SUMMARY.LINE_CLAMP} drop-shadow-sm`}>
                        {summary}
                    </p>
                )}

                <div className="mt-auto pt-3 border-t border-white/15 flex items-center justify-between text-gray-300">
                    <div className="flex items-center gap-2">
                        {source && (
                            <span className={`${CONFIG.META.SIZE} font-bold bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded backdrop-blur-md border border-white/10 transition-colors pointer-events-auto`}>
                                {source}
                            </span>
                        )}
                        {author && (
                            <span className={`${CONFIG.META.SIZE} opacity-80`}>
                                {author}
                            </span>
                        )}
                    </div>
                    {publishedAt && (
                        <span className="text-[11px] font-medium opacity-70">
                            {new Date(publishedAt).toLocaleDateString()}
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
};
