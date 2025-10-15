import { Metadata } from 'next'
import OnchainOverview from '@/components/overviews/OnchainOverview'

// 정적 메타데이터
export const metadata: Metadata = {
  title: 'Bitcoin Halving Analysis - Historical Cycles & Price Impact | FireMarkets',
  description: 'Comprehensive Bitcoin halving analysis including historical cycles, price impact, and market behavior patterns. Explore halving data from 2012 to 2024.',
  keywords: 'Bitcoin, halving, analysis, historical, cycles, price impact, market behavior, 2012, 2016, 2020, 2024',
  openGraph: {
    title: 'Bitcoin Halving Analysis | FireMarkets',
    description: 'Historical Bitcoin halving cycles and price impact analysis.',
    type: 'website',
    url: '/onchain/halving',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bitcoin Halving Analysis | FireMarkets',
    description: 'Historical Bitcoin halving cycles and price impact analysis.',
  },
  alternates: {
    canonical: '/onchain/halving',
  },
}

// 구조화된 데이터 (JSON-LD) 생성
function generateStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'DataCatalog',
    name: 'Bitcoin Halving Analysis',
    description: 'Historical Bitcoin halving cycles and price impact analysis',
    url: 'https://firemarkets.net/onchain/halving',
    provider: {
      '@type': 'Organization',
      name: 'FireMarkets',
      url: 'https://firemarkets.net'
    },
    about: {
      '@type': 'Thing',
      name: 'Bitcoin Halving',
      description: 'Bitcoin network halving events and their market impact'
    },
    keywords: ['Bitcoin', 'halving', 'analysis', 'historical', 'cycles', 'price impact'],
    dataset: {
      '@type': 'Dataset',
      name: 'Bitcoin Halving Data',
      description: 'Historical Bitcoin halving events and price data',
      distribution: {
        '@type': 'DataDownload',
        contentUrl: 'https://firemarkets.net/onchain/halving',
        encodingFormat: 'application/json'
      }
    }
  }
}

export default function HalvingPage() {
  const structuredData = generateStructuredData()

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
        <OnchainOverview />
      </main>
    </>
  )
}
