import { MetadataRoute } from 'next'
import { apiClient } from '@/lib/api'

export const revalidate = 3600 // revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://firemarkets.net'

    // Fetch posts
    let posts: any[] = [];
    try {
        const data: any = await apiClient.getPosts({
            page_size: 10000,
            status: 'published'
        });
        if (data && data.posts) {
            posts = data.posts;
        }
    } catch (e) {
        console.error('Sitemap: Failed to fetch posts', e);
    }

    // Fetch tags
    let tags: any[] = [];
    try {
        const tagData: any = await apiClient.getBlogTags();
        if (tagData && Array.isArray(tagData)) {
            tags = tagData;
        }
    } catch (e) {
        console.error('Sitemap: Failed to fetch tags', e);
    }

    // Static Routes
    const staticRoutes = [
        '',
        '/en',
        '/ko',
        '/en/blog',
        '/ko/blog',
        '/en/news',
        '/ko/news',
        '/en/assets',
        '/ko/assets',
        '/en/onchain',
        '/ko/onchain',
        '/en/map',
        '/ko/map',
        // Add more static routes as needed
    ];

    const staticEntries: MetadataRoute.Sitemap = staticRoutes.map(route => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: route === '' ? 1 : 0.8,
    }));

    // Dynamic Post Entries
    const postEntries: MetadataRoute.Sitemap = [];

    posts.forEach(post => {
        const slug = post.slug;
        const updatedAt = new Date(post.updated_at || post.created_at);
        const type = post.post_type;

        // Determine path prefix based on type
        let pathPrefixes: string[] = [];

        if (type === 'news') {
            // News are under /news/[slug]
            pathPrefixes = ['/en/news', '/ko/news'];
        } else if (type === 'brief_news') {
            // Brief news are under /briefnews/[slug]
            pathPrefixes = ['/en/briefnews', '/ko/briefnews'];
        } else if (type === 'post' || type === 'raw_news' || type === 'ai_draft_news') {
            // General posts are under /blog/[slug]
            pathPrefixes = ['/en/blog', '/ko/blog'];
        } else if (type === 'page') {
            // Pages are likely at root /[locale]/[slug]
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

    // Tag Entries
    const tagEntries: MetadataRoute.Sitemap = [];
    tags.forEach(tag => {
        if (tag.slug && tag.usage_count > 0) {
            ['en', 'ko'].forEach(locale => {
                tagEntries.push({
                    url: `${baseUrl}/${locale}/tag/${tag.slug}`,
                    lastModified: new Date(),
                    changeFrequency: 'weekly',
                    priority: 0.5
                });
            });
        }
    });

    return [...staticEntries, ...postEntries, ...tagEntries];
}
