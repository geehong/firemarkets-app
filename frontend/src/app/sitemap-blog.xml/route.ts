import { apiClient } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    const baseUrl = 'https://firemarkets.net';
    const now = new Date().toISOString();

    let posts: any[] = [];
    try {
        const data: any = await apiClient.getPosts({
            page: 1,
            page_size: 1000,
            status: 'published',
            post_type: 'post'
        });
        posts = data?.posts || [];
    } catch (e) {
        console.error('Sitemap Blog: Error fetching posts', e);
    }

    const postUrls: string[] = [];
    posts.forEach(post => {
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

            const koUrl = `${baseUrl}/blog/${slug}`;
            const enUrl = `${baseUrl}/en/blog/${slug}`;

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
