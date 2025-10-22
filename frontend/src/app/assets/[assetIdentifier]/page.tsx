import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAssetOverview } from '@/lib/data/assets'
import AssetOverview from '@/components/overviews/AssetOverview'

// 동적 렌더링 강제 설정
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface AssetPageProps {
  params: { assetIdentifier: string }
}

// 동적 메타데이터 생성
export async function generateMetadata({ 
  params 
}: AssetPageProps): Promise<Metadata> {
  try {
    const { assetIdentifier } = await params
    
    // 중앙화된 데이터 페칭 함수 사용
    const asset = await getAssetOverview(assetIdentifier)
    
    // 서버 사이드 로깅: 메타데이터 생성 시 볼륨 관련 필드 점검
    // 참고: 실제 존재하지 않는 키는 undefined로 출력됩니다.
    // 이 로그는 서버 콘솔(Next.js 서버 로그)에 표시됩니다.
    console.log('[AssetPage][generateMetadata]', {
      assetIdentifier,
      volume: (asset as any)?.volume,
      volume_24h: (asset as any)?.volume_24h,
      avg_volume: (asset as any)?.avg_volume,
      avg_volume_24h: (asset as any)?.avg_volume_24h,
      turnover: (asset as any)?.turnover,
      quote_volume: (asset as any)?.quote_volume,
    })
    
    if (!asset) {
      return {
        title: 'Asset Not Found | FireMarkets',
        description: 'The requested asset could not be found.',
      }
    }

    const title = `${asset.name} (${asset.ticker}) - Price, Charts | FireMarkets`
    const description = `Live price, charts, and market data for ${asset.name}. Explore historical data and analysis on FireMarkets.`
    const keywords = `${asset.name}, ${asset.ticker}, price, chart, market data, ${asset.type_name}`

    return {
      title,
      description,
      keywords,
      openGraph: {
        title: `${asset.name} (${asset.ticker}) | FireMarkets`,
        description: `Live price and market data for ${asset.name}.`,
        images: asset.logo_image_url ? [asset.logo_image_url] : ['/default-logo.png'],
        type: 'website',
        url: `/assets/${assetIdentifier}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${asset.name} | FireMarkets`,
        description: `Live price and market data for ${asset.name}.`,
        images: asset.logo_image_url ? [asset.logo_image_url] : ['/default-logo.png'],
      },
      alternates: {
        canonical: `/assets/${assetIdentifier}`,
      },
      other: {
        'asset-type': asset.type_name,
        'asset-exchange': asset.exchange,
        'asset-currency': asset.currency,
      },
    }
  } catch (error) {
    console.error('Failed to generate metadata:', error)
    return {
      title: 'Error | FireMarkets',
      description: 'An error occurred while loading asset data.',
    }
  }
}

// 구조화된 데이터 (JSON-LD) 생성
function generateStructuredData(asset: any, assetIdentifier: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FinancialProduct',
    name: asset.name,
    tickerSymbol: asset.ticker,
    description: asset.description,
    category: asset.type_name,
    provider: {
      '@type': 'Organization',
      name: 'FireMarkets',
      url: 'https://firemarkets.net'
    },
    url: `https://firemarkets.net/assets/${assetIdentifier}`,
    ...(asset.logo_image_url && {
      image: asset.logo_image_url
    }),
    ...(asset.company_name && {
      issuer: {
        '@type': 'Organization',
        name: asset.company_name,
        ...(asset.website && { url: asset.website }),
        ...(asset.ceo && { founder: asset.ceo }),
        ...(asset.employees_count && { numberOfEmployees: asset.employees_count }),
        ...(asset.address && { address: asset.address }),
        ...(asset.city && asset.state && { location: `${asset.city}, ${asset.state}` })
      }
    }),
    ...(asset.sector && {
      industry: asset.sector
    }),
    ...(asset.country && {
      areaServed: {
        '@type': 'Country',
        name: asset.country
      }
    }),
    ...(asset.market_cap && {
      marketCap: {
        '@type': 'MonetaryAmount',
        value: asset.market_cap,
        currency: asset.currency
      }
    }),
    ...(asset.pe_ratio && {
      priceEarningsRatio: asset.pe_ratio
    }),
    ...(asset.eps && {
      earningsPerShare: {
        '@type': 'MonetaryAmount',
        value: asset.eps,
        currency: asset.currency
      }
    }),
    ...(asset.dividend_yield && {
      dividendYield: asset.dividend_yield
    }),
    ...(asset.ipo_date && {
      dateFounded: asset.ipo_date
    })
  }
}

export default async function AssetPage({ params }: AssetPageProps) {
  const { assetIdentifier } = await params
  
  try {
    // 중앙화된 데이터 페칭 함수 사용
    const asset = await getAssetOverview(assetIdentifier)
    
    // 서버 사이드 로깅: 페이지 렌더 시 볼륨 관련 필드 점검
    console.log('[AssetPage][render]', {
      assetIdentifier,
      volume: (asset as any)?.volume,
      volume_24h: (asset as any)?.volume_24h,
      avg_volume: (asset as any)?.avg_volume,
      avg_volume_24h: (asset as any)?.avg_volume_24h,
      turnover: (asset as any)?.turnover,
      quote_volume: (asset as any)?.quote_volume,
    })
    
    if (!asset) {
      notFound()
    }

    const structuredData = generateStructuredData(asset, assetIdentifier)
    
    // 클라이언트 사이드 로깅을 위한 데이터 준비
    const clientVolumeLogData = {
      assetIdentifier,
      volume: (asset as any)?.volume,
      volume_24h: (asset as any)?.volume_24h,
      avg_volume: (asset as any)?.avg_volume,
      avg_volume_24h: (asset as any)?.avg_volume_24h,
      turnover: (asset as any)?.turnover,
      quote_volume: (asset as any)?.quote_volume,
    }

    return (
      <>
        {/* 구조화된 데이터 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        {/* 클라이언트 콘솔 로깅: 차트/볼륨 이슈 디버깅 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { console.log('[AssetPage][client]', ${JSON.stringify(
              clientVolumeLogData
            )}); } catch (e) {} })();`,
          }}
        />
        
        {/* 메인 콘텐츠 */}
        <main className="container mx-auto px-4 py-8">
          <AssetOverview initialData={asset} />
        </main>
      </>
    )
  } catch (error) {
    console.error('Failed to fetch asset:', error)
    notFound()
  }
}

// 정적 생성 가능한 경로들 (선택사항)
export async function generateStaticParams() {
  // 인기 자산들에 대해 정적 페이지 생성
  const popularAssets = [
    'BTCUSDT',
    'ETHUSDT', 
    'AAPL',
    'TSLA',
    'MSFT',
    'GOOGL',
    'AMZN',
    'NVDA'
  ]
  
  return popularAssets.map((assetIdentifier) => ({
    assetIdentifier,
  }))
}
