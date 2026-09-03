export const dynamic = 'force-dynamic';
export const revalidate = 0;

const POSTS_PER_SITEMAP = 2500; // 2,500 posts = 5,000 URLs per sitemap

async function getPostCount(postType: string): Promise<number> {
    try {
        const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://backend:8000';
        const res = await fetch(`${backendUrl}/api/v1/posts?page=1&page_size=1&status=published&post_type=${postType}`, {
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
        });
        if (res.ok) {
            const data = await res.json();
            return data?.total || 0;
        }
        return 0;
    } catch (e) {
        return 0;
    }
}

export async function GET() {
    const baseUrl = 'https://firemarkets.net';
    const now = new Date().toISOString();

    const [briefnewsTotal, newsTotal, blogTotal] = await Promise.all([
        getPostCount('brief_news'),
        getPostCount('news'),
        getPostCount('post'),
    ]);

    const briefnewsSitemapCount = Math.max(4, Math.ceil(briefnewsTotal / POSTS_PER_SITEMAP));

    const sitemapEntries: string[] = [
        `  <sitemap>
    <loc>${baseUrl}/sitemap-static.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`,
        `  <sitemap>
    <loc>${baseUrl}/sitemap-news.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`,
        `  <sitemap>
    <loc>${baseUrl}/sitemap-blog.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`
    ];

    for (let i = 1; i <= briefnewsSitemapCount; i++) {
        sitemapEntries.push(`  <sitemap>
    <loc>${baseUrl}/sitemap-briefnews-${i}.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</sitemapindex>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
    });
}
