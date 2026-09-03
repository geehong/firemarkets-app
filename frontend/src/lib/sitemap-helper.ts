import { apiClient } from '@/lib/api';

const POSTS_PER_SITEMAP = 2500;
const API_PAGE_SIZE = 1000;

async function fetchPostsPage(page: number): Promise<any[]> {
    try {
        const data: any = await apiClient.getPosts({
            page,
            page_size: API_PAGE_SIZE,
            status: 'published',
            post_type: 'brief_news'
        });
        return data?.posts || [];
    } catch (e) {
        return [];
    }
}

export async function generateBriefnewsSitemap(pageId: number) {
    const baseUrl = 'https://firemarkets.net';
    const now = new Date().toISOString();

    const startPostIndex = (pageId - 1) * POSTS_PER_SITEMAP;
    const endPostIndex = pageId * POSTS_PER_SITEMAP;

    const startApiPage = Math.floor(startPostIndex / API_PAGE_SIZE) + 1;
    const endApiPage = Math.ceil(endPostIndex / API_PAGE_SIZE);

    let fetchedPosts: any[] = [];
    try {
        const promises = [];
        for (let p = startApiPage; p <= endApiPage; p++) {
            promises.push(fetchPostsPage(p));
        }
        const results = await Promise.all(promises);
        const allFetched = results.flat();

        const offsetInFirstPage = startPostIndex % API_PAGE_SIZE;
        fetchedPosts = allFetched.slice(offsetInFirstPage, offsetInFirstPage + POSTS_PER_SITEMAP);
    } catch (e) {
        console.error(`Sitemap Briefnews ${pageId}: Error fetching posts`, e);
    }

    const postUrls: string[] = [];
    fetchedPosts.forEach(post => {
        try {
            const slug = post.slug;
            if (!slug) return;

            let updatedAt = now;
            const rawDate = post.updated_at || post.created_at;
            if (rawDate) {
                const parsed = new Date(rawDate);
                if (!isNaN(parsed.getTime())) {
                    updatedAt = parsed.toISOString();
                }
            }

            const koUrl = `${baseUrl}/news/briefnews/${slug}`;
            const enUrl = `${baseUrl}/en/news/briefnews/${slug}`;

            postUrls.push(`
  <url>
    <loc>${koUrl}</loc>
    <lastmod>${updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="${koUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
  </url>
  <url>
    <loc>${enUrl}</loc>
    <lastmod>${updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="${koUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
  </url>`);
        } catch (e) {}
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${postUrls.join('')}
</urlset>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
    });
}
