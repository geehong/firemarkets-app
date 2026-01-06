export const FALLBACK_IMAGES = [
    '/images/posts/temp/abstract_finance.webp',
    '/images/posts/temp/bitcoin_gold.webp',
    '/images/posts/temp/ethereum_network.webp',
    '/images/posts/temp/stock_chart.webp',
    '/images/posts/temp/global_network.webp',
    '/images/posts/temp/blockchain_blocks.webp',
    '/images/posts/temp/bull_bear.webp',
    '/images/posts/temp/future_city.webp',
    '/images/posts/temp/trading_desk.webp',
    '/images/posts/temp/tech_bg.webp',
];

interface PostLike {
    id: number;
    title: string | { ko?: string; en?: string };
    post_type?: string;
    category?: { name: string };
    tags?: Array<{ name: string }>;
}

/**
 * Utility to optimize image path by swapping extensions to .webp if applicable.
 */
export const optimizeImagePath = (path: string | null | undefined): string | null | undefined => {
    if (!path) return path;
    if (path.startsWith('http')) return path;
    // Replace .png, .jpg, .jpeg with .webp
    return path.replace(/\.(png|jpe?g)$/i, '.webp');
};

export const getFallbackImage = (post: PostLike) => {
    const titleKo = typeof post.title === 'string' ? '' : post.title.ko || '';
    const titleEn = typeof post.title === 'string' ? post.title : post.title.en || '';

    const text = `${titleEn} ${titleKo} ${post.post_type || ''} ${post.category?.name || ''} ${post.tags?.map(t => t.name).join(' ') || ''}`.toLowerCase();

    if (text.includes('bitcoin') || text.includes('btc')) return '/images/posts/temp/bitcoin_gold.webp';
    if (text.includes('ethereum') || text.includes('eth')) return '/images/posts/temp/ethereum_network.webp';
    if (text.includes('stock') || text.includes('market') || text.includes('trading')) return '/images/posts/temp/stock_chart.webp';
    if (text.includes('bull') || text.includes('bear')) return '/images/posts/temp/bull_bear.webp';
    if (text.includes('block') || text.includes('chain')) return '/images/posts/temp/blockchain_blocks.webp';
    if (text.includes('global') || text.includes('world')) return '/images/posts/temp/global_network.webp';
    if (text.includes('future') || text.includes('city') || text.includes('tech')) return '/images/posts/temp/future_city.webp';
    if (text.includes('desk') || text.includes('monitor')) return '/images/posts/temp/trading_desk.webp';

    return FALLBACK_IMAGES[Math.abs(post.id) % FALLBACK_IMAGES.length];
};
