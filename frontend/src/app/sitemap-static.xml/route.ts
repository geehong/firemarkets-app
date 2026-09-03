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

    const staticUrls: string[] = [];
    const localePrefix = (locale: string) => locale === 'ko' ? '' : `/${locale}`;

    locales.forEach(locale => {
        const prefix = localePrefix(locale);
        mainRoutes.forEach(route => {
            const url = `${baseUrl}${prefix}${route}`;
            const prio = route === '' || route === '/en' ? '1.0' : '0.8';
            staticUrls.push(`
  <url>
    <loc>${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${prio}</priority>
  </url>`);
        });
        onchainMetrics.forEach(metric => {
            const url = `${baseUrl}${prefix}/onchain/${metric}`;
            staticUrls.push(`
  <url>
    <loc>${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`);
        });
    });

    let tags: any[] = [];
    try {
        const tagData: any = await apiClient.getBlogTags();
        if (tagData && Array.isArray(tagData)) {
            tags = tagData;
        }
    } catch (e) {}

    const tagUrls: string[] = [];
    tags.forEach(tag => {
        if (tag.slug && tag.usage_count > 0) {
            locales.forEach(locale => {
                const prefix = localePrefix(locale);
                tagUrls.push(`
  <url>
    <loc>${baseUrl}${prefix}/tag/${tag.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`);
            });
        }
    });

    let assetUrls: string[] = [];
    try {
        const assetData: any = await apiClient.v2GetAssets({ limit: 1000 });
        const assetsList = assetData?.data || (Array.isArray(assetData) ? assetData : []);
        assetsList.forEach((asset: any) => {
            const ticker = asset.ticker || asset.symbol || asset.slug;
            if (ticker && ticker !== 'USDC' && ticker !== 'USDT') {
                locales.forEach(locale => {
                    const prefix = localePrefix(locale);
                    assetUrls.push(`
  <url>
    <loc>${baseUrl}${prefix}/assets/${ticker}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`);
                });
            }
        });
    } catch (e) {
        console.error('Sitemap Static: Failed to fetch assets', e);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.join('')}
${tagUrls.join('')}
${assetUrls.join('')}
</urlset>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
    });
}
