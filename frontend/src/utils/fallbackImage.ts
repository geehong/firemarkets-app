export const FALLBACK_IMAGES = [
    '/images/posts/temp/abstract_finance.png',
    '/images/posts/temp/bitcoin_gold.png',
    '/images/posts/temp/ethereum_network.png',
    '/images/posts/temp/stock_chart.png',
    '/images/posts/temp/global_network.png',
    '/images/posts/temp/blockchain_blocks.png',
    '/images/posts/temp/bull_bear.png',
    '/images/posts/temp/future_city.png',
    '/images/posts/temp/trading_desk.png',
    '/images/posts/temp/tech_bg.png',
];

interface PostLike {
    id: number;
    title: string | { ko?: string; en?: string };
    post_type?: string;
    category?: { name: string };
    tags?: Array<{ name: string }>;
}

export const getFallbackImage = (post: PostLike) => {
    const titleKo = typeof post.title === 'string' ? '' : post.title.ko || '';
    const titleEn = typeof post.title === 'string' ? post.title : post.title.en || '';

    const text = `${titleEn} ${titleKo} ${post.post_type || ''} ${post.category?.name || ''} ${post.tags?.map(t => t.name).join(' ') || ''}`.toLowerCase();

    if (text.includes('bitcoin') || text.includes('btc')) return '/images/posts/temp/bitcoin_gold.png';
    if (text.includes('ethereum') || text.includes('eth')) return '/images/posts/temp/ethereum_network.png';
    if (text.includes('stock') || text.includes('market') || text.includes('trading')) return '/images/posts/temp/stock_chart.png';
    if (text.includes('bull') || text.includes('bear')) return '/images/posts/temp/bull_bear.png';
    if (text.includes('block') || text.includes('chain')) return '/images/posts/temp/blockchain_blocks.png';
    if (text.includes('global') || text.includes('world')) return '/images/posts/temp/global_network.png';
    if (text.includes('future') || text.includes('city') || text.includes('tech')) return '/images/posts/temp/future_city.png';
    if (text.includes('desk') || text.includes('monitor')) return '/images/posts/temp/trading_desk.png';

    return FALLBACK_IMAGES[post.id % FALLBACK_IMAGES.length];
};
