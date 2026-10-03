import { apiClient } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    const baseUrl = 'https://firemarkets.net';
    const now = new Date().toISOString();
    const locales = ['ko', 'en'];
    const mainRoutes = ['', '/blog', '/news', '/news/briefnews', '/assets', '/onchain', '/map', '/about', '/contact', '/privacy-policy', '/terms-of-service'];
    const onchainMetrics = [
        'halving/cycle-comparison', 'halving/halving-bull-chart', 'mvrv_z_score', 'mvrv',
        'lth_mvrv', 'sth_mvrv', 'nupl', 'lth_nupl', 'sth_nupl', 'puell_multiple',
        'reserve_risk', 'realized_price', 'sth_realized_price', 'terminal_price',
        'delta_price_usd', 'true_market_mean', 'aviv', 'sopr', 'cdd_90dma',
        'hodl_waves_supply', 'nrpl_usd', 'utxos_in_profit_pct', 'utxos_in_loss_pct',
        'hashrate', 'difficulty', 'rhodl_ratio', 'nvts', 'market_cap', 'realized_cap',
        'thermo_cap', 'etf_btc_total', 'etf_btc_flow'
    ];

    const urlBlocks: string[] = [];

    mainRoutes.forEach(route => {
        const koUrl = `${baseUrl}${route}`;
        const enUrl = `${baseUrl}/en${route}`;
        const prioKo = route === '' ? '1.0' : '0.8';
        const prioEn = route === '' ? '1.0' : '0.8';

        urlBlocks.push(`
  <url>
    <loc>${koUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${prioKo}</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="${koUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
  </url>
  <url>
    <loc>${enUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${prioEn}</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="${koUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
  </url>`);
    });

    onchainMetrics.forEach(metric => {
        const koUrl = `${baseUrl}/onchain/${metric}`;
        const enUrl = `${baseUrl}/en/onchain/${metric}`;

        urlBlocks.push(`
  <url>
    <loc>${koUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="${koUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
  </url>
  <url>
    <loc>${enUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="${koUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
  </url>`);
    });

    let tags: any[] = [];
    try {
        const tagData: any = await apiClient.getBlogTags();
        if (tagData && Array.isArray(tagData)) {
            tags = tagData;
        }
    } catch (e) {}

    tags.forEach(tag => {
        if (tag.slug && tag.usage_count > 0) {
            const koUrl = `${baseUrl}/tag/${tag.slug}`;
            const enUrl = `${baseUrl}/en/tag/${tag.slug}`;

            urlBlocks.push(`
  <url>
    <loc>${koUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="${koUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
  </url>
  <url>
    <loc>${enUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="${koUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
  </url>`);
        }
    });

    let assetsList: any[] = [];
    try {
        const assetData: any = await apiClient.v2GetAssets({ limit: 1000 });
        assetsList = assetData?.data || (Array.isArray(assetData) ? assetData : []);
    } catch (e) {
        console.error('Sitemap Static: Failed to fetch assets', e);
    }

    assetsList.forEach((asset: any) => {
        const ticker = asset.ticker || asset.symbol || asset.slug;
        if (ticker && ticker !== 'USDC' && ticker !== 'USDT') {
            const koUrl = `${baseUrl}/assets/${ticker}`;
            const enUrl = `${baseUrl}/en/assets/${ticker}`;

            urlBlocks.push(`
  <url>
    <loc>${koUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="${koUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
  </url>
  <url>
    <loc>${enUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <xhtml:link rel="alternate" hreflang="ko" href="${koUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
  </url>`);
        }
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlBlocks.join('')}
</urlset>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
    });
}
