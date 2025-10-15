import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { apiClient } from '@/lib/api'
import AssetOverview from '@/components/overviews/AssetOverview'

interface AssetPageProps {
  params: { assetIdentifier: string }
}

// 동적 메타데이터 생성
export async function generateMetadata({ 
  params 
}: AssetPageProps): Promise<Metadata> {
  try {
    const { assetIdentifier } = await params
    const asset = await apiClient.getAssetOverview(assetIdentifier)
    
    if (!asset) {
      return {
        title: 'Asset Not Found | FireMarkets',
        description: 'The requested asset could not be found.',
      }
    }

    const title = `${asset.name} (${asset.asset_identifier || asset.ticker}) - Price, Charts | FireMarkets`
    const description = `Live price, charts, and market data for ${asset.name}. Explore historical data and analysis on FireMarkets.`
    const keywords = `${asset.name}, ${asset.asset_identifier || asset.ticker}, price, chart, market data, ${asset.type_name}`

    return {
      title,
      description,
      keywords,
      openGraph: {
        title: `${asset.name} (${asset.asset_identifier || asset.ticker}) | FireMarkets`,
        description: `Live price and market data for ${asset.name}.`,
        images: asset.logo_url ? [asset.logo_url] : ['/default-logo.png'],
        type: 'website',
        url: `/assets/${assetIdentifier}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${asset.name} | FireMarkets`,
        description: `Live price and market data for ${asset.name}.`,
        images: asset.logo_url ? [asset.logo_url] : ['/default-logo.png'],
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
    tickerSymbol: asset.asset_identifier || asset.ticker,
    description: asset.description,
    category: asset.type_name,
    provider: {
      '@type': 'Organization',
      name: 'FireMarkets',
      url: 'https://firemarkets.net'
    },
    url: `https://firemarkets.net/assets/${assetIdentifier}`,
    ...(asset.logo_url && {
      image: asset.logo_url
    }),
    ...(asset.company_name && {
      issuer: {
        '@type': 'Organization',
        name: asset.company_name
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
    })
  }
}

export default async function AssetPage({ params }: AssetPageProps) {
  const { assetIdentifier } = await params
  let asset
  
  try {
    asset = await apiClient.getAssetOverview(assetIdentifier)
  } catch (error) {
    console.error('Failed to fetch asset:', error)
    notFound()
  }

  if (!asset) {
    notFound()
  }

  const structuredData = generateStructuredData(asset, assetIdentifier)

  return (
    <>
      {/* 구조화된 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      
      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-8">
        <AssetOverview />
      </main>
    </>
  )
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
