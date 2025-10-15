import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { apiClient } from '@/lib/api'
import OnchainOverview from '@/components/overviews/OnchainOverview'

interface OnchainMetricPageProps {
  params: { metric: string }
}

// 동적 메타데이터 생성
export async function generateMetadata({ 
  params 
}: OnchainMetricPageProps): Promise<Metadata> {
  try {
    const metrics = await apiClient.getOnchainMetrics()
    const metricConfig = metrics.find(m => m.id === params.metric)
    
    if (!metricConfig) {
      return {
        title: 'Onchain Metric Not Found | FireMarkets',
        description: 'The requested onchain metric could not be found.',
      }
    }

    const cleanMetricName = metricConfig.name.replace(/\s*\([^)]*\)/g, '')
    const title = `${cleanMetricName} Analysis - Bitcoin Onchain Data | FireMarkets`
    const description = `Comprehensive ${cleanMetricName} analysis and correlation with Bitcoin price. Explore onchain metrics and market insights on FireMarkets.`
    const keywords = `${cleanMetricName}, Bitcoin, onchain, analysis, correlation, blockchain data, market insights`

    return {
      title,
      description,
      keywords,
      openGraph: {
        title: `${cleanMetricName} Analysis | FireMarkets`,
        description: `Bitcoin ${cleanMetricName} analysis and market correlation.`,
        type: 'website',
        url: `/onchain/${params.metric}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${cleanMetricName} Analysis | FireMarkets`,
        description: `Bitcoin ${cleanMetricName} analysis and market correlation.`,
      },
      alternates: {
        canonical: `/onchain/${params.metric}`,
      },
      other: {
        'metric-id': params.metric,
        'metric-name': cleanMetricName,
        'analysis-type': 'onchain',
      },
    }
  } catch (error) {
    console.error('Failed to generate metadata:', error)
    return {
      title: 'Onchain Analysis | FireMarkets',
      description: 'Bitcoin onchain metrics and market analysis.',
    }
  }
}

// 구조화된 데이터 (JSON-LD) 생성
function generateStructuredData(metricConfig: any, metric: string) {
  const cleanMetricName = metricConfig.name.replace(/\s*\([^)]*\)/g, '')
  
  return {
    '@context': 'https://schema.org',
    '@type': 'DataCatalog',
    name: `${cleanMetricName} Analysis`,
    description: metricConfig.description,
    url: `https://firemarkets.net/onchain/${metric}`,
    provider: {
      '@type': 'Organization',
      name: 'FireMarkets',
      url: 'https://firemarkets.net'
    },
    about: {
      '@type': 'Thing',
      name: 'Bitcoin',
      description: 'Cryptocurrency and digital asset'
    },
    keywords: [cleanMetricName, 'Bitcoin', 'onchain', 'blockchain', 'analysis'],
    dataset: {
      '@type': 'Dataset',
      name: `${cleanMetricName} Data`,
      description: `Historical ${cleanMetricName} data for Bitcoin`,
      distribution: {
        '@type': 'DataDownload',
        contentUrl: `https://firemarkets.net/onchain/${metric}`,
        encodingFormat: 'application/json'
      }
    }
  }
}

export default async function OnchainMetricPage({ params }: OnchainMetricPageProps) {
  let metricConfig
  
  try {
    const metrics = await apiClient.getOnchainMetrics()
    metricConfig = metrics.find(m => m.id === params.metric)
  } catch (error) {
    console.error('Failed to fetch onchain metrics:', error)
    notFound()
  }

  if (!metricConfig) {
    notFound()
  }

  const structuredData = generateStructuredData(metricConfig, params.metric)

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

// 정적 생성 가능한 경로들 (인기 메트릭들)
export async function generateStaticParams() {
  try {
    const metrics = await apiClient.getOnchainMetrics()
    return metrics.slice(0, 10).map((metric) => ({
      metric: metric.id,
    }))
  } catch (error) {
    console.error('Failed to generate static params:', error)
    // 기본 메트릭들 반환
    return [
      { metric: 'mvrv_z_score' },
      { metric: 'nvt_ratio' },
      { metric: 'realized_price' },
      { metric: 'market_cap' },
    ]
  }
}
