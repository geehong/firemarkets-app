import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAssetOverview, getAssetDetail } from '@/lib/data/assets'
import AssetOverview from '@/components/overviews/AssetOverview'

// 다국어 필드를 문자열로 변환하는 헬퍼 함수
const getStringValue = (value: any, lang: 'ko' | 'en' = 'ko'): string => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    if (value[lang]) return String(value[lang])
    if (value.ko) return String(value.ko)
    if (value.en) return String(value.en)
    // 객체의 첫 번째 값을 사용
    const firstKey = Object.keys(value)[0]
    if (firstKey) return String(value[firstKey])
  }
  return String(value)
}

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
    // getAssetOverview가 실패하면 getAssetDetail을 fallback으로 사용
    let asset = await getAssetOverview(assetIdentifier)
    
    if (!asset) {
      // Overview가 없으면 Detail을 시도
      asset = await getAssetDetail(assetIdentifier)
    }
    
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

    // 서버 사이드에서 asset 데이터 정규화 (다국어 필드를 문자열로 변환)
    const normalizedAsset = {
      ...asset,
      name: getStringValue(asset.name),
      ticker: getStringValue(asset.ticker),
      type_name: getStringValue(asset.type_name),
      description: getStringValue(asset.description),
      exchange: getStringValue(asset.exchange),
      currency: getStringValue(asset.currency),
    }

    const assetName = normalizedAsset.name
    const assetTicker = normalizedAsset.ticker
    const assetTypeName = normalizedAsset.type_name
    
    const title = `${assetName} (${assetTicker}) - Price, Charts | FireMarkets`
    const description = `Live price, charts, and market data for ${assetName}. Explore historical data and analysis on FireMarkets.`
    const keywords = `${assetName}, ${assetTicker}, price, chart, market data, ${assetTypeName}`

    return {
      title,
      description,
      keywords,
      openGraph: {
        title: `${assetName} (${assetTicker}) | FireMarkets`,
        description: `Live price and market data for ${assetName}.`,
        images: asset.logo_image_url ? [asset.logo_image_url] : ['/default-logo.png'],
        type: 'website',
        url: `/assets/${assetIdentifier}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${assetName} | FireMarkets`,
        description: `Live price and market data for ${assetName}.`,
        images: asset.logo_image_url ? [asset.logo_image_url] : ['/default-logo.png'],
      },
      alternates: {
        canonical: `/assets/${assetIdentifier}`,
      },
      other: {
        'asset-type': assetTypeName,
        'asset-exchange': getStringValue(asset.exchange),
        'asset-currency': getStringValue(asset.currency),
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
    name: getStringValue(asset.name),
    tickerSymbol: getStringValue(asset.ticker),
    description: getStringValue(asset.description),
    category: getStringValue(asset.type_name),
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
        name: getStringValue(asset.company_name),
        ...(asset.website && { url: getStringValue(asset.website) }),
        ...(asset.ceo && { founder: getStringValue(asset.ceo) }),
        ...(asset.employees_count && { numberOfEmployees: asset.employees_count }),
        ...(asset.address && { address: getStringValue(asset.address) }),
        ...(asset.city && asset.state && { location: `${getStringValue(asset.city)}, ${getStringValue(asset.state)}` })
      }
    }),
    ...(asset.sector && {
      industry: getStringValue(asset.sector)
    }),
    ...(asset.country && {
      areaServed: {
        '@type': 'Country',
        name: getStringValue(asset.country)
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
    // getAssetOverview가 실패하면 getAssetDetail을 fallback으로 사용
    let asset = await getAssetOverview(assetIdentifier)
    
    if (!asset) {
      // Overview가 없으면 Detail을 시도
      asset = await getAssetDetail(assetIdentifier)
    }
    
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

    // 서버 사이드에서 asset 데이터 정규화 (다국어 필드를 문자열로 변환)
    const normalizedAsset = {
      ...asset,
      name: getStringValue(asset.name),
      ticker: getStringValue(asset.ticker),
      type_name: getStringValue(asset.type_name),
      description: getStringValue(asset.description),
      exchange: getStringValue(asset.exchange),
      currency: getStringValue(asset.currency),
      ...(asset.company_name && { company_name: getStringValue(asset.company_name) }),
      ...(asset.sector && { sector: getStringValue(asset.sector) }),
      ...(asset.industry && { industry: getStringValue(asset.industry) }),
      ...(asset.country && { country: getStringValue(asset.country) }),
      ...(asset.ceo && { ceo: getStringValue(asset.ceo) }),
      ...(asset.website && { website: getStringValue(asset.website) }),
      ...(asset.address && { address: getStringValue(asset.address) }),
      ...(asset.city && { city: getStringValue(asset.city) }),
      ...(asset.state && { state: getStringValue(asset.state) }),
    }

    const structuredData = generateStructuredData(normalizedAsset, assetIdentifier)
    
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
          <AssetOverview initialData={normalizedAsset} />
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
