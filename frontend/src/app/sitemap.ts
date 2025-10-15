import { MetadataRoute } from 'next';
import { apiClient } from '@/lib/api';

const BASE_URL = 'https://firemarkets.net';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. 정적 페이지 목록
  const staticRoutes = [
    '/',
    '/assets',
    '/onchain',
    '/onchain/halving',
    // Asset type pages
    '/assets?type_name=Stocks',
    '/assets?type_name=Cryptocurrency',
    '/assets?type_name=ETF',
    '/assets?type_name=Commodity',
    // Tables
    '/tables/assets-list',
    '/tables/history-table',
    // Admin pages
    '/admin',
    '/admin/blank',
    '/admin/calendar',
    '/admin/form-elements',
    // Chart pages
    '/admin/minichart',
    '/admin/ohlcv-chart',
    '/admin/onchain-chart',
    '/admin/treemap-chart',
    '/admin/halving-chart',
    // UI Elements
    '/admin/videos',
    // Auth pages
    '/signin',
    // Error pages
    '/error-404',
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '/' ? 1.0 : 0.8,
  }));

  // 2. 동적 페이지 목록 (모든 자산 페이지)
  let dynamicRoutes: MetadataRoute.Sitemap = [];
  
  // 인기 자산 목록 (정적 생성)
  const popularAssets = [
    'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'XRPUSDT', 
    'DOGEUSDT', 'LTCUSDT', 'BCHUSDT', 'AAPL', 'GOOGL', 
    'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'AMD',
    'INTC', 'CRM', 'ADBE', 'PYPL', 'UBER', 'SPOT', 'SQ'
  ];
  
  const assetRoutes = popularAssets.map((asset) => ({
    url: `${BASE_URL}/assets/${asset}`,
    lastModified: new Date(),
    changeFrequency: 'hourly' as const,
    priority: 0.7,
  }));

  // 인기 온체인 메트릭 페이지
  const popularMetrics = [
    'mvrv_z_score', 'nvt_ratio', 'realized_price', 'market_cap',
    'active_addresses', 'transaction_count', 'hash_rate', 'difficulty'
  ];
  
  const metricRoutes = popularMetrics.map((metric) => ({
    url: `${BASE_URL}/onchain/${metric}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));

  dynamicRoutes = [...assetRoutes, ...metricRoutes];
  
  // TODO: API 호출이 정상화되면 아래 코드로 교체
  /*
  try {
    // 모든 자산을 가져오는 API 호출 (최대 10000개)
    const assets = await apiClient.getAssets({ limit: 10000 });
    
    if (assets && assets.data && Array.isArray(assets.data)) {
      const assetRoutes = assets.data.map((asset: { asset_identifier: string }) => ({
        url: `${BASE_URL}/assets/${asset.asset_identifier}`,
        lastModified: new Date(),
        changeFrequency: 'hourly' as const,
        priority: 0.7,
      }));
      dynamicRoutes = assetRoutes;
    }
  } catch (error) {
    console.error("Failed to fetch assets for sitemap:", error);
    // API 호출 실패 시에도 정적 라우트는 반환
  }
  */

  return [...staticRoutes, ...dynamicRoutes];
}
