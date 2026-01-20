import { MetadataRoute } from 'next'
import { apiClient } from '@/lib/api'

export const revalidate = 3600 // revalidate every hour

// Google limits sitemaps to 50,000 URLs.
// Each post generates 2 URLs (en, ko).
// So 10,000 posts = 20,000 URLs, which is safely within the limit.
const PER_SITEMAP_POSTS = 10000;

// generateSitemaps removed to force single sitemap.xml generation


export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://firemarkets.net'
    
    // Single sitemap mode
    const pageIndex = 0;

    // 1. Fetch posts for this specific range (pageIndex + 1)
    let posts: any[] = [];
    try {
        const data: any = await apiClient.getPosts({
            page: pageIndex + 1, // API uses 1-based indexing
            page_size: PER_SITEMAP_POSTS,
            status: 'published'
        });
        if (data && data.posts) {
            posts = data.posts;
        }
    } catch (e) {
        console.error(`Sitemap: Failed to fetch posts for index ${pageIndex}`, e);
    }

    // 2. Build Post Entries
    const postEntries: MetadataRoute.Sitemap = [];
    posts.forEach(post => {
        const slug = post.slug;
        const updatedAt = new Date(post.updated_at || post.created_at);
        const type = post.post_type;

        let pathPrefixes: string[] = [];

        if (type === 'news') {
            pathPrefixes = ['/en/news', '/ko/news'];
        } else if (type === 'brief_news') {
            pathPrefixes = ['/en/briefnews', '/ko/briefnews'];
        } else if (type === 'post' || type === 'raw_news' || type === 'ai_draft_news') {
            pathPrefixes = ['/en/blog', '/ko/blog'];
        } else if (type === 'page') {
            pathPrefixes = ['/en', '/ko'];
        }

        if (pathPrefixes.length > 0) {
            pathPrefixes.forEach(prefix => {
                postEntries.push({
                    url: `${baseUrl}${prefix}/${slug}`,
                    lastModified: updatedAt,
                    changeFrequency: 'weekly',
                    priority: type === 'news' ? 0.7 : 0.6
                });
            });
        }
    });

    // 3. Static Routes & Tags (Include ONLY in the first sitemap map)
    if (pageIndex === 0) {
        // Fetch Tags
        let tags: any[] = [];
        try {
            const tagData: any = await apiClient.getBlogTags();
            if (tagData && Array.isArray(tagData)) {
                tags = tagData;
            }
        } catch (e) {
            console.error('Sitemap: Failed to fetch tags', e);
        }

        const locales = ['ko', 'en']
        const mainRoutes = [
            '',
            // '/dashboard', // Excluded for AdSense: likely requires login or is dynamic
            '/blog',
            '/news',
            '/news/briefnews',
            '/assets',
            '/onchain',
            '/map',
        ]

        const onchainMetrics = [
            'halving/cycle-comparison',
            'halving/halving-bull-chart',
            'mvrv_z_score',
            'mvrv',
            'lth_mvrv',
            'sth_mvrv',
            'nupl',
            'lth_nupl',
            'sth_nupl',
            'puell_multiple',
            'reserve_risk',
            'realized_price',
            'sth_realized_price',
            'terminal_price',
            'delta_price_usd',
            'true_market_mean',
            'aviv',
            'sopr',
            'cdd_90dma',
            'hodl_waves_supply',
            'nrpl_usd',
            'utxos_in_profit_pct',
            'utxos_in_loss_pct',
            'hashrate',
            'difficulty',
            'rhodl_ratio',
            'nvts',
            'market_cap',
            'realized_cap',
            'thermo_cap',
            'etf_btc_total',
            'etf_btc_flow'
        ]

        const staticRoutes: string[] = []

        // Root translations
        staticRoutes.push('', '/en', '/ko')

        // Main routes
        locales.forEach(locale => {
            mainRoutes.forEach(route => {
                if (route !== '') {
                    staticRoutes.push(`/${locale}${route}`)
                }
            })
        })

        // On-chain metric routes
        locales.forEach(locale => {
            onchainMetrics.forEach(metric => {
                staticRoutes.push(`/${locale}/onchain/${metric}`)
            })
        })

        const staticEntries: MetadataRoute.Sitemap = staticRoutes.map(route => ({
            url: `${baseUrl}${route}`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: route === '' || route === '/en' || route === '/ko' ? 1 : 0.8,
        }));

        const tagEntries: MetadataRoute.Sitemap = [];
        tags.forEach(tag => {
            if (tag.slug && tag.usage_count > 0) {
                locales.forEach(locale => {
                    tagEntries.push({
                        url: `${baseUrl}/${locale}/tag/${tag.slug}`,
                        lastModified: new Date(),
                        changeFrequency: 'weekly',
                        priority: 0.5
                    });
                });
            }
        });

        // Return combined entries for the first page
        return [...staticEntries, ...tagEntries, ...postEntries];
    }

    // For subsequent pages, return only post entries
    return postEntries;
}
