import { Metadata } from 'next'
import AssetsList from '@/components/lists/AssetsList'

interface AssetsPageProps {
  searchParams: { type_name?: string }
}

// 동적 메타데이터 생성
export async function generateMetadata({ 
  searchParams 
}: AssetsPageProps): Promise<Metadata> {
  const { type_name: typeName } = await searchParams
  
  if (typeName) {
    return {
      title: `${typeName} Assets - Market Overview | FireMarkets`,
      description: `Explore ${typeName} assets with live prices, charts, and market data. Comprehensive analysis and insights on FireMarkets.`,
      keywords: `${typeName}, assets, market data, prices, charts, analysis, trading`,
      openGraph: {
        title: `${typeName} Assets | FireMarkets`,
        description: `Live ${typeName} market data and analysis.`,
        type: 'website',
        url: `/assets?type_name=${encodeURIComponent(typeName)}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${typeName} Assets | FireMarkets`,
        description: `Live ${typeName} market data and analysis.`,
      },
      alternates: {
        canonical: `/assets?type_name=${encodeURIComponent(typeName)}`,
      },
    }
  }

  return {
    title: 'All Assets - Market Overview | FireMarkets',
    description: 'Explore all assets with live prices, charts, and comprehensive market data analysis. Stocks, cryptocurrencies, ETFs, and commodities.',
    keywords: 'assets, market data, prices, charts, stocks, crypto, ETFs, commodities, trading, analysis',
    openGraph: {
      title: 'All Assets | FireMarkets',
      description: 'Comprehensive market data for all asset types.',
      type: 'website',
      url: '/assets',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'All Assets | FireMarkets',
      description: 'Comprehensive market data for all asset types.',
    },
    alternates: {
      canonical: '/assets',
    },
  }
}

// 구조화된 데이터 (JSON-LD) 생성
function generateStructuredData(typeName?: string) {
  const baseData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: typeName ? `${typeName} Assets` : 'All Assets',
    description: typeName 
      ? `Market data and analysis for ${typeName} assets`
      : 'Comprehensive market data for all asset types',
    url: typeName ? `https://firemarkets.net/assets?type_name=${encodeURIComponent(typeName)}` : 'https://firemarkets.net/assets',
    provider: {
      '@type': 'Organization',
      name: 'FireMarkets',
      url: 'https://firemarkets.net'
    },
    mainEntity: {
      '@type': 'ItemList',
      name: typeName ? `${typeName} Assets` : 'Asset List',
      description: typeName 
        ? `List of ${typeName} assets with market data`
        : 'List of all available assets with market data'
    }
  }

  return baseData
}

export default async function AssetsPage({ searchParams }: AssetsPageProps) {
  const { type_name: typeName } = await searchParams
  const structuredData = generateStructuredData(typeName)

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
        <AssetsList />
      </main>
    </>
  )
}
