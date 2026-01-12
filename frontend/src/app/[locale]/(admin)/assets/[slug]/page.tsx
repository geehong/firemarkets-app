import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { apiClient } from '@/lib/api'
import AssetHeader from '@/components/assets/AssetHeader'
import AssetDetailedView from '@/components/template/AssetDetailedView'

// Reconstruct the AssetOverviews logic on the server
async function getAssetData(slug: string) {
    try {
        const assetDetail = await apiClient.getAssetDetail(slug)
        if (!assetDetail) return null

        const typeName = assetDetail.type_name
        let detailedData: any = {}

        // Fetch type-specific data
        try {
            if (typeName === 'Stocks') {
                const stockRes = await apiClient.getStockInfo(slug)
                if (stockRes) {
                    detailedData = {
                        ...detailedData,
                        ...stockRes.post_overview,
                        ...stockRes.numeric_overview,
                        // Merge financials if needed
                    }
                }
            } else if (typeName === 'Crypto') {
                const cryptoRes = await apiClient.getCryptoInfo(slug)
                if (cryptoRes) {
                    detailedData = {
                        ...detailedData,
                        ...cryptoRes.post_overview,
                        ...cryptoRes.numeric_overview,
                        crypto_symbol: cryptoRes.numeric_overview?.symbol,
                        crypto_market_cap: cryptoRes.numeric_overview?.market_cap,
                    }
                }
            } else if (typeName === 'ETFs' || typeName === 'Funds') {
                const etfRes = await apiClient.getETFInfo(slug)
                if (etfRes) {
                    detailedData = {
                        ...detailedData,
                        ...etfRes.post_overview,
                        ...etfRes.numeric_overview,
                    }
                }
            }
        } catch (e) {
            console.error(`Failed to fetch specific info for ${slug} (${typeName})`, e)
        }

        // Fetch common data (always)
        try {
            const commonData = await apiClient.getAssetInfo(slug)
            if (commonData) {
                detailedData = { ...detailedData, ...commonData }
            }
        } catch (e) {
            console.error(`Failed to fetch common info for ${slug}`, e)
        }

        // specific field mappings or fallbacks
        // existing AssetOverview logic for fallbacks:
        const mergedAsset = {
            ...assetDetail,
            ...detailedData,
            name: detailedData.title || detailedData.name || assetDetail.name,
            ticker: detailedData.ticker || detailedData.symbol || assetDetail.ticker,
        }

        return mergedAsset
    } catch (error) {
        console.error('Failed to fetch asset data:', error)
        return null
    }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params
    const asset = await getAssetData(slug)

    if (!asset) {
        return {
            title: 'Asset Not Found | FireMarkets',
            description: 'The requested asset could not be found.'
        }
    }

    const name = asset.name || slug
    const ticker = asset.ticker || slug

    return {
        title: `${name} (${ticker}) - Price, Data | FireMarkets`,
        description: asset.description || `Live price and analysis for ${name} (${ticker}).`,
    }
}

export default async function AssetPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
    const { slug, locale } = await params
    const asset = await getAssetData(slug)

    // Check if asset is excluded
    if (asset && (asset.ticker === 'USDC' || asset.ticker === 'USDT')) {
        notFound()
    }

    if (!asset) {
        notFound()
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <AssetDetailedView asset={asset} locale={locale} />
        </main>
    )
}
