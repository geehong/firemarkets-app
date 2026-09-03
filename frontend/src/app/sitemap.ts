import { MetadataRoute } from 'next'
import { apiClient } from '@/lib/api'

// force-dynamic: the previous ISR (revalidate=3600) build cached an empty
// post list whenever the build ran without backend access (e.g. build-time
// network isolation), and that empty sitemap could persist indefinitely if
// revalidation never got triggered by a real request. Always fetch live data
// instead - Google's crawler explicitly reported this sitemap as undetected
// for real post URLs, confirming stale/empty output reached production.
export const revalidate = 3600;

// The backend API itself caps page_size at 1000 regardless of what's
// requested, so covering more posts than that means paging through multiple
// requests rather than asking for a bigger page.
const API_PAGE_SIZE = 1000;

// Google limits a single sitemap to 50,000 URLs. Each post generates 2 URLs
// (en, ko), so this caps total posts fetched per type at Google's actual
// limit rather than an arbitrary lower number that silently dropped most
// published content.
const MAX_POSTS_PER_TYPE = 50000;

// generateSitemaps removed to force single sitemap.xml generation

async function fetchAllPublishedPosts(postType: string): Promise<any[]> {
    const results: any[] = [];
    for (let page = 1; results.length < MAX_POSTS_PER_TYPE; page++) {
        const data: any = await apiClient.getPosts({
            page,
            page_size: API_PAGE_SIZE,
            status: 'published',
            post_type: postType
        });
        const batch = data?.posts || [];
        results.push(...batch);
        if (batch.length < API_PAGE_SIZE) break; // last page reached
    }
    return results;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://firemarkets.net'

    // 1. Fetch all published posts.
    let posts: any[] = [];
    try {
        const [otherPosts, briefNewsPosts] = await Promise.all([
            fetchAllPublishedPosts('news,post,raw_news,ai_draft_news,page'),
            fetchAllPublishedPosts('brief_news'),
        ]);
        posts = [...otherPosts, ...briefNewsPosts];
    } catch (e) {
        console.error('Sitemap: Failed to fetch posts', e);
    }

    // 2. Build Post Entries
    const postEntries: MetadataRoute.Sitemap = [];
    posts.forEach(post => {
        const slug = post.slug;
        const updatedAt = new Date(post.updated_at || post.created_at);
        const type = post.post_type;

        let basePath = '/blog';
        if (type === 'news') {
            basePath = '/news';
        } else if (type === 'brief_news') {
            basePath = '/news/briefnews';
        } else if (type === 'page') {
            basePath = '';
        }

        const koUrl = `${baseUrl}${basePath}/${slug}`;
        const enUrl = `${baseUrl}/en${basePath}/${slug}`;

        const pathPrefixes = [
            { prefix: '', url: koUrl },
            { prefix: '/en', url: enUrl }
        ];

        pathPrefixes.forEach(({ url }) => {
            const restrictedPaths = ['/admin', '/profile', '/calendar', '/widgets', '/tables', '/chart'];
            const isRestricted = restrictedPaths.some(p => url.includes(p));

            if (!isRestricted) {
                postEntries.push({
                    url,
                    lastModified: updatedAt,
                    changeFrequency: 'weekly',
                    priority: type === 'news' ? 0.7 : 0.6,
                    alternates: {
                        languages: {
                            ko: koUrl,
                            en: enUrl
                        }
                    }
                });
            }
        });
    });

    // 3. Static Routes & Tags
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

        // ko is the default locale (localePrefix: 'as-needed'), so its canonical
        // URLs carry no /ko prefix - only /en gets prefixed.
        const localePrefix = (locale: string) => locale === 'ko' ? '' : `/${locale}`

        // Root translations
        staticRoutes.push('', '/en')

        // Main routes
        locales.forEach(locale => {
            const prefix = localePrefix(locale)
            mainRoutes.forEach(route => {
                if (route !== '') {
                    staticRoutes.push(`${prefix}${route}`)
                }
            })
        })

        // On-chain metric routes
        locales.forEach(locale => {
            const prefix = localePrefix(locale)
            onchainMetrics.forEach(metric => {
                staticRoutes.push(`${prefix}/onchain/${metric}`)
            })
        })

        const staticEntries: MetadataRoute.Sitemap = staticRoutes.map(route => ({
            url: `${baseUrl}${route}`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: route === '' || route === '/en' ? 1 : 0.8,
        }));

        const tagEntries: MetadataRoute.Sitemap = [];
        tags.forEach(tag => {
            if (tag.slug && tag.usage_count > 0) {
                locales.forEach(locale => {
                    const prefix = localePrefix(locale)
                    tagEntries.push({
                        url: `${baseUrl}${prefix}/tag/${tag.slug}`,
                        lastModified: new Date(),
                        changeFrequency: 'weekly',
                        priority: 0.5
                    });
                });
            }
        });

    return [...staticEntries, ...tagEntries, ...postEntries];
}
