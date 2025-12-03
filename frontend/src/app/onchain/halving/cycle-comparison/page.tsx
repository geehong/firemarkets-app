import { Metadata } from 'next'
import CycleComparisonChart from '@/components/charts/onchaincharts/CycleComparisonChart'

export const metadata: Metadata = {
  title: 'Bitcoin Cycle Comparison - Low to High Analysis | FireMarkets',
  description: 'Compare Bitcoin cycles from low to high points. Analyze Era 1, 2, 3, and 4 price movements normalized from their lowest to highest points.',
  keywords: 'Bitcoin, cycle, comparison, era, low to high, price analysis, normalized, 2011, 2015, 2018, 2022',
  openGraph: {
    title: 'Bitcoin Cycle Comparison | FireMarkets',
    description: 'Compare Bitcoin cycles from low to high points. Normalized analysis of historical price movements.',
    type: 'website',
    url: '/onchain/halving/cycle-comparison',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bitcoin Cycle Comparison | FireMarkets',
    description: 'Compare Bitcoin cycles from low to high points. Normalized analysis of historical price movements.',
  },
  alternates: {
    canonical: '/onchain/halving/cycle-comparison',
  },
}

// 구조화된 데이터 (JSON-LD) 생성
function generateStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'DataCatalog',
    name: 'Bitcoin Cycle Comparison',
    description: 'Compare Bitcoin cycles from low to high points. Normalized analysis of historical price movements.',
    url: 'https://firemarkets.net/onchain/halving/cycle-comparison',
    provider: {
      '@type': 'Organization',
      name: 'FireMarkets',
      url: 'https://firemarkets.net'
    },
    about: {
      '@type': 'Thing',
      name: 'Bitcoin Cycles',
      description: 'Bitcoin price cycles from low to high points'
    },
    keywords: ['Bitcoin', 'cycle', 'comparison', 'era', 'low to high', 'price analysis'],
    dataset: {
      '@type': 'Dataset',
      name: 'Bitcoin Cycle Data',
      description: 'Historical Bitcoin cycle data normalized from low to high points',
      distribution: {
        '@type': 'DataDownload',
        contentUrl: 'https://firemarkets.net/onchain/halving/cycle-comparison',
        encodingFormat: 'application/json'
      }
    }
  }
}

export default function CycleComparisonPage() {
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
        <CycleComparisonChart 
          title="Bitcoin Cycle Comparison (Low to High)" 
          height={600} 
        />
      </main>
    </>
  )
}


